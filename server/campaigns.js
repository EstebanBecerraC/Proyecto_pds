import { createCatalog } from './catalog.js'
import { goalToCents, validateCampaign } from '../shared/campaign.js'

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const fields = 'id, owner_id, title, description, category, goal_cents, raised_cents, deadline, status, created_at'
const serialize = row => ({ ...row, imageUrl: '/api/campaigns/' + row.id + '/image' })

function matchesImage(bytes, type) {
  if (type === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  if (type === 'image/webp') {
    const text = new TextDecoder('ascii')
    return text.decode(bytes.slice(0, 4)) === 'RIFF' && text.decode(bytes.slice(8, 12)) === 'WEBP'
  }
  return false
}

export function createCampaignApi(db, getUser, { origin = 'http://localhost:5173' } = {}) {
  const schema = `
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL CHECK(length(trim(title)) > 0),
      description TEXT NOT NULL CHECK(length(trim(description)) > 0),
      category TEXT NOT NULL,
      image BLOB NOT NULL,
      image_type TEXT NOT NULL,
      goal_cents INTEGER NOT NULL CHECK(goal_cents > 0),
      deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Borrador' CHECK(status IN ('Borrador', 'Activa', 'Cancelada')),
      raised_cents INTEGER NOT NULL DEFAULT 0 CHECK(raised_cents >= 0),
      creation_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(owner_id, creation_key)
    );
  `
  db.exec(schema)
  const existingSchema = db.query("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'campaigns'").get().sql
  if (!existingSchema.includes("'Cancelada'")) {
    // SQLite requires rebuilding a table to change a CHECK constraint.
    // The transaction preserves all existing campaign data and IDs.
    const hasRaised = db.query('PRAGMA table_info(campaigns)').all().some(column => column.name === 'raised_cents')
    db.transaction(() => {
      db.exec(schema.replace('CREATE TABLE IF NOT EXISTS campaigns (', 'CREATE TABLE campaigns_updated ('))
      db.exec(`
        INSERT INTO campaigns_updated
          (id, owner_id, title, description, category, image, image_type, goal_cents, deadline, status, raised_cents, creation_key, created_at)
        SELECT id, owner_id, title, description, category, image, image_type, goal_cents, deadline, status, ${hasRaised ? 'raised_cents' : '0'}, creation_key, created_at
        FROM campaigns;
        DROP TABLE campaigns;
        ALTER TABLE campaigns_updated RENAME TO campaigns;
      `)
    })()
  }
  db.exec('CREATE INDEX IF NOT EXISTS campaigns_owner ON campaigns(owner_id)')

  const catalog = createCatalog(db)

  return async function handle(request) {
    const user = getUser(request)
    if (!user) return json({ error: 'Debes iniciar sesión.' }, 401)
    const path = new URL(request.url).pathname
    if (['POST', 'DELETE'].includes(request.method) && request.headers.get('origin') !== origin)
      return json({ error: 'Origen no permitido.' }, 403)
    if (path === '/api/campaigns/catalog' && request.method === 'GET') return catalog(request)
    if (path === '/api/campaigns' && request.method === 'GET') {
      const rows = db.query(`SELECT ${fields} FROM campaigns WHERE owner_id = ? ORDER BY id DESC`).all(user.id)
      return json({ campaigns: rows.map(serialize) })
    }
    if (path === '/api/campaigns' && request.method === 'POST') {
      let form
      try { form = await request.formData() }
      catch { return json({ error: 'El formulario enviado no es válido.' }, 400) }
      const data = Object.fromEntries(['title', 'description', 'category', 'goal', 'deadline'].map(field => {
        const value = form.get(field)
        return [field, typeof value === 'string' ? value.trim() : '']
      }))
      const file = form.get('image')
      const image = file instanceof Blob ? file : null
      const errors = validateCampaign(data, image)
      if (Object.keys(errors).length) return json({ error: 'Revisa los campos indicados.', errors }, 422)
      const creationKey = form.get('creationKey')
      if (typeof creationKey !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(creationKey))
        return json({ error: 'La solicitud no es válida. Recarga el formulario.' }, 400)
      const bytes = new Uint8Array(await image.arrayBuffer())
      if (!matchesImage(bytes, image.type))
        return json({ error: 'Revisa los campos indicados.', errors: { image: 'El archivo no corresponde a una imagen JPG, PNG o WebP válida.' } }, 422)
      const result = db.query(`INSERT INTO campaigns
        (owner_id, title, description, category, image, image_type, goal_cents, deadline, creation_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(owner_id, creation_key) DO NOTHING`)
        .run(user.id, data.title, data.description, data.category, bytes, image.type, goalToCents(data.goal), data.deadline, creationKey)
      const campaign = db.query(`SELECT ${fields} FROM campaigns WHERE owner_id = ? AND creation_key = ?`).get(user.id, creationKey)
      return json({ campaign: serialize(campaign) }, result.changes ? 201 : 200)
    }
    const activation = path.match(/^\/api\/campaigns\/(\d+)\/activate$/)
    if (activation && request.method === 'POST') {
      db.query("UPDATE campaigns SET status = 'Activa' WHERE id = ? AND owner_id = ? AND status = 'Borrador'")
        .run(activation[1], user.id)
      const campaign = db.query(`SELECT ${fields} FROM campaigns WHERE id = ? AND owner_id = ?`).get(activation[1], user.id)
      return campaign ? json({ campaign: serialize(campaign) }) : json({ error: 'Campaña no encontrada.' }, 404)
    }
    const cancellation = path.match(/^\/api\/campaigns\/(\d+)\/cancel$/)
    if (cancellation && request.method === 'POST') {
      const campaign = db.query(`SELECT ${fields} FROM campaigns WHERE id = ? AND owner_id = ?`).get(cancellation[1], user.id)
      if (!campaign) return json({ error: 'Campaña no encontrada.' }, 404)
      if (campaign.status !== 'Activa') return json({ error: 'Solo se pueden cancelar campañas activas.' }, 409)
      db.query("UPDATE campaigns SET status = 'Cancelada' WHERE id = ? AND owner_id = ? AND status = 'Activa'")
        .run(cancellation[1], user.id)
      return json({ campaign: serialize({ ...campaign, status: 'Cancelada' }) })
    }
    const match = path.match(/^\/api\/campaigns\/(\d+)(\/image)?$/)
    if (match && !match[2] && request.method === 'DELETE') {
      const campaign = db.query('SELECT status, raised_cents FROM campaigns WHERE id = ? AND owner_id = ?').get(match[1], user.id)
      if (!campaign) return json({ error: 'Campaña no encontrada.' }, 404)
      if (campaign.status !== 'Borrador' || campaign.raised_cents !== 0)
        return json({ error: 'Solo se pueden eliminar borradores sin aportes.' }, 409)
      db.query("DELETE FROM campaigns WHERE id = ? AND owner_id = ? AND status = 'Borrador' AND raised_cents = 0")
        .run(match[1], user.id)
      return json({ message: 'Campaña eliminada permanentemente.' })
    }
    if (match && request.method === 'GET') {
      if (match[2]) {
        const image = db.query("SELECT image, image_type FROM campaigns WHERE id = ? AND (owner_id = ? OR status = 'Activa')").get(match[1], user.id)
        return image ? new Response(image.image, { headers: {
          'Content-Type': image.image_type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        } }) : json({ error: 'Campaña no encontrada.' }, 404)
      }
      const campaign = db.query(`SELECT ${fields} FROM campaigns WHERE id = ? AND (owner_id = ? OR status = 'Activa')`).get(match[1], user.id)
      return campaign ? json({ campaign: serialize(campaign) }) : json({ error: 'Campaña no encontrada.' }, 404)
    }
    return json({ error: 'Ruta no encontrada.' }, 404)
  }
}

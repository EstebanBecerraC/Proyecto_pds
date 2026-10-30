import { fundingPercentage } from '../shared/campaign.js'

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export function createFavoritesApi(db, getUser, { origin = 'http://localhost:5173' } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, campaign_id)
  );
  CREATE INDEX IF NOT EXISTS favorites_campaign ON favorites(campaign_id);`)

  const visibleCampaign = (id, userId) => db.query(`SELECT id, status FROM campaigns
    WHERE id = ? AND (status = 'Activa' OR owner_id = ?)`).get(id, userId)
  const save = db.transaction((id, userId) => {
    const campaign = visibleCampaign(id, userId)
    if (!campaign) return json({ error: 'Campaña no encontrada.' }, 404)
    if (campaign.status !== 'Activa') return json({ error: 'Solo puedes guardar campañas activas en favoritas.' }, 409)
    db.query('INSERT INTO favorites (user_id, campaign_id) VALUES (?, ?) ON CONFLICT DO NOTHING').run(userId, id)
    return json({ favorite: true })
  })

  return request => {
    if (['PUT', 'DELETE'].includes(request.method) && request.headers.get('origin') !== origin)
      return json({ error: 'Origen no permitido.' }, 403)
    const user = getUser(request)
    if (!user) return json({ error: 'Debes iniciar sesión.' }, 401)
    const path = new URL(request.url).pathname
    if (path === '/api/favorites' && request.method === 'GET') {
      const rows = db.query(`SELECT c.id, c.title, c.category, c.goal_cents, c.raised_cents, c.status
        FROM favorites f JOIN campaigns c ON c.id = f.campaign_id
        WHERE f.user_id = ? AND (c.status = 'Activa' OR c.owner_id = ?)
        ORDER BY f.created_at DESC, f.campaign_id DESC`).all(user.id, user.id)
      return json({ campaigns: rows.map(row => ({ ...row,
        imageUrl: '/api/campaigns/' + row.id + '/image',
        fundingPercentage: fundingPercentage(row.raised_cents, row.goal_cents),
      })) })
    }
    const match = path.match(/^\/api\/favorites\/([1-9]\d*)$/)
    if (!match || !Number.isSafeInteger(Number(match[1]))) return json({ error: 'Ruta no encontrada.' }, 404)
    const id = Number(match[1])
    if (request.method === 'PUT') return save(id, user.id)
    if (request.method === 'GET') {
      if (!visibleCampaign(id, user.id)) return json({ error: 'Campaña no encontrada.' }, 404)
      return json({ favorite: Boolean(db.query('SELECT 1 FROM favorites WHERE user_id = ? AND campaign_id = ?').get(user.id, id)) })
    }
    if (request.method === 'DELETE') {
      // Removing an unavailable campaign is safe and does not reveal whether it exists.
      db.query('DELETE FROM favorites WHERE user_id = ? AND campaign_id = ?').run(user.id, id)
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
    }
    return json({ error: 'Ruta no encontrada.' }, 404)
  }
}

import { fundingPercentage } from '../shared/campaign.js'

export function createCatalog(db) {
  if (!db.query('PRAGMA table_info(campaigns)').all().some(column => column.name === 'raised_cents')) {
    db.exec('ALTER TABLE campaigns ADD COLUMN raised_cents INTEGER NOT NULL DEFAULT 0 CHECK(raised_cents >= 0)')
  }
  db.exec('CREATE INDEX IF NOT EXISTS campaigns_status ON campaigns(status, id)')
  const read = db.transaction((requestedPage, search) => {
    const searchPattern = search
      ? '%' + search.replace(/[\\%_]/g, character => '\\' + character) + '%'
      : ''
    const searchClause = search
      ? " AND (title LIKE ? ESCAPE '\\' COLLATE NOCASE OR description LIKE ? ESCAPE '\\' COLLATE NOCASE)"
      : ''
    const searchParameters = search ? [searchPattern, searchPattern] : []
    const { total } = db.query("SELECT COUNT(*) AS total FROM campaigns WHERE status = 'Activa'" + searchClause)
      .get(...searchParameters)
    const pageSize = 25
    const totalPages = Math.ceil(total / pageSize)
    const page = Math.min(requestedPage, Math.max(1, totalPages))
    const rows = db.query(`SELECT id, owner_id, title, category, goal_cents, raised_cents, status
      FROM campaigns WHERE status = 'Activa'${searchClause} ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(...searchParameters, pageSize, (page - 1) * pageSize)
    return {
      campaigns: rows.map(row => ({
        ...row,
        imageUrl: '/api/campaigns/' + row.id + '/image',
        fundingPercentage: fundingPercentage(row.raised_cents, row.goal_cents),
      })),
      pagination: { page, pageSize, total, totalPages },
    }
  })
  return request => {
    const parameters = new URL(request.url).searchParams
    const value = parameters.get('page') ?? '1'
    const page = Number(value)
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(page) || page < 1) {
      return Response.json({ error: 'La página debe ser un número entero mayor a 0.' }, { status: 400 })
    }
    const search = (parameters.get('q') ?? '').trim()
    if (search.length > 120) {
      return Response.json({ error: 'La búsqueda no puede superar los 120 caracteres.' }, { status: 400 })
    }
    return Response.json(read(page, search), { headers: { 'Cache-Control': 'no-store' } })
  }
}

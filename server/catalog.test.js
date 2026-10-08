import { afterEach, beforeEach, expect, test } from 'bun:test'
import { createApp } from './app.js'
import { fundingPercentage } from '../shared/campaign.js'
import { createCatalog } from './catalog.js'
import { Database } from 'bun:sqlite'

let app
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII='), char => char.charCodeAt(0))
const token = 'catalog-session'
beforeEach(() => {
  app = createApp(':memory:')
  app.db.query('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(1, 'Lector', 'lector@example.test', 'fixture')
  app.db.query('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(2, 'Otro creador', 'creador@example.test', 'fixture')
  const hash = new Bun.CryptoHasher('sha256').update(token).digest('hex')
  app.db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hash, 1, Date.now() + 60_000)
})
afterEach(() => app.close())

function seed(status = 'Activa', ownerId = 2, raised = 0, goal = 100000, overrides = {}) {
  const result = app.db.query(`INSERT INTO campaigns
    (owner_id, title, description, category, image, image_type, goal_cents, raised_cents, deadline, status, creation_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(ownerId, overrides.title ?? 'Proyecto ' + crypto.randomUUID(), overrides.description ?? 'Descripción del proyecto.',
      overrides.category ?? 'Comunidad', png, 'image/png', goal, raised, '2099-12-31', status, crypto.randomUUID())
  return Number(result.lastInsertRowid)
}
function get(path = '/api/campaigns/catalog', signedIn = true) {
  return app.fetch(new Request('http://localhost:3000' + path, { headers: signedIn ? { Cookie: 'session=' + token } : {} }))
}

test('el catálogo incluye solo activas de todos los usuarios y el total coincide', async () => {
  const own = seed('Activa', 1)
  const other = seed('Activa', 2)
  seed('Borrador', 1)
  seed('Borrador', 2)
  const response = await get()
  expect(response.status).toBe(200)
  const { campaigns, pagination } = await response.json()
  expect(campaigns.map(row => row.id)).toEqual([other, own])
  expect(campaigns.every(row => row.status === 'Activa')).toBe(true)
  expect(pagination).toEqual({ page: 1, pageSize: 25, total: 2, totalPages: 1 })
  expect(pagination.total).toBe(app.db.query("SELECT COUNT(*) AS count FROM campaigns WHERE status = 'Activa'").get().count)
})

test('paginación de 25 sin omitir ni repetir campañas y con orden estable', async () => {
  const ids = []
  for (let i = 0; i < 61; i++) ids.push(seed('Activa', i % 2 ? 1 : 2))
  for (let i = 0; i < 7; i++) seed('Borrador')
  const pages = []
  for (let page = 1; page <= 3; page++) pages.push(await (await get('/api/campaigns/catalog?page=' + page)).json())
  expect(pages.map(result => result.campaigns.length)).toEqual([25, 25, 11])
  expect(pages.every(result => result.pagination.total === 61 && result.pagination.totalPages === 3)).toBe(true)
  const visible = pages.flatMap(result => result.campaigns.map(row => row.id))
  expect(visible).toEqual(ids.reverse())
  expect(new Set(visible).size).toBe(61)
})

test('cada tarjeta recibe título, imagen, meta y porcentaje de financiamiento', async () => {
  seed('Activa', 2, 0, 100000)
  seed('Activa', 1, 25000, 100000)
  seed('Activa', 2, 150000, 100000)
  const { campaigns } = await (await get()).json()
  expect(campaigns.map(row => row.fundingPercentage)).toEqual([150, 25, 0])
  for (const row of campaigns) {
    expect(row.title.length).toBeGreaterThan(0)
    expect(row.goal_cents).toBeGreaterThan(0)
    expect(row.imageUrl).toBe('/api/campaigns/' + row.id + '/image')
    expect(typeof row.fundingPercentage).toBe('number')
    const image = await get(row.imageUrl)
    expect(image.status).toBe(200)
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(png)
  }
  expect(fundingPercentage(1, 3)).toBe(33.33)
})

test('sin activas devuelve una lista vacía y total cero incluso si hay borradores', async () => {
  seed('Borrador')
  const result = await (await get()).json()
  expect(result.campaigns).toEqual([])
  expect(result.pagination).toEqual({ page: 1, pageSize: 25, total: 0, totalPages: 0 })
})

test('busca coincidencias parciales en título y descripción sin distinguir mayúsculas', async () => {
  const titleMatch = seed('Activa', 2, 0, 100000, { title: 'Huerto Urbano', description: 'Cultivos locales' })
  const descriptionMatch = seed('Activa', 2, 0, 100000, { title: 'Biblioteca vecinal', description: 'Un HUERTO educativo' })
  seed('Activa', 2, 0, 100000, { title: 'Festival de arte', description: 'Música comunitaria' })
  seed('Borrador', 2, 0, 100000, { title: 'Huerto privado' })
  const response = await get('/api/campaigns/catalog?q=huerto')
  expect(response.status).toBe(200)
  const result = await response.json()
  expect(result.campaigns.map(row => row.id)).toEqual([descriptionMatch, titleMatch])
  expect(result.pagination).toEqual({ page: 1, pageSize: 25, total: 2, totalPages: 1 })
})

test('una búsqueda sin coincidencias devuelve grilla vacía y total cero', async () => {
  seed('Activa', 2, 0, 100000, { title: 'Energía solar', description: 'Paneles para la escuela' })
  const startedAt = performance.now()
  const result = await (await get('/api/campaigns/catalog?q=teatro')).json()
  expect(performance.now() - startedAt).toBeLessThan(1000)
  expect(result.campaigns).toEqual([])
  expect(result.pagination).toEqual({ page: 1, pageSize: 25, total: 0, totalPages: 0 })
})

test('la búsqueda conserva paginación, recorta espacios y trata comodines como texto', async () => {
  for (let index = 0; index < 27; index++) {
    seed('Activa', 2, 0, 100000, { title: `Coincidencia ${index}`, description: 'Descripción común' })
  }
  seed('Activa', 2, 0, 100000, { title: 'Cien % real', description: 'Símbolo literal' })
  seed('Activa', 2, 0, 100000, { title: 'Otro proyecto', description: 'Sin el símbolo' })
  const secondPage = await (await get('/api/campaigns/catalog?page=2&q=%20%20coincidencia%20%20')).json()
  expect(secondPage.campaigns).toHaveLength(2)
  expect(secondPage.pagination).toEqual({ page: 2, pageSize: 25, total: 27, totalPages: 2 })
  const literal = await (await get('/api/campaigns/catalog?q=%25')).json()
  expect(literal.campaigns.map(row => row.title)).toEqual(['Cien % real'])
})

test('rechaza términos de búsqueda que superan el máximo permitido', async () => {
  const response = await get('/api/campaigns/catalog?q=' + 'a'.repeat(121))
  expect(response.status).toBe(400)
  expect((await response.json()).error).toContain('120 caracteres')
})

test('valida páginas y normaliza solicitudes fuera del rango', async () => {
  seed()
  for (const value of ['0', '-1', 'abc', '1.5', 'Infinity', '9007199254740992']) {
    expect((await get('/api/campaigns/catalog?page=' + value)).status).toBe(400)
  }
  const result = await (await get('/api/campaigns/catalog?page=999')).json()
  expect(result.pagination.page).toBe(1)
  expect(result.campaigns).toHaveLength(1)
})

test('consultar el catálogo requiere sesión', async () => {
  seed()
  expect((await get('/api/campaigns/catalog', false)).status).toBe(401)
})

test('permite el detalle activo ajeno pero conserva privados los borradores', async () => {
  const active = seed('Activa', 2)
  const draft = seed('Borrador', 2)
  expect((await get('/api/campaigns/' + active)).status).toBe(200)
  expect((await get('/api/campaigns/' + active + '/image')).status).toBe(200)
  expect((await get('/api/campaigns/' + draft)).status).toBe(404)
  expect((await get('/api/campaigns/' + draft + '/image')).status).toBe(404)
  const activation = await app.fetch(new Request('http://localhost:3000/api/campaigns/' + active + '/activate', {
    method: 'POST', headers: { Cookie: 'session=' + token, Origin: 'http://localhost:5173' },
  }))
  expect(activation.status).toBe(404)
})

test('Mis campañas sigue mostrando únicamente las propias en sus distintos estados', async () => {
  const draft = seed('Borrador', 1)
  const active = seed('Activa', 1)
  seed('Activa', 2)
  const { campaigns } = await (await get('/api/campaigns')).json()
  expect(campaigns.map(row => row.id)).toEqual([active, draft])
})

test('el filtro excluye otros estados como Finalizada', () => {
  // Isolated schema allows future states without adding a finalization feature.
  const db = new Database(':memory:')
  try {
    db.exec(`CREATE TABLE campaigns (
      id INTEGER PRIMARY KEY, owner_id INTEGER, title TEXT, category TEXT,
      goal_cents INTEGER, raised_cents INTEGER, status TEXT
    )`)
    for (const status of ['Activa', 'Finalizada', 'Borrador', 'Cancelada']) {
      db.query('INSERT INTO campaigns (owner_id, title, category, goal_cents, raised_cents, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(1, status, 'Comunidad', 10000, 0, status)
    }
    const response = createCatalog(db)(new Request('http://localhost:3000/api/campaigns/catalog'))
    return response.json().then(result => {
      expect(result.pagination.total).toBe(1)
      expect(result.campaigns.map(row => row.title)).toEqual(['Activa'])
    }).finally(() => db.close())
  } catch (error) {
    db.close()
    throw error
  }
})

test('la actualización agrega financiamiento a bases existentes conservando datos', () => {
  const db = new Database(':memory:')
  try {
    db.exec(`CREATE TABLE campaigns (
      id INTEGER PRIMARY KEY, owner_id INTEGER, title TEXT, category TEXT,
      goal_cents INTEGER, status TEXT
    )`)
    db.query("INSERT INTO campaigns VALUES (1, 2, 'Proyecto existente', 'Comunidad', 10000, 'Activa')").run()
    const catalog = createCatalog(db)
    expect(db.query('SELECT raised_cents FROM campaigns WHERE id = 1').get().raised_cents).toBe(0)
    return catalog(new Request('http://localhost:3000/api/campaigns/catalog')).json().then(result => {
      expect(result.campaigns[0].title).toBe('Proyecto existente')
      expect(result.campaigns[0].fundingPercentage).toBe(0)
    }).finally(() => db.close())
  } catch (error) {
    db.close()
    throw error
  }
})

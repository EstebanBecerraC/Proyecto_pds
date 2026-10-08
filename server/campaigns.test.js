import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { createApp } from './app.js'
import { CATEGORIES, goalToCents, validateCampaign } from '../shared/campaign.js'

const app = createApp(':memory:')
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII='), char => char.charCodeAt(0))
let ownerCookie
let otherCookie
const data = { title: 'Huerto comunitario', description: 'Un espacio para cultivar en comunidad.', category: CATEGORIES[0], goal: '150000', deadline: '2099-12-31' }

async function createUser(application, email) {
  const body = { name: 'Persona de prueba', email, password: 'Clave-segura-123' }
  const send = route => application.fetch(new Request('http://localhost:3000/api/auth/' + route, {
    method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }))
  expect((await send('register')).status).toBe(201)
  const login = await send('login')
  expect(login.status).toBe(200)
  return login.headers.get('set-cookie').split(';')[0]
}
beforeAll(async () => {
  ownerCookie = await createUser(app, 'owner@example.test')
  otherCookie = await createUser(app, 'other@example.test')
})
beforeEach(() => { app.db.query('DELETE FROM campaigns').run() })
afterAll(() => app.close())

function form(overrides = {}, image = new File([png], 'imagen.png', { type: 'image/png' }), creationKey = crypto.randomUUID()) {
  const body = new FormData()
  for (const [key, value] of Object.entries({ ...data, ...overrides })) body.append(key, value)
  if (image) body.append('image', image)
  body.append('creationKey', creationKey)
  return body
}
function send(body, { application = app, cookie = ownerCookie, origin = 'http://localhost:5173' } = {}) {
  return application.fetch(new Request('http://localhost:3000/api/campaigns', {
    method: 'POST', headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body,
  }))
}
function get(path = '', cookie = ownerCookie, application = app) {
  return application.fetch(new Request('http://localhost:3000/api/campaigns' + path, { headers: cookie ? { Cookie: cookie } : {} }))
}
const count = () => app.db.query('SELECT COUNT(*) AS total FROM campaigns').get().total

test('cada campo vacío muestra Campo requerido y no crea campañas', async () => {
  const blank = { title: ' ', description: '', category: '', goal: '', deadline: '' }
  const response = await send(form(blank, null))
  expect(response.status).toBe(422)
  const result = await response.json()
  expect(result.errors).toEqual({
    title: 'Campo requerido', description: 'Campo requerido', category: 'Campo requerido',
    goal: 'Campo requerido', deadline: 'Campo requerido', image: 'Campo requerido',
  })
  for (const field of Object.keys(blank)) {
    const invalid = await send(form({ [field]: '   ' }))
    expect(invalid.status).toBe(422)
    expect((await invalid.json()).errors[field]).toBe('Campo requerido')
  }
  expect(count()).toBe(0)
})

test('metas cero, negativas, texto y no finitas se rechazan sin insertar', async () => {
  for (const goal of ['0', '-100', 'texto', 'NaN', 'Infinity', '1e3', '0.00', '999999999999999999999']) {
    const response = await send(form({ goal }))
    expect(response.status).toBe(422)
    expect((await response.json()).errors.goal).toContain('número mayor a 0')
    expect(count()).toBe(0)
  }
})

test('la validación del navegador detecta campos vacíos y metas inválidas', () => {
  expect(Object.values(validateCampaign({}, null))).toEqual(Array(6).fill('Campo requerido'))
  expect(validateCampaign({ ...data, goal: 'abc' }, { size: 1, type: 'image/png' }).goal).toContain('número mayor a 0')
  expect(goalToCents('0,01')).toBe(1)
  expect(goalToCents('1250.50')).toBe(125050)
})

test('crea un borrador del usuario autenticado e ignora estado o dueño enviados', async () => {
  const response = await send(form({ status: 'Publicada', owner_id: '999' }))
  expect(response.status).toBe(201)
  const { campaign } = await response.json()
  expect(campaign.status).toBe('Borrador')
  expect(campaign.title).toBe(data.title)
  expect(campaign.goal_cents).toBe(15000000)
  expect(campaign.owner_id).toBe(app.db.query('SELECT id FROM users WHERE email = ?').get('owner@example.test').id)
  const summary = await get('/' + campaign.id)
  expect(await summary.json()).toEqual({ campaign })
  const image = await get('/' + campaign.id + '/image')
  expect(image.headers.get('content-type')).toBe('image/png')
  expect(new Uint8Array(await image.arrayBuffer())).toEqual(png)
  expect(count()).toBe(1)
})

test('reintentar el mismo guardado no crea dos campañas', async () => {
  const key = crypto.randomUUID()
  const first = await send(form({}, undefined, key))
  const second = await send(form({}, undefined, key))
  expect(first.status).toBe(201)
  expect(second.status).toBe(200)
  expect((await first.json()).campaign.id).toBe((await second.json()).campaign.id)
  expect(count()).toBe(1)
})

test('rechaza categorías y fechas inválidas', async () => {
  for (const overrides of [{ category: 'Inventada' }, { deadline: '2000-01-01' }, { deadline: '2099-02-30' }, { deadline: 'mañana' }]) {
    expect((await send(form(overrides))).status).toBe(422)
  }
  expect(count()).toBe(0)
})

test('rechaza imágenes inexistentes, vacías, grandes o de contenido incompatible', async () => {
  for (const image of [
    null,
    new File([], 'vacia.png', { type: 'image/png' }),
    new File(['texto'], 'falsa.png', { type: 'image/png' }),
    new File(['<svg />'], 'vector.svg', { type: 'image/svg+xml' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }),
  ]) {
    const response = await send(form({}, image))
    expect(response.status).toBe(422)
    expect((await response.json()).errors.image).toBeDefined()
  }
  expect(count()).toBe(0)
})

test('los borradores y sus imágenes solo son accesibles por su creador', async () => {
  const { campaign } = await (await send(form())).json()
  expect((await get('/' + campaign.id, otherCookie)).status).toBe(404)
  expect((await get('/' + campaign.id + '/image', otherCookie)).status).toBe(404)
  expect((await (await get('', otherCookie)).json()).campaigns).toHaveLength(0)
  expect((await (await get()).json()).campaigns).toHaveLength(1)
})

test('rechaza creación sin sesión y peticiones desde otros orígenes', async () => {
  expect((await send(form(), { cookie: null })).status).toBe(401)
  expect((await get('', null)).status).toBe(401)
  expect((await send(form(), { origin: 'https://otro.example' })).status).toBe(403)
  expect(count()).toBe(0)
})

test('rechaza un cuerpo mal formado sin modificar la base', async () => {
  const response = await app.fetch(new Request('http://localhost:3000/api/campaigns', {
    method: 'POST', headers: { Origin: 'http://localhost:5173', Cookie: ownerCookie, 'Content-Type': 'application/json' }, body: '{}',
  }))
  expect(response.status).toBe(400)
  expect(count()).toBe(0)
})

test('la campaña y su imagen persisten al volver a abrir SQLite', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const directory = mkdtempSync(join(tmpdir(), 'pds-campaign-test-'))
  const path = join(directory, 'test.sqlite')
  let persistent
  try {
    persistent = createApp(path)
    const cookie = await createUser(persistent, 'persistent@example.test')
    const { campaign } = await (await send(form(), { application: persistent, cookie })).json()
    const activated = await persistent.fetch(new Request('http://localhost:3000/api/campaigns/' + campaign.id + '/activate', {
      method: 'POST', headers: { Origin: 'http://localhost:5173', Cookie: cookie },
    }))
    expect(activated.status).toBe(200)
    persistent.close()
    persistent = createApp(path)
    const restored = await get('/' + campaign.id, cookie, persistent)
    expect((await restored.json()).campaign.status).toBe('Activa')
    const image = await get('/' + campaign.id + '/image', cookie, persistent)
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(png)
  } finally {
    persistent?.close()
    rmSync(directory, { recursive: true, force: true })
  }
})

function activate(id, cookie = ownerCookie, origin = 'http://localhost:5173') {
  return app.fetch(new Request('http://localhost:3000/api/campaigns/' + id + '/activate', {
    method: 'POST', headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
  }))
}

test('el creador activa su borrador y puede reintentar sin duplicarlo', async () => {
  const { campaign } = await (await send(form())).json()
  expect(campaign.status).toBe('Borrador')
  const activated = await activate(campaign.id)
  expect(activated.status).toBe(200)
  expect((await activated.json()).campaign.status).toBe('Activa')
  const { campaign: saved } = await (await get('/' + campaign.id)).json()
  expect(saved).toEqual({ ...campaign, status: 'Activa' })
  expect((await activate(campaign.id)).status).toBe(200)
  expect(count()).toBe(1)
  expect((await (await get()).json()).campaigns[0].status).toBe('Activa')
})

test('rechaza activación ajena, sin sesión o desde otro origen', async () => {
  const { campaign } = await (await send(form())).json()
  expect((await activate(campaign.id, otherCookie)).status).toBe(404)
  expect((await activate(campaign.id, null)).status).toBe(401)
  expect((await activate(campaign.id, ownerCookie, 'https://otro.example')).status).toBe(403)
  expect((await activate(999999)).status).toBe(404)
  expect((await (await get('/' + campaign.id)).json()).campaign.status).toBe('Borrador')
})

test('migra campañas antiguas sin perder sus datos y permite activarlas', async () => {
  const { createAuth } = await import('./auth.js')
  const { createCampaignApi } = await import('./campaigns.js')
  const legacy = createAuth(':memory:')
  try {
    const cookie = await createUser(legacy, 'legacy@example.test')
    const oldSchema = app.db.query("SELECT sql FROM sqlite_master WHERE name = 'campaigns'").get().sql
      .replace("CHECK(status IN ('Borrador', 'Activa'))", "CHECK(status = 'Borrador')")
    legacy.db.exec(oldSchema)
    legacy.db.query(`INSERT INTO campaigns
      (id, owner_id, title, description, category, image, image_type, goal_cents, deadline, creation_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(42, 1, data.title, data.description, data.category, png, 'image/png', 15000000, data.deadline, crypto.randomUUID())
    const before = legacy.db.query('SELECT * FROM campaigns').get()
    const handle = createCampaignApi(legacy.db, legacy.getUser)
    expect(legacy.db.query('SELECT * FROM campaigns').get()).toEqual(before)
    const response = await handle(new Request('http://localhost:3000/api/campaigns/42/activate', {
      method: 'POST', headers: { Origin: 'http://localhost:5173', Cookie: cookie },
    }))
    expect(response.status).toBe(200)
    expect((await response.json()).campaign.status).toBe('Activa')
    createCampaignApi(legacy.db, legacy.getUser)
    expect(legacy.db.query('SELECT status FROM campaigns WHERE id = 42').get().status).toBe('Activa')
    expect(legacy.db.query('PRAGMA foreign_key_check').all()).toEqual([])
  } finally { legacy.close() }
})

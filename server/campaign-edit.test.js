import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { createApp } from './app.js'

const app = createApp(':memory:')
const origin = 'http://localhost:5173'
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII='), char => char.charCodeAt(0))
const original = { title: 'Huerto', description: 'Cultivar en comunidad.', category: 'Comunidad', goal: '150000', deadline: '2099-12-31' }
const updated = { title: 'Huerto actualizado', description: 'Nueva descripción.', category: 'Educación', goal: '250000.50', deadline: '2099-11-30' }
let ownerCookie, otherCookie, campaignId

async function user(email) {
  const body = JSON.stringify({ name: 'Persona de prueba', email, password: 'Clave-segura-123' })
  const send = route => app.fetch(new Request('http://localhost:3000/api/auth/' + route, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body,
  }))
  expect((await send('register')).status).toBe(201)
  return (await send('login')).headers.get('set-cookie').split(';')[0]
}
function form(values = updated, image) {
  const body = new FormData()
  for (const [field, value] of Object.entries(values)) body.append(field, value)
  if (image !== undefined) body.append('image', image)
  return body
}
function editRequest(body = form(), cookie = ownerCookie, requestOrigin = origin, id = campaignId) {
  return new Request('http://localhost:3000/api/campaigns/' + id, {
    method: 'PUT', headers: { Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}) }, body,
  })
}
const row = () => app.db.query('SELECT * FROM campaigns WHERE id = ?').get(campaignId)

beforeAll(async () => {
  ownerCookie = await user('edit-owner@example.test')
  otherCookie = await user('edit-other@example.test')
})
beforeEach(async () => {
  app.db.exec('DELETE FROM contributions; DELETE FROM campaigns;')
  const body = form(original, new File([png], 'imagen.png', { type: 'image/png' }))
  body.append('creationKey', crypto.randomUUID())
  const response = await app.fetch(new Request('http://localhost:3000/api/campaigns', {
    method: 'POST', headers: { Origin: origin, Cookie: ownerCookie }, body,
  }))
  expect(response.status).toBe(201)
  campaignId = (await response.json()).campaign.id
})
afterAll(() => app.close())

test('HU05: el creador modifica los campos y conserva imagen, dueño, estado y fecha de creación', async () => {
  const before = row()
  const response = await app.fetch(editRequest())
  expect(response.status).toBe(200)
  const { campaign } = await response.json()
  expect(campaign).toMatchObject({ id: campaignId, title: updated.title, description: updated.description,
    category: updated.category, goal_cents: 25000050, deadline: updated.deadline,
    status: 'Borrador', owner_id: before.owner_id, raised_cents: 0, created_at: before.created_at })
  expect(row().image).toEqual(before.image)
  expect(row().creation_key).toBe(before.creation_key)
  expect(app.db.query('SELECT COUNT(*) AS total FROM campaigns').get().total).toBe(1)
})

test('HU05: permite reemplazar una imagen válida', async () => {
  const jpeg = new File([Uint8Array.from([255, 216, 255, 224])], 'nueva.jpg', { type: 'image/jpeg' })
  expect((await app.fetch(editRequest(form(updated, jpeg)))).status).toBe(200)
  expect(row().image_type).toBe('image/jpeg')
  expect(row().image).toEqual(new Uint8Array(await jpeg.arrayBuffer()))
})

test('HU05: otro usuario no puede editar un borrador ni una campaña activa', async () => {
  for (const status of ['Borrador', 'Activa']) {
    app.db.query('UPDATE campaigns SET status = ? WHERE id = ?').run(status, campaignId)
    const before = row()
    expect((await app.fetch(editRequest(form(), otherCookie))).status).toBe(404)
    expect(row()).toEqual(before)
  }
})

test('HU05: rechaza la edición del creador en estado Activa o Cancelada', async () => {
  for (const status of ['Activa', 'Cancelada']) {
    app.db.query('UPDATE campaigns SET status = ? WHERE id = ?').run(status, campaignId)
    const before = row()
    expect((await app.fetch(editRequest())).status).toBe(409)
    expect(row()).toEqual(before)
  }
})

test('HU05: rechaza sesión ausente, otro origen y campaña inexistente sin modificar datos', async () => {
  const before = row()
  expect((await app.fetch(editRequest(form(), null))).status).toBe(401)
  expect((await app.fetch(editRequest(form(), ownerCookie, 'https://otro.example'))).status).toBe(403)
  expect((await app.fetch(editRequest(form(), ownerCookie, origin, 999999))).status).toBe(404)
  expect(row()).toEqual(before)
})

test('HU05: valida campos vacíos, meta, categoría y fecha sin cambios parciales', async () => {
  const before = row()
  for (const invalid of [{ title: '' }, { description: '' }, { category: '' }, { goal: '' }, { deadline: '' },
    { goal: '0' }, { goal: '-1' }, { goal: 'texto' }, { category: 'Inventada' },
    { deadline: '2000-01-01' }, { deadline: '2099-02-30' }]) {
    expect((await app.fetch(editRequest(form({ ...updated, ...invalid })))).status).toBe(422)
    expect(row()).toEqual(before)
  }
})

test('HU05: valida una imagen nueva vacía, falsa, muy grande o de tipo no admitido', async () => {
  const before = row()
  for (const image of [new File([], 'vacia.png', { type: 'image/png' }),
    new File(['texto'], 'falsa.png', { type: 'image/png' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }),
    new File(['<svg/>'], 'imagen.svg', { type: 'image/svg+xml' }), 'imagen.png']) {
    const response = await app.fetch(editRequest(form(updated, image)))
    expect(response.status).toBe(422)
    expect((await response.json()).errors.image).toBeDefined()
    expect(row()).toEqual(before)
  }
})

test('HU05: rechaza un cuerpo mal formado sin modificar el borrador', async () => {
  const before = row()
  const request = editRequest('{}')
  request.headers.set('Content-Type', 'application/json')
  expect((await app.fetch(request)).status).toBe(400)
  expect(row()).toEqual(before)
})

test('HU05: ignora intentos de modificar dueño, estado y recaudación', async () => {
  const before = row()
  expect((await app.fetch(editRequest(form({ ...updated, owner_id: '999', status: 'Activa', raised_cents: '9999' })))).status).toBe(200)
  expect(row()).toMatchObject({ owner_id: before.owner_id, status: 'Borrador', raised_cents: 0 })
})

test('HU05: no modifica una campaña activada mientras se procesa el formulario', async () => {
  const request = editRequest()
  const readForm = request.formData.bind(request)
  request.formData = async () => {
    const body = await readForm()
    app.db.query("UPDATE campaigns SET status = 'Activa' WHERE id = ?").run(campaignId)
    return body
  }
  expect((await app.fetch(request)).status).toBe(409)
  expect(row()).toMatchObject({ title: original.title, status: 'Activa' })
})

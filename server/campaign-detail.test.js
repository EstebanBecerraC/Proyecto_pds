import { afterEach, beforeEach, expect, setSystemTime, test } from 'bun:test'
import { createApp } from './app.js'
import { daysRemaining, formatDeadline, formatGoal, todayInChile } from '../shared/campaign.js'

let app, campaignId
const origin = 'http://localhost:5173'
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII='), character => character.charCodeAt(0))
const title = 'Campaña con tildes, ñ y símbolos <>&'
const description = 'Primer párrafo con tildes y ñ.\n\n' + 'Descripción completa. '.repeat(400) + '\nÚltima línea: <script>texto literal</script> & sin recortes.'

beforeEach(() => {
  app = createApp(':memory:')
  for (const [id, name] of [[1, 'María Creadora'], [2, 'Persona interesada']]) {
    app.db.query('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
      .run(id, name, `usuario${id}@example.test`, 'hash-privado')
    app.db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(new Bun.CryptoHasher('sha256').update('detail-session-' + id).digest('hex'), id, Date.now() + 60_000)
  }
  const result = app.db.query(`INSERT INTO campaigns
    (owner_id, title, description, category, image, image_type, goal_cents, raised_cents, deadline, status, creation_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(1, title, description, 'Educación', png, 'image/png', 25000050, 12500000,
      '2099-12-31', 'Activa', crypto.randomUUID())
  campaignId = Number(result.lastInsertRowid)
})
afterEach(() => { setSystemTime(); app.close() })

function request(path = '/api/campaigns/' + campaignId, userId = 2, options = {}) {
  return app.fetch(new Request('http://localhost:3000' + path, {
    ...options, headers: { Origin: origin, ...(userId ? { Cookie: 'session=detail-session-' + userId } : {}), ...options.headers },
  }))
}

test('HU03: el detalle devuelve exactamente todos los campos guardados y la descripción completa', async () => {
  const stored = app.db.query('SELECT * FROM campaigns WHERE id = ?').get(campaignId)
  const response = await request()
  expect(response.status).toBe(200)
  const { campaign } = await response.json()
  for (const field of ['id', 'owner_id', 'title', 'description', 'category', 'goal_cents', 'raised_cents', 'deadline', 'status', 'created_at']) {
    expect(campaign[field]).toEqual(stored[field])
  }
  expect(campaign.description.length).toBe(description.length)
  expect(campaign.creator_name).toBe('María Creadora')
  expect(campaign.imageUrl).toBe(`/api/campaigns/${campaignId}/image`)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
})

test('HU03: la imagen del detalle coincide byte a byte con la imagen original', async () => {
  const { campaign } = await (await request()).json()
  const response = await request(campaign.imageUrl)
  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('image/png')
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(png)
})

test('HU03: muestra el creador real de la campaña y no los datos privados de su cuenta', async () => {
  const { campaign } = await (await request()).json()
  expect(campaign.owner_id).toBe(1)
  expect(campaign.creator_name).toBe('María Creadora')
  expect(campaign.creator_name).not.toBe('Persona interesada')
  expect(campaign).not.toHaveProperty('email')
  expect(campaign).not.toHaveProperty('password_hash')
  expect(campaign).not.toHaveProperty('creation_key')
})

test('HU03: el detalle conserva el estado exacto Borrador, Activa o Cancelada', async () => {
  for (const status of ['Borrador', 'Activa', 'Cancelada']) {
    app.db.query('UPDATE campaigns SET status = ? WHERE id = ?').run(status, campaignId)
    const response = await request(undefined, 1)
    expect(response.status).toBe(200)
    expect((await response.json()).campaign.status).toBe(status)
  }
})

test('HU03: otro usuario puede ver una activa, pero no un borrador o una cancelada', async () => {
  expect((await request()).status).toBe(200)
  for (const status of ['Borrador', 'Cancelada']) {
    app.db.query('UPDATE campaigns SET status = ? WHERE id = ?').run(status, campaignId)
    expect((await request()).status).toBe(404)
    expect((await request(`/api/campaigns/${campaignId}/image`)).status).toBe(404)
  }
})

test('HU03: el detalle y su imagen requieren una sesión válida', async () => {
  for (const path of [`/api/campaigns/${campaignId}`, `/api/campaigns/${campaignId}/image`]) {
    expect((await request(path, null)).status).toBe(401)
    app.db.query('UPDATE sessions SET expires_at = 0 WHERE user_id = 2').run()
    expect((await request(path)).status).toBe(401)
  }
})

test('HU03: una campaña inexistente devuelve un error sin datos de otra campaña', async () => {
  const response = await request('/api/campaigns/999999')
  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({ error: 'Campaña no encontrada.' })
})

test('HU03: el flujo de aporte actualiza el detalle y conserva los datos de creación', async () => {
  const before = (await (await request()).json()).campaign
  const response = await request(`/api/campaigns/${campaignId}/contributions`, 2, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: '10000' }),
  })
  expect(response.status).toBe(201)
  const after = (await (await request()).json()).campaign
  expect(after.raised_cents).toBe(before.raised_cents + 1000000)
  for (const field of ['title', 'description', 'creator_name', 'category', 'goal_cents', 'deadline', 'status', 'created_at', 'imageUrl']) {
    expect(after[field]).toEqual(before[field])
  }
})

test('HU03: los montos conservan sus decimales y la fecha se muestra sin cambio de día', () => {
  expect(formatGoal(25000050)).toBe('$250.000,5')
  expect(formatGoal(12500000)).toBe('$125.000')
  expect(formatDeadline('2099-12-31')).toBe('31 de diciembre de 2099')
})

test('HU03: calcula días de calendario, incluidos cambios de año, año bisiesto y horario de verano', () => {
  expect(daysRemaining('2027-01-01', '2026-12-31')).toBe(1)
  expect(daysRemaining('2028-03-01', '2028-02-28')).toBe(2)
  expect(daysRemaining('2026-09-07', '2026-09-05')).toBe(2)
  expect(daysRemaining('2026-04-06', '2026-04-04')).toBe(2)
})

test('HU03: el plazo de hoy o vencido muestra cero días y las fechas inválidas se rechazan', () => {
  expect(daysRemaining('2026-10-08', '2026-10-08')).toBe(0)
  expect(daysRemaining('2026-10-07', '2026-10-08')).toBe(0)
  for (const value of ['', 'texto', '2026-02-30']) expect(daysRemaining(value, '2026-10-08')).toBeNull()
})

test('HU03: usa la fecha de Chile cuando UTC ya está en el día siguiente', () => {
  setSystemTime(new Date('2026-01-01T02:00:00Z'))
  expect(todayInChile()).toBe('2025-12-31')
  expect(daysRemaining('2026-01-01')).toBe(1)
})

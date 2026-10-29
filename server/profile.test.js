import { afterEach, beforeEach, expect, test } from 'bun:test'
import { createApp } from './app.js'

let app
const origin = 'http://localhost:5173'
const first = { name: 'Persona Uno', email: 'uno@example.com', password: 'clave-segura-123' }
const second = { name: 'Persona Dos', email: 'dos@example.com', password: 'otra-clave-123' }

beforeEach(() => { app = createApp(':memory:') })
afterEach(() => app.close())

async function send(path, { method = 'GET', data, cookie, requestOrigin = origin } = {}) {
  const response = await app.fetch(new Request('http://localhost:3000' + path, {
    method,
    headers: {
      Origin: requestOrigin,
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  }))
  return response
}

async function register(credentials) {
  const response = await send('/api/auth/register', { method: 'POST', data: credentials })
  expect(response.status).toBe(201)
  return response.headers.get('set-cookie').split(';')[0]
}

async function body(response) {
  return response.status === 204 ? null : response.json()
}

test('HU09: consulta exclusivamente el perfil asociado a la sesión', async () => {
  const cookie = await register(first)
  await register(second)

  const response = await send('/api/profile', { cookie })
  expect(response.status).toBe(200)
  expect((await body(response)).profile).toMatchObject({ id: 1, name: first.name, email: first.email })
  expect((await send('/api/profile')).status).toBe(401)
})

test('HU09: actualiza nombre y correo normalizado y conserva los cambios', async () => {
  const cookie = await register(first)
  const response = await send('/api/profile', {
    method: 'PUT', cookie,
    data: { name: '  Nombre Actualizado  ', email: ' NUEVO@EXAMPLE.COM ' },
  })
  expect(response.status).toBe(200)
  expect((await body(response)).profile).toMatchObject({ name: 'Nombre Actualizado', email: 'nuevo@example.com' })
  expect(app.db.query('SELECT name, email FROM users WHERE id = 1').get())
    .toEqual({ name: 'Nombre Actualizado', email: 'nuevo@example.com' })
})

test('HU09: rechaza campos fuera de las reglas y correos de otra cuenta sin cambios parciales', async () => {
  const cookie = await register(first)
  await register(second)

  const invalid = await send('/api/profile', {
    method: 'PUT', cookie,
    data: { name: 'A', email: 'cambio@example.com' },
  })
  expect(invalid.status).toBe(422)
  expect((await body(invalid)).errors.name).toBe('El nombre debe tener entre 2 y 80 caracteres.')
  expect(app.db.query('SELECT name, email FROM users WHERE id = 1').get())
    .toEqual({ name: first.name, email: first.email })

  const duplicate = await send('/api/profile', {
    method: 'PUT', cookie,
    data: { name: 'Nombre nuevo', email: ' DOS@EXAMPLE.COM ' },
  })
  expect(duplicate.status).toBe(409)
  expect((await body(duplicate)).errors.email).toBe('Este correo ya está registrado')
  expect(app.db.query('SELECT name, email FROM users WHERE id = 1').get())
    .toEqual({ name: first.name, email: first.email })
})

test('HU09: cambia la contraseña con la contraseña actual y una confirmación coincidente', async () => {
  const cookie = await register(first)
  const changed = await send('/api/profile', {
    method: 'PUT', cookie,
    data: {
      name: first.name,
      email: first.email,
      currentPassword: first.password,
      newPassword: 'nueva-clave-456',
      confirmation: 'nueva-clave-456',
    },
  })
  expect(changed.status).toBe(200)

  expect((await send('/api/auth/login', { method: 'POST', data: first })).status).toBe(401)
  expect((await send('/api/auth/login', {
    method: 'POST', data: { email: first.email, password: 'nueva-clave-456' },
  })).status).toBe(200)
})

test('HU09: conserva la contraseña cuando la actual, longitud o confirmación no cumplen las reglas', async () => {
  const cookie = await register(first)
  for (const password of [
    { currentPassword: 'incorrecta-123', newPassword: 'nueva-clave-456', confirmation: 'nueva-clave-456' },
    { currentPassword: first.password, newPassword: 'corta-1', confirmation: 'corta-1' },
    { currentPassword: first.password, newPassword: 'nueva-clave-456', confirmation: 'otra-clave-456' },
  ]) {
    const response = await send('/api/profile', {
      method: 'PUT', cookie, data: { name: first.name, email: first.email, ...password },
    })
    expect(response.status).toBe(422)
  }
  expect((await send('/api/auth/login', { method: 'POST', data: first })).status).toBe(200)
})

function campaign(ownerId, status, key) {
  return app.db.query(`INSERT INTO campaigns
    (owner_id, title, description, category, image, image_type, goal_cents, deadline, status, creation_key)
    VALUES (?, 'Campaña', 'Descripción', 'Comunidad', ?, 'image/png', 100000, '2099-12-31', ?, ?)`)
    .run(ownerId, new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), status, key).lastInsertRowid
}

test('HU09: impide eliminar una cuenta que creó una campaña activa', async () => {
  const cookie = await register(first)
  campaign(1, 'Activa', 'active-campaign-01')

  const response = await send('/api/profile', { method: 'DELETE', cookie })
  expect(response.status).toBe(409)
  expect((await body(response)).error).toBe('Cancela tus campañas activas antes de eliminar la cuenta.')
  expect(app.db.query('SELECT deleted_at FROM users WHERE id = 1').get().deleted_at).toBeNull()
  expect((await send('/api/profile', { cookie })).status).toBe(200)
})

test('HU09: elimina la cuenta sin campañas activas y conserva sus aportes', async () => {
  const cookie = await register(first)
  await register(second)
  const campaignId = campaign(2, 'Activa', 'active-campaign-02')
  app.db.query('INSERT INTO contributions (campaign_id, user_id, amount_cents) VALUES (?, 1, 5000)').run(campaignId)

  const response = await send('/api/profile', { method: 'DELETE', cookie })
  expect(response.status).toBe(204)
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  expect(app.db.query('SELECT COUNT(*) AS count FROM contributions WHERE user_id = 1').get().count).toBe(1)
  expect(app.db.query('SELECT name, deleted_at FROM users WHERE id = 1').get().name).toBe('Usuario eliminado')
  expect(app.db.query('SELECT COUNT(*) AS count FROM sessions WHERE user_id = 1').get().count).toBe(0)
  expect((await send('/api/profile', { cookie })).status).toBe(401)
  expect((await send('/api/auth/login', { method: 'POST', data: first })).status).toBe(401)
})

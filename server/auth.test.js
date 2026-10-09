import { afterEach, beforeEach, expect, test } from 'bun:test'
import { createAuth } from './auth.js'

let auth
const credentials = { name: 'Persona Prueba', email: 'persona@example.com', password: 'clave-segura-123' }
beforeEach(() => { auth = createAuth(':memory:') })
afterEach(() => auth.close())

function request(path, data, cookie, origin = 'http://localhost:5173') {
  return auth.fetch(new Request('http://localhost:3000/api/auth/' + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data),
  }))
}
async function login() {
  await request('register', credentials)
  const response = await request('login', credentials)
  return response.headers.get('set-cookie').split(';')[0]
}

test('registra un usuario y guarda solo el hash de su contraseña', async () => {
  const response = await request('register', credentials)
  expect(response.status).toBe(201)
  const user = { id: 1, name: credentials.name, email: credentials.email }
  expect(await response.json()).toEqual({ user })
  const cookie = response.headers.get('set-cookie')
  expect(cookie).toContain('HttpOnly')
  expect(cookie).toContain('SameSite=Lax')
  expect(await (await request('me', undefined, cookie.split(';')[0])).json()).toEqual({ user })
  const row = auth.db.query('SELECT * FROM users').get()
  expect(row.password_hash).not.toBe(credentials.password)
  expect(await Bun.password.verify(credentials.password, row.password_hash)).toBe(true)
})

test('rechaza correos duplicados sin distinguir mayúsculas o espacios', async () => {
  await request('register', credentials)
  const response = await request('register', { ...credentials, email: ' PERSONA@example.com ' })
  expect(response.status).toBe(409)
  expect(await response.json()).toEqual({
    error: 'Este correo ya está registrado', fields: { email: 'Este correo ya está registrado' },
  })
  expect(response.headers.get('set-cookie')).toBeNull()
  expect(auth.db.query('SELECT COUNT(*) AS count FROM users').get().count).toBe(1)
  expect(auth.db.query('SELECT COUNT(*) AS count FROM sessions').get().count).toBe(1)
})

test('valida nombre, correo y contraseña en el servidor', async () => {
  for (const data of [{ ...credentials, name: 'A' }, { ...credentials, email: 'invalido' }, { ...credentials, password: '123' }, null]) {
    expect((await request('register', data)).status).toBe(400)
  }
})

test('permite login, recupera la sesión y la invalida al salir', async () => {
  const cookie = await login()
  const me = await request('me', undefined, cookie)
  expect(me.status).toBe(200)
  expect(await me.json()).toEqual({ user: { id: 1, name: credentials.name, email: credentials.email } })
  expect((await request('logout', {}, cookie)).headers.get('set-cookie')).toContain('Max-Age=0')
  expect((await request('me', undefined, cookie)).status).toBe(401)
})

test('no revela si una cuenta existe al rechazar credenciales', async () => {
  await request('register', credentials)
  const wrong = await request('login', { ...credentials, password: 'incorrecta-123' })
  const unknown = await request('login', { ...credentials, email: 'otra@example.com' })
  expect(wrong.status).toBe(401)
  expect(unknown.status).toBe(401)
  expect(await wrong.json()).toEqual(await unknown.json())
})

test('HU00A: rechaza contraseñas incorrectas cortas y largas con el mismo mensaje genérico', async () => {
  await request('register', credentials)
  for (const email of [credentials.email, 'otra@example.com', 'correo-invalido']) {
    for (const password of ['123', 'incorrecta-123', 'x'.repeat(129)]) {
      const response = await request('login', { email, password })
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'Correo o contraseña incorrectos' })
      expect(response.headers.get('set-cookie')).toBeNull()
    }
  }
  expect(auth.db.query('SELECT COUNT(*) AS count FROM sessions').get().count).toBe(1)
})

test('HU00A: indica cada campo obligatorio ausente sin generar una sesión', async () => {
  for (const [data, fields] of [
    [{}, { email: 'Campo obligatorio', password: 'Campo obligatorio' }],
    [{ email: '  ', password: '123' }, { email: 'Campo obligatorio' }],
    [{ email: credentials.email, password: '' }, { password: 'Campo obligatorio' }],
  ]) {
    const response = await request('login', data)
    expect(response.status).toBe(400)
    expect((await response.json()).fields).toEqual(fields)
    expect(response.headers.get('set-cookie')).toBeNull()
  }
  expect(auth.db.query('SELECT COUNT(*) AS count FROM sessions').get().count).toBe(0)
})

test('HU00B: el registro reemplaza la sesión anterior y normaliza el correo', async () => {
  const first = await request('register', credentials)
  const oldCookie = first.headers.get('set-cookie').split(';')[0]
  const response = await request('register', { ...credentials, name: 'Otra persona', email: ' OTRA@EXAMPLE.COM ' }, oldCookie)
  expect(response.status).toBe(201)
  const cookie = response.headers.get('set-cookie').split(';')[0]
  expect(cookie).not.toBe(oldCookie)
  expect((await request('me', undefined, oldCookie)).status).toBe(401)
  expect((await (await request('me', undefined, cookie)).json()).user.email).toBe('otra@example.com')
  expect(auth.db.query('SELECT COUNT(*) AS count FROM sessions').get().count).toBe(1)
})

test('HU00B: revierte el registro si falla la creación de la sesión', async () => {
  auth.db.exec(`CREATE TRIGGER reject_session BEFORE INSERT ON sessions
    BEGIN SELECT RAISE(ABORT, 'Fallo de sesión simulado'); END;`)
  const originalError = console.error
  console.error = () => {}
  let response
  try { response = await request('register', credentials) }
  finally { console.error = originalError }
  expect(response.status).toBe(500)
  expect(response.headers.get('set-cookie')).toBeNull()
  expect(auth.db.query('SELECT COUNT(*) AS count FROM users').get().count).toBe(0)
  expect(auth.db.query('SELECT COUNT(*) AS count FROM sessions').get().count).toBe(0)
})

test('rechaza sesiones ausentes, inventadas y vencidas', async () => {
  expect((await request('me')).status).toBe(401)
  expect((await request('me', undefined, 'session=inventada')).status).toBe(401)
  const cookie = await login()
  auth.db.query('UPDATE sessions SET expires_at = 0').run()
  expect((await request('me', undefined, cookie)).status).toBe(401)
})

test('protege las cookies y rechaza peticiones desde otros orígenes', async () => {
  await request('register', credentials)
  const response = await request('login', credentials)
  expect(response.headers.get('set-cookie')).toContain('HttpOnly')
  expect(response.headers.get('set-cookie')).toContain('SameSite=Lax')
  expect((await request('logout', {}, undefined, 'https://otro.example')).status).toBe(403)
})

test('limita intentos repetidos', async () => {
  for (let i = 0; i < 20; i++) await request('login', {})
  expect((await request('login', {})).status).toBe(429)
})

test('rechaza JSON mal formado', async () => {
  const response = await auth.fetch(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: '{',
  }))
  expect(response.status).toBe(400)
})

test('conserva usuarios y sesiones al volver a abrir SQLite', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const directory = mkdtempSync(join(tmpdir(), 'pds-auth-test-'))
  const path = join(directory, 'test.sqlite')
  let persistent
  try {
    persistent = createAuth(path)
    const send = (route, data, cookie) => persistent.fetch(new Request('http://localhost:3000/api/auth/' + route, {
      method: data ? 'POST' : 'GET',
      headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: data ? JSON.stringify(data) : undefined,
    }))
    const response = await send('register', credentials)
    expect(response.status).toBe(201)
    const cookie = response.headers.get('set-cookie').split(';')[0]
    persistent.close()
    persistent = createAuth(path)
    const me = await send('me', undefined, cookie)
    expect(me.status).toBe(200)
    expect((await me.json()).user.email).toBe(credentials.email)
  } finally {
    persistent?.close()
    // Only remove the temporary directory created by this test.
    rmSync(directory, { recursive: true, force: true })
  }
})


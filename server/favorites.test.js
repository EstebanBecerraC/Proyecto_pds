import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './app.js'

let app, owner, reader, third
const origin = 'http://localhost:5173'
async function send(path, cookie, method = 'GET', data, requestOrigin = origin) {
  return app.fetch(new Request('http://localhost:3000' + path, { method,
    headers: { Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}), ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: data === undefined ? undefined : JSON.stringify(data),
  }))
}
async function account(name) {
  const response = await send('/api/auth/register', null, 'POST', { name, email: name + '@example.test', password: 'Clave-segura-123' })
  expect(response.status).toBe(201)
  return response.headers.get('set-cookie').split(';')[0]
}
function campaign(status = 'Activa', title = 'Campaña favorita') {
  return Number(app.db.query(`INSERT INTO campaigns
    (owner_id, title, description, category, image, image_type, goal_cents, deadline, status, creation_key)
    VALUES (1, ?, 'Descripción', 'Comunidad', ?, 'image/png', 100000, '2099-12-31', ?, ?)`)
    .run(title, new Uint8Array([137,80,78,71,13,10,26,10]), status, crypto.randomUUID()).lastInsertRowid)
}
async function list(cookie = reader) { return (await (await send('/api/favorites', cookie)).json()).campaigns }
beforeEach(async () => {
  app = createApp(':memory:')
  owner = await account('Creadora'); reader = await account('Lectora'); third = await account('Tercera')
})
afterEach(() => app.close())

test('HU10: lista vacía y estado inicial sin guardar', async () => {
  const id = campaign()
  expect(await list()).toEqual([])
  const response = await send('/api/favorites/' + id, reader)
  expect(await response.json()).toEqual({ favorite: false })
  expect(response.headers.get('cache-control')).toBe('no-store')
})

test('HU10: guarda activas ajenas y propias sin duplicar al reintentar', async () => {
  const id = campaign()
  for (const cookie of [reader, owner]) for (let i = 0; i < 2; i++) {
    const response = await send('/api/favorites/' + id, cookie, 'PUT', { user_id: 3 })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ favorite: true })
  }
  expect(app.db.query('SELECT COUNT(*) AS n FROM favorites').get().n).toBe(2)
  expect(await list(third)).toEqual([])
  expect((await (await send('/api/favorites/' + id, reader)).json()).favorite).toBe(true)
})

test('HU10: cada usuario consulta y elimina exclusivamente sus favoritas', async () => {
  const id = campaign()
  await send('/api/favorites/' + id, reader, 'PUT')
  await send('/api/favorites/' + id, third, 'PUT')
  for (let i = 0; i < 2; i++) expect((await send('/api/favorites/' + id, reader, 'DELETE')).status).toBe(204)
  expect(await list(reader)).toEqual([])
  expect((await list(third)).map(c => c.id)).toEqual([id])
  expect((await (await send('/api/favorites/' + id, reader)).json()).favorite).toBe(false)
})

test('HU10: devuelve datos actuales y orden estable sin datos privados', async () => {
  const first = campaign(), second = campaign('Activa', 'Otra campaña')
  await send('/api/favorites/' + first, reader, 'PUT')
  await send('/api/favorites/' + second, reader, 'PUT')
  app.db.query("UPDATE favorites SET created_at = '2030-01-01 00:00:00'").run()
  app.db.query('UPDATE campaigns SET raised_cents = 25000 WHERE id = ?').run(first)
  const rows = await list()
  expect(rows.map(c => c.id)).toEqual([second, first])
  expect(rows[1]).toEqual({ id: first, title: 'Campaña favorita', category: 'Comunidad', goal_cents: 100000,
    raised_cents: 25000, status: 'Activa', imageUrl: '/api/campaigns/' + first + '/image', fundingPercentage: 25 })
})

test('HU10: no permite guardar borradores, canceladas ni campañas inexistentes', async () => {
  for (const status of ['Borrador', 'Cancelada']) {
    const id = campaign(status)
    expect((await send('/api/favorites/' + id, reader, 'PUT')).status).toBe(404)
    expect((await send('/api/favorites/' + id, reader)).status).toBe(404)
    expect((await send('/api/favorites/' + id, owner, 'PUT')).status).toBe(409)
  }
  expect((await send('/api/favorites/999999', reader, 'PUT')).status).toBe(404)
  expect((await send('/api/favorites/999999', reader)).status).toBe(404)
  expect(await list()).toEqual([])
})

test('HU10: al cancelar oculta los datos al público y permite al creador consultar su favorita', async () => {
  const id = campaign()
  await send('/api/favorites/' + id, reader, 'PUT')
  await send('/api/favorites/' + id, owner, 'PUT')
  expect((await send('/api/campaigns/' + id + '/cancel', owner, 'POST')).status).toBe(200)
  expect(await list()).toEqual([])
  expect((await send('/api/favorites/' + id, reader)).status).toBe(404)
  expect((await list(owner))[0].status).toBe('Cancelada')
  expect((await send('/api/favorites/' + id, reader, 'DELETE')).status).toBe(204)
})

test('HU10: bloquea sesiones ausentes, inventadas y vencidas en todas las operaciones', async () => {
  const id = campaign()
  app.db.query('UPDATE sessions SET expires_at = 0').run()
  for (const cookie of [undefined, 'session=inventada', reader]) {
    for (const [path, method] of [['/api/favorites', 'GET'], ['/api/favorites/' + id, 'GET'], ['/api/favorites/' + id, 'PUT'], ['/api/favorites/' + id, 'DELETE']])
      expect((await send(path, cookie, method)).status).toBe(401)
  }
  expect(app.db.query('SELECT COUNT(*) AS n FROM favorites').get().n).toBe(0)
})

test('HU10: rechaza otros orígenes sin alterar favoritas', async () => {
  const id = campaign()
  expect((await send('/api/favorites/' + id, reader, 'PUT', undefined, 'https://otro.test')).status).toBe(403)
  await send('/api/favorites/' + id, reader, 'PUT')
  expect((await send('/api/favorites/' + id, reader, 'DELETE', undefined, '')).status).toBe(403)
  expect((await list()).map(c => c.id)).toEqual([id])
})

test('HU10: rechaza identificadores inválidos y quitar una inexistente no filtra información', async () => {
  for (const id of ['0', '-1', 'abc', '1.5', '9007199254740992'])
    expect((await send('/api/favorites/' + id, reader, 'PUT')).status).toBe(404)
  expect((await send('/api/favorites/999999', reader, 'DELETE')).status).toBe(204)
})

test('HU10: borrar físicamente una campaña limpia su asociación', async () => {
  const id = campaign()
  await send('/api/favorites/' + id, reader, 'PUT')
  app.db.query("UPDATE campaigns SET status = 'Borrador' WHERE id = ?").run(id)
  expect((await send('/api/campaigns/' + id, owner, 'DELETE')).status).toBe(200)
  expect(app.db.query('SELECT COUNT(*) AS n FROM favorites').get().n).toBe(0)
})

test('HU10: cerrar sesión impide acceso y volver a entrar recupera favoritas', async () => {
  const id = campaign()
  await send('/api/favorites/' + id, reader, 'PUT')
  await send('/api/auth/logout', reader, 'POST', {})
  expect((await send('/api/favorites', reader)).status).toBe(401)
  const response = await send('/api/auth/login', null, 'POST', { email: 'Lectora@example.test', password: 'Clave-segura-123' })
  const cookie = response.headers.get('set-cookie').split(';')[0]
  expect((await list(cookie)).map(c => c.id)).toEqual([id])
})

test('HU10: agrega la tabla sin perder datos y conserva favoritas al reabrir SQLite', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'pds-favorites-'))
  try {
    app.close(); app = createApp(join(directory, 'test.sqlite'))
    const cookie = await account('Persistente')
    const id = campaign()
    // Simulate an existing installation before the favorites migration.
    app.db.exec('DROP TABLE favorites')
    app.close(); app = createApp(join(directory, 'test.sqlite'))
    expect((await send('/api/campaigns/' + id, cookie)).status).toBe(200)
    await send('/api/favorites/' + id, cookie, 'PUT')
    app.close(); app = createApp(join(directory, 'test.sqlite'))
    expect((await list(cookie)).map(c => c.id)).toEqual([id])
  } finally {
    app.close(); app = createApp(':memory:')
    rmSync(directory, { recursive: true, force: true })
  }
})

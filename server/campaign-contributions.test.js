import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './app.js'
import { formatGoal } from '../shared/campaign.js'

let app, campaignId, directory
const origin = 'http://localhost:5173'
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII='), character => character.charCodeAt(0))

function setup() {
  for (const [id, name] of [[1, 'Creadora'], [2, 'Juan'], [3, 'María <>& Ñ']]) {
    app.db.query('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
      .run(id, name, `history-${id}@example.test`, 'hash-privado')
    app.db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(new Bun.CryptoHasher('sha256').update('history-session-' + id).digest('hex'), id, Date.now() + 60_000)
  }
  campaignId = seedCampaign()
}
function seedCampaign(ownerId = 1, status = 'Activa') {
  return Number(app.db.query(`INSERT INTO campaigns
    (owner_id, title, description, category, image, image_type, goal_cents, deadline, status, creation_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(ownerId, 'Campaña de prueba', 'Respaldada por su comunidad.', 'Comunidad', png, 'image/png',
      50000000, '2099-12-31', status, crypto.randomUUID()).lastInsertRowid)
}
function seedContribution(userId = 2, amount = 1000000, id = campaignId) {
  const result = app.db.query('INSERT INTO contributions (campaign_id, user_id, amount_cents) VALUES (?, ?, ?)')
    .run(id, userId, amount)
  app.db.query('UPDATE campaigns SET raised_cents = raised_cents + ? WHERE id = ?').run(amount, id)
  return Number(result.lastInsertRowid)
}
function request(id = campaignId, userId = 2, options = {}) {
  return app.fetch(new Request(`http://localhost:3000/api/campaigns/${id}/contributions`, {
    ...options, headers: { Origin: origin, ...(userId ? { Cookie: 'session=history-session-' + userId } : {}), ...options.headers },
  }))
}
async function history(id = campaignId, userId = 2) {
  const response = await request(id, userId)
  expect(response.status).toBe(200)
  return (await response.json()).contributions
}
beforeEach(() => { app = createApp(':memory:'); setup() })
afterEach(() => { app.close(); if (directory) rmSync(directory, { recursive: true, force: true }); directory = undefined })

test('HU08: cada transacción entrega el nombre del aportante y su monto exacto', async () => {
  const id = seedContribution()
  const stored = app.db.query('SELECT * FROM contributions WHERE id = ?').get(id)
  const rows = await history()
  expect(rows).toEqual([{ id, contributor_name: 'Juan', amount_cents: 1000000, created_at: stored.created_at }])
  expect(`${rows[0].contributor_name} aportó ${formatGoal(rows[0].amount_cents)}`).toBe('Juan aportó $10.000')
})

test('HU08: lista todos los aportes en orden estable, incluidos aportes repetidos de la misma persona', async () => {
  const ids = []
  for (let index = 0; index < 36; index++) ids.push(seedContribution(index % 2 ? 2 : 3, (index + 1) * 100))
  const rows = await history()
  expect(rows.map(row => row.id)).toEqual(ids.reverse())
  expect(new Set(rows.map(row => row.id)).size).toBe(36)
  expect(rows.filter(row => row.contributor_name === 'Juan')).toHaveLength(18)
  expect(rows.filter(row => row.contributor_name === 'María <>& Ñ')).toHaveLength(18)
})

test('HU08: el historial pertenece únicamente a la campaña consultada', async () => {
  const own = seedContribution(2, 1000000)
  const otherCampaign = seedCampaign(3)
  const other = seedContribution(3, 750000, otherCampaign)
  expect((await history()).map(row => row.id)).toEqual([own])
  expect((await history(otherCampaign)).map(row => row.id)).toEqual([other])
})

test('HU08: una campaña activa sin aportes devuelve la lista vacía', async () => {
  expect(await history()).toEqual([])
  expect(app.db.query('SELECT raised_cents FROM campaigns WHERE id = ?').get(campaignId).raised_cents).toBe(0)
})

test('HU08: el historial muestra los nombres de los aportantes, incluido el creador cuando aporta', async () => {
  seedContribution(1, 500000)
  seedContribution(3, 750000)
  expect((await history()).map(row => row.contributor_name)).toEqual(['María <>& Ñ', 'Creadora'])
})

test('HU08: el historial no expone correo, contraseña, sesión ni identificador de usuario', async () => {
  seedContribution()
  const response = await request()
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  const { contributions } = await response.json()
  expect(Object.keys(contributions[0]).sort()).toEqual(['amount_cents', 'contributor_name', 'created_at', 'id'])
})

test('HU08: permite leer activas ajenas y conserva privados los borradores y las canceladas', async () => {
  seedContribution()
  expect((await request()).status).toBe(200)
  for (const status of ['Borrador', 'Cancelada']) {
    app.db.query('UPDATE campaigns SET status = ? WHERE id = ?').run(status, campaignId)
    expect((await request()).status).toBe(404)
    expect(await history(campaignId, 1)).toHaveLength(1)
  }
})

test('HU08: requiere sesión válida y rechaza sesiones ausentes, inventadas y vencidas', async () => {
  seedContribution()
  expect((await request(campaignId, null)).status).toBe(401)
  expect((await request(campaignId, 999)).status).toBe(401)
  app.db.query('UPDATE sessions SET expires_at = 0 WHERE user_id = 2').run()
  expect((await request()).status).toBe(401)
})

test('HU08: una campaña inexistente devuelve error y no una lista vacía', async () => {
  const response = await request(999999)
  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({ error: 'Campaña no encontrada.' })
})

test('HU08: un aporte exitoso aparece una sola vez en el historial y coincide con lo recaudado', async () => {
  const originalId = seedContribution(3, 750000)
  const response = await request(campaignId, 2, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: '10000' }),
  })
  expect(response.status).toBe(201)
  const { contribution, campaign } = await response.json()
  const rows = await history()
  expect(rows.map(row => row.id)).toEqual([contribution.id, originalId])
  expect(rows[0]).toMatchObject({ contributor_name: 'Juan', amount_cents: 1000000 })
  expect(rows.reduce((sum, row) => sum + row.amount_cents, 0)).toBe(campaign.raised_cents)
  expect(await history()).toEqual(rows)
})

test('HU08: los aportes rechazados no aparecen en el historial', async () => {
  seedContribution()
  const before = await history()
  const response = await request(campaignId, 2, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: '0' }),
  })
  expect(response.status).toBe(422)
  expect(await history()).toEqual(before)
})

test('HU08: los aportes existentes y sus nombres persisten al volver a abrir SQLite', async () => {
  app.close()
  directory = mkdtempSync(join(tmpdir(), 'hu08-history-'))
  const path = join(directory, 'history.sqlite')
  app = createApp(path)
  setup()
  seedContribution(2, 1000000)
  seedContribution(3, 750000)
  const before = await history()
  app.close()
  app = createApp(path)
  expect(await history()).toEqual(before)
})

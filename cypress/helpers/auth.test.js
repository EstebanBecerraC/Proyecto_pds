import { afterEach, expect, test } from 'bun:test'
import { submitAuth } from './auth.js'

const originalCy = globalThis.cy
afterEach(() => { if (originalCy === undefined) delete globalThis.cy; else globalThis.cy = originalCy })

function setup(responses) {
  const waits = [], routes = []
  let clicks = 0
  globalThis.cy = {
    intercept(route) { routes.push(route.pathname); return { as() {} } },
    contains() { return { should() { return { click() { clicks++ } } } } },
    wait(value) {
      if (typeof value === 'number') { waits.push(value); return Promise.resolve() }
      const response = responses.shift()
      // Support Cypress's then(options, callback) form without using real timers.
      return { then(options, callback) { return Promise.resolve().then(() => callback({ response })) } }
    },
    log() {},
    wrap(value) { return Promise.resolve(value) },
  }
  return { waits, routes, clicks: () => clicks }
}
const reply = (statusCode, headers = {}) => ({ statusCode, headers, body: { error: 'Respuesta de prueba' } })

test('E2E auth: un registro exitoso no introduce esperas ni reintentos', async () => {
  const spy = setup([reply(201)])
  expect((await submitAuth('register', /^Crear cuenta$/, [201])).statusCode).toBe(201)
  expect(spy.waits).toEqual([])
  expect(spy.clicks()).toBe(1)
})

test('E2E auth: espera Retry-After y reenvía el formulario una sola vez tras 429', async () => {
  const spy = setup([reply(429, { 'retry-after': '60' }), reply(201)])
  expect((await submitAuth('register', /^Crear cuenta$/, [201])).statusCode).toBe(201)
  expect(spy.waits).toEqual([60100])
  expect(spy.routes).toEqual(['/api/auth/register', '/api/auth/register'])
  expect(spy.clicks()).toBe(2)
})

test('E2E auth: un segundo 429 falla con el estado real sin reintentar indefinidamente', async () => {
  const spy = setup([reply(429, { 'retry-after': '1' }), reply(429)])
  await expect(submitAuth('login', /^Iniciar sesión$/, [200])).rejects.toThrow('HTTP 429')
  expect(spy.clicks()).toBe(2)
})

test('E2E auth: no reintenta ni oculta duplicados ni errores del servidor', async () => {
  for (const status of [409, 500]) {
    const spy = setup([reply(status)])
    await expect(submitAuth('register', /^Crear cuenta$/, [201])).rejects.toThrow('HTTP ' + status)
    expect(spy.waits).toEqual([])
    expect(spy.clicks()).toBe(1)
  }
})

test('E2E auth: admite 401 solo cuando el caso lo espera explícitamente', async () => {
  setup([reply(401)])
  expect((await submitAuth('login', /^Iniciar sesión$/, [200, 401])).statusCode).toBe(401)
  setup([reply(401)])
  await expect(submitAuth('login', /^Iniciar sesión$/, [200])).rejects.toThrow('HTTP 401')
})

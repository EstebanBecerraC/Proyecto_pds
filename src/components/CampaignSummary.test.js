import { afterEach, beforeEach, expect, test } from 'bun:test'
import { plugin } from 'bun'
import { readFile } from 'node:fs/promises'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createRenderer, nextTick, reactive } from 'vue'

// Compile the actual Vue component; the renderer avoids a browser dependency.
plugin({ name: 'vue-component-tests', setup(build) {
  build.onLoad({ filter: /\.vue$/ }, async ({ path }) => {
    const { descriptor } = parse(await readFile(path, 'utf8'), { filename: path })
    return { contents: compileScript(descriptor, { id: 'component-test', inlineTemplate: true }).content, loader: 'js' }
  })
} })
const { default: CampaignSummary } = await import('./CampaignSummary.vue')

function node(type, text = '') {
  return { type, tagName: type.toUpperCase(), text, children: [], props: {}, parent: null, addEventListener() {}, removeEventListener() {}, getRootNode() { return globalThis.document } }
}
const renderer = createRenderer({
  createElement: node, createText: text => node('#text', text), createComment: () => node('#comment'),
  setText: (el, text) => { el.text = text }, setElementText: (el, text) => { el.text = text; el.children = [] },
  parentNode: el => el.parent, nextSibling: el => el.parent?.children[el.parent.children.indexOf(el) + 1] ?? null,
  patchProp: (el, key, previous, value) => { el.props[key] = value; el[key] = value },
  insert(el, parent, anchor = null) {
    if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1)
    el.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, el)
  },
  remove(el) { if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1); el.parent = null },
})
const originalFetch = globalThis.fetch
const originalWindow = globalThis.window
const originalDocument = globalThis.document
const originalDocumentClass = globalThis.Document
const originalShadowRoot = globalThis.ShadowRoot
let app, root, props, calls, timers, handler, removed, expired
const campaign = (id = 1, status = 'Activa') => ({ id, status, owner_id: 1, creator_name: 'Creadora', title: 'Campaña ' + id, description: 'Idea', category: 'Educación', raised_cents: 0, goal_cents: 100000, deadline: '2099-12-31', imageUrl: '/image' })
const response = (body, status = 200) => Response.json(body, { status })
function deferred() { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
async function flush() { for (let i = 0; i < 12; i++) { await Promise.resolve(); await nextTick() } }
function all(el = root) { return [el, ...el.children.flatMap(child => all(child))] }
function text(el = root) { return el.text + el.children.map(child => text(child)).join('') }
function button(label) { const el = all().find(el => el.type === 'button' && text(el) === label); expect(el).toBeDefined(); return el }
async function click(label) { button(label).props.onClick(); await flush() }
async function mount(id = '1') {
  props = reactive({ campaignId: id, userId: 1, onRemoved: () => removed++, onSessionExpired: () => expired++ })
  root = node('root')
  // A render wrapper keeps props reactive when switching campaigns.
  const { h } = await import('vue')
  app = renderer.createApp({ render: () => h(CampaignSummary, props) })
  app.mount(root)
  await flush()
}
async function startPayment(amount = '100') {
  await click('Aportar')
  all().find(el => el.tagName === 'INPUT').props['onUpdate:modelValue'](amount)
  await nextTick()
  all().find(el => el.type === 'form').props.onSubmit({ preventDefault() {} })
  await flush()
}
beforeEach(() => {
  calls = []; timers = []; removed = 0; expired = 0
  handler = path => response(path.endsWith('/contributions') ? { contributions: [] } : { campaign: campaign(Number(path.split('/').at(-1))) })
  globalThis.fetch = async (path, options) => { calls.push({ path, options }); return handler(path, options) }
  globalThis.window = { setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length } }
  globalThis.Document = class Document {}
  globalThis.ShadowRoot = class ShadowRoot {}
  globalThis.document = { activeElement: null }
})
afterEach(() => {
  app?.unmount(); app = null
  globalThis.fetch = originalFetch
  if (originalDocumentClass === undefined) delete globalThis.Document; else globalThis.Document = originalDocumentClass
  if (originalShadowRoot === undefined) delete globalThis.ShadowRoot; else globalThis.ShadowRoot = originalShadowRoot
  if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow
  if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument
})

test('HU07: bloquea aportes repetidos y espera cinco segundos antes de mostrar Pago exitoso y refrescar historial', async () => {
  handler = (path, options) => response(path.endsWith('/contributions') ? options.method === 'POST' ? { campaign: { ...campaign(), raised_cents: 10000 } } : { contributions: [] } : { campaign: campaign() })
  await mount()
  await startPayment()
  expect(text()).toContain('Confirmando pago…')
  expect(text()).not.toContain('Pago exitoso')
  expect(button('Aportar').props.disabled).toBe(true)
  expect(all().some(el => el.type === 'form')).toBe(false)
  expect(timers[0].delay).toBe(5000)
  await click('Aportar')
  expect(calls.filter(call => call.options.method === 'POST')).toHaveLength(1)
  expect(calls.filter(call => call.path.endsWith('/contributions') && !call.options.method)).toHaveLength(1)
  timers[0].callback(); await flush()
  expect(text()).toContain('Pago exitoso')
  expect(text()).not.toContain('Confirmando pago…')
  expect(button('Aportar').props.disabled).toBe(false)
  expect(calls.filter(call => call.path.endsWith('/contributions') && !call.options.method)).toHaveLength(2)
})

test('HU07: si el servidor tarda más que el temporizador mantiene el bloqueo hasta recibir respuesta', async () => {
  const payment = deferred()
  handler = (path, options) => options.method === 'POST' ? payment.promise : response(path.endsWith('/contributions') ? { contributions: [] } : { campaign: campaign() })
  await mount(); await startPayment(); timers[0].callback(); await flush()
  expect(text()).toContain('Confirmando pago…')
  payment.resolve(response({ campaign: { ...campaign(), raised_cents: 10000 } })); await flush()
  expect(text()).toContain('Pago exitoso')
})

test('HU07: un aporte inválido no se envía ni inicia el temporizador', async () => {
  await mount(); await startPayment('0')
  expect(text()).toContain('Ingresa un monto entero de CLP mayor a 0.')
  expect(calls.some(call => call.options.method === 'POST')).toBe(false)
  expect(timers).toHaveLength(0)
})

test('HU07: pago rechazado permite reintentar y no anuncia éxito ni refresca historial', async () => {
  handler = (path, options) => options.method === 'POST' ? response({ error: 'Campaña cancelada' }, 409) : response(path.endsWith('/contributions') ? { contributions: [] } : { campaign: campaign() })
  await mount(); await startPayment(); timers[0].callback(); await flush()
  expect(text()).toContain('Campaña cancelada')
  expect(text()).not.toContain('Pago exitoso')
  expect(button('Aportar').props.disabled).toBe(false)
  expect(calls.filter(call => call.path.endsWith('/contributions') && !call.options.method)).toHaveLength(1)
})

test('HU08: muestra error del historial y permite reintentar sin recargar la campaña', async () => {
  let historyCalls = 0
  handler = path => path.endsWith('/contributions') ? ++historyCalls === 1 ? response({ error: 'Historial no disponible' }, 503) : response({ contributions: [{ id: 1, contributor_name: 'Ana', amount_cents: 10000 }] }) : response({ campaign: campaign() })
  await mount()
  expect(text()).toContain('Historial no disponible')
  await click('Reintentar historial')
  expect(text()).toContain('Ana')
  expect(text()).not.toContain('Historial no disponible')
  expect(calls.filter(call => !call.path.endsWith('/contributions'))).toHaveLength(1)
})

test('HU08: descarta un historial antiguo cuando cambia la campaña', async () => {
  const old = deferred()
  handler = path => path === '/api/campaigns/1/contributions' ? old.promise : response(path.endsWith('/contributions') ? { contributions: [{ id: 2, contributor_name: 'Nueva persona', amount_cents: 20000 }] } : { campaign: campaign(Number(path.split('/').at(-1))) })
  await mount(); props.campaignId = '2'; await flush()
  old.resolve(response({ contributions: [{ id: 1, contributor_name: 'Persona antigua', amount_cents: 10000 }] })); await flush()
  expect(text()).toContain('Campaña 2')
  expect(text()).toContain('Nueva persona')
  expect(text()).not.toContain('Persona antigua')
})

test('HU07/HU08: un pago pendiente de otra campaña no modifica el detalle nuevo ni muestra éxito', async () => {
  await mount(); await startPayment(); props.campaignId = '2'; await flush()
  timers[0].callback(); await flush()
  expect(text()).toContain('Campaña 2')
  expect(text()).not.toContain('Pago exitoso')
})

test('HU08: una sesión vencida al leer historial avisa al contenedor', async () => {
  handler = path => response(path.endsWith('/contributions') ? { error: 'Sesión vencida' } : { campaign: campaign() }, path.endsWith('/contributions') ? 401 : 200)
  await mount(); expect(expired).toBe(1)
})

test('HU06: eliminar exige confirmación y Volver no envía ninguna eliminación', async () => {
  handler = path => response(path.endsWith('/contributions') ? { contributions: [] } : { campaign: campaign(1, 'Borrador') })
  await mount(); await click('Eliminar campaña')
  expect(text()).toContain('¿Eliminar esta campaña?')
  expect(calls.some(call => call.options.method === 'DELETE')).toBe(false)
  await click('Volver')
  expect(text()).not.toContain('¿Eliminar esta campaña?')
  await click('Eliminar campaña'); await click('Sí, eliminar permanentemente')
  expect(calls.filter(call => call.options.method === 'DELETE')).toHaveLength(1)
  expect(removed).toBe(1)
})

test('HU06: cancelar exige confirmación y oculta Aportar después del éxito', async () => {
  handler = (path, options) => response(path.endsWith('/contributions') ? { contributions: [] } : { campaign: campaign(1, options.method === 'POST' ? 'Cancelada' : 'Activa') })
  await mount(); await click('Cancelar Campaña')
  expect(calls.some(call => call.options.method === 'POST')).toBe(false)
  await click('Volver')
  expect(text()).not.toContain('¿Cancelar esta campaña?')
  await click('Cancelar Campaña'); await click('Sí, cancelar campaña')
  expect(text()).toContain('La campaña fue cancelada y ya no acepta nuevos aportes.')
  expect(all().some(el => el.type === 'button' && text(el) === 'Aportar')).toBe(false)
})

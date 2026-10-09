import { expect, test } from 'bun:test'
import { CATEGORIES, MAX_IMAGE_BYTES, goalToCents, contributionToCents, validateCampaign, fundingPercentage } from './campaign.js'

const valid = { title: 'Mi idea', description: 'Descripción del proyecto', category: CATEGORIES[0], goal: '1000', deadline: '2030-01-02' }
const image = { size: 100, type: 'image/png' }
const validate = (data = valid, file = image, options) => validateCampaign(data, file, '2030-01-01', options)

test('HU01/HU05: acepta exactamente los límites de título y descripción y rechaza excederlos', () => {
  expect(validate({ ...valid, title: 'a'.repeat(120), description: 'b'.repeat(10000) })).toEqual({})
  expect(validate({ ...valid, title: 'a'.repeat(121), description: 'b'.repeat(10001) })).toEqual({
    title: 'El título admite hasta 120 caracteres.', description: 'La descripción admite hasta 10.000 caracteres.',
  })
})

test('HU01/HU05: acepta todas las categorías configuradas y rechaza una desconocida', () => {
  for (const category of CATEGORIES) expect(validate({ ...valid, category })).toEqual({})
  expect(validate({ ...valid, category: 'Desconocida' }).category).toBe('Selecciona una categoría válida.')
})

test('HU01/HU05: valida imagen obligatoria, opcional y el límite exacto de 5 MB', () => {
  expect(validate(valid, null)).toEqual({ image: 'Campo requerido' })
  expect(validate(valid, null, { requireImage: false })).toEqual({})
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    expect(validate(valid, { type, size: MAX_IMAGE_BYTES })).toEqual({})
    expect(validate(valid, { type, size: MAX_IMAGE_BYTES + 1 }).image).toBe('La imagen no puede superar los 5 MB.')
  }
  expect(validate(valid, { ...image, size: 0 }, { requireImage: false }).image).toBe('Campo requerido')
  expect(validate(valid, { ...image, type: 'image/svg+xml' }).image).toBe('Selecciona una imagen JPG, PNG o WebP.')
})

test('HU01/HU05: rechaza hoy, fechas vencidas e inexistentes y acepta mañana y el día bisiesto', () => {
  for (const deadline of ['2030-01-01', '2029-12-31']) expect(validate({ ...valid, deadline }).deadline).toBe('La fecha límite debe ser posterior a hoy.')
  for (const deadline of ['2030-02-29', '2030-04-31', '2030-13-01', '02/01/2030']) expect(validate({ ...valid, deadline }).deadline).toBe('Ingresa una fecha válida.')
  expect(validate()).toEqual({})
  expect(validate({ ...valid, deadline: '2032-02-29' })).toEqual({})
})

test('HU01: convierte metas con precisión decimal, coma y espacios sin redondear valores inválidos', () => {
  for (const [value, cents] of [['0.01', 1], [' 12,34 ', 1234], ['12.3', 1230], ['0001', 100], ['90071992547409.91', Number.MAX_SAFE_INTEGER]]) expect(goalToCents(value)).toBe(cents)
  for (const value of [null, undefined, '', ' ', '0', '-1', '1.001', '1e3', 'Infinity', '1,2,3', '90071992547409.92']) expect(goalToCents(value)).toBeNull()
})

test('HU07: aportes solo aceptan CLP enteros positivos dentro del rango seguro', () => {
  for (const [value, cents] of [['1', 100], [' 1000 ', 100000], ['00025', 2500], ['90071992547409', 9007199254740900]]) expect(contributionToCents(value)).toBe(cents)
  for (const value of [null, undefined, '', '0', '-100', '0.01', '1.0', '1,5', '1e3', 'texto', '90071992547410']) expect(contributionToCents(value)).toBeNull()
})

test('HU02/HU03: porcentaje cero, parcial, completo y sobre la meta con dos decimales', () => {
  for (const [raised, goal, percentage] of [[0, 300, 0], [100, 300, 33.33], [200, 300, 66.67], [300, 300, 100], [450, 300, 150], [-1, 300, 0], [100, 0, 0]]) expect(fundingPercentage(raised, goal)).toBe(percentage)
})

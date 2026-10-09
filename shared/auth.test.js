import { expect, test } from 'bun:test'
import { validateAuth } from './auth.js'

test('HU00A: el formulario identifica ambos campos vacíos y cada omisión individual', () => {
  expect(validateAuth({ email: '', password: '' })).toEqual({ email: 'Campo obligatorio', password: 'Campo obligatorio' })
  expect(validateAuth({ email: '   ', password: '123' })).toEqual({ email: 'Campo obligatorio' })
  expect(validateAuth({ email: 'persona@example.com', password: '' })).toEqual({ password: 'Campo obligatorio' })
})

test('HU00A: la validación del formulario permite enviar contraseñas cortas para comprobar las credenciales', () => {
  expect(validateAuth({ email: 'persona@example.com', password: '123' })).toEqual({})
  expect(validateAuth({ email: 'correo-incorrecto', password: '123' })).toEqual({})
})

test('HU00B: el registro conserva las reglas de creación y valida la confirmación', () => {
  const options = { registering: true, confirmPassword: true }
  expect(validateAuth({ name: '', email: '', password: '', confirmation: '' }, options)).toEqual({
    name: 'Campo obligatorio', email: 'Campo obligatorio', password: 'Campo obligatorio', confirmation: 'Campo obligatorio',
  })
  const data = { name: 'Persona', email: 'persona@example.com', password: 'Clave-segura-123', confirmation: 'Clave-segura-123' }
  expect(validateAuth(data, options)).toEqual({})
  expect(validateAuth({ ...data, password: '123', confirmation: '123' }, options).password).toBe('La contraseña debe tener entre 8 y 128 caracteres.')
  expect(validateAuth({ ...data, confirmation: 'Otra-clave-123' }, options)).toEqual({ confirmation: 'Las contraseñas no coinciden.' })
  expect(validateAuth({ ...data, email: 'correo-invalido' }, options)).toEqual({ email: 'Ingresa un correo válido.' })
  expect(validateAuth({ ...data, name: 'A' }, options)).toEqual({ name: 'El nombre debe tener entre 2 y 80 caracteres.' })
})

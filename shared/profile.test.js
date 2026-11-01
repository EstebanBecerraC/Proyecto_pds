import { expect, test } from 'bun:test'
import { validateProfile } from './profile.js'

const profile = { name: 'Persona', email: 'persona@example.com' }

test('HU09: nombre acepta los límites de 2 y 80 caracteres', () => {
  expect(validateProfile({ ...profile, name: 'AB' })).toEqual({})
  expect(validateProfile({ ...profile, name: 'A'.repeat(80) })).toEqual({})
  expect(validateProfile({ ...profile, name: 'A' }).name).toBe('El nombre debe tener entre 2 y 80 caracteres.')
  expect(validateProfile({ ...profile, name: 'A'.repeat(81) }).name).toBe('El nombre debe tener entre 2 y 80 caracteres.')
})

test('HU09: correo conserva las mismas reglas del registro', () => {
  expect(validateProfile({ ...profile, email: 'persona+perfil@example.com' })).toEqual({})
  expect(validateProfile({ ...profile, email: 'persona@localhost' }).email).toBe('Ingresa un correo válido.')
  expect(validateProfile({ ...profile, email: `${'a'.repeat(242)}@example.com` })).toEqual({})
  expect(validateProfile({ ...profile, email: `${'a'.repeat(243)}@example.com` }).email).toBe('Ingresa un correo válido.')
})

test('HU09: contraseña acepta entre 8 y 128 caracteres sin exigir composición', () => {
  for (const newPassword of ['abcdefgh', '1'.repeat(128)]) {
    expect(validateProfile({ ...profile, currentPassword: 'actual-123', newPassword, confirmation: newPassword })).toEqual({})
  }
  for (const newPassword of ['a'.repeat(7), 'a'.repeat(129)]) {
    expect(validateProfile({ ...profile, currentPassword: 'actual-123', newPassword, confirmation: newPassword }).newPassword)
      .toBe('La contraseña debe tener entre 8 y 128 caracteres.')
  }
})

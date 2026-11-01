import { isValidEmail } from './auth.js'

export function validateProfile(data) {
  const errors = {}
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  const email = typeof data.email === 'string' ? data.email.trim() : ''
  const currentPassword = typeof data.currentPassword === 'string' ? data.currentPassword : ''
  const newPassword = typeof data.newPassword === 'string' ? data.newPassword : ''
  const confirmation = typeof data.confirmation === 'string' ? data.confirmation : ''
  const changingPassword = Boolean(currentPassword || newPassword || confirmation)

  if (!name) errors.name = 'Campo obligatorio'
  else if (name.length < 2 || name.length > 80) errors.name = 'El nombre debe tener entre 2 y 80 caracteres.'
  if (!email) errors.email = 'Campo obligatorio'
  else if (!isValidEmail(email)) errors.email = 'Ingresa un correo válido.'

  if (changingPassword) {
    if (!currentPassword) errors.currentPassword = 'Campo obligatorio'
    if (!newPassword) errors.newPassword = 'Campo obligatorio'
    else if (newPassword.length < 8 || newPassword.length > 128)
      errors.newPassword = 'La contraseña debe tener entre 8 y 128 caracteres.'
    if (!confirmation) errors.confirmation = 'Campo obligatorio'
    else if (confirmation !== newPassword) errors.confirmation = 'Las contraseñas no coinciden.'
  }

  return errors
}

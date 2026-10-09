export const INCORRECT_CREDENTIALS = 'Correo o contraseña incorrectos'
export const REGISTERED_EMAIL = 'Este correo ya está registrado'
export const isValidEmail = email => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// Login checks required fields; password creation rules apply only to registration.
export function validateAuth(data, { registering = false, confirmPassword = false } = {}) {
  const fields = {}
  const email = typeof data.email === 'string' ? data.email.trim() : ''
  const password = typeof data.password === 'string' ? data.password : ''
  if (!email) fields.email = 'Campo obligatorio'
  else if (registering && !isValidEmail(email)) fields.email = 'Ingresa un correo válido.'
  if (!password) fields.password = 'Campo obligatorio'
  else if (registering && (password.length < 8 || password.length > 128))
    fields.password = 'La contraseña debe tener entre 8 y 128 caracteres.'
  if (registering) {
    const name = typeof data.name === 'string' ? data.name.trim() : ''
    if (!name) fields.name = 'Campo obligatorio'
    else if (name.length < 2 || name.length > 80) fields.name = 'El nombre debe tener entre 2 y 80 caracteres.'
    if (confirmPassword) {
      if (!data.confirmation) fields.confirmation = 'Campo obligatorio'
      else if (data.confirmation !== password) fields.confirmation = 'Las contraseñas no coinciden.'
    }
  }
  return fields
}

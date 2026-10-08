export const CATEGORIES = ['Arte y cultura', 'Tecnología', 'Educación', 'Medioambiente', 'Comunidad', 'Emprendimiento', 'Otros']
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function todayInChile() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const part = type => parts.find(item => item.type === type).value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function goalToCents(value) {
  const text = String(value ?? '').trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null
}

export function validateCampaign(data, image, today = todayInChile()) {
  const errors = {}
  for (const field of ['title', 'description', 'category', 'goal', 'deadline']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) errors[field] = 'Campo requerido'
  }
  if (data.title?.trim().length > 120) errors.title = 'El título admite hasta 120 caracteres.'
  if (data.description?.trim().length > 10000) errors.description = 'La descripción admite hasta 10.000 caracteres.'
  if (!errors.category && !CATEGORIES.includes(data.category)) errors.category = 'Selecciona una categoría válida.'
  if (!errors.goal && goalToCents(data.goal) === null)
    errors.goal = 'El valor debe ser un número mayor a 0, con un máximo de 2 decimales.'
  if (!errors.deadline) {
    const date = new Date(data.deadline + 'T00:00:00Z')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.deadline) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== data.deadline)
      errors.deadline = 'Ingresa una fecha válida.'
    else if (data.deadline <= today) errors.deadline = 'La fecha límite debe ser posterior a hoy.'
  }
  if (!image || image.size === 0) errors.image = 'Campo requerido'
  else if (!IMAGE_TYPES.includes(image.type)) errors.image = 'Selecciona una imagen JPG, PNG o WebP.'
  else if (image.size > MAX_IMAGE_BYTES) errors.image = 'La imagen no puede superar los 5 MB.'
  return errors
}

export const formatGoal = cents => new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 2,
}).format(cents / 100)
export const formatDeadline = value => new Intl.DateTimeFormat('es-CL', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
}).format(new Date(value + 'T00:00:00Z'))

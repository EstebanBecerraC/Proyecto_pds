export async function requestApi(path, options = {}) {
  let response
  try { response = await fetch(path, { credentials: 'same-origin', ...options }) }
  catch { throw new Error('No se pudo conectar con el servidor. Intenta nuevamente.') }
  let result
  try { result = await response.json() }
  catch { throw new Error('El servidor no pudo procesar la solicitud. Intenta nuevamente.') }
  if (!response.ok) {
    const error = new Error(result.error || 'No se pudo completar la solicitud.')
    error.status = response.status
    error.fields = result.errors || {}
    throw error
  }
  return result
}

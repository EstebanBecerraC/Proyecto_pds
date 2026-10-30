let sequence = 0

// Exercise the real form and inspect its response before checking navigation.
// Retry only an explicit rate limit, once, respecting the server's Retry-After.
export function submitAuth(route, button, expectedStatuses, retries = 1) {
  const alias = 'authSubmission' + ++sequence
  cy.intercept({ method: 'POST', pathname: '/api/auth/' + route }).as(alias)
  cy.contains('button', button).should('be.enabled').click()
  return cy.wait('@' + alias).then({ timeout: 90000 }, ({ response }) => {
    if (!response) throw new Error('La autenticación no recibió respuesta del servidor.')
    if (response.statusCode === 429 && retries > 0) {
      const seconds = Number(response.headers?.['retry-after'] ?? 60)
      if (!Number.isFinite(seconds) || seconds < 0 || seconds > 60)
        throw new Error('Retry-After de autenticación fuera del rango esperado: ' + seconds)
      cy.log('Límite de autenticación: esperar Retry-After y reintentar una vez.')
      return cy.wait(seconds * 1000 + 100, { log: false })
        .then(() => submitAuth(route, button, expectedStatuses, retries - 1))
    }
    if (!expectedStatuses.includes(response.statusCode))
      throw new Error(`POST /api/auth/${route}: HTTP ${response.statusCode}. ${response.body?.error || 'Respuesta inesperada.'}`)
    return cy.wrap(response, { log: false })
  })
}

import { submitAuth } from '../helpers/auth.js'

const runId = Date.now()
const password = 'Clave-favoritas-123'
const account = label => ({ name: 'Persona ' + label, email: `hu10-${label}-${runId}@example.test`, password })

function reset() {
  cy.clearAllCookies()
  cy.visit('/')
  cy.reload()
  cy.location('hash').should('eq', '#/')
}
function register(user) {
  reset()
  cy.visit('/#/register')
  cy.get('#name').type(user.name)
  cy.get('#email').type(user.email)
  cy.get('#password').type(user.password, { log: false })
  cy.get('#confirmation').type(user.password, { log: false })
  submitAuth('register', /^Crear cuenta$/, [201])
  cy.location('hash').should('eq', '#/home')
}
function login(user) {
  reset()
  cy.visit('/#/login')
  cy.get('#email').type(user.email)
  cy.get('#password').type(user.password, { log: false })
  submitAuth('login', /^Iniciar sesión$/, [200])
  cy.location('hash').should('eq', '#/home')
}
function createCampaign(title) {
  cy.visit('/#/campaigns/new')
  cy.get('#campaign-title').type(title)
  cy.get('#campaign-description').type('Proyecto para comprobar campañas favoritas.')
  cy.get('#campaign-category').select('Comunidad')
  cy.get('#campaign-image').selectFile({ contents: 'cypress/fixtures/campana.png', fileName: 'campana.png', mimeType: 'image/png' })
  cy.get('#campaign-goal').type('100000')
  cy.get('#campaign-deadline').type('2099-12-31')
  cy.contains('button', 'Guardar borrador').click()
  cy.location('hash').should('match', /^#\/campaigns\/[1-9]\d*$/)
  cy.get('[data-cy=toggle-favorite]').should('not.exist')
  return cy.location('hash').then(hash => {
    cy.contains('button', 'Activar campaña').click()
    cy.get('.draft-badge').should('have.text', 'Activa')
    cy.get('[data-cy=toggle-favorite]').should('be.enabled')
    return cy.wrap(hash, { log: false })
  })
}
function favorites() {
  cy.contains('a', /^Mis favoritas$/).click()
  cy.location('hash').should('eq', '#/favorites')
  cy.contains('h1', /^Mis favoritas$/).should('be.visible')
}
function save() {
  cy.get('[data-cy=toggle-favorite]').should('have.text', 'Guardar en favoritas').click()
  cy.get('[data-cy=toggle-favorite]').should('have.attr', 'aria-pressed', 'true').and('have.text', 'Quitar de favoritas')
}

describe('HU-10: campañas favoritas', () => {
  it('HU10-CY-01: lista vacía, guarda, persiste entre sesiones y quita desde el detalle', () => {
    const user = account('persistencia')
    const title = 'Favorita persistente HU10'
    register(user)
    favorites()
    cy.contains('Aún no tienes campañas favoritas disponibles.').should('be.visible')
    createCampaign(title)
    save()
    favorites()
    cy.get('[data-cy=favorite-card]').should('have.length', 1).and('contain', title)
    cy.reload()
    cy.get('[data-cy=favorite-card]').should('have.length', 1)
    cy.contains('button', /^Cerrar sesión$/).click()
    cy.location('hash').should('eq', '#/')
    login(user)
    favorites()
    cy.get('[data-cy=favorite-card]').should('have.length', 1)
    cy.get('[data-cy=favorite-card] a').click()
    cy.get('[data-cy=toggle-favorite]').should('have.text', 'Quitar de favoritas').click()
    cy.get('[data-cy=toggle-favorite]').should('have.attr', 'aria-pressed', 'false')
    favorites()
    cy.get('[data-cy=favorite-card]').should('not.exist')
    cy.contains('Aún no tienes campañas favoritas disponibles.').should('be.visible')
  })

  it('HU10-CY-02: separa las cuentas y oculta una campaña cancelada por su creador', () => {
    const owner = account('creador'), reader = account('lectora'), other = account('otra')
    register(owner)
    createCampaign('Campaña compartida HU10').then(hash => {
      register(reader)
      cy.visit('/' + hash)
      save()
      register(other)
      favorites()
      cy.get('[data-cy=favorite-card]').should('not.exist')
      cy.visit('/' + hash)
      cy.get('[data-cy=toggle-favorite]').should('have.attr', 'aria-pressed', 'false')
      login(reader)
      favorites()
      cy.get('[data-cy=favorite-card]').should('have.length', 1)
      login(owner)
      cy.visit('/' + hash)
      cy.contains('button', /^Cancelar Campaña$/).click()
      cy.contains('button', 'Sí, cancelar campaña').click()
      cy.get('.draft-badge').should('have.text', 'Cancelada')
      login(reader)
      favorites()
      cy.get('[data-cy=favorite-card]').should('not.exist')
    })
  })

  it('HU10-CY-03: un error permite reintentar sin fingir éxito ni perder la favorita', () => {
    register(account('errores'))
    createCampaign('Campaña para errores HU10')
    cy.intercept({ method: 'PUT', url: '**/api/favorites/*', times: 1 }, { statusCode: 503, body: { error: 'Guardado no disponible' } })
    cy.get('[data-cy=toggle-favorite]').click()
    cy.contains('Guardado no disponible').should('be.visible')
    cy.get('[data-cy=toggle-favorite]').should('have.attr', 'aria-pressed', 'false')
    save()
    cy.intercept({ method: 'GET', pathname: '/api/favorites', times: 1 }, { statusCode: 503, body: { error: 'Lista no disponible' } })
    favorites()
    cy.contains('Lista no disponible').should('be.visible')
    cy.contains('Aún no tienes campañas favoritas disponibles.').should('not.exist')
    cy.contains('button', /^Reintentar$/).click()
    cy.get('[data-cy=favorite-card]').should('have.length', 1)
    cy.intercept({ method: 'DELETE', url: '**/api/favorites/*', times: 1 }, { statusCode: 503, body: { error: 'No se pudo quitar' } })
    cy.get('[data-cy=favorite-card] button').click()
    cy.contains('No se pudo quitar').should('be.visible')
    cy.get('[data-cy=favorite-card]').should('have.length', 1)
    cy.get('[data-cy=favorite-card] button').click()
    cy.get('[data-cy=favorite-card]').should('not.exist')
  })

  it('HU10-CY-04: Mis favoritas requiere iniciar sesión', () => {
    reset()
    cy.visit('/#/favorites')
    cy.location('hash').should('eq', '#/login')
    cy.window().then(win => win.fetch('/api/favorites').then(async response => {
      expect(response.status).to.eq(401)
      expect((await response.json()).error).to.eq('Debes iniciar sesión.')
    }))
  })
})

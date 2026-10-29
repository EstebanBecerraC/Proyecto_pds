const initialPassword = 'Clave-perfil-123'
const changedPassword = 'Clave-perfil-456'
const runId = Date.now()

function user(label) {
  return {
    name: `Persona ${label} HU09`,
    email: `hu09-${label}-${runId}@example.test`,
    password: initialPassword,
  }
}

function resetApp() {
  cy.clearAllCookies()
  cy.visit('/')
  cy.reload()
  cy.location('hash').should('eq', '#/')
}

function register(account) {
  resetApp()
  cy.visit('/#/register')
  cy.get('#name').type(account.name)
  cy.get('#email').type(account.email)
  cy.get('#password').type(account.password, { log: false })
  cy.get('#confirmation').type(account.password, { log: false })
  cy.contains('button', /^Crear cuenta$/).click()
  cy.location('hash').should('eq', '#/home')
}

function login(email, password) {
  resetApp()
  cy.visit('/#/login')
  cy.get('#email').type(email)
  cy.get('#password').type(password, { log: false })
  cy.contains('button', /^Iniciar sesión$/).click()
}

function openProfile() {
  cy.contains('a', /^Mi perfil$/).click()
  cy.location('hash').should('eq', '#/profile')
  cy.contains('h1', 'Mi perfil').should('be.visible')
}

function createActiveCampaign() {
  cy.visit('/#/campaigns/new')
  cy.get('#campaign-title').type('Campaña activa HU09')
  cy.get('#campaign-description').type('Campaña para comprobar la eliminación de la cuenta creadora.')
  cy.get('#campaign-category').select('Comunidad')
  cy.get('#campaign-image').selectFile({
    contents: 'cypress/fixtures/campana.png',
    fileName: 'campana.png',
    mimeType: 'image/png',
  })
  cy.get('#campaign-goal').type('100000')
  cy.get('#campaign-deadline').type('2099-12-31')
  cy.contains('button', 'Guardar borrador').click()
  return cy.location('hash').should('match', /^#[/]campaigns[/][1-9][0-9]*$/).then(hash => {
    const campaignId = Number(hash.split('/').pop())
    cy.contains('button', 'Activar campaña').click()
    cy.get('.draft-badge').should('have.text', 'Activa')
    return cy.wrap(campaignId, { log: false })
  })
}

function openDeleteConfirmation() {
  cy.contains('button', /^Eliminar mi cuenta$/).click()
  cy.contains('Escribe la siguiente palabra para confirmar:').should('be.visible')
  cy.get('.delete-confirmation-phrase').should('be.visible').and('have.text', 'entiendo')
}

describe('HU-09: gestionar perfil', () => {
  it('HU09-CY-01: consulta, modifica los datos y cambia la contraseña', () => {
    const account = user('actualizar')
    const updatedEmail = `hu09-actualizado-${runId}@example.test`

    register(account)
    openProfile()

    cy.get('#profile-name').should('have.value', account.name)
    cy.get('#profile-email').should('have.value', account.email)

    cy.get('#profile-name').clear().type('Perfil actualizado HU09')
    cy.get('#profile-email').clear().type(updatedEmail)
    cy.get('#current-password').type(initialPassword, { log: false })
    cy.get('#new-password').type(changedPassword, { log: false })
    cy.get('#profile-confirmation').type(changedPassword, { log: false })
    cy.contains('button', /^Guardar cambios$/).click()

    cy.contains('Perfil actualizado correctamente.').should('be.visible')
    cy.get('#profile-name').should('have.value', 'Perfil actualizado HU09')
    cy.get('#profile-email').should('have.value', updatedEmail)
    cy.get('#current-password').should('have.value', '')
    cy.get('#new-password').should('have.value', '')
    cy.get('#profile-confirmation').should('have.value', '')

    cy.contains('button', /^Cerrar sesión$/).click()
    login(updatedEmail, initialPassword)
    cy.location('hash').should('eq', '#/login')
    cy.contains('[role="alert"]', 'Correo o contraseña incorrectos').should('be.visible')

    cy.get('#password').clear().type(changedPassword, { log: false })
    cy.contains('button', /^Iniciar sesión$/).click()
    cy.location('hash').should('eq', '#/home')
  })

  it('HU09-CY-02: exige escribir exactamente entiendo antes de eliminar la cuenta', () => {
    const account = user('eliminar')

    register(account)
    openProfile()
    openDeleteConfirmation()

    cy.contains('button', /^Sí, eliminar mi cuenta$/).should('be.disabled')
    cy.get('#delete-account-confirmation').type('Entiendo')
    cy.contains('button', /^Sí, eliminar mi cuenta$/).should('be.disabled')

    cy.get('#delete-account-confirmation').clear().type('entiendo')
    cy.contains('button', /^Sí, eliminar mi cuenta$/).should('be.enabled').click()
    cy.location('hash').should('eq', '#/')
    cy.contains('a', /^Iniciar sesión$/).should('be.visible')
    cy.contains('a', /^Registrarse$/).should('be.visible')

    login(account.email, initialPassword)
    cy.location('hash').should('eq', '#/login')
    cy.contains('[role="alert"]', 'Correo o contraseña incorrectos').should('be.visible')
  })

  it('HU09-CY-03: impide eliminar una cuenta que creó una campaña activa', () => {
    const account = user('campana-activa')

    register(account)
    createActiveCampaign()
    openProfile()
    openDeleteConfirmation()

    cy.get('#delete-account-confirmation').type('entiendo')
    cy.contains('button', /^Sí, eliminar mi cuenta$/).click()

    cy.location('hash').should('eq', '#/profile')
    cy.contains('[role="alert"]', 'Cancela tus campañas activas antes de eliminar la cuenta.').should('be.visible')
    cy.get('#profile-name').should('have.value', account.name)
  })

  it('HU09-CY-04: conserva los aportes después de eliminar la cuenta aportante', () => {
    const owner = user('dueno-aporte')
    const contributor = user('aportante')

    register(owner)
    createActiveCampaign().then(campaignId => {
      register(contributor)
      cy.visit(`/#/campaigns/${campaignId}`)
      cy.contains('h1', 'Campaña activa HU09').should('be.visible')

      cy.contains('button', /^Aportar$/).click()
      cy.get('#contribution-amount').type('5000')
      cy.contains('button', /^Confirmar aporte$/).click()
      cy.contains('Pago exitoso', { timeout: 10000 }).should('be.visible')
      cy.contains('.campaign-contributions li', contributor.name).should('contain.text', '5.000')

      openProfile()
      openDeleteConfirmation()
      cy.get('#delete-account-confirmation').type('entiendo')
      cy.contains('button', /^Sí, eliminar mi cuenta$/).click()
      cy.location('hash').should('eq', '#/')

      login(owner.email, owner.password)
      cy.location('hash').should('eq', '#/home')
      cy.visit(`/#/campaigns/${campaignId}`)
      cy.contains('.campaign-contributions li', 'Usuario eliminado')
        .should('be.visible')
        .and('contain.text', '5.000')
    })
  })
})

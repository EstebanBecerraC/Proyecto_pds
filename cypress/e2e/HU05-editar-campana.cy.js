const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII='
const password = 'Clave-segura-123'
const owner = {
  name: 'Creador HU05',
  email: `hu05-${Date.now()}@example.test`,
  password,
}

let campaignId

function login(email = owner.email) {
  cy.clearCookies()
  cy.visit('/#/login')
  cy.get('#email').type(email)
  cy.get('#password').type(password, { log: false })
  cy.contains('button', /^Iniciar sesión$/).click()
  return cy.location('hash').should('eq', '#/home')
}

function register(user) {
  cy.clearCookies()
  cy.visit('/#/register')
  cy.get('#name').type(user.name)
  cy.get('#email').type(user.email)
  cy.get('#password').type(user.password, { log: false })
  cy.get('#confirmation').type(user.password, { log: false })
  cy.contains('button', /^Crear cuenta$/).click()
  return cy.location('hash').should('eq', '#/login')
}

// Consulta la API real desde el navegador y verifica su respuesta.
function browserApi(url, method = 'GET') {
  return cy.window({ log: false }).then({ timeout: 15000 }, win => {
    const controller = new win.AbortController()
    const timer = win.setTimeout(() => controller.abort(), 10000)

    return win.fetch(url, {
      method,
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async response => {
        const body = await response.json()

        expect(
          response.status,
          `${method} ${url}: ${body.error || 'respuesta de la API'}`,
        ).to.be.within(200, 299)

        return { status: response.status, body }
      })
      .finally(() => win.clearTimeout(timer))
  })
}

function image(fileName = 'campana.png') {
  return {
    contents: Cypress.Buffer.from(png, 'base64'),
    fileName,
    mimeType: 'image/png',
  }
}

function openEdit() {
  cy.contains('a', 'Editar campaña').click()
  cy.get('#campaign-title').should('have.value', 'Campaña HU05')
}

describe('HU-05: editar campaña', () => {
  before(() => {
    register(owner)
  })

  beforeEach(() => {
    login()

    cy.intercept('POST', '/api/campaigns').as('create')
    cy.visit('/#/campaigns/new')

    cy.get('#campaign-title').type('Campaña HU05')
    cy.get('#campaign-description')
      .type('Descripción original del proyecto.')
    cy.get('#campaign-category').select('Comunidad')
    cy.get('#campaign-image').selectFile(image())
    cy.get('#campaign-goal').type('150000')
    cy.get('#campaign-deadline').type('2099-12-31')

    cy.contains('button', 'Guardar borrador').click()

    cy.wait('@create').then(({ response }) => {
      expect(response.statusCode).to.eq(201)
      campaignId = response.body.campaign.id
    })

    cy.contains('h1', 'Campaña HU05').should('be.visible')
  })

  it('HU05-CY-01: precarga, guarda y persiste sin reemplazar la imagen', () => {
    openEdit()

    cy.get('#campaign-description')
      .should('have.value', 'Descripción original del proyecto.')
    cy.get('#campaign-category').should('have.value', 'Comunidad')
    cy.get('#campaign-goal').should('have.value', '150000')
    cy.get('#campaign-deadline').should('have.value', '2099-12-31')
    cy.get('img[alt="Imagen actual de la campaña"]')
      .should('be.visible')

    cy.get('#campaign-title').clear().type('Campaña actualizada HU05')
    cy.get('#campaign-description').clear().type('Descripción actualizada.')
    cy.get('#campaign-category').select('Educación')
    cy.get('#campaign-goal').clear().type('250000')
    cy.get('#campaign-deadline').clear().type('2099-11-30')

    cy.intercept('PUT', '/api/campaigns/*').as('edit')
    cy.contains('button', 'Guardar cambios').click()
    cy.wait('@edit').its('response.statusCode').should('eq', 200)

    cy.contains('Los cambios de la campaña se guardaron correctamente.')
      .should('be.visible')

    cy.reload()

    cy.contains('h1', 'Campaña actualizada HU05').should('be.visible')
    cy.contains('Descripción actualizada.').should('be.visible')

    browserApi(`/api/campaigns/${campaignId}`)
      .its('body.campaign')
      .should('include', {
        title: 'Campaña actualizada HU05',
        category: 'Educación',
        goal_cents: 25000000,
        deadline: '2099-11-30',
        status: 'Borrador',
        raised_cents: 0,
      })

    cy.get('.summary-image')
      .should('be.visible')
      .and($img => {
        expect($img[0].naturalWidth).to.be.greaterThan(0)
      })
  })

  it('HU05-CY-02: permite seleccionar y guardar una nueva imagen', () => {
    openEdit()

    cy.get('#campaign-image').selectFile(image('reemplazo.png'))
    cy.get('img[alt="Vista previa de la imagen de la campaña"]')
      .should('be.visible')

    cy.intercept('PUT', '/api/campaigns/*').as('edit')
    cy.contains('button', 'Guardar cambios').click()
    cy.wait('@edit').its('response.statusCode').should('eq', 200)

    cy.get('.summary-image')
      .should('be.visible')
      .and($img => {
        expect($img[0].naturalWidth).to.be.greaterThan(0)
      })
  })

  it('HU05-CY-03: muestra validaciones y conserva los datos guardados', () => {
    openEdit()

    cy.get('#campaign-title').clear()
    cy.get('#campaign-goal').clear().type('0')
    cy.contains('button', 'Guardar cambios').click()

    cy.get('#error-title').should('contain', 'Campo requerido')
    cy.get('#error-goal').should('contain', 'mayor a 0')

    browserApi(`/api/campaigns/${campaignId}`)
      .its('body.campaign.title')
      .should('eq', 'Campaña HU05')

    cy.get('#campaign-title').type('Cambio sin guardar')
    cy.get('#campaign-goal').clear().type('200000')
    cy.get('#campaign-image').selectFile({
      contents: Cypress.Buffer.from('archivo de texto'),
      fileName: 'archivo.txt',
      mimeType: 'text/plain',
    })

    cy.contains('button', 'Guardar cambios').click()
    cy.get('#error-image').should('contain', 'JPG, PNG o WebP')

    browserApi(`/api/campaigns/${campaignId}`)
      .its('body.campaign.title')
      .should('eq', 'Campaña HU05')
  })

  it('HU05-CY-04: cancelar vuelve al detalle sin guardar cambios', () => {
    openEdit()

    cy.get('#campaign-title').clear().type('Cambio descartado')
    cy.contains('a', /^Cancelar$/).click()

    cy.contains('h1', 'Campaña HU05').should('be.visible')

    browserApi(`/api/campaigns/${campaignId}`)
      .its('body.campaign.title')
      .should('eq', 'Campaña HU05')
  })

  it('HU05-CY-05: una campaña activa o cancelada no permite editar', () => {
    cy.contains('button', 'Activar campaña').click()
    cy.get('.draft-badge').should('have.text', 'Activa')
    cy.contains('a', 'Editar campaña').should('not.exist')

    cy.visit(`/#/campaigns/${campaignId}/edit`)

    cy.contains('Solo se pueden editar campañas en Borrador.')
      .should('be.visible')
    cy.get('#campaign-title').should('not.exist')

    browserApi(`/api/campaigns/${campaignId}/cancel`, 'POST')
    cy.reload()

    cy.contains('Solo se pueden editar campañas en Borrador.')
      .should('be.visible')
    cy.get('#campaign-title').should('not.exist')
  })

  it('HU05-CY-06: otro usuario no puede editar ni acceder al borrador', () => {
    const other = {
      name: 'Otro usuario HU05',
      email: `hu05-other-${Date.now()}@example.test`,
      password,
    }

    register(other)
    login(other.email)

    cy.visit(`/#/campaigns/${campaignId}/edit`)
    cy.contains('Campaña no encontrada.').should('be.visible')
    cy.get('#campaign-title').should('not.exist')

    login()
    browserApi(`/api/campaigns/${campaignId}/activate`, 'POST')

    login(other.email)
    cy.visit(`/#/campaigns/${campaignId}`)

    cy.contains('h1', 'Campaña HU05').should('be.visible')
    cy.contains('a', 'Editar campaña').should('not.exist')

    cy.visit(`/#/campaigns/${campaignId}/edit`)

    cy.contains('Solo el creador puede editar esta campaña.')
      .should('be.visible')
    cy.get('#campaign-title').should('not.exist')
  })
})
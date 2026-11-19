import { submitAuth } from '../helpers/auth.js'

const password = 'Entrega3-segura-123'
let sequence = 0
const account = () => ({ name: 'Persona entrega 3', email: `e3-${Date.now()}-${++sequence}@example.test`, password })

function reset() {
  cy.clearAllCookies()
  cy.visit('/')
  cy.reload()
  cy.location('hash').should('eq', '#/')
}
function register(user) {
  cy.visit('/#/register')
  cy.get('#name').type(user.name)
  cy.get('#email').type(user.email)
  cy.get('#password').type(user.password, { log: false })
  cy.get('#confirmation').type(user.password, { log: false })
  submitAuth('register', /^Crear cuenta$/, [201])
  cy.location('hash').should('eq', '#/home')
}
function fillCampaign(title, description = 'Proyecto de prueba de la tercera entrega.') {
  cy.get('#campaign-title').type(title)
  cy.get('#campaign-description').type(description)
  cy.get('#campaign-category').select('Comunidad')
  cy.get('#campaign-image').selectFile('cypress/fixtures/campana.png')
  cy.get('#campaign-goal').type('100000')
  cy.get('#campaign-deadline').type('2099-12-31')
}
function createCampaign(title, description) {
  cy.visit('/#/campaigns/new')
  fillCampaign(title, description)
  cy.contains('button', /^Guardar borrador$/).click()
  cy.contains('h1', title).should('be.visible')
  cy.get('.draft-badge').should('have.text', 'Borrador')
  return cy.location('hash').should('match', /^#\/campaigns\/[1-9]\d*$/)
}
function home() { cy.contains('nav a', /^Inicio$/).click() }
function search(text) {
  cy.get('#campaign-search').clear().type(text)
  cy.get('button[aria-label="Buscar campañas"]').should('be.enabled').click()
}

describe('Entrega 3: flujos críticos de usuario', () => {
  beforeEach(reset)

  it('E3-CY-01: registro, sesión persistente, navegación y cierre de sesión', () => {
    const user = account()
    register(user)
    cy.reload()
    cy.location('hash').should('eq', '#/home')
    cy.contains('nav a', /^Mis campañas$/).click()
    cy.contains('.session-caption', user.email).should('be.visible')
    cy.contains('nav a', /^Mi perfil$/).click()
    cy.get('#profile-email').should('have.value', user.email)
    cy.contains('nav a', /^Mis favoritas$/).click()
    cy.contains('h1', /^Mis favoritas$/).should('be.visible')
    cy.contains('button', /^Cerrar sesión$/).click()
    cy.location('hash').should('eq', '#/')
    cy.visit('/#/my-campaigns')
    cy.location('hash').should('eq', '#/login')
    cy.get('#email').type(user.email)
    cy.get('#password').type(password, { log: false })
    submitAuth('login', /^Iniciar sesión$/, [200])
    cy.location('hash').should('eq', '#/home')
  })

  it('E3-CY-02: campos obligatorios y credenciales incorrectas en login', () => {
    cy.visit('/#/login')
    cy.contains('button', /^Iniciar sesión$/).click()
    cy.get('#auth-error-email').should('have.text', 'Campo obligatorio')
    cy.get('#auth-error-password').should('have.text', 'Campo obligatorio')
    cy.get('#email').type(account().email)
    cy.get('#password').type('incorrecta', { log: false })
    submitAuth('login', /^Iniciar sesión$/, [401])
    cy.contains('[role=alert]', 'Correo o contraseña incorrectos').should('be.visible')
    cy.location('hash').should('eq', '#/login')
    cy.get('#email').should('not.have.value', '')
  })

  it('E3-CY-03: registro rechaza correo inválido, confirmación distinta y duplicados', () => {
    const user = account()
    cy.visit('/#/register')
    cy.get('#name').type(user.name)
    cy.get('#email').type('correo-invalido')
    cy.get('#password').type(password, { log: false })
    cy.get('#confirmation').type('otra-clave', { log: false })
    cy.contains('button', /^Crear cuenta$/).click()
    cy.get('#auth-error-email').should('contain.text', 'correo válido')
    cy.get('#auth-error-confirmation').should('contain.text', 'no coinciden')
    cy.get('#email').clear().type(user.email)
    cy.get('#confirmation').clear().type(password, { log: false })
    submitAuth('register', /^Crear cuenta$/, [201])
    cy.location('hash').should('eq', '#/home')
    cy.contains('button', /^Cerrar sesión$/).click()
    cy.location('hash').should('eq', '#/')
    cy.visit('/#/register')
    cy.get('#name').clear().type(user.name)
    cy.get('#email').clear().type(user.email)
    cy.get('#password').type(password, { log: false })
    cy.get('#confirmation').type(password, { log: false })
    submitAuth('register', /^Crear cuenta$/, [409])
    cy.get('#auth-error-email').should('contain.text', 'Este correo ya está registrado')
    cy.location('hash').should('eq', '#/register')
  })

  it('E3-CY-04: crear, listar, abrir, editar y eliminar un borrador con confirmación', () => {
    register(account())
    const title = 'CRUD entrega 3 ' + Date.now()
    createCampaign(title).then(hash => {
      cy.contains('nav a', /^Mis campañas$/).click()
      cy.contains('.campaign-tile', title).click()
      cy.location('hash').should('eq', hash)
      cy.contains('.campaign-description', 'Proyecto de prueba de la tercera entrega.').should('be.visible')
      cy.get('.summary-image').should('be.visible').and($image => {
        expect($image[0].naturalWidth).to.be.greaterThan(0)
      })
      cy.contains('a', /^Editar campaña$/).click()
      cy.get('#campaign-title').clear().type(title + ' editado')
      cy.contains('button', /^Guardar cambios$/).click()
      cy.contains('h1', title + ' editado').should('be.visible')
      cy.reload()
      cy.contains('h1', title + ' editado').should('be.visible')
      cy.contains('button', /^Eliminar campaña$/).click()
      cy.contains('[role=alertdialog]', 'Esta acción es permanente').should('be.visible')
      cy.contains('[role=alertdialog] button', /^Volver$/).click()
      cy.contains('h1', title + ' editado').should('be.visible')
      cy.contains('button', /^Eliminar campaña$/).click()
      cy.contains('button', /^Sí, eliminar permanentemente$/).click()
      cy.location('hash').should('eq', '#/my-campaigns')
      cy.contains('.campaign-tile', title).should('not.exist')
      cy.visit('/' + hash)
      cy.contains('[role=alert]', 'Campaña no encontrada.').should('be.visible')
    })
  })

  it('E3-CY-05: creación rechaza campos vacíos, meta inválida y fecha vencida', () => {
    register(account())
    cy.visit('/#/campaigns/new')
    cy.contains('button', /^Guardar borrador$/).click()
    for (const field of ['title', 'description', 'category', 'image', 'goal', 'deadline']) {
      cy.get('#error-' + field).should('contain.text', 'Campo requerido')
    }
    fillCampaign('Campaña con validaciones E3')
    cy.get('#campaign-goal').clear().type('0')
    cy.get('#campaign-deadline').clear().type('2000-01-01')
    cy.contains('button', /^Guardar borrador$/).click()
    cy.get('#error-goal').should('contain.text', 'mayor a 0')
    cy.get('#error-deadline').should('contain.text', 'posterior a hoy')
    cy.location('hash').should('eq', '#/campaigns/new')
    cy.contains('nav a', /^Mis campañas$/).click()
    cy.contains('.campaign-tile', 'Campaña con validaciones E3').should('not.exist')
  })

  it('E3-CY-06: búsqueda por título y descripción, sin resultados y limpieza', () => {
    register(account())
    const marker = 'busquedae3' + Date.now()
    const title = 'Proyecto ' + marker
    const description = 'Descripción especial descripcion' + marker
    createCampaign(title, description)
    cy.contains('button', /^Activar campaña$/).click()
    cy.get('.draft-badge').should('have.text', 'Activa')
    home()
    search(marker.toUpperCase())
    cy.get('.campaign-tile').should('have.length', 1).and('contain.text', title)
    search('descripcion' + marker)
    cy.get('.campaign-tile').should('have.length', 1).and('contain.text', title)
    search('sinresultados' + marker)
    cy.contains('No se encontraron campañas para esta búsqueda').should('be.visible')
    cy.get('.campaign-tile').should('not.exist')
    cy.contains('button', /^Limpiar búsqueda$/).click()
    cy.get('#campaign-search').should('have.value', '')
    cy.contains('.campaign-tile', title).should('be.visible').click()
    cy.contains('h1', title).should('be.visible')
  })
})

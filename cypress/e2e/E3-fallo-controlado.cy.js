// Prueba temporal para acreditar FAILURE en Jenkins y su notificación a Discord.
// La marca esperada no existe: el fallo es intencional y no es un defecto de la app.
describe('Entrega 3: fallo controlado de UI', () => {
  it('E3-FAIL-01: demuestra que un fallo E2E hace fallar el pipeline', () => {
    cy.visit('/')
    cy.get('body').should('contain.text', 'E3_FALLO_CONTROLADO_INTENCIONAL')
  })
})

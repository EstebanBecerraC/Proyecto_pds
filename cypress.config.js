import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || process.env.BASE_URL || 'http://localhost:5173',
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.cy.js',
  },
  screenshotsFolder: 'reports/entrega-3/screenshots',
  videosFolder: 'reports/entrega-3/videos',
  screenshotOnRunFailure: true,
  video: false,
})

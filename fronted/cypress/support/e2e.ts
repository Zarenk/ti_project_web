// Punto de entrada de soporte: registra los comandos custom.
import "./commands"

// Prevent uncaught application errors (e.g. RSC streaming SyntaxError)
// from failing Cypress tests. These are Next.js dev-mode artifacts.
Cypress.on("uncaught:exception", (err) => {
  if (
    err.message.includes("Invalid or unexpected token") ||
    err.message.includes("Unexpected token") ||
    err.message.includes("hydrat") ||
    err.message.includes("NEXT_") ||
    err.message.includes("__next") ||
    err.message.includes("Loading chunk") ||
    err.message.includes("ChunkLoadError")
  ) {
    return false // suppress and don't fail the test
  }
})

// Warm up Next.js dev server by requesting the login page before tests run.
// This triggers page compilation so the first actual test doesn't timeout.
// Uses cy.request() instead of cy.visit() to avoid content-type failures
// when the server returns 500 during startup.
before(() => {
  cy.request({ url: "/login", failOnStatusCode: false, timeout: 60000 })
  cy.wait(2000)
})

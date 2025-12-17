// Suite básica de tests E2E para validar el flujo de contexto en UI real.
const mockUser = {
  id: 1,
  name: "E2E Admin",
  role: "SUPER_ADMIN_GLOBAL",
  isPublicSignup: false,
}

describe("Context restore flow", () => {
  beforeEach(() => {
    cy.loginViaApi()
    cy.intercept("GET", "/api/me", mockUser).as("currentUserForContext")
  })

  it("shows history and allows restoration UI", () => {
    cy.visit("/dashboard/account/context-history")
    cy.contains("Historial de contextos", { timeout: 10000 }).should("be.visible")
    cy.get("body").then(($body) => {
      const restoreBtn = $body.find("button:contains('Restaurar')").first()
      if (restoreBtn.length) {
        cy.wrap(restoreBtn).click({ force: true })
        cy.contains("Contexto restaurado", { timeout: 5000 }).should("exist")
      } else {
        cy.log("Sin entradas aún para restaurar, se omite la acción.")
      }
    })
  })

  it("renders context dashboard metrics", () => {
    cy.visit("/dashboard/account/context-dashboard")
    cy.contains("Dashboard de contexto", { timeout: 10000 }).should("be.visible")
    cy.contains("Actividad personal", { timeout: 10000 }).should("exist")
  })
})

export {}

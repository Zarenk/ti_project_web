import { T } from "./_support/test-constants"

describe("05 — Cash register opening", () => {
  beforeEach(() => {
    cy.loginAs(T.ADMIN_EMAIL, T.PASSWORD)
    cy.setTenantSelection(1, 1)
  })

  it("opens the cash register page", () => {
    cy.visit("/dashboard/cashregister", { timeout: T.PAGE_LOAD })

    // The page should load without errors
    cy.contains(/[Cc]aja/, { timeout: T.API_WAIT }).should("be.visible")
  })

  it("verifies or opens a cash register for the store", () => {
    cy.visit("/dashboard/cashregister", { timeout: T.PAGE_LOAD })

    // Check if there's already an active cash register
    cy.get("body", { timeout: T.API_WAIT }).then(($body) => {
      const hasActiveCash = $body.text().includes("ACTIVA") || $body.text().includes("Activa")

      if (!hasActiveCash) {
        // If no active cash register, look for an "open" or "create" button
        const openBtn = $body.find("button:contains('Abrir'), button:contains('Nueva'), button:contains('Crear')")
        if (openBtn.length) {
          cy.wrap(openBtn.first()).click()

          // Fill initial balance = 0
          cy.get('[role="dialog"]', { timeout: 5000 }).within(() => {
            cy.get('input[type="number"]').first().clear().type("0")
            cy.contains("button", /[Aa]brir|[Cc]onfirmar|[Cc]rear/).click()
          })
        }
      }
    })

    // Verify we can see the cash register (active or just opened)
    cy.contains(/[Cc]aja/, { timeout: T.API_WAIT }).should("be.visible")
  })
})

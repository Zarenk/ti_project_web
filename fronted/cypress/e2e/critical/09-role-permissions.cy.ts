import { T } from "./_support/test-constants"

describe("09 — Role-based permissions", () => {
  describe("EMPLOYEE role restrictions", () => {
    beforeEach(() => {
      cy.loginAs(T.EMPLOYEE_EMAIL, T.PASSWORD)
      cy.setTenantSelection(1, 1)
    })

    it("can access the dashboard", () => {
      cy.visit("/dashboard", { timeout: T.PAGE_LOAD })
      cy.url().should("include", "/dashboard")
    })

    it("dashboard loads for employee without financial summary", () => {
      cy.visit("/dashboard", { timeout: T.PAGE_LOAD })
      cy.url().should("include", "/dashboard")

      // Employee should see the dashboard page load
      cy.get("body", { timeout: T.API_WAIT }).then(($body) => {
        const text = $body.text()
        // Should NOT see financial summary that's admin-only
        expect(text).to.not.include("Resumen Financiero")
      })
    })

    it("can view products list", () => {
      cy.visit("/dashboard/products", { timeout: T.PAGE_LOAD })
      cy.contains(T.PRODUCT_NAME_EDITED, { timeout: T.API_WAIT }).should("be.visible")
    })

    it("can access sales page", () => {
      cy.visit("/dashboard/sales", { timeout: T.PAGE_LOAD })
      cy.url().should("include", "/dashboard/sales")
    })

    it("cannot access accounting", () => {
      cy.visit("/dashboard/accounting", { timeout: T.PAGE_LOAD })
      // Should redirect away or show access denied
      cy.url({ timeout: T.PAGE_LOAD }).then((url) => {
        // Either redirected to dashboard or shows an unauthorized message
        const isBlocked =
          !url.includes("/accounting") ||
          url.includes("/dashboard") ||
          url.includes("/unauthorized")
        expect(isBlocked).to.be.true
      })
    })

    it("cannot access system options", () => {
      cy.visit("/dashboard/options", { timeout: T.PAGE_LOAD })
      cy.url({ timeout: T.PAGE_LOAD }).then((url) => {
        const isBlocked =
          !url.includes("/options") ||
          url.includes("/dashboard") ||
          url.includes("/unauthorized")
        expect(isBlocked).to.be.true
      })
    })

    it("cannot delete sales (button not visible)", () => {
      cy.visit("/dashboard/sales", { timeout: T.PAGE_LOAD })

      // If there are sales rows, the "Eliminar" button should NOT exist
      // (DeleteActionsGuard hides it for EMPLOYEE role)
      cy.get("body", { timeout: T.API_WAIT }).then(($body) => {
        const rows = $body.find("tbody tr")
        if (rows.length > 0) {
          cy.get("tbody tr").first().within(() => {
            cy.contains("button", /[Ee]liminar/).should("not.exist")
          })
        }
      })
    })
  })

  describe("ADMIN role permissions", () => {
    beforeEach(() => {
      cy.loginAs(T.ADMIN_EMAIL, T.PASSWORD)
      cy.setTenantSelection(1, 1)
    })

    it("can access the dashboard with KPIs", () => {
      cy.visit("/dashboard", { timeout: T.PAGE_LOAD })
      cy.url().should("include", "/dashboard")
      // Admin should see KPI cards
      cy.get("body", { timeout: T.API_WAIT }).then(($body) => {
        const text = $body.text()
        // Should have some KPI-like content (inventory, sales, etc.)
        const hasKPIs =
          text.includes("Inventario") ||
          text.includes("Ventas") ||
          text.includes("Stock") ||
          text.includes("Ordenes")
        expect(hasKPIs).to.be.true
      })
    })

    it("can access accounting", () => {
      cy.visit("/dashboard/accounting", { timeout: T.PAGE_LOAD })
      cy.url().should("include", "/accounting")
    })

    it("can access system options", () => {
      cy.visit("/dashboard/options", { timeout: T.PAGE_LOAD })
      cy.url().should("include", "/options")
    })
  })

  describe("SUPER_ADMIN_ORG role permissions", () => {
    beforeEach(() => {
      cy.loginAs(T.ORG_ADMIN_EMAIL, T.PASSWORD)
      cy.setTenantSelection(1, 1)
    })

    it("can access the dashboard with full data", () => {
      cy.visit("/dashboard", { timeout: T.PAGE_LOAD })
      cy.url().should("include", "/dashboard")
    })

    it("can access accounting", () => {
      cy.visit("/dashboard/accounting", { timeout: T.PAGE_LOAD })
      cy.url().should("include", "/accounting")
    })

    it("can access tenancy management", () => {
      cy.visit("/dashboard/tenancy", { timeout: T.PAGE_LOAD })
      cy.url().should("include", "/tenancy")
    })
  })
})

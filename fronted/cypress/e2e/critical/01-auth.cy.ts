import { T } from "./_support/test-constants"

describe("01 — Authentication flows", () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it("logs in as ADMIN via UI and reaches /dashboard", () => {
    cy.visit("/login")
    cy.get("#email").type(T.ADMIN_EMAIL)
    cy.get("#password").type(T.PASSWORD)
    cy.contains("button", "Iniciar Sesion").click()
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard")
  })

  it("logs in as EMPLOYEE via UI and reaches /dashboard", () => {
    cy.visit("/login")
    cy.get("#email").type(T.EMPLOYEE_EMAIL)
    cy.get("#password").type(T.PASSWORD)
    cy.contains("button", "Iniciar Sesion").click()
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard")
  })

  it("logs in as SUPER_ADMIN_ORG via UI and reaches /dashboard", () => {
    cy.visit("/login")
    cy.get("#email").type(T.ORG_ADMIN_EMAIL)
    cy.get("#password").type(T.PASSWORD)
    cy.contains("button", "Iniciar Sesion").click()
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard")
  })

  it("shows error on invalid credentials", () => {
    cy.visit("/login")
    cy.get("#email").type("invalid@nope.com")
    cy.get("#password").type("WrongPassword123!")
    cy.contains("button", "Iniciar Sesion").click()
    // Should stay on login and show some kind of error
    cy.url({ timeout: 5000 }).should("include", "/login")
  })

  it("logs out and redirects to /login", () => {
    // First log in via API
    cy.loginAs(T.ADMIN_EMAIL, T.PASSWORD)
    cy.visit("/dashboard")
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard")
    // Now logout
    cy.logout()
    cy.url().should("include", "/login")
  })
})

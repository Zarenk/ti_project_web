/// <reference types="cypress" />

// Comandos personalizados para compartir login/API helpers entre specs.
declare global {
  namespace Cypress {
    interface Chainable {
      loginViaApi(): Chainable<void>
      loginAs(email: string, password: string): Chainable<void>
      setTenantSelection(orgId: number | null, companyId: number | null): Chainable<void>
      login(email: string, password: string): Chainable<void>
      logout(): Chainable<void>
      loginAsAdmin(): Chainable<void>
      apiGet(path: string): Chainable<Cypress.Response<any>>
      apiPost(path: string, body?: object): Chainable<Cypress.Response<any>>
    }
  }
}

Cypress.Commands.add("loginViaApi", () => {
  // Usa el endpoint de login del backend para obtener un access_token
  // y colocarlo en localStorage antes de visitar la app.
  const email = Cypress.env("E2E_EMAIL")
  const password = Cypress.env("E2E_PASSWORD")
  const backendUrl = Cypress.env("BACKEND_URL")

  if (!email || !password) {
    throw new Error(
      "E2E_EMAIL y E2E_PASSWORD deben estar definidos en las variables de entorno de Cypress",
    )
  }

  cy.request({
    method: "POST",
    url: `${backendUrl}/users/login`,
    body: { email, password },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status !== 201 && response.status !== 200) {
      throw new Error(
        `Login API failed (${response.status}). Verifica las credenciales usadas en Cypress env.`,
      )
    }
    const token = response.body?.access_token
    if (!token) {
      throw new Error("La respuesta de login no contiene access_token.")
    }
    cy.setCookie("token", token)
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", token)
      },
    })
  })
})

Cypress.Commands.add("setTenantSelection", (orgId: number | null, companyId: number | null) => {
  if (orgId === null) {
    cy.clearCookie("tenant_org_id")
  } else {
    cy.setCookie("tenant_org_id", String(orgId))
  }

  if (companyId === null) {
    cy.clearCookie("tenant_company_id")
  } else {
    cy.setCookie("tenant_company_id", String(companyId))
  }

  cy.window().then((win) => {
    if (orgId == null && companyId == null) {
      win.localStorage.removeItem("dashboard.tenant-selection")
      return
    }
    win.localStorage.setItem(
      "dashboard.tenant-selection",
      JSON.stringify({
        orgId,
        companyId,
      }),
    )
  })
})

// ==================== LEARNING SYSTEM COMMANDS ====================

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.visit('/login')
      cy.get('#email').type(email)
      cy.get('#password').type(password)
      cy.contains('button', 'Iniciar Sesion').click()

      // Esperar a que redirija al dashboard
      cy.url({ timeout: 10000 }).should('include', '/dashboard')

      // Verificar que el token esté en las cookies
      cy.getCookie('token').should('exist')
    },
    {
      validate() {
        cy.getCookie('token').should('exist')
      },
    }
  )
})

Cypress.Commands.add('logout', () => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.visit('/login')
})

Cypress.Commands.add('loginAsAdmin', () => {
  // Usar credenciales de admin desde variables de entorno o valores por defecto
  const adminEmail = Cypress.env('ADMIN_EMAIL') || 'superadmin@test.com'
  const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123'
  cy.login(adminEmail, adminPassword)
})

// ==================== E2E CRITICAL COMMANDS ====================

/**
 * Login via API with explicit credentials. Sets token in cookie + localStorage.
 * Does NOT use cy.session() — each call performs a fresh login.
 */
Cypress.Commands.add("loginAs", (email: string, password: string) => {
  const backendUrl = Cypress.env("BACKEND_URL")
  cy.request({
    method: "POST",
    url: `${backendUrl}/users/login`,
    body: { email, password },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status !== 201 && response.status !== 200) {
      throw new Error(
        `Login as ${email} failed (${response.status}): ${JSON.stringify(response.body)}`,
      )
    }
    const token = response.body?.access_token
    if (!token) {
      throw new Error(`Login response for ${email} missing access_token.`)
    }
    cy.setCookie("token", token)
    cy.window().then((win) => {
      win.localStorage.setItem("token", token)
    })
  })
})

/**
 * Authenticated GET request to the backend API.
 * Uses the token stored in localStorage.
 */
Cypress.Commands.add("apiGet", (path: string) => {
  const backendUrl = Cypress.env("BACKEND_URL")
  cy.window().then((win) => {
    const token = win.localStorage.getItem("token") ?? ""
    return cy.request({
      method: "GET",
      url: `${backendUrl}${path}`,
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    })
  })
})

/**
 * Authenticated POST request to the backend API.
 */
Cypress.Commands.add("apiPost", (path: string, body?: object) => {
  const backendUrl = Cypress.env("BACKEND_URL")
  cy.window().then((win) => {
    const token = win.localStorage.getItem("token") ?? ""
    return cy.request({
      method: "POST",
      url: `${backendUrl}${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ?? {},
      failOnStatusCode: false,
    })
  })
})

export {}

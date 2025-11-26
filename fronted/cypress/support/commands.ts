/// <reference types="cypress" />

// Comandos personalizados para compartir login/API helpers entre specs.
declare global {
  namespace Cypress {
    interface Chainable {
      loginViaApi(): Chainable<void>
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
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", token)
      },
    })
  })
})

export {}

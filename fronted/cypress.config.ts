import { defineConfig } from "cypress"

// Configuración base de Cypress para apuntar al frontend local y reutilizar envs.
export default defineConfig({
  e2e: {
    baseUrl: process.env.FRONTEND_BASE_URL || "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    pageLoadTimeout: 60000,
    defaultCommandTimeout: 15000,
    // Must be >= 1024px to trigger Tailwind lg: breakpoint for desktop filters
    viewportWidth: 1280,
    viewportHeight: 720,
  },
  env: {
    BACKEND_URL: process.env.E2E_BACKEND_URL || "http://localhost:4000/api",
  },
})

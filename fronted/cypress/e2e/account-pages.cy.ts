const backendBase: string = Cypress.env("BACKEND_URL") || "http://localhost:4000"
const apiBase = `${backendBase.replace(/\/$/, "")}/api`

type TenantPayload = {
  organization: { id: number; name: string; status: string } | null
  company: { id: number; name: string; status: string } | null
  companies: { id: number; name: string; status: string }[]
}

type ActiveTenantPayload = {
  organization: { id: number; name: string; status: string }
  company: { id: number; name: string; status: string }
  companies: { id: number; name: string; status: string }[]
}

const mockUser = {
  id: 1,
  name: "E2E Admin",
  role: "SUPER_ADMIN_GLOBAL",
  isPublicSignup: false,
}

const mockCurrentTenant: ActiveTenantPayload = {
  organization: { id: 1, name: "Testing Org", status: "ACTIVE" },
  company: { id: 1, name: "Testing Co", status: "ACTIVE" },
  companies: [{ id: 1, name: "Testing Co", status: "ACTIVE" }],
}

const emptyTenant: TenantPayload = {
  organization: null,
  company: null,
  companies: [],
}

const TENANCY_ENDPOINT = "**/api/tenancy/current"
const BILLING_INVOICES_ENDPOINT = "**/api/subscriptions/invoices*"
const EXPORTS_ENDPOINT = "**/api/subscriptions/exports*"
const EXPORTS_CREATE_ENDPOINT = "**/api/subscriptions/exports"
const SUMMARY_ENDPOINT = "**/api/subscriptions/me/summary"
const PLANS_ENDPOINT = "**/api/subscriptions/plans**"
const CHANGE_PLAN_ENDPOINT = "**/api/subscriptions/change-plan"
const CANCEL_SUBSCRIPTION_ENDPOINT = "**/api/subscriptions/cancel"
const SITE_SETTINGS_ENDPOINT = "**/api/site-settings**"
const ONBOARDING_PROGRESS_ENDPOINT = "**/api/onboarding/progress**"

const siteSettingsResponse = {
  settings: {
    company: {
      name: "Testing Org",
      receiptFormat: "a4",
      documentNumber: "",
      address: "",
      phone: "",
      email: "",
    },
    brand: {
      siteName: "Testing Org Portal",
      logoUrl: "",
      faviconUrl: "",
    },
    theme: {
      mode: "system",
      colors: {
        primary: "#0f172a",
        accent: "#f1f5f9",
        bg: "#ffffff",
        text: "#020817",
      },
      preset: "shadcn-default",
    },
    typography: {
      fontFamily: "Inter",
      baseSize: 16,
      scale: 1.25,
    },
    layout: {
      container: "lg",
      spacing: 4,
      radius: 0.75,
      shadow: "md",
      buttonStyle: "rounded",
    },
    navbar: {
      style: "light",
      position: "fixed",
      showSearch: true,
      links: [
        { label: "Inicio", href: "/" },
        { label: "Productos", href: "/productos" },
        { label: "Contacto", href: "/contacto" },
      ],
    },
    hero: {
      title: "Bienvenido",
      subtitle: "Explora la plataforma demo",
      ctaLabel: "Comenzar",
      ctaHref: "",
      enableCarousel: false,
      speed: 5,
      particles: false,
    },
    components: {
      cardStyle: "shadow",
      chipStyle: "solid",
      tableDensity: "normal",
    },
    seo: {
      defaultTitle: "Testing Org Portal",
      defaultDescription: "Demo SaaS",
      ogImage: "",
      baseSlug: "",
    },
    integrations: {
      gaId: "",
      metaPixelId: "",
      loadOnCookieAccept: true,
    },
    social: {
      facebook: "",
      instagram: "",
      tiktok: "",
      youtube: "",
      x: "",
    },
    privacy: {
      cookieBanner: false,
      cookieText: "Este sitio utiliza cookies para mejorar tu experiencia.",
      acceptText: "Aceptar",
    },
    maintenance: {
      enabled: false,
      message: "Estamos realizando mantenimiento. Vuelve pronto.",
    },
    system: {
      autoBackupFrequency: "manual",
      lastAutoBackupAt: null,
    },
    permissions: {
      dashboard: true,
      catalog: true,
      store: true,
      inventory: true,
      sales: true,
      purchases: true,
      accounting: true,
      marketing: true,
      providers: true,
      settings: true,
      hidePurchaseCost: false,
      hideDeleteActions: false,
    },
  },
  updatedAt: null,
  createdAt: null,
}

const onboardingProgressResponse = {
  id: 1,
  organizationId: mockCurrentTenant.organization.id,
  currentStep: 1,
  companyProfile: { completed: true, completedAt: "2025-01-01T00:00:00.000Z" },
  storeSetup: { completed: true, completedAt: "2025-01-02T00:00:00.000Z" },
  sunatSetup: { completed: false },
  dataImport: { completed: false },
  demoStatus: "SEEDED",
  demoSeededAt: "2025-01-01T00:00:00.000Z",
  demoClearedAt: null,
  wizardDismissedAt: null,
  isCompleted: false,
  completedAt: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
}

function stubCommonRequests(currentTenant: TenantPayload = mockCurrentTenant) {
  cy.intercept("GET", "/api/me", mockUser).as("currentUser")
  cy.intercept("GET", TENANCY_ENDPOINT, currentTenant).as("currentTenant")
}

function stubDashboardDependencies() {
  cy.intercept("GET", SITE_SETTINGS_ENDPOINT, siteSettingsResponse).as("siteSettings")
  cy.intercept("GET", ONBOARDING_PROGRESS_ENDPOINT, onboardingProgressResponse).as("onboardingProgress")
}

describe("Account billing / exports / plan pages", () => {
  beforeEach(() => {
    cy.loginViaApi()
    stubDashboardDependencies()
  })

  it("renders billing history with stub invoices", () => {
    stubCommonRequests()
    cy.setTenantSelection(mockCurrentTenant.organization.id, mockCurrentTenant.company.id)

    const mockInvoices = [
      {
        id: 1,
        code: "INV-001",
        amount: "120.00",
        currency: "PEN",
        status: "PAID",
        billingPeriodStart: "2025-01-01T00:00:00.000Z",
        billingPeriodEnd: "2025-01-31T23:59:59.000Z",
        createdAt: "2025-01-02T12:00:00.000Z",
        planName: "Plan Demo",
        pdfAvailable: true,
        canRetry: false,
        paymentMethod: { brand: "VISA", last4: "4242" },
      },
    ]

    cy.intercept("GET", BILLING_INVOICES_ENDPOINT, (req) => {
      // La pagina puede mandar organizationId=1 justo despues del login antes de actualizar
      // la seleccion mockeada; respondemos igual para mantener la vista estable.
      req.reply(mockInvoices)
    }).as("billingData")

    cy.visit("/dashboard/account/billing")

    cy.wait("@billingData")
    cy.contains("Facturacion y pagos", { timeout: 10000, matchCase: false }).should("be.visible")
    cy.contains("INV-001", { timeout: 10000 }).should("exist")
    cy.contains("Plan Demo").should("exist")
  })

  it("shows helper message when no organization is seleccionada", () => {
    stubCommonRequests(emptyTenant)
    cy.setTenantSelection(null, null)

    cy.intercept("GET", BILLING_INVOICES_ENDPOINT, []).as("billingEmpty")

    cy.visit("/dashboard/account/billing")
    cy.wait("@currentTenant")
    cy.wait("@billingEmpty")
    cy.get('[data-testid="billing-no-selection"]', { timeout: 10000 }).should("be.visible")
  })

  it("renders export list and triggers solicitation", () => {
    stubCommonRequests()
    cy.setTenantSelection(mockCurrentTenant.organization.id, mockCurrentTenant.company.id)

    const firstBatch = [
      {
        id: 1,
        status: "PENDING",
        cleanupStatus: "PENDING",
        requestedAt: "2025-02-01T10:00:00.000Z",
        completedAt: null,
        expiresAt: null,
        errorMessage: null,
        fileReady: false,
      },
    ]

    const refreshedBatch = [
      firstBatch[0],
      {
        id: 2,
        status: "COMPLETED",
        cleanupStatus: "COMPLETED",
        requestedAt: "2025-02-02T12:00:00.000Z",
        completedAt: "2025-02-02T12:30:00.000Z",
        expiresAt: "2025-02-05T12:30:00.000Z",
        errorMessage: null,
        fileReady: true,
      },
    ]

    let exportsCallCount = 0
    cy.intercept("GET", EXPORTS_ENDPOINT, (req) => {
      exportsCallCount += 1
      req.reply(exportsCallCount > 1 ? refreshedBatch : firstBatch)
    }).as("exportsList")

    cy.intercept("POST", EXPORTS_CREATE_ENDPOINT, {
      statusCode: 202,
      body: { id: 2 },
    }).as("requestExport")

    cy.visit("/dashboard/account/exports")
    cy.wait("@exportsList")
    cy.contains(/Exportaciones de datos/i, { timeout: 10000 }).should("be.visible")
    cy.contains("#1").should("exist")

    cy.contains(/Solicitar exportaci/i).click()
    cy.wait("@requestExport")
    cy.wait("@exportsList")
    cy.contains("#2", { timeout: 10000 }).should("exist")
  })

  it("shows subscription usage summary", () => {
    stubCommonRequests()
    cy.setTenantSelection(mockCurrentTenant.organization.id, mockCurrentTenant.company.id)

    cy.intercept("GET", SUMMARY_ENDPOINT, {
      plan: { name: "Plan Demo", code: "DEMO", status: "TRIAL" },
      trial: { isTrial: true, daysLeft: 10, endsAt: "2025-12-31T00:00:00.000Z" },
      quotas: { users: 5, invoices: 100, storageMB: 2048 },
      usage: { users: 3, invoices: 40, storageMB: 512 },
    }).as("subscriptionSummary")

    cy.intercept("GET", PLANS_ENDPOINT, [
      {
        id: 1,
        code: "DEMO",
        name: "Plan Demo",
        interval: "monthly",
        price: "0.00",
        currency: "PEN",
        description: "Incluye datos demo",
      },
      {
        id: 2,
        code: "GROWTH",
        name: "Plan Crecimiento",
        interval: "monthly",
        price: "120.00",
        currency: "PEN",
        description: "Para empresas en expansion",
        features: { users: 10, invoices: 500 },
      },
    ]).as("plansList")

    cy.visit("/dashboard/account/plan")
    cy.wait("@subscriptionSummary")
    cy.wait("@plansList")
    cy.contains(/Consumo del plan/i, { timeout: 10000 }).should("be.visible")
    cy.contains(/Usuarios/i).should("exist")
    cy.contains(/Comprobantes/i).should("exist")
    cy.contains(/Almacenamiento/i).should("exist")
    cy.contains(/Cambiar de plan/i).should("exist")
    cy.contains(/Cancelar suscripcion/i).should("exist")
  })

  it("permite gestionar upgrades y cancelacion self-service", () => {
    stubCommonRequests()
    cy.setTenantSelection(mockCurrentTenant.organization.id, mockCurrentTenant.company.id)

    let summaryCalls = 0
    cy.intercept("GET", SUMMARY_ENDPOINT, (req) => {
      summaryCalls += 1
      const baseSummary = {
        quotas: { users: 5, invoices: 100, storageMB: 2048 },
        usage: { users: 3, invoices: 40, storageMB: 512 },
        trial: { isTrial: false, daysLeft: null, endsAt: null },
      }
      if (summaryCalls === 1) {
        req.reply({
          ...baseSummary,
          plan: { name: "Plan Demo", code: "DEMO", status: "ACTIVE" },
        })
      } else {
        req.reply({
          ...baseSummary,
          plan: { name: "Plan Crecimiento", code: "GROWTH", status: "ACTIVE" },
        })
      }
    }).as("subscriptionSummaryChange")

    cy.intercept("GET", PLANS_ENDPOINT, [
      {
        id: 1,
        code: "DEMO",
        name: "Plan Demo",
        interval: "monthly",
        price: "0.00",
        currency: "PEN",
      },
      {
        id: 2,
        code: "GROWTH",
        name: "Plan Crecimiento",
        interval: "monthly",
        price: "120.00",
        currency: "PEN",
      },
    ]).as("plansListChange")

    cy.intercept("POST", CHANGE_PLAN_ENDPOINT, (req) => {
      req.reply({ status: "scheduled" })
    }).as("changePlanRequest")

    cy.intercept("POST", CANCEL_SUBSCRIPTION_ENDPOINT, (req) => {
      req.reply({ status: "scheduled" })
    }).as("cancelSubscriptionRequest")

    cy.visit("/dashboard/account/plan")
    cy.wait("@subscriptionSummaryChange")
    cy.wait("@plansListChange")

    cy.contains("Cambiar de plan", { timeout: 10000 }).should("be.visible")
    cy.get("body")
      .should(($body) => {
        expect($body[0].style.pointerEvents).not.to.equal("none")
      })
    cy.get("#plan-select").scrollIntoView().click({ force: true })
    cy.contains("Plan Crecimiento").click()
    cy.contains(/Solicitar cambio/i).click()
    cy.wait("@changePlanRequest").its("request.body").should("include", { planCode: "GROWTH" })
    cy.wait("@subscriptionSummaryChange")

    cy.get("#cancel-reason").click()
    cy.contains("El precio no se ajusta a mi presupuesto").click()
    cy.contains(/Confirmar cancelacion/i).click()
    cy.wait("@cancelSubscriptionRequest").its("request.body").should("include", { reasonCategory: "price" })
  })
})

export {}

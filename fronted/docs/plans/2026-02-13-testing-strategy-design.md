# Testing Strategy Design - Frontend Next.js

**Date:** 2026-02-13
**Status:** ✅ Validated
**Approach:** Pyramid Testing (Unit → Integration → E2E)
**Timeline:** 6 weeks
**Expected Coverage:** 45-50%

---

## Executive Summary

This document outlines a comprehensive testing strategy for the frontend application using the **Pyramid Testing** approach. The strategy prioritizes ROI, uses the real backend when possible, and focuses on critical business modules: Quotes, Sales, Entries, Inventory, Products, Clients, Accounting, Authentication, and Tenancy.

### Key Principles

- ✅ **Pragmatic**: ROI from day 1, not over-engineering
- ✅ **Real Backend**: Use real API in development, mocks only in CI
- ✅ **Incremental**: 6-week plan with measurable milestones
- ✅ **Scalable**: Patterns designed for team growth

---

## 1. Testing Architecture - The Pyramid

```
        /\      ← E2E: 5-10 critical flows (Cypress)
       /  \       • Slow but high confidence
      /    \      • Login → Create → Verify
     /      \
    /________\  ← Integration: 20-30 API tests (Vitest + Real Backend)
   /          \   • Medium speed, real backend in dev
  /            \  • Mock only in CI
 /______________\ ← Unit: 100+ tests (Vitest)
                    • Fast, pure functions
                    • Calculations, validators, formatters
```

### Why This Approach?

- **Fast feedback**: Unit tests run in <1s
- **Real confidence**: Integration tests use real backend
- **Cost-effective**: Few E2E tests (expensive to maintain)
- **Pragmatic**: 80% of bugs caught with 20% of effort

---

## 2. Directory Structure

```
fronted/
├── __tests__/                    # Global test infrastructure
│   ├── setup.ts                  # Vitest global setup
│   ├── helpers/
│   │   ├── test-utils.tsx       # render(), screen, custom renders
│   │   ├── mock-factories.ts    # Factory functions for test data
│   │   └── api-mocks.ts         # MSW handlers (for CI only)
│   └── fixtures/                # Real data from backend
│       ├── quotes.fixtures.ts   # Generated from real API
│       ├── sales.fixtures.ts
│       └── products.fixtures.ts
│
├── src/app/dashboard/
│   ├── quotes/
│   │   ├── __tests__/
│   │   │   ├── quotes.api.test.ts      # API integration tests
│   │   │   ├── page.test.tsx           # Component integration
│   │   │   ├── calculations.test.ts    # Unit tests
│   │   │   └── utils.test.ts
│   │   ├── components/
│   │   │   └── __tests__/              # Component unit tests
│   │   │       ├── quote-action-buttons.test.tsx
│   │   │       └── quote-summary-panel.test.tsx
│   │   ├── quotes.api.tsx
│   │   └── page.tsx
│   │
│   └── [other modules follow same pattern]
│
├── cypress/
│   ├── e2e/
│   │   └── critical-flows/
│   │       ├── quote-to-issue.cy.ts
│   │       ├── sale-to-invoice.cy.ts
│   │       └── entry-to-inventory.cy.ts
│   └── support/
│       ├── commands.ts              # Custom commands
│       └── e2e.ts
│
├── scripts/
│   └── generate-fixtures.ts        # Generate fixtures from real backend
│
└── vitest.config.ts                # Vitest configuration
```

---

## 3. Level 1: Unit Tests - Pure Functions & Business Logic

### What to Test

- ✅ **Calculations**: Totals, taxes, margins, discounts
- ✅ **Formatters**: Dates, currency, accounting formats
- ✅ **Validators**: Form validation, business rules
- ✅ **Transformers**: API data ↔ UI data mapping

### Pattern Example

```typescript
// src/app/dashboard/quotes/__tests__/calculations.test.ts
import { describe, it, expect } from 'vitest'
import { calculateQuoteTotals, calculateMargin } from '../utils/calculations'

describe('Quote Calculations', () => {
  describe('calculateQuoteTotals', () => {
    it('calculates subtotal correctly with multiple items', () => {
      const items = [
        { price: 100, quantity: 2 },
        { price: 50, quantity: 1 }
      ]
      const result = calculateQuoteTotals(items, 0.18)

      expect(result.subtotal).toBe(250)
      expect(result.tax).toBe(45)
      expect(result.total).toBe(295)
    })

    it('handles empty items array', () => {
      const result = calculateQuoteTotals([], 0.18)

      expect(result.subtotal).toBe(0)
      expect(result.total).toBe(0)
    })

    it('applies custom tax rate correctly', () => {
      const items = [{ price: 100, quantity: 1 }]
      const result = calculateQuoteTotals(items, 0.10)

      expect(result.tax).toBe(10)
    })
  })

  describe('calculateMargin', () => {
    it('calculates margin percentage correctly', () => {
      expect(calculateMargin(100, 70)).toBe(30)
    })

    it('handles zero cost', () => {
      expect(calculateMargin(100, 0)).toBe(100)
    })
  })
})
```

### Coverage Goal

- **Target**: 90%+ for pure functions
- **Why**: Easy and fast to test, high ROI

---

## 4. Level 2: Integration Tests - APIs with Real Backend

### Hybrid Strategy: Real Backend + Realistic Mocks

**In Development:** Use **REAL backend** at `http://localhost:4000`
**In CI:** Use MSW with fixtures generated from real backend

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    env: {
      // KEY: Use real backend in development
      NEXT_PUBLIC_API_URL: process.env.CI
        ? 'http://localhost:3001'  // Mock server in CI
        : 'http://localhost:4000'  // REAL backend in dev
    }
  }
})
```

### Generate Fixtures from Real Backend

```typescript
// scripts/generate-fixtures.ts
import fs from 'fs'
import { authFetch } from '../src/lib/auth'

async function generateFixtures() {
  console.log('🔄 Fetching data from REAL backend...')

  // Call REAL backend
  const catalog = await authFetch('http://localhost:4000/api/quotes/catalog')
  const clients = await authFetch('http://localhost:4000/api/clients')

  // Save real responses
  fs.writeFileSync(
    '__tests__/fixtures/quotes.fixtures.ts',
    `export const quotesFixtures = ${JSON.stringify(catalog, null, 2)}`
  )

  console.log('✅ Fixtures generated from REAL backend')
}

generateFixtures()
```

### API Test Pattern

```typescript
// src/app/dashboard/quotes/__tests__/quotes.api.test.ts
import { describe, it, expect } from 'vitest'
import { getQuoteCatalog, createQuote, issueQuote } from '../quotes.api'

describe('Quotes API Integration (Real Backend)', () => {
  it('fetches real catalog data', async () => {
    const catalog = await getQuoteCatalog(1)

    expect(catalog).toBeDefined()
    expect(catalog.pc.length).toBeGreaterThan(0)
    expect(catalog.pc[0].price).toBeTypeOf('number')
  })

  it('creates quote in real database', async () => {
    const quote = await createQuote({
      clientName: 'Test E2E Client',
      items: [{ productId: 1, quantity: 2 }]
    })

    expect(quote.id).toBeTypeOf('number')
    expect(quote.clientName).toBe('Test E2E Client')

    // Cleanup: Delete test data
    await deleteQuote(quote.id)
  })

  it('handles 404 errors correctly', async () => {
    await expect(getQuoteCatalog(999999))
      .rejects.toThrow('Not found')
  })
})
```

### Contract Tests - Validate Fixtures = Backend

```typescript
// __tests__/contracts/quotes-contract.test.ts
import { describe, it, expect } from 'vitest'
import { quotesFixtures } from '../fixtures/quotes.fixtures'

describe('Quotes API Contract', () => {
  it('real backend matches fixture structure', async () => {
    const realData = await fetch('http://localhost:4000/api/quotes/catalog')
      .then(r => r.json())

    // Validate structure matches
    expect(Object.keys(realData)).toEqual(Object.keys(quotesFixtures.catalog))
    expect(realData.pc[0]).toHaveProperty('id')
    expect(realData.pc[0]).toHaveProperty('name')
    expect(realData.pc[0]).toHaveProperty('price')
  })
})
```

### Coverage Goal

- **Target**: 80%+ for API functions
- **Why**: Critical for detecting integration issues

---

## 5. Level 3: Component Tests - React Components

### What to Test

- ✅ **Rendering**: Conditional rendering, loading states
- ✅ **Interactions**: Clicks, inputs, form submissions
- ✅ **State**: Component state changes
- ✅ **Integration**: Multiple components working together

### Pattern - Presentational Component

```typescript
// src/app/dashboard/quotes/components/__tests__/quote-action-buttons.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuoteActionButtons } from '../quote-action-buttons'

describe('QuoteActionButtons', () => {
  const defaultProps = {
    hasProducts: true,
    hasClient: true,
    storeId: 1,
    isSavingDraft: false,
    isIssuingQuote: false,
    sendingWhatsApp: false,
    onClear: vi.fn(),
    onSaveDraft: vi.fn(),
    onPreviewPdf: vi.fn(),
    onPrintPdf: vi.fn(),
    onSendWhatsApp: vi.fn(),
    onIssueQuote: vi.fn(),
    isReadOnly: false,
  }

  it('renders all action buttons', () => {
    render(<QuoteActionButtons {...defaultProps} />)

    expect(screen.getByText('Limpiar')).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
    expect(screen.getByText('Emitir')).toBeInTheDocument()
  })

  it('disables issue button when missing client', () => {
    render(<QuoteActionButtons {...defaultProps} hasClient={false} />)

    const issueButton = screen.getByText('Emitir')
    expect(issueButton).toBeDisabled()
  })

  it('calls onIssueQuote when clicked', async () => {
    const user = userEvent.setup()
    render(<QuoteActionButtons {...defaultProps} />)

    await user.click(screen.getByText('Emitir'))

    expect(defaultProps.onIssueQuote).toHaveBeenCalledOnce()
  })

  it('shows loading state when issuing', () => {
    render(<QuoteActionButtons {...defaultProps} isIssuingQuote={true} />)

    expect(screen.getByText('Emitiendo...')).toBeInTheDocument()
  })
})
```

### Pattern - Full Page Integration

```typescript
// src/app/dashboard/quotes/__tests__/page.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuotesPage from '../page'

describe('Quotes Page Integration', () => {
  it('loads and displays catalog', async () => {
    render(<QuotesPage />)

    // Wait for API call to complete
    await waitFor(() => {
      expect(screen.getByText('PC Componentes')).toBeInTheDocument()
    })
  })

  it('adds product to quote', async () => {
    const user = userEvent.setup()
    render(<QuotesPage />)

    await waitFor(() => screen.getByText('PC Componentes'))

    // Click on a product
    await user.click(screen.getByText('Intel Core i7'))

    // Verify it appears in summary
    expect(screen.getByText('Seleccionados 1')).toBeInTheDocument()
  })

  it('calculates totals correctly', async () => {
    const user = userEvent.setup()
    render(<QuotesPage />)

    await waitFor(() => screen.getByText('PC Componentes'))
    await user.click(screen.getByText('Intel Core i7'))

    // Check calculated total
    expect(screen.getByText(/Total: PEN/)).toBeInTheDocument()
  })
})
```

### Coverage Goal

- **Target**: 60-70% for components
- **Why**: Focus on logic, not styling

---

## 6. Level 4: E2E Tests - Critical User Flows

### Strategy: Few but Critical Flows

**Only 5-10 flows** - E2E is expensive to maintain.

### Critical Flows to Test

1. ✅ Login → Create Quote → Issue Quote
2. ✅ Login → Create Sale → Generate Invoice
3. ✅ Login → Entry → Verify Inventory Updated
4. ✅ Login → Switch Tenant → Verify Context
5. ✅ Login → Payment Flow → Mercado Pago

### Pattern - Critical Flow

```typescript
// cypress/e2e/critical-flows/quote-to-issue.cy.ts
describe('Critical Flow: Create and Issue Quote', () => {
  beforeEach(() => {
    // Login using custom command
    cy.loginViaApi()

    // Ensure clean state
    cy.task('db:seed', 'quotes-test-data')
  })

  it('completes full quote flow: select → configure → issue', () => {
    // 1. Navigate to quotes
    cy.visit('/dashboard/quotes')
    cy.contains('Configuración de la cotización').should('be.visible')

    // 2. Select products
    cy.get('[data-testid="product-card"]').first().click()
    cy.contains('Seleccionados 1').should('be.visible')

    // 3. Add client
    cy.get('[data-testid="client-selector"]').click()
    cy.contains('Test Client E2E').click()

    // 4. Verify totals calculated
    cy.get('[data-testid="quote-total"]').should('contain', 'PEN')

    // 5. Issue quote
    cy.get('button').contains('Emitir').click()

    // 6. Verify success
    cy.contains('Cotización emitida exitosamente', { timeout: 10000 })
      .should('be.visible')

    // 7. Verify in database via API
    cy.request('/api/quotes?status=ISSUED').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.greaterThan(0)
    })
  })

  it('prevents issuing quote without required fields', () => {
    cy.visit('/dashboard/quotes')

    // Try to issue without products/client
    cy.get('button').contains('Emitir').should('be.disabled')

    // Add product only
    cy.get('[data-testid="product-card"]').first().click()
    cy.get('button').contains('Emitir').should('still.be.disabled')

    // Add client - now should enable
    cy.get('[data-testid="client-selector"]').click()
    cy.contains('Test Client E2E').click()
    cy.get('button').contains('Emitir').should('not.be.disabled')
  })

  afterEach(() => {
    // Cleanup test data
    cy.task('db:cleanup', 'quotes-test-data')
  })
})
```

### Custom Commands

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      loginViaApi(role?: string): Chainable<void>
      selectProduct(productName: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('loginViaApi', (role = 'SUPER_ADMIN_GLOBAL') => {
  cy.request({
    method: 'POST',
    url: '/api/login',
    body: { username: 'test@example.com', password: 'test123' }
  }).then((response) => {
    window.localStorage.setItem('token', response.body.token)
  })
})

Cypress.Commands.add('selectProduct', (productName: string) => {
  cy.contains('[data-testid="product-card"]', productName).click()
})
```

### Execution Strategy

- **Development**: Manual execution when changing critical flows
- **CI/CD**: Run on every PR to main
- **Nightly**: Full E2E suite every night

### Coverage Goal

- **Target**: 5-10 critical flows
- **Why**: E2E is expensive, focus on highest risk paths

---

## 7. Implementation Plan - 6 Weeks

### Week 1: Setup + Quick Wins

**Days 1-2: Base Configuration**
```bash
npm install --save-dev \
  @testing-library/react \
  @testing-library/user-event \
  @vitejs/plugin-react \
  msw

# Create vitest.config.ts
# Setup test helpers
```

**Days 3-5: First Unit Tests (10-15 tests)**
- Quote calculations (totals, tax, margins)
- Accounting formatters (formatGlosa, formatCurrency)
- Critical validators (validateQuote, validateSale)

**📊 Week 1 Goal:** 15-20 tests running, ~5% coverage

---

### Week 2: API Integration

**Days 1-2: MSW + Fixtures Setup**
```bash
# Create generate-fixtures script
npm run fixtures:generate

# Setup contract tests
```

**Days 3-5: Critical APIs (15-20 tests)**
- `quotes.api.test.ts` (getQuoteCatalog, createQuote, issueQuote)
- `sales.api.test.ts` (createSale, getSales)
- `products.api.test.ts` (getProducts, updateProduct)

**📊 Week 2 Goal:** 35-40 tests running, ~15% coverage

---

### Week 3: Quote Components

**Components (20-25 tests)**
- `quote-action-buttons.test.tsx`
- `quote-summary-panel.test.tsx`
- `quote-configuration-panel.test.tsx`
- `quote-context-bar.test.tsx`
- `page.test.tsx` (full integration)

**📊 Week 3 Goal:** 60-65 tests running, ~25% coverage

---

### Week 4: Sales + Entries Components

**Components (20-25 tests)**
- `sales-form.test.tsx`
- `entries-form.test.tsx`
- Reuse patterns from Week 3

**📊 Week 4 Goal:** 85-90 tests running, ~35% coverage

---

### Week 5: Critical E2E Flows

**Days 1-2: Cypress Setup**
- Custom commands (loginViaApi, selectProduct, fillForm)
- Database seed/cleanup tasks

**Days 3-5: 5 Critical Flows**
- `quote-to-issue.cy.ts`
- `sale-to-invoice.cy.ts`
- `entry-to-inventory.cy.ts`
- `tenant-context-switch.cy.ts`
- `mercadopago-payment.cy.ts`

**📊 Week 5 Goal:** 90-95 tests + 5 E2E, ~40% coverage

---

### Week 6: Consolidation + CI/CD

**Days 1-2: Optimization**
- Refactor duplicate tests
- Improve reusable fixtures
- Reduce execution times

**Days 3-4: CI/CD Integration**
- GitHub Actions workflow
- Parallel test execution
- Coverage reports

**Day 5: Documentation**
- Testing README
- Pattern guide for team
- Video walkthrough

**📊 Week 6 Goal:** 100+ tests, ~45-50% coverage, CI/CD ✅

---

## 8. NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:contracts": "vitest run --grep 'Contract'",
    "test:unit": "vitest run --grep -v 'Contract|Integration'",
    "test:integration": "vitest run --grep 'Integration'",
    "fixtures:generate": "tsx scripts/generate-fixtures.ts"
  }
}
```

---

## 9. Configuration Files

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
    env: {
      NEXT_PUBLIC_API_URL: process.env.CI
        ? 'http://localhost:3001'
        : 'http://localhost:4000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### __tests__/setup.ts

```typescript
import { expect, afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Setup MSW server for CI environment
if (process.env.CI) {
  const { server } = await import('./helpers/api-mocks')

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
}
```

---

## 10. Success Metrics

### Coverage Goals

- **Unit Tests**: 90%+ for pure functions
- **Integration Tests**: 80%+ for API functions
- **Component Tests**: 60-70% for components
- **E2E Tests**: 5-10 critical flows
- **Overall**: 45-50% total coverage

### Performance Metrics

- **Unit Tests**: <1s for full suite
- **Integration Tests**: <30s for full suite
- **Component Tests**: <60s for full suite
- **E2E Tests**: <5min for full suite
- **Total CI Time**: <10min

### Quality Metrics

- **Zero flaky tests**: All tests must be deterministic
- **100% passing**: No skipped or disabled tests in main
- **Maintenance**: <10min/week to update fixtures

---

## 11. Next Steps

### Ready to start implementation?

1. **Week 1 starts**: Setup + First Unit Tests
2. **Need help?**: Review this document with the team
3. **Questions?**: Reach out before starting

### Resources

- Vitest Docs: https://vitest.dev
- Testing Library: https://testing-library.com
- Cypress Docs: https://docs.cypress.io
- MSW Docs: https://mswjs.io

---

**End of Design Document**

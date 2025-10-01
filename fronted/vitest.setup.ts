process.env.VITEST_DISABLE_NATIVE = "true"
process.env.VITEST_FORCE_NATIVE = "false"
process.env.ROLLUP_SKIP_NATIVE = "true"

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class MockIntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
})

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
})

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }),
})

declare module "vitest" {
  interface Assertion<T = any> {
    toBeInTheDocument(): void
    toHaveAttribute(name: string, value?: string): void
  }
}

import { expect } from "vitest"

expect.extend({
  toBeInTheDocument(received: unknown) {
    const element = received as HTMLElement | null
    const pass = !!element && document.body.contains(element)
    return {
      pass,
      message: () =>
        pass
          ? "Expected element not to be in the document"
          : "Expected element to be found in the document",
    }
  },
  toHaveAttribute(received: unknown, name: string, value?: string) {
    const element = received as HTMLElement | null
    const hasAttribute = !!element && element.hasAttribute(name)
    if (!hasAttribute) {
      return {
        pass: false,
        message: () => `Expected element to have attribute ${name}`,
      }
    }
    if (value === undefined) {
      return {
        pass: true,
        message: () => "",
      }
    }
    const actual = element!.getAttribute(name)
    const pass = actual === value
    return {
      pass,
      message: () =>
        pass
          ? "Expected attribute values to differ"
          : `Expected attribute ${name} to be \"${value}\" but received \"${actual}\"`,
    }
  },
})
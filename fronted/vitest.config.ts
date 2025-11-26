import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: process.env.VITEST_ENV ?? "jsdom",
    setupFiles: process.env.VITEST_ENV === "node" ? [] : ["./vitest.setup.ts"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

#!/usr/bin/env node
const path = require("node:path")
const fs = require("node:fs")
const Module = require("module")
const { transformSync } = require("esbuild")

const projectRoot = path.resolve(__dirname, "..")
const tsExtensions = [".ts", ".tsx"]

for (const ext of tsExtensions) {
  require.extensions[ext] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8")
    const result = transformSync(source, {
      loader: ext === ".tsx" ? "tsx" : "ts",
      format: "cjs",
      target: "es2019",
      jsx: "automatic",
      jsxImportSource: "react",
      sourcemap: false,
    })
    module._compile(result.code, filename)
  }
}

require.extensions[".css"] = () => {}

const harness = require(path.join(projectRoot, "src/test-support/harness"))
const mockFactories = harness.getMockRegistry()
const mockInstances = new Map()

const originalResolve = Module._resolveFilename
Module._resolveFilename = function (request, parent, isMain, options) {
  if (mockFactories.has(request)) {
    return `mock:${request}`
  }
  if (request.startsWith("@/")) {
    const withoutAlias = request.slice(2)
    const candidate = path.join(projectRoot, "src", withoutAlias)
    return originalResolve.call(this, candidate, parent, isMain, options)
  }
  return originalResolve.call(this, request, parent, isMain, options)
}

const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request.startsWith("mock:") || mockFactories.has(request)) {
    const specifier = request.startsWith("mock:") ? request.slice(5) : request
    if (!mockFactories.has(specifier)) {
      throw new Error(`Mock for ${specifier} not registered`)
    }
    if (!mockInstances.has(specifier)) {
      const factory = mockFactories.get(specifier)
      mockInstances.set(specifier, factory())
    }
    return mockInstances.get(specifier)
  }
  return originalLoad.apply(this, arguments)
}

const resetMocks = () => {
  mockInstances.clear()
}

const testFile = path.join(projectRoot, "src/components/__tests__/website-settings.test.tsx")
require(testFile)

harness
  .runRegisteredTests({ resetMocks })
  .then(() => {
    console.log("All tests passed")
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
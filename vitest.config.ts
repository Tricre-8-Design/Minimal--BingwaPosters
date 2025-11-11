import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Exclude Playwright tests from Vitest discovery
    exclude: ["e2e/**", "node_modules/**"],
  },
})
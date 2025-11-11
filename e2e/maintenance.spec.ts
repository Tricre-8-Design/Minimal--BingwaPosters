import { test, expect } from "@playwright/test"

test.describe("maintenance mode", () => {
  test("redirects home to maintenance when MAINTENANCE_MODE=true", async ({ page }) => {
    // Assumes dev server running and env MAINTENANCE_MODE=true
    const resp = await page.goto("http://localhost:3000/")
    // Allow dev server to choose 3001/3002; follow redirects manually
    expect(resp?.status()).toBeLessThan(400)
    await page.waitForLoadState("domcontentloaded")
    // The maintenance page shows the badge text "Under Maintenance"
    const badge = page.getByText("Under Maintenance")
    await expect(badge).toBeVisible()
  })
})
import { test, expect, type Page } from "@playwright/test"

import { signInAsTeacher } from "./helpers/auth"

type ProtectedPaintObserver = {
  sawProtectedPaint: () => boolean
}

function observeTeacherPaint(page: Page): ProtectedPaintObserver {
  let protectedPainted = false

  page.on("domcontentloaded", async () => {
    const currentUrl = page.url()
    if (!currentUrl.includes("/teacher")) return

    const bodyText = await page.locator("body").innerText().catch(() => "")
    if (bodyText.includes("Active Courses") || bodyText.includes("New Course")) {
      protectedPainted = true
    }
  })

  return {
    sawProtectedPaint: () => protectedPainted,
  }
}

test.describe("Auth redirect no-flash regression", () => {
  test.use({
    storageState: undefined,
    viewport: { width: 1280, height: 900 },
  })

  test("redirects unauthenticated direct protected-route request before protected content paints", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    const observer = observeTeacherPaint(page)

    try {
      const teacherResponsePromise = page.waitForResponse(
        (response) => response.url().includes("/teacher") && response.status() >= 300 && response.status() < 400,
      )

      await page.goto("/teacher")

      const redirectResponse = await teacherResponsePromise
      expect(redirectResponse.status()).toBeGreaterThanOrEqual(300)
      expect(redirectResponse.status()).toBeLessThan(400)

      await expect(page).toHaveURL(/\/login(?:\?|$)/)
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
      expect(observer.sawProtectedPaint()).toBe(false)
    } finally {
      await context.close()
    }
  })

  test("redirects to login on refresh after session loss without repainting protected shell", async ({ browser }) => {
    test.skip(
      !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
      "Requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD.",
    )

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()

    try {
      await signInAsTeacher(page)
      await page.goto("/teacher")
      await expect(page.getByText("Active Courses")).toBeVisible()

      await context.clearCookies()

      const observer = observeTeacherPaint(page)
      const teacherResponsePromise = page.waitForResponse(
        (response) => response.url().includes("/teacher") && response.status() >= 300 && response.status() < 400,
      )

      await page.reload()

      const redirectResponse = await teacherResponsePromise
      expect(redirectResponse.status()).toBeGreaterThanOrEqual(300)
      expect(redirectResponse.status()).toBeLessThan(400)

      await expect(page).toHaveURL(/\/login(?:\?|$)/)
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
      expect(observer.sawProtectedPaint()).toBe(false)
    } finally {
      await context.close()
    }
  })
})

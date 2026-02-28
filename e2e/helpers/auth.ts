/**
 * Reusable sign-in helper for E2E tests.
 *
 * Signs the test user in via the app's own login form so that the
 * Supabase session cookies are set correctly in the browser context.
 */
import type { Page } from "@playwright/test"

export async function signInAsTeacher(page: Page) {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error("E2E_TEST_EMAIL or E2E_TEST_PASSWORD is not set. Add them to .env.test.local.")
  }

  await page.goto("/login")
  await page.getByPlaceholder("Email address").fill(email)
  await page.getByPlaceholder("Password").fill(password)

  // Intercept the Supabase auth token request so we can confirm success without
  // relying on a client-side redirect (the login page uses router.refresh()).
  const authResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/auth/v1/token") && res.request().method() === "POST",
    { timeout: 15_000 },
  )

  await page.getByRole("button", { name: "Sign In" }).click()

  const authResponse = await authResponsePromise
  if (authResponse.status() !== 200) {
    const body = await authResponse.text()
    throw new Error(`Sign-in failed (HTTP ${authResponse.status()}): ${body}`)
  }
}

/**
 * Extracts the courseId from the current URL query-string parameter "id"
 * or "courseId" that the coursebuilder page uses. Returns null if absent.
 */
export function extractCourseIdFromUrl(url: string): string | null {
  const searchParams = new URL(url).searchParams
  return searchParams.get("id") ?? searchParams.get("courseId") ?? null
}

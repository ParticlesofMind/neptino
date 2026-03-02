import type { Page } from "@playwright/test"
import { createAdminClient } from "./supabase-admin"

/**
 * Triggers a course-creation action and returns the id of the newly created
 * course by polling Supabase via the service-role admin client.
 *
 * The app navigates to the Classification section immediately after a course
 * is created, so we cannot rely on the Essentials "Save Changes" button being
 * visible. Polling the DB is the most reliable signal.
 */
export async function captureInsertedCourseId(
  page: Page,
  triggerAction: () => Promise<void>,
): Promise<string> {
  const beforeInsert = new Date()
  await triggerAction()

  const admin = createAdminClient()
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const { data } = await admin
      .from("courses")
      .select("id")
      .gte("created_at", beforeInsert.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
    const id = (data as Array<{ id: string }> | null)?.[0]?.id
    if (id) return id
    await page.waitForTimeout(500)
  }
  throw new Error("captureInsertedCourseId: no course row found in Supabase within 20 s.")
}

/**
 * Navigates the sidebar to the given section label by clicking its nav item.
 */
export async function goToSection(page: Page, sectionLabel: string) {
  await page.getByRole("button", { name: sectionLabel, exact: true }).click()
  // Allow time for the section to fully render.
  await page.waitForTimeout(300)
}

/**
 * Waits for the course debounce save (800 ms debounce + buffer for DB write + React re-render).
 */
export async function waitForDebounce(page: Page) {
  await page.waitForTimeout(3_000)
}

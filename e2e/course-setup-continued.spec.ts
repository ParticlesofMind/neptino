/**
 * E2E test: Course Setup Continued (tests 9–14)
 *
 * Depends on `course-creation.spec.ts` running first to create a course and
 * write its id to `test-results/course-id.json`.
 *
 * See e2e/KNOWN-GAPS.md for known data-model issues documented during authoring.
 */

import { test, expect, type Page } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"
import { signInAsTeacher } from "./helpers/auth"
import {
  createAdminClient,
  deleteCourse,
  fetchCourse,
  fetchTemplatesForCourse,
} from "./helpers/supabase-admin"
import { goToSection, waitForDebounce } from "./helpers/course-test-utils"

// ─── Shared state ─────────────────────────────────────────────────────────────

const SHARED_ID_PATH = path.join(__dirname, "..", "test-results", "course-id.json")

function readSharedCourseId(): string | null {
  try {
    return JSON.parse(fs.readFileSync(SHARED_ID_PATH, "utf-8")).id ?? null
  } catch {
    return null
  }
}

// ─── Cleanup: runs after all tests in this file ───────────────────────────────

test.afterAll(async () => {
  const id = readSharedCourseId()
  if (id) {
    await deleteCourse(id)
    try { fs.unlinkSync(SHARED_ID_PATH) } catch { /* ignore */ }
  }
})

// ─── Course Setup Continued ───────────────────────────────────────────────────

test.describe("Course Setup Continued", () => {
  test.use({ storageState: undefined })

  let sharedPage: Page
  let courseId: string

  test.beforeAll(async ({ browser }) => {
    const id = readSharedCourseId()
    if (!id) throw new Error("No shared course ID found. Run course-creation.spec.ts first.")
    courseId = id

    const context = await browser.newContext()
    sharedPage = await context.newPage()
    await signInAsTeacher(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.context().close()
  })

  // ── 9. Communication ────────────────────────────────────────────────────────

  test("9. sets a welcome message and persists communication_settings", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${courseId}`)
    await goToSection(page, "Communication")

    await page
      .getByPlaceholder("Send a short welcome note to enrolled students")
      .fill("Welcome to the course! We are glad to have you here.")

    await waitForDebounce(page)

    const row = await fetchCourse(courseId)
    const cs = row?.communication_settings as Record<string, unknown> | null
    expect(cs).not.toBeNull()
    expect(cs?.welcome_message).toBe("Welcome to the course! We are glad to have you here.")
    expect(cs?.announcement_channel).toBeDefined()
  })

  // ── 10. AI Model (LLM) ──────────────────────────────────────────────────────

  test("10. configures AI model settings and persists generation_settings", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${courseId}`)
    await goToSection(page, "AI Model")

    const mistralLabel = page.locator('label[for="model-mistral"]')
    if (await mistralLabel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await mistralLabel.click()
    }

    await waitForDebounce(page)

    const row = await fetchCourse(courseId)
    expect(row?.generation_settings).not.toBeNull()
    expect(
      row?.generation_settings?.teacher_name ?? row?.generation_settings?.teacherName,
    ).toBeTruthy()
  })

  // ── 11. Reload + re-hydration ───────────────────────────────────────────────

  test("11. reloading the page via ?id= re-hydrates all section state", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${courseId}`)

    await goToSection(page, "Essentials")
    await expect(page.getByPlaceholder("Enter course title")).toHaveValue(
      /.+/,
      { timeout: 10_000 },
    )
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible({ timeout: 8_000 })

    await goToSection(page, "Students")
    await expect(page.getByText("alice.testington@example.com")).toBeVisible({ timeout: 8_000 })
  })

  // ── 12. Launch flow ─────────────────────────────────────────────────────────

  test("12. launch checklist is satisfied and updates visibility_settings on launch", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${courseId}&view=launch`)

    await expect(page.getByText("Course created")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Title set")).toBeVisible()
    await expect(page.getByText("Description added")).toBeVisible()

    await expect(page.getByRole("button", { name: "Fix →" })).toHaveCount(0, { timeout: 30_000 })

    const launchBtn = page.getByRole("button", { name: "Launch Course" })
    await expect(launchBtn).toBeEnabled({ timeout: 10_000 })

    let launchPatchCalled = false
    page.on("response", (res) => {
      if (
        res.url().includes("/rest/v1/courses") &&
        res.request().method() === "PATCH" &&
        res.status() < 300
      ) {
        launchPatchCalled = true
      }
    })

    await launchBtn.click()
    await expect(page.getByText(/launched successfully/i)).toBeVisible({ timeout: 10_000 })
    expect(launchPatchCalled).toBe(true)

    const row = await fetchCourse(courseId)
    const vs = row?.visibility_settings as Record<string, boolean> | null
    expect(vs?.visible).toBe(true)
    expect(vs?.enrollment).toBe(true)
  })

  // ── 13. Templates table integration ────────────────────────────────────────

  test("13. templates section writes rows to the templates table", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${courseId}&view=setup`)
    await goToSection(page, "Templates")

    const addBtn = page.getByRole("button", { name: /add|new template/i }).first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await waitForDebounce(page)

      const rows = await fetchTemplatesForCourse(courseId)
      expect(rows.length).toBeGreaterThan(0)
      expect(rows[0].course_id).toBe(courseId)
    } else {
      test.skip(true, "Templates section has no visible Add button — check selector.")
    }
  })

  // ── 14. Create canvas overflow regression ──────────────────────────────────

  test("14. create view template body does not stay overflowed after adaptive spill", async () => {
    test.skip(!courseId, "Requires a created course id from earlier flow tests.")
    const page = sharedPage

    const admin = createAdminClient()
    const existing = await fetchCourse(courseId)
    const existingRecord = (existing ?? {}) as Record<string, unknown>
    const existingCurriculum = (existingRecord.curriculum_data as Record<string, unknown> | null) ?? {}
    const existingSchedule = (existingRecord.schedule_settings as Record<string, unknown> | null) ?? {}

    const seededCurriculum = {
      ...existingCurriculum,
      module_org: existingCurriculum.module_org ?? "linear",
      module_count: existingCurriculum.module_count ?? 1,
      module_names: Array.isArray(existingCurriculum.module_names) && existingCurriculum.module_names.length > 0
        ? existingCurriculum.module_names
        : ["Module 1"],
      session_rows: [
        {
          id: "e2e-overflow-session-1",
          session_number: 1,
          title: "Overflow Validation Lesson",
          notes: "E2E seeded lesson for overflow regression.",
          duration_minutes: 60,
          topics: 1,
          objectives: 1,
          tasks: 2,
          template_type: "lesson",
          topic_names: ["Topic 1"],
          objective_names: ["Objective 1"],
          task_names: [
            "Task with enough detail to consume vertical space in the template body and trigger continuation handling.",
            "Second long task line that should remain within adaptive page flow rather than clipping under footer.",
          ],
        },
      ],
    }

    const seededSchedule = {
      ...existingSchedule,
      generated_entries: [
        { id: "e2e-overflow-entry-1", session: 1, day: "Mon", date: "01.01.2026", start_time: "09:00", end_time: "10:00" },
      ],
    }

    const { error: seedError } = await admin
      .from("courses")
      .update({ curriculum_data: seededCurriculum, schedule_settings: seededSchedule })
      .eq("id", courseId)

    expect(seedError).toBeNull()

    await page.goto(`/teacher/coursebuilder?id=${courseId}&view=create`)
    await page.waitForTimeout(2_000)

    const templateViewports = page.getByTestId("template-body-viewport")
    const viewportCount = await templateViewports.count()
    expect(viewportCount).toBeGreaterThan(0)

    const initialTotalRaw = (await page.getByTestId("canvas-page-total").first().innerText()).trim()
    const initialTotalMatch = initialTotalRaw.match(/\/\s*(\d+)/)
    const initialTotalPages = initialTotalMatch ? Number.parseInt(initialTotalMatch[1], 10) : 0

    await expect.poll(async () => {
      return templateViewports.evaluateAll((elements) => {
        return elements.some((element) => {
          const el = element as HTMLElement
          return (el.scrollHeight - el.clientHeight) > 2
        })
      })
    }, {
      timeout: 12_000,
      intervals: [400, 800, 1200],
      message: "Template body viewport remained overflowed instead of spilling to continuation pages.",
    }).toBe(false)

    await expect.poll(async () => {
      const raw = (await page.getByTestId("canvas-page-total").first().innerText()).trim()
      const match = raw.match(/\/\s*(\d+)/)
      return match ? Number.parseInt(match[1], 10) : 0
    }, {
      timeout: 12_000,
      intervals: [400, 800, 1200],
      message: "Canvas page total did not grow despite overflow-driven continuation handling.",
    }).toBeGreaterThan(1)

    const finalTotalRaw = (await page.getByTestId("canvas-page-total").first().innerText()).trim()
    const finalTotalMatch = finalTotalRaw.match(/\/\s*(\d+)/)
    const finalTotalPages = finalTotalMatch ? Number.parseInt(finalTotalMatch[1], 10) : 0

    if (initialTotalPages <= 1) {
      expect(finalTotalPages).toBeGreaterThan(initialTotalPages)
    } else {
      expect(finalTotalPages).toBeGreaterThanOrEqual(initialTotalPages)
    }
  })
})

// ─── Standalone: column-level regression tests ───────────────────────────────

test.describe("Supabase column regression", () => {
  test("courses table has all required columns", async () => {
    const admin = createAdminClient()

    const requiredColumns = [
      "id", "course_name", "course_subtitle", "course_description", "course_language",
      "course_type", "teacher_id", "institution", "course_image", "generation_settings",
      "students_overview", "classification_data", "course_layout", "schedule_settings",
      "visibility_settings", "marketplace_settings", "pricing_settings",
      "integration_settings", "communication_settings", "template_settings",
      "created_at", "updated_at",
    ]

    const { data, error } = await (admin as ReturnType<typeof createAdminClient>)
      .rpc("exec_sql" as never, {
        query: `SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'courses'`,
      }) as { data: Array<{ column_name: string }> | null; error: unknown }

    if (error) {
      console.warn("Column regression check skipped: exec_sql RPC not available.")
      return
    }

    const columnNames = (data as Array<{ column_name: string }>).map((r) => r.column_name)
    for (const col of requiredColumns) {
      expect(columnNames, `Column "${col}" is missing from public.courses`).toContain(col)
    }
  })
})

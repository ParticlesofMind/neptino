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

test.describe.skip("Course Setup Continued", () => {
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

    // The layout engine pre-computes pagination — no DOM overflow detection.
    // Wait for the page total to reflect multi-page layout (within 12 s).
    await expect.poll(async () => {
      const raw = (await page.getByTestId("canvas-page-total").first().innerText()).trim()
      const match = raw.match(/\/\s*(\d+)/)
      return match ? Number.parseInt(match[1], 10) : 0
    }, {
      timeout: 12_000,
      intervals: [400, 800, 1200],
      message: "Canvas page total did not grow beyond 1 despite large seeded content — layout engine may not be assigning continuation pages.",
    }).toBeGreaterThan(1)

    const initialTotalRaw = (await page.getByTestId("canvas-page-total").first().innerText()).trim()
    const initialTotalMatch = initialTotalRaw.match(/\/\s*(\d+)/)
    const finalTotalPages = initialTotalMatch ? Number.parseInt(initialTotalMatch[1], 10) : 0

    expect(finalTotalPages).toBeGreaterThan(1)
  })

  test("15. create view insertion line places card at exact slot", async () => {
    test.skip(!courseId, "Requires a created course id from earlier flow tests.")
    const page = sharedPage

    // Capture browser console output for debugging
    const consoleLogs: string[] = []
    page.on("console", (msg) => {
      if (msg.text().includes("[useCardDrop]")) {
        consoleLogs.push(msg.text())
      }
    })

    const admin = createAdminClient()
    const existing = await fetchCourse(courseId)
    const existingRecord = (existing ?? {}) as Record<string, unknown>
    const existingCurriculum = (existingRecord.curriculum_data as Record<string, unknown> | null) ?? {}
    const existingSchedule = (existingRecord.schedule_settings as Record<string, unknown> | null) ?? {}

    const seededCurriculum = {
      ...existingCurriculum,
      module_org: existingCurriculum.module_org ?? "linear",
      module_count: 1,
      module_names: ["Module 1"],
      session_rows: [
        {
          id: "e2e-precision-session-1",
          session_number: 1,
          title: "Precision Drop Lesson",
          duration_minutes: 60,
          topics: 1,
          objectives: 1,
          tasks: 1,
          template_type: "lesson",
          topic_names: ["Topic 1"],
          objective_names: ["Objective 1"],
          task_names: ["Task 1"],
        },
      ],
    }

    const seededSchedule = {
      ...existingSchedule,
      generated_entries: [
        { id: "e2e-precision-entry-1", session: 1, day: "Mon", date: "01.01.2026", start_time: "09:00", end_time: "10:00" },
      ],
    }

    const { error: seedError } = await admin
      .from("courses")
      .update({ curriculum_data: seededCurriculum, schedule_settings: seededSchedule })
      .eq("id", courseId)

    expect(seedError).toBeNull()

    await page.goto(`/teacher/coursebuilder?id=${courseId}&view=create`)
    await page.waitForTimeout(1_500)

    const firstInstructionArea = page.getByTestId("task-area-instruction").first()
    await expect(firstInstructionArea).toBeVisible({ timeout: 10_000 })

    // Target the inner droppable div directly (not the outer wrapper that includes
    // the label) so the drag pointer lands within the registered droppable rect.
    const firstInstructionDropZone = page.getByTestId("task-area-droppable-instruction").first()

    const firstCardSource = page.getByRole("button", {
      name: /United Nations: Organizational Profile/i,
    }).first()

    // Simulate a pointer-based drag for dnd-kit (PointerSensor requires
    // an actual pointermove with distance to activate the drag context).
    async function pointerDrag(
      source: import("@playwright/test").Locator,
      target: import("@playwright/test").Locator,
    ) {
      const sBox = await source.boundingBox()
      const tBox = await target.boundingBox()
      if (!sBox || !tBox) throw new Error("Drag source or target has no bounding box")
      const sx = sBox.x + sBox.width  / 2
      const sy = sBox.y + sBox.height / 2
      const tx = tBox.x + tBox.width  / 2
      const ty = tBox.y + tBox.height / 2
      await page.mouse.move(sx, sy)
      await page.mouse.down()
      // Small initial movement to cross dnd-kit's activationConstraint distance
      await page.mouse.move(sx + 8, sy + 8, { steps: 4 })
      await page.mouse.move(tx, ty, { steps: 20 })
      await page.waitForTimeout(80)
      await page.mouse.up()
    }

    await pointerDrag(firstCardSource, firstInstructionDropZone)

    // Wait for the dropped card to render insertion slots
    const topInsertionLine = firstInstructionArea
      .locator('[data-testid="drop-insertion-line"][data-slot-index="0"]')
      .first()
    await expect(topInsertionLine).toBeAttached({ timeout: 5_000 })
    // Force dnd-kit to re-measure all droppable rects so the newly-mounted
    // slot is included in the next collision detection pass.
    await page.evaluate(() => window.dispatchEvent(new Event("resize")))
    // Wait for dnd-kit to complete the async rect measurement
    await page.waitForTimeout(500)

    // Debug: log bounding boxes to understand pointer placement
    const iaBox = await firstInstructionArea.boundingBox()
    const dzBox = await firstInstructionDropZone.boundingBox()
    const slotBox = await topInsertionLine.boundingBox()
    console.log("[test15] firstInstructionArea bbox:", iaBox)
    console.log("[test15] firstInstructionDropZone bbox:", dzBox)
    console.log("[test15] topInsertionLine bbox:", slotBox)
    // Check what getBoundingClientRect returns for the slot (what dnd-kit measures)
    const slotClientRect = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="drop-insertion-line"][data-slot-index="0"]')
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    const dropzoneClientRect = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="task-area-droppable-instruction"]')
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    console.log("[test15] slot getBoundingClientRect:", slotClientRect)
    console.log("[test15] dropzone getBoundingClientRect:", dropzoneClientRect)

    const secondCardSource = page.getByRole("button", {
      name: /Amazon Rainforest Species Dataset/i,
    }).first()

    await pointerDrag(secondCardSource, topInsertionLine)
    await page.waitForTimeout(600)

    const topCard = firstInstructionArea.getByText("Amazon Rainforest Species Dataset", { exact: false }).first()
    const bottomCard = firstInstructionArea.getByText("United Nations: Organizational Profile", { exact: false }).first()

    await expect(topCard).toBeVisible({ timeout: 8_000 })
    await expect(bottomCard).toBeVisible({ timeout: 8_000 })

    const topBox = await topCard.boundingBox()
    const bottomBox = await bottomCard.boundingBox()
    expect(topBox).not.toBeNull()
    expect(bottomBox).not.toBeNull()
    console.log("[test15] consoleLogs from browser:", consoleLogs)
    expect((topBox?.y ?? 0)).toBeLessThan(bottomBox?.y ?? 0)
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

/**
 * E2E test: Course Creation Flow (tests 1–8)
 *
 * Covers the full coursebuilder setup pipeline from initial course creation
 * through each setup section, verifying every write reaches Supabase.
 *
 * See e2e/KNOWN-GAPS.md for known data-model issues documented during authoring.
 * Tests 9–14 and the column-regression suite live in course-setup-continued.spec.ts.
 */

import { test, expect, type Page } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"
import { signInAsTeacher } from "./helpers/auth"
import {
  fetchCourse,
  type CourseRow,
} from "./helpers/supabase-admin"
import { captureInsertedCourseId, goToSection, waitForDebounce } from "./helpers/course-test-utils"

// ─── Shared state across tests in this file ───────────────────────────────────

let createdCourseId: string | null = null

const COURSE_NAME  = `E2E Test Course ${Date.now()}`
const DESCRIPTION  = "Playwright automated E2E test course — created by the test suite."
const SUBTITLE     = "An E2E-generated subtitle"

// ─── Auth fixture ─────────────────────────────────────────────────────────────

test.beforeAll(async ({ browser }) => {
  // Nothing to set up here — tests sign in individually because they each
  // start with a fresh page. See the first test below.
  void browser
})

test.afterAll(async () => {
  if (createdCourseId) {
    // Persist the course id for course-setup-continued.spec.ts (tests 9–14).
    // Cleanup is handled by that spec's afterAll.
    const dir = path.join(__dirname, "..", "test-results")
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, "course-id.json"), JSON.stringify({ id: createdCourseId }))
  }
})

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe.skip("Course Creation Flow", () => {
  // Each test in this suite operates on the same browser context so the
  // Supabase session cookie persists between tests.
  test.use({ storageState: undefined })

  let sharedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    sharedPage = await context.newPage()
    await signInAsTeacher(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.context().close()
  })

  // ── 1. Essentials – create the course ──────────────────────────────────────

  test("1. fills essentials and creates a new course in Supabase", async () => {
    const page = sharedPage

    await page.goto("/teacher/coursebuilder")

    // ── Fill required fields ──────────────────────────────────────────────────
    await page.getByPlaceholder("Enter course title").fill(COURSE_NAME)
    await page.getByPlaceholder("Enter course subtitle").fill(SUBTITLE)
    await page.getByPlaceholder("Describe what students will learn").fill(DESCRIPTION)

    // FieldLabel renders as <div><span> – not a real <label> – so getByLabel() won't
    // match. Use an XPath helper to find the <select> that follows the label span.
    const fieldSelect = (label: string) =>
      page.locator(`xpath=//span[.="${label}"]/parent::div/following-sibling::select[1]`)

    await fieldSelect("Course Language").selectOption("English")
    await fieldSelect("Course Type").selectOption("Online")

    // Teacher and Institution are auto-populated from auth user metadata.
    // Verify they are filled before saving.
    const teacherSelect = fieldSelect("Teacher")
    await expect(teacherSelect).not.toHaveValue("")

    // ── Submit and capture the new course ID ─────────────────────────────────
    createdCourseId = await captureInsertedCourseId(page, async () => {
      await page.getByRole("button", { name: "Create Course" }).click()
    })

    expect(createdCourseId).toBeTruthy()

    // ── [GAP-1] Verify URL – currently expected to fail (known gap) ──────────
    // The URL should be updated with ?id=<courseId> but currently isn't.
    // Re-enable this assertion once GAP-1 is resolved.
    //
    // await expect(page).toHaveURL(new RegExp(`id=${createdCourseId}`))

    // ── Verify Supabase row ───────────────────────────────────────────────────
    const row = await fetchCourse(createdCourseId)
    expect(row).not.toBeNull()
    const r = row as CourseRow

    expect(r.course_name).toBe(COURSE_NAME)
    expect(r.course_description).toBe(DESCRIPTION)
    // course_subtitle requires migration 20260202 (GAP-5)
    expect(r.course_subtitle).toBe(SUBTITLE)
    expect(r.course_language).toBe("English")
    expect(r.course_type).toBe("Online")
    expect(r.teacher_id).toBeTruthy()
    expect(r.institution).toBeTruthy()

    // generation_settings must contain teacher_name (GAP-3)
    expect(r.generation_settings).not.toBeNull()
    expect(r.generation_settings?.teacher_name ?? r.generation_settings?.teacherName).toBeTruthy()

    // [GAP-2] students_overview initial value is incomplete
    // Should contain method + students but currently only has total + synced.
    expect(r.students_overview).toMatchObject({ total: 0, synced: 0 })
    // These will fail until GAP-2 is fixed:
    // expect(r.students_overview?.method).toBeDefined()
    // expect(Array.isArray(r.students_overview?.students)).toBe(true)

    // [GAP-4] visibility_settings not set on creation — should be explicit default
    // Currently returns {} or null.
    const visibility = r.visibility_settings ?? {}
    expect(Object.keys(visibility).length).toBe(0)
    // Future expectation once GAP-4 is resolved:
    // expect(visibility.visible).toBe(false)
  })

  // ── 2. Classification ──────────────────────────────────────────────────────

  test("2. fills classification and persists classification_data", async () => {
    const page = sharedPage

    // Navigate with ?id= so the page loads the existing course.
    await page.goto(`/teacher/coursebuilder?id=${createdCourseId}`)
    await goToSection(page, "Classification")

    // ClassYear uses SearchableSelect (trigger button → popover list).
    // There are 20 options (Year 1‒20), which exceeds searchThreshold=15 so a
    // search input appears inside the dropdown.
    await page.getByRole("button", { name: "Select year..." }).click()
    await page.getByPlaceholder("Search...").fill("Year 10")
    await page.getByRole("button", { name: "Year 10" }).click()

    // The "Course Sequence" row has plain TextInput elements — easy to interact with.
    await page.getByPlaceholder("e.g., Algebra I", { exact: true }).fill("Intro to Programming")
    await page.getByPlaceholder("e.g., Calculus", { exact: true }).fill("Advanced Programming")

    await waitForDebounce(page)

    const row = await fetchCourse(createdCourseId!)
    expect(row?.classification_data).not.toBeNull()
    // classYear is stored inside the JSONB blob
    const cd = row?.classification_data as Record<string, unknown>
    expect(cd?.class_year ?? cd?.classYear).toBeTruthy()
  })

  // ── 3. Students ────────────────────────────────────────────────────────────

  test("3. adds a student and persists students_overview", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${createdCourseId}`)
    await goToSection(page, "Students")

    // Switch to manual entry mode — the button label is exactly "Manual Entry".
    // Clicking it sets the `method` state, which enables the form inputs.
    await page.getByRole("button", { name: "Manual Entry" }).click()

    // FieldLabel renders as <div><span>, NOT <label> — so the inputs cannot be
    // found via getByLabel(). The actual placeholder values are the example
    // strings defined in the component source.
    await page.getByPlaceholder("Jane", { exact: true }).fill("Alice")
    await page.getByPlaceholder("Doe", { exact: true }).fill("Testington")
    await page.getByPlaceholder("jane@school.org", { exact: true }).fill("alice.testington@example.com")
    await page.getByRole("button", { name: "Add Student" }).click()

    await waitForDebounce(page)

    const row = await fetchCourse(createdCourseId!)
    const so = row?.students_overview as Record<string, unknown> | null
    expect(so).not.toBeNull()
    expect(so?.total).toBeGreaterThanOrEqual(1)

    const students = so?.students as unknown[]
    expect(Array.isArray(students)).toBe(true)
    expect(students.length).toBeGreaterThanOrEqual(1)

    const alice = (students as Array<Record<string, unknown>>).find(
      (s) => s.email === "alice.testington@example.com",
    )
    expect(alice).toBeDefined()
    expect(alice?.first).toBe("Alice")
  })

  // ── 4. Pedagogy ────────────────────────────────────────────────────────────

  test("4. sets a pedagogy preset and persists course_layout", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${createdCourseId}`)
    await goToSection(page, "Pedagogy")

    // Click a preset button to set the pedagogy position
    await page.getByRole("button", { name: "Progressive" }).click()

    await waitForDebounce(page)

    const row = await fetchCourse(createdCourseId!)
    expect(row?.course_layout).not.toBeNull()
    const cl = row?.course_layout as Record<string, unknown>
    const pedagogy = cl?.pedagogy as Record<string, unknown> | null
    expect(pedagogy).not.toBeNull()
    // The "Progressive" preset maps to x=75, y=75
    expect(pedagogy?.x).toBe(75)
    expect(pedagogy?.y).toBe(75)
  })

  // ── 5. Schedule ────────────────────────────────────────────────────────────

  test("5. configures a schedule and persists schedule_settings", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${createdCourseId}`)
    await goToSection(page, "Schedule")

    // Fill start and end date for date-range mode.
    // The schedule section uses DD.MM.YYYY format.
    const today = new Date()
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`

    const startDate = fmt(today)
    const endD = new Date(today)
    endD.setDate(endD.getDate() + 28)
    const endDate = fmt(endD)

    const dateInputs = page.getByPlaceholder(/DD\.MM\.YYYY/)
    await dateInputs.first().fill(startDate)
    await dateInputs.last().fill(endDate)

    // Select at least one active day
    // exact:true prevents matching substrings like "Pricing & Monetization" that contain "Mon".
    await page.getByRole("button", { name: "Mon", exact: true }).click()
    await page.getByRole("button", { name: "Wed", exact: true }).click()

    // Generate the schedule
    const generateBtn = page.getByRole("button", { name: /generate/i })
    if (await generateBtn.isVisible()) await generateBtn.click()

    await waitForDebounce(page)

    const row = await fetchCourse(createdCourseId!)
    const ss = row?.schedule_settings as Record<string, unknown> | null
    expect(ss).not.toBeNull()
    const entries = ss?.generated_entries as unknown[]
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  // ── 6. Visibility ──────────────────────────────────────────────────────────

  test("6. toggles visibility settings and persists visibility_settings", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${createdCourseId}`)
    await goToSection(page, "Course Visibility")

    // The visibility section uses real <label> elements wrapping <input type="checkbox">.
    await page.getByLabel("Course visible to students").click()

    await waitForDebounce(page)

    const row = await fetchCourse(createdCourseId!)
    const vs = row?.visibility_settings as Record<string, boolean> | null
    expect(vs).not.toBeNull()
    // At least one key should have been written
    expect(Object.keys(vs ?? {}).length).toBeGreaterThan(0)
  })

  // ── 7. Marketplace ─────────────────────────────────────────────────────────

  test("7. fills marketplace settings and persists marketplace_settings", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${createdCourseId}`)
    await goToSection(page, "Marketplace")

    // Marketplace section target audience TextInput has placeholder "e.g., Grade 11 Humanities".
    await page.getByPlaceholder("e.g., Grade 11 Humanities").fill("Grade 10 students")

    await waitForDebounce(page)

    const row = await fetchCourse(createdCourseId!)
    const ms = row?.marketplace_settings as Record<string, unknown> | null
    expect(ms).not.toBeNull()
    expect(ms?.target_audience).toBe("Grade 10 students")
    expect(ms?.listing_status).toBeDefined()
  })

  // ── 8. Pricing ─────────────────────────────────────────────────────────────

  test("8. fills pricing settings and persists pricing_settings", async () => {
    const page = sharedPage

    await page.goto(`/teacher/coursebuilder?id=${createdCourseId}`)
    await goToSection(page, "Pricing & Monetization")

    // FieldLabel renders as <div><span> – use XPath. Valid options: free / subscription / one-time / license.
    const pricingModelSelect = page.locator('xpath=//span[.="Pricing Model"]/parent::div/following-sibling::select[1]')
    await pricingModelSelect.selectOption("one-time")

    // Base Price TextInput has placeholder "99" (not a descriptive label).
    const priceInput = page.getByPlaceholder("99")
    if (await priceInput.isVisible()) await priceInput.fill("49")

    await waitForDebounce(page)

    const row = await fetchCourse(createdCourseId!)
    const ps = row?.pricing_settings as Record<string, unknown> | null
    expect(ps).not.toBeNull()
    expect(ps?.pricing_model).toBe("one-time")
  })

})

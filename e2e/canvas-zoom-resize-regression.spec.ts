import { test, expect, type Page } from "@playwright/test"
import { signInAsTeacher } from "./helpers/auth"
import { captureInsertedCourseId } from "./helpers/course-test-utils"
import { createAdminClient, deleteCourse } from "./helpers/supabase-admin"

function selectByFieldLabel(page: Page, label: string) {
  return page.locator(`xpath=//span[.="${label}"]/parent::div/following-sibling::select[1]`)
}

async function createCourseForCreateView(page: Page): Promise<string> {
  const title = `Canvas Zoom Regression ${Date.now()}`

  await page.goto("/teacher/coursebuilder")
  await page.getByPlaceholder("Enter course title").fill(title)
  await page.getByPlaceholder("Describe what students will learn").fill("Regression test for create canvas zoom and panel resizing.")
  await selectByFieldLabel(page, "Course Language").selectOption("English")
  await selectByFieldLabel(page, "Course Type").selectOption("Online")

  return captureInsertedCourseId(page, async () => {
    await page.getByRole("button", { name: "Create Course" }).click()
  })
}

async function seedSingleSession(courseId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from("courses")
    .update({
      curriculum_data: {
        topics: 2,
        objectives: 2,
        tasks: 2,
        module_names: ["Module 1"],
        session_rows: [
          {
            id: "e2e-seeded-session-1",
            session_number: 1,
            title: "Session 1",
            template_type: "lesson",
            topics: 2,
            objectives: 2,
            tasks: 2,
            topic_names: ["Topic 1", "Topic 2"],
            objective_names: ["Objective 1", "Objective 2", "Objective 3", "Objective 4"],
            task_names: [
              "Task 1",
              "Task 2",
              "Task 3",
              "Task 4",
              "Task 5",
              "Task 6",
              "Task 7",
              "Task 8",
            ],
          },
        ],
      },
      schedule_settings: {
        generated_entries: [
          {
            id: "e2e-seeded-entry-1",
            session: 1,
            date: "2026-03-21",
            day: "Saturday",
          },
        ],
      },
    })
    .eq("id", courseId)

  if (error) {
    throw new Error(`seedSingleSession failed: ${error.message}`)
  }
}

async function dragHorizontal(page: Page, testId: string, deltaX: number) {
  const handle = page.getByTestId(testId)
  await expect(handle).toBeVisible()

  const box = await handle.boundingBox()
  if (!box) {
    throw new Error(`Could not get bounding box for ${testId}`)
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + deltaX, startY, { steps: 8 })
  await page.mouse.up()
}

async function getPanelWidth(page: Page, testId: string): Promise<number> {
  return page.getByTestId(testId).evaluate((el) => el.getBoundingClientRect().width)
}

async function getPanelMidpoint(page: Page) {
  const viewportWidth = await page.evaluate(() => window.innerWidth)
  const filesWidth = await getPanelWidth(page, "curate-files-panel")
  const atlasWidth = await getPanelWidth(page, "curate-atlas-panel")
  return (filesWidth + (viewportWidth - atlasWidth)) / 2
}

async function getCanvasMetrics(page: Page) {
  const pageRegion = page.locator('[role="region"][aria-label^="Page"]').first()
  await expect(pageRegion).toBeVisible()

  const box = await pageRegion.boundingBox()
  if (!box) {
    throw new Error("Could not get bounding box for first canvas page")
  }

  const scale = await pageRegion.locator(":scope > div").evaluate((el) => {
    const transform = (el as HTMLElement).style.transform ?? ""
    const match = transform.match(/scale\(([^)]+)\)/)
    return match ? Number(match[1]) : 1
  })

  return {
    width: box.width,
    centerX: box.x + box.width / 2,
    scale,
  }
}

test.describe("Canvas zoom and resize regression", () => {
  test.use({
    storageState: undefined,
    viewport: { width: 1280, height: 900 },
  })

  test("keeps canvas centered and content-aware as side panels and zoom change", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()

    let courseId: string | null = null

    try {
      await signInAsTeacher(page)
      courseId = await createCourseForCreateView(page)
      await seedSingleSession(courseId)

      await page.goto(`/teacher/coursebuilder?id=${courseId}&view=create`)
      await expect(page.locator('[role="region"][aria-label^="Page"]').first()).toBeVisible()

      const filesInitial = await getPanelWidth(page, "curate-files-panel")
      const atlasInitial = await getPanelWidth(page, "curate-atlas-panel")

      // Constrict available canvas lane by widening both side panels.
      await dragHorizontal(page, "resize-files-panel-handle", 120)
      await dragHorizontal(page, "resize-atlas-panel-handle", -120)

      const filesConstricted = await getPanelWidth(page, "curate-files-panel")
      const atlasConstricted = await getPanelWidth(page, "curate-atlas-panel")
      expect(filesConstricted).toBeGreaterThan(filesInitial)
      expect(atlasConstricted).toBeGreaterThan(atlasInitial)

      const constricted = await getCanvasMetrics(page)

      // Re-open canvas lane by shrinking both side panels.
      await dragHorizontal(page, "resize-files-panel-handle", -220)
      await dragHorizontal(page, "resize-atlas-panel-handle", 220)

      const filesRelaxed = await getPanelWidth(page, "curate-files-panel")
      const atlasRelaxed = await getPanelWidth(page, "curate-atlas-panel")
      expect(filesRelaxed).toBeLessThan(filesConstricted)
      expect(atlasRelaxed).toBeLessThan(atlasConstricted)

      const relaxed = await getCanvasMetrics(page)
      expect(relaxed.scale).toBeGreaterThan(constricted.scale)

      // Verify horizontal centering at the true midpoint between side panels.
      const expectedPanelMidpoint = await getPanelMidpoint(page)
      expect(Math.abs(relaxed.centerX - expectedPanelMidpoint)).toBeLessThan(20)

      const zoomInButton = page.locator('button[title="Zoom in (+10%)"]')
      const zoomOutButton = page.locator('button[title="Zoom out (−10%)"]')

      await zoomInButton.click()
      const zoomedIn = await getCanvasMetrics(page)
      expect(zoomedIn.width).toBeGreaterThan(relaxed.width)
      expect(Math.abs(zoomedIn.centerX - relaxed.centerX)).toBeLessThan(16)

      await zoomOutButton.click()
      const zoomedBack = await getCanvasMetrics(page)
      expect(zoomedBack.width).toBeLessThan(zoomedIn.width)
      expect(Math.abs(zoomedBack.centerX - relaxed.centerX)).toBeLessThan(16)
    } finally {
      if (courseId) {
        await deleteCourse(courseId)
      }
      await context.close()
    }
  })

  test("keeps canvas center aligned to panel midpoint through asymmetric panel resize", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()

    let courseId: string | null = null

    try {
      await signInAsTeacher(page)
      courseId = await createCourseForCreateView(page)
      await seedSingleSession(courseId)

      await page.goto(`/teacher/coursebuilder?id=${courseId}&view=create`)
      await expect(page.locator('[role="region"][aria-label^="Page"]').first()).toBeVisible()

      const initialCanvas = await getCanvasMetrics(page)
      const initialMidpoint = await getPanelMidpoint(page)
      expect(Math.abs(initialCanvas.centerX - initialMidpoint)).toBeLessThan(20)

      await dragHorizontal(page, "resize-files-panel-handle", 140)
      await dragHorizontal(page, "resize-atlas-panel-handle", -60)

      const resizedCanvas = await getCanvasMetrics(page)
      const resizedMidpoint = await getPanelMidpoint(page)
      expect(Math.abs(resizedCanvas.centerX - resizedMidpoint)).toBeLessThan(20)
    } finally {
      if (courseId) {
        await deleteCourse(courseId)
      }
      await context.close()
    }
  })
})

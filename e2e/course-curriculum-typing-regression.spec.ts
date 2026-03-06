import { test, expect, type Page } from "@playwright/test"
import { signInAsTeacher } from "./helpers/auth"
import { captureInsertedCourseId, goToSection, waitForDebounce } from "./helpers/course-test-utils"
import { deleteCourse, fetchCourse } from "./helpers/supabase-admin"

function selectByFieldLabel(page: Page, label: string) {
  return page.locator(`xpath=//span[.="${label}"]/parent::div/following-sibling::select[1]`)
}

test.describe("Curriculum Typing Regression", () => {
  test.use({ storageState: undefined })

  let sharedPage: Page
  let courseId: string | null = null

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    sharedPage = await context.newPage()
    await signInAsTeacher(sharedPage)
  })

  test.afterAll(async () => {
    if (courseId) await deleteCourse(courseId)
    await sharedPage.context().close()
  })

  test("rapid module typing and all-view naming persist to Supabase and rehydrate", async () => {
    const page = sharedPage

    const title = `Typing Regression ${Date.now()}`

    // Essentials: create course
    await page.goto("/teacher/coursebuilder")
    await page.getByPlaceholder("Enter course title").fill(title)
    await page.getByPlaceholder("Describe what students will learn").fill("Regression test for curriculum typing and persistence.")
    await selectByFieldLabel(page, "Course Language").selectOption("English")
    await selectByFieldLabel(page, "Course Type").selectOption("Online")

    courseId = await captureInsertedCourseId(page, async () => {
      await page.getByRole("button", { name: "Create Course" }).click()
    })

    // Curriculum: verify module typing is stable and does not remount input per character.
    await page.goto(`/teacher/coursebuilder?id=${courseId}`)
    await goToSection(page, "Curriculum")

    await page.getByText("Custom Modules").click()
    await page.getByRole("button", { name: "Modules", exact: true }).click()

    const moduleName = "Quantum Mechanics Foundations"
    const moduleInput = page.getByTestId("curriculum-module-input-0")
    await moduleInput.click()
    await moduleInput.pressSequentially(moduleName, { delay: 15 })
    const savedModuleName = await moduleInput.inputValue()
    expect(savedModuleName.endsWith(moduleName)).toBe(true)

    // All view: verify topic/objective/task manual edits save even when only those fields change.
    await page.getByRole("button", { name: "All", exact: true }).click()

    const topicName = "Topic Rapid Save"
    const objectiveName = "Objective Rapid Save"
    const taskName = "Task Rapid Save"

    await page.getByTestId("curriculum-all-topic-input-0-0").fill("")
    await page.getByTestId("curriculum-all-topic-input-0-0").pressSequentially(topicName, { delay: 12 })

    await page.getByTestId("curriculum-all-objective-input-0-0-0").fill("")
    await page.getByTestId("curriculum-all-objective-input-0-0-0").pressSequentially(objectiveName, { delay: 12 })

    await page.getByTestId("curriculum-all-task-input-0-0-0-0").fill("")
    await page.getByTestId("curriculum-all-task-input-0-0-0-0").pressSequentially(taskName, { delay: 12 })

    await waitForDebounce(page)

    const row = await fetchCourse(courseId)
    const curriculum = (row?.curriculum_data ?? {}) as Record<string, unknown>
    const moduleNames = (curriculum.module_names ?? []) as string[]
    const rows = (curriculum.session_rows ?? []) as Array<Record<string, unknown>>
    const firstRow = rows[0] ?? {}

    expect(moduleNames[0]).toBe(savedModuleName)
    expect(((firstRow.topic_names as string[] | undefined) ?? [])[0]).toBe(topicName)
    expect(((firstRow.objective_names as string[] | undefined) ?? [])[0]).toBe(objectiveName)
    expect(((firstRow.task_names as string[] | undefined) ?? [])[0]).toBe(taskName)

    // Reload and ensure hydration is correct from Supabase.
    await page.goto(`/teacher/coursebuilder?id=${courseId}`)
    await goToSection(page, "Curriculum")

    await page.getByRole("button", { name: "Modules", exact: true }).click()
    await expect(page.getByTestId("curriculum-module-input-0")).toHaveValue(savedModuleName)

    await page.getByRole("button", { name: "All", exact: true }).click()
    await expect(page.getByTestId("curriculum-all-topic-input-0-0")).toHaveValue(topicName)
    await expect(page.getByTestId("curriculum-all-objective-input-0-0-0")).toHaveValue(objectiveName)
    await expect(page.getByTestId("curriculum-all-task-input-0-0-0-0")).toHaveValue(taskName)
  })
})

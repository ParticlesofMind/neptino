import { test, expect, type Page } from "@playwright/test"
import { signInAsTeacher } from "./helpers/auth"
import {
  createAdminClient,
  deleteCourse,
  fetchCourse,
  fetchTemplatesForCourse,
} from "./helpers/supabase-admin"
import { captureInsertedCourseId, goToSection, waitForDebounce } from "./helpers/course-test-utils"

const COURSE_NAME = `E2E Setup Backend ${Date.now()}`
const COURSE_SUBTITLE = "Backend persistence verification"
const COURSE_DESCRIPTION = "Comprehensive setup flow test that verifies Supabase writes and rehydration."

function selectByFieldLabel(page: Page, label: string) {
  return page.locator(`xpath=//span[.="${label}"]/parent::div/following-sibling::select[1]`)
}

function inputByFieldLabel(page: Page, label: string) {
  return page.locator(`xpath=//span[.="${label}"]/parent::div/following-sibling::input[1]`)
}

async function pickFirstSearchableOption(page: Page) {
  await expect(page.locator("div.absolute.z-50").first()).toBeVisible({ timeout: 8_000 })
  await page.locator("div.absolute.z-50 button").first().click()
}

test.describe("Course Setup Backend Persistence", () => {
  test.use({ storageState: undefined })

  let sharedPage: Page
  let courseId: string

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    sharedPage = await context.newPage()
    await signInAsTeacher(sharedPage)
  })

  test.afterAll(async () => {
    if (courseId) {
      await deleteCourse(courseId)
    }
    await sharedPage.context().close()
  })

  test("runs full Setup flow and verifies Supabase writes from Essentials to Curriculum", async () => {
    const page = sharedPage

    // Essentials
    await page.goto("/teacher/coursebuilder")
    await page.getByPlaceholder("Enter course title").fill(COURSE_NAME)
    await page.getByPlaceholder("Enter course subtitle").fill(COURSE_SUBTITLE)
    await page.getByPlaceholder("Describe what students will learn").fill(COURSE_DESCRIPTION)
    await selectByFieldLabel(page, "Course Language").selectOption("English")
    await selectByFieldLabel(page, "Course Type").selectOption("Online")
    await expect(selectByFieldLabel(page, "Teacher")).not.toHaveValue("")

    courseId = await captureInsertedCourseId(page, async () => {
      await page.getByRole("button", { name: "Create Course" }).click()
    })

    const essentialsRow = await fetchCourse(courseId)
    expect(essentialsRow?.course_name).toBe(COURSE_NAME)
    expect(essentialsRow?.course_subtitle).toBe(COURSE_SUBTITLE)
    expect(essentialsRow?.course_description).toBe(COURSE_DESCRIPTION)
    expect(essentialsRow?.course_language).toBe("English")
    expect(essentialsRow?.course_type).toBe("Online")
    expect(essentialsRow?.generation_settings).not.toBeNull()

    // Classification
    await page.goto(`/teacher/coursebuilder?id=${courseId}`)
    await goToSection(page, "Classification")

    await page.getByRole("button", { name: "Select year..." }).click()
    await page.getByPlaceholder("Search...").fill("Year 10")
    await page.getByRole("button", { name: "Year 10" }).click()

    await page.getByRole("button", { name: "Select framework..." }).click()
    await pickFirstSearchableOption(page)

    await page.getByRole("button", { name: "Select domain..." }).click()
    await page.getByPlaceholder("Search...").fill("Education")
    await pickFirstSearchableOption(page)

    await page.getByRole("button", { name: "Select subject..." }).click()
    await pickFirstSearchableOption(page)

    await page.getByRole("button", { name: "Select topic..." }).click()
    await pickFirstSearchableOption(page)

    await page.getByRole("button", { name: "Select subtopic..." }).click()
    await pickFirstSearchableOption(page)

    await page.getByPlaceholder("e.g., Algebra I", { exact: true }).fill("Foundational Skills")
    await page.getByPlaceholder("e.g., Calculus", { exact: true }).fill("Advanced Studio Practice")
    await page.getByPlaceholder(/Students have completed Algebra I/).fill("Learners know core terminology and basic principles.")
    await page.getByPlaceholder("e.g., photosynthesis").fill("taxonomy")
    await page.getByRole("button", { name: "Add" }).first().click()
    await page.getByPlaceholder("e.g., Cell Division and Mitosis").fill("applied project work")
    await page.getByRole("button", { name: "Add" }).nth(1).click()
    await page.getByPlaceholder(/This biology course is taught through a medical sciences lens/).fill("Use project-based examples from real classroom contexts.")

    await waitForDebounce(page)

    const classificationRow = await fetchCourse(courseId)
    const classification = (classificationRow?.classification_data ?? {}) as Record<string, unknown>
    expect(String(classification.class_year ?? "")).toContain("Year 10")
    expect(classification.curricular_framework).toBeTruthy()
    expect(classification.domain).toBeTruthy()
    expect(classification.subject).toBeTruthy()
    expect(classification.topic).toBeTruthy()
    expect(classification.subtopic).toBeTruthy()
    expect(classification.prior_knowledge).toBe("Learners know core terminology and basic principles.")
    expect(classification.application_context).toContain("project-based examples")
    expect(Array.isArray(classification.key_terms)).toBe(true)
    expect((classification.key_terms as string[]).includes("taxonomy")).toBe(true)
    expect(Array.isArray(classification.mandatory_topics)).toBe(true)
    expect((classification.mandatory_topics as string[]).includes("applied project work")).toBe(true)

    // Students
    await goToSection(page, "Students")
    await page.getByRole("button", { name: "Manual Entry" }).click()
    await page.getByPlaceholder("Jane", { exact: true }).fill("Alice")
    await page.getByPlaceholder("Doe", { exact: true }).fill("Backend")
    await page.getByPlaceholder("jane@school.org", { exact: true }).fill("alice.backend@example.com")
    await selectByFieldLabel(page, "Learning Style Preference").selectOption("visual")
    await selectByFieldLabel(page, "Learning Differences").selectOption("accommodations")
    await page.getByPlaceholder(/extended time, reduced reading load/).fill("Extended time for written responses.")
    await page.getByRole("button", { name: "Add Student" }).click()

    await page.getByPlaceholder("Jane,Doe,jane@school.org,12345").fill("Bob,Builder,bob.builder@example.com,S-00042")
    await page.getByRole("button", { name: "Add Bulk Students" }).click()

    await waitForDebounce(page)

    const studentsRow = await fetchCourse(courseId)
    const studentsOverview = (studentsRow?.students_overview ?? {}) as Record<string, unknown>
    const students = (studentsOverview.students ?? []) as Array<Record<string, unknown>>
    expect(studentsOverview.method).toBe("manual")
    expect(students.length).toBeGreaterThanOrEqual(2)
    const alice = students.find((s) => s.email === "alice.backend@example.com")
    expect(alice?.learningStyle).toBe("visual")
    expect(alice?.learningDifferences).toBe("accommodations")
    expect(alice?.accommodations).toContain("Extended time")

    // Pedagogy
    await goToSection(page, "Pedagogy")
    await page.getByRole("button", { name: "Guided Discovery" }).click()
    await waitForDebounce(page)

    const pedagogyRow = await fetchCourse(courseId)
    const pedagogy = ((pedagogyRow?.course_layout ?? {}) as Record<string, unknown>).pedagogy as Record<string, unknown>
    expect(pedagogy?.x).toBe(-25)
    expect(pedagogy?.y).toBe(75)

    // Templates
    await goToSection(page, "Templates")
    await page.getByRole("button", { name: "Create Template" }).click()
    await page.getByRole("button", { name: "Quiz" }).click()
    await page.getByPlaceholder("My template").fill("Backend Quiz Template")
    await page.getByPlaceholder("Short description").fill("Template generated by backend persistence test.")
    await page.getByRole("button", { name: "Create", exact: true }).last().click()

    await waitForDebounce(page)

    const templatesCourseRow = await fetchCourse(courseId)
    const templateSettings = (templatesCourseRow?.template_settings ?? {}) as Record<string, unknown>
    const templates = (templateSettings.templates ?? []) as Array<Record<string, unknown>>
    expect(templates.some((template) => template.label === "Backend Quiz Template")).toBe(true)

    const templatesTableRows = await fetchTemplatesForCourse(courseId)
    expect(templatesTableRows.some((template) => template.name === "Backend Quiz Template")).toBe(true)

    // Schedule
    await goToSection(page, "Schedule")
    await page.getByPlaceholder("DD.MM.YYYY").first().fill("03.03.2026")
    await page.getByPlaceholder("DD.MM.YYYY").last().fill("31.03.2026")
    await page.getByRole("button", { name: "Mon", exact: true }).click()
    await page.getByRole("button", { name: "Wed", exact: true }).click()
    await selectByFieldLabel(page, "Repeats").selectOption("weeks")
    await inputByFieldLabel(page, "Repeat Every").fill("2")
    await inputByFieldLabel(page, "Cycles to Generate").fill("2")
    await inputByFieldLabel(page, "Sessions Per Day").fill("2")
    await page.getByPlaceholder("HH:MM").first().fill("09:00")
    await page.getByPlaceholder("HH:MM").last().fill("11:00")
    await page.getByRole("button", { name: "+ Add Break" }).click()
    await page.getByRole("button", { name: "Generate Schedule" }).click()

    await waitForDebounce(page)

    const scheduleRow = await fetchCourse(courseId)
    const schedule = (scheduleRow?.schedule_settings ?? {}) as Record<string, unknown>
    const generatedEntries = (schedule.generated_entries ?? []) as unknown[]
    const scheduleBreaks = (schedule.breaks ?? []) as unknown[]
    expect(schedule.schedule_mode).toBe("date-range")
    expect(schedule.repeat_unit).toBe("weeks")
    expect(schedule.repeat_every).toBe(2)
    expect(schedule.repeat_cycles).toBe(2)
    expect(schedule.sessions_per_day).toBe(2)
    expect(generatedEntries.length).toBeGreaterThan(0)
    expect(scheduleBreaks.length).toBeGreaterThan(0)

    // Resources
    await goToSection(page, "Resources")
    const resourceSelect = page.locator("select:enabled").first()
    await resourceSelect.selectOption("high")

    await waitForDebounce(page)

    const resourcesRow = await fetchCourse(courseId)
    const generationSettings = (resourcesRow?.generation_settings ?? {}) as Record<string, unknown>
    const resourcePreferences = (generationSettings.resources_preferences ?? []) as Array<Record<string, unknown>>
    const wikiPreference = resourcePreferences.find((resource) => resource.id === "wikipedia")
    expect(wikiPreference?.priority).toBe("high")

    // Curriculum
    await goToSection(page, "Curriculum")
    await page.getByText("Custom Modules").click()

    await page.getByText("Intensive").click()
    await inputByFieldLabel(page, "Number of Modules").fill("4")
    await inputByFieldLabel(page, "Topics / lesson").fill("3")
    await inputByFieldLabel(page, "Objectives / topic").fill("2")
    await inputByFieldLabel(page, "Tasks / objective").fill("2")
    await page.getByText("Spiral").click()
    await page.getByText("Complete").click()

    const certSelect = page.locator('select').filter({ hasText: "At the end of each module" }).first()
    await certSelect.selectOption("end-course")

    const namingSelects = page.locator("select").filter({ hasText: "No specific rule" })
    await namingSelects.nth(0).selectOption("verb")
    await namingSelects.nth(1).selectOption("noun")
    await namingSelects.nth(2).selectOption("question")
    await namingSelects.nth(3).selectOption("blooms")

    // Manual naming paths must stay unique per branch.
    await page.getByRole("button", { name: "Objectives", exact: true }).click()
    await page.getByTestId("curriculum-objective-input-0-0-0").fill("Objective Topic1-Obj1")
    await page.getByTestId("curriculum-objective-input-0-1-0").fill("Objective Topic2-Obj1")

    await page.getByRole("button", { name: "Tasks", exact: true }).click()
    await page.getByTestId("curriculum-task-input-0-0-0-0").fill("Task Topic1-Obj1-Task1")
    await page.getByTestId("curriculum-task-input-0-1-0-0").fill("Task Topic2-Obj1-Task1")

    await waitForDebounce(page)

    const curriculumRow = await fetchCourse(courseId)
    const curriculumData = (curriculumRow?.curriculum_data ?? {}) as Record<string, unknown>
    expect(curriculumData.module_org).toBe("custom")
    expect(curriculumData.module_count).toBe(4)
    expect(curriculumData.content_volume).toBe("triple")
    expect(curriculumData.topics).toBe(3)
    expect(curriculumData.objectives).toBe(2)
    expect(curriculumData.tasks).toBe(2)
    expect(curriculumData.sequencing_mode).toBe("spiral")
    expect(curriculumData.course_type).toBe("complete")
    expect(curriculumData.certificate_mode).toBe("end-course")
    expect(Array.isArray(curriculumData.session_rows)).toBe(true)
    expect((curriculumData.session_rows as unknown[]).length).toBeGreaterThan(0)

    const firstRow = ((curriculumData.session_rows as Array<Record<string, unknown>>)[0] ?? {})
    const objectiveNames = (firstRow.objective_names ?? []) as string[]
    const taskNames = (firstRow.task_names ?? []) as string[]
    expect(objectiveNames[0]).toBe("Objective Topic1-Obj1")
    expect(objectiveNames[2]).toBe("Objective Topic2-Obj1")
    expect(taskNames[0]).toBe("Task Topic1-Obj1-Task1")
    expect(taskNames[4]).toBe("Task Topic2-Obj1-Task1")

    const generationWithAi = (curriculumRow?.generation_settings ?? {}) as Record<string, unknown>
    const aiGeneration = (generationWithAi.ai_generation ?? {}) as Record<string, unknown>
    const curriculumContext = (aiGeneration.curriculum_context ?? {}) as Record<string, unknown>
    expect(curriculumContext.module_org).toBe("custom")
    expect(curriculumContext.module_count).toBe(4)
    expect(curriculumContext.topics_per_lesson).toBe(3)
    expect(curriculumContext.objectives_per_topic).toBe(2)
    expect(curriculumContext.tasks_per_objective).toBe(2)

    // Verify fetch path by reloading after full setup and checking persisted values are hydrated.
    await page.goto(`/teacher/coursebuilder?id=${courseId}`)
    await goToSection(page, "Essentials")
    await expect(page.getByPlaceholder("Enter course title")).toHaveValue(COURSE_NAME)
    await goToSection(page, "Students")
    await expect(page.getByText("alice.backend@example.com")).toBeVisible()
    await goToSection(page, "Curriculum")
    await expect(inputByFieldLabel(page, "Number of Modules")).toHaveValue("4")
    await page.getByRole("button", { name: "Objectives", exact: true }).click()
    await expect(page.getByTestId("curriculum-objective-input-0-0-0")).toHaveValue("Objective Topic1-Obj1")
    await expect(page.getByTestId("curriculum-objective-input-0-1-0")).toHaveValue("Objective Topic2-Obj1")
    await page.getByRole("button", { name: "Tasks", exact: true }).click()
    await expect(page.getByTestId("curriculum-task-input-0-0-0-0")).toHaveValue("Task Topic1-Obj1-Task1")
    await expect(page.getByTestId("curriculum-task-input-0-1-0-0")).toHaveValue("Task Topic2-Obj1-Task1")

    // Save trigger must work when only manual naming fields change.
    await page.getByRole("button", { name: "Topics", exact: true }).click()
    await page.getByTestId("curriculum-topic-input-0-0").fill("Topic One Manual Rename")
    await page.getByRole("button", { name: "Objectives", exact: true }).click()
    await page.getByTestId("curriculum-objective-input-0-0-0").fill("Objective Manual Rename")
    await page.getByRole("button", { name: "Tasks", exact: true }).click()
    await page.getByTestId("curriculum-task-input-0-0-0-0").fill("Task Manual Rename")

    await waitForDebounce(page)

    const namesOnlySaveRow = await fetchCourse(courseId)
    const namesOnlyFirst = (((namesOnlySaveRow?.curriculum_data as Record<string, unknown> | null)?.session_rows as Array<Record<string, unknown>> | undefined)?.[0] ?? {})
    const namesOnlyTopics = (namesOnlyFirst.topic_names ?? []) as string[]
    const namesOnlyObjectives = (namesOnlyFirst.objective_names ?? []) as string[]
    const namesOnlyTasks = (namesOnlyFirst.task_names ?? []) as string[]
    expect(namesOnlyTopics[0]).toBe("Topic One Manual Rename")
    expect(namesOnlyObjectives[0]).toBe("Objective Manual Rename")
    expect(namesOnlyTasks[0]).toBe("Task Manual Rename")

    // Ensure DB row still exists after full cycle.
    const admin = createAdminClient()
    const { data: finalRow, error } = await admin
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .single()

    expect(error).toBeNull()
    expect(finalRow?.id).toBe(courseId)
  })
})

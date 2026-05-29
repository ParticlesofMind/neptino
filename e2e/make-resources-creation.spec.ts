import { expect, test, type Page } from "@playwright/test"

import { signInAsTeacher } from "./helpers/auth"
import { createAdminClient, deleteCourse } from "./helpers/supabase-admin"
import type { CardType } from "../src/components/coursebuilder/create/types"

type ResourceScenario = {
  type: CardType
  fill: (page: Page) => Promise<void>
}

const IMAGE_ASSET = "/coursebuilder-stress/stress-image.svg"
const AUDIO_ASSET = "/coursebuilder-stress/stress-audio.wav"
const VIDEO_ASSET = "/coursebuilder-stress/stress-video.mp4"

const RESOURCE_SCENARIOS: ResourceScenario[] = [
  {
    type: "text",
    fill: async (page) => {
      const editor = page.locator(".ProseMirror").first()
      await expect(editor).toBeVisible()
      await editor.click()
      await page.keyboard.insertText("Evaporation, condensation, and precipitation move water through a connected system.")
    },
  },
  {
    type: "image",
    fill: async (page) => {
      await fillAndCommit(page.getByPlaceholder("https://example.com/image.jpg"), IMAGE_ASSET)
      await page.getByPlaceholder("Describe this image for screen readers").fill("Diagram of a release resource.")
    },
  },
  {
    type: "audio",
    fill: async (page) => {
      await fillAndCommit(page.getByPlaceholder("https://example.com/audio.mp3"), AUDIO_ASSET)
    },
  },
  {
    type: "video",
    fill: async (page) => {
      await fillAndCommit(page.getByPlaceholder("YouTube, Vimeo, or .mp4 / .m3u8 URL"), VIDEO_ASSET)
    },
  },
  {
    type: "animation",
    fill: async (page) => {
      await page.getByRole("button", { name: "SVG", exact: true }).click()
      await fillAndCommit(page.getByPlaceholder(/animation\.svg/), IMAGE_ASSET)
    },
  },
  {
    type: "dataset",
    fill: async (page) => {
      await page.getByPlaceholder("What does this dataset contain?").fill("A compact test dataset for release validation.")
      await page.getByPlaceholder("https://... or database.table_name").fill("atlas.release_resources")
    },
  },
  {
    type: "embed",
    fill: async (page) => {
      await fillAndCommit(page.getByPlaceholder("https://example.com/article"), "about:blank")
    },
  },
  {
    type: "flashcards",
    fill: async (page) => {
      await page.getByPlaceholder("Term").first().fill("Nucleus")
      await page.getByPlaceholder("Definition / match").first().fill("Stores genetic material")
    },
  },
  {
    type: "code-snippet",
    fill: async (page) => {
      await page.getByPlaceholder("const answer = 42").fill("const average = values.reduce((sum, value) => sum + value, 0) / values.length")
    },
  },
  {
    type: "model-3d",
    fill: async () => {},
  },
  {
    type: "map",
    fill: async () => {},
  },
  {
    type: "chart",
    fill: async (page) => {
      await page.getByPlaceholder("Label").first().fill("Week 1")
      await page.getByPlaceholder("0").first().fill("42")
    },
  },
  {
    type: "diagram",
    fill: async (page) => {
      await page.getByRole("button", { name: /add node/i }).click()
    },
  },
  {
    type: "document",
    fill: async (page) => {
      await fillAndCommit(page.getByPlaceholder("https://example.com/document.pdf"), "data:application/pdf;base64,JVBERi0xLjQK")
      await page.getByPlaceholder(/Key excerpt or abstract/).fill("Reference excerpt used by the release resource test.")
    },
  },
  {
    type: "timeline",
    fill: async (page) => {
      await page.getByRole("button", { name: /add event/i }).click()
      await page.getByPlaceholder("e.g. 1969").fill("1969")
      await page.getByPlaceholder("Event name").fill("ARPANET")
    },
  },
]

async function createCourseForMakeResources(): Promise<string> {
  const admin = createAdminClient()
  const email = process.env.E2E_TEST_EMAIL
  if (!email) {
    throw new Error("E2E_TEST_EMAIL is not set.")
  }

  const { data: teacher, error: teacherError } = await admin
    .from("users")
    .select("id, email, first_name, last_name, institution")
    .eq("email", email)
    .single()

  if (teacherError || !teacher) {
    throw new Error(`Could not find E2E teacher profile: ${teacherError?.message ?? "missing row"}`)
  }

  const title = `Make Resources E2E ${Date.now()}`
  const teacherName = [teacher.first_name, teacher.last_name].filter(Boolean).join(" ") || teacher.email
  const { data: course, error } = await admin
    .from("courses")
    .insert({
      course_name: title,
      course_subtitle: "Resource creation coverage",
      course_description: "Release resource creation checks.",
      course_language: "English",
      course_type: "Online",
      teacher_id: teacher.id,
      institution: teacher.institution ?? "Independent",
      generation_settings: {
        teacher_id: teacher.id,
        teacher_name: teacherName,
      },
      students_overview: { total: 0, synced: 0 },
      curriculum_data: {
        topics: 1,
        objectives: 1,
        tasks: 1,
        module_names: ["Module 1"],
        session_rows: [
          {
            id: "e2e-make-resources-session-1",
            session_number: 1,
            title: "Session 1",
            template_type: "lesson",
            topics: 1,
            objectives: 1,
            tasks: 1,
            topic_names: ["Release resources"],
            objective_names: ["Create each resource type"],
            task_names: ["Create and save one resource"],
          },
        ],
      },
    })
    .select("id")
    .single()

  if (error || !course) {
    throw new Error(`createCourseForMakeResources failed: ${error?.message ?? "missing inserted row"}`)
  }

  return course.id as string
}

async function openMakePanel(page: Page) {
  const addButton = page.getByTestId("make-add-block")
  if (!(await addButton.isVisible({ timeout: 750 }).catch(() => false))) {
    await page.getByRole("button", { name: /^make$/i }).click()
  }
  await expect(addButton).toBeVisible()
}

async function fillTitle(page: Page, title: string) {
  const titleInput = page.getByLabel("Block name").first()
  await expect(titleInput).toBeVisible()
  await titleInput.fill(title)
}

async function fillAndCommit(locator: ReturnType<Page["getByPlaceholder"]>, value: string) {
  const input = locator.first()
  await expect(input).toBeVisible()
  await input.fill(value)
  await input.press("Enter")
}

test.describe("Make panel release resources", () => {
  let courseId: string | null = null

  test.afterEach(async () => {
    if (courseId) {
      await deleteCourse(courseId)
      courseId = null
    }
  })

  test("creates every initial-release resource from the Make tab", async ({ page }) => {
    test.setTimeout(120_000)

    await signInAsTeacher(page)
    await page.evaluate(() => localStorage.removeItem("neptino-make-library"))

    courseId = await createCourseForMakeResources()

    await page.goto(`/teacher/coursebuilder?id=${courseId}&view=create`)
    await page.waitForLoadState("networkidle")

    const runId = Date.now()

    for (const [index, scenario] of RESOURCE_SCENARIOS.entries()) {
      const title = `E2E ${scenario.type} resource ${runId}-${index + 1}`

      await openMakePanel(page)
      await page.getByTestId("make-filter-resources").click()
      await page.getByTestId(`make-card-type-${scenario.type}`).scrollIntoViewIfNeeded()
      await page.getByTestId(`make-card-type-${scenario.type}`).click()

      await fillTitle(page, title)
      await scenario.fill(page)

      const addButton = page.getByTestId("make-add-block")
      await expect(addButton, `${scenario.type} should be addable`).toBeEnabled({ timeout: 5_000 })
      await addButton.click()
      await expect(addButton).toContainText("Added", { timeout: 2_000 })

      await page.waitForTimeout(900)
      await openMakePanel(page)
      await page.getByTestId("make-filter-library").click()
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 5_000 })
    }
  })
})

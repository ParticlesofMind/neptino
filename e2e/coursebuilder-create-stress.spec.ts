import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { signInAsTeacher } from "./helpers/auth"
import { createAdminClient } from "./helpers/supabase-admin"

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const OUTPUT_DIR = path.join(process.cwd(), "output", "playwright")
const STRESS_IMAGE_URL = "/coursebuilder-stress/stress-image.svg"
const STRESS_VIDEO_URL = "/coursebuilder-stress/stress-video.mp4"
const STRESS_AUDIO_URL = "/coursebuilder-stress/stress-audio.wav"

const SESSION_COUNT = 3
const TOPICS_PER_SESSION = 2
const OBJECTIVES_PER_TOPIC = 2
const TASKS_PER_OBJECTIVE = 4
const SEEDED_CARDS_PER_TASK = 3
const HEAVY_DEBUG_CARDS_PER_TASK = 4

const TOTAL_TASKS =
  SESSION_COUNT * TOPICS_PER_SESSION * OBJECTIVES_PER_TOPIC * TASKS_PER_OBJECTIVE
const EXPECTED_SEEDED_CARDS = TOTAL_TASKS * SEEDED_CARDS_PER_TASK
const EXPECTED_TOTAL_AFTER_HEAVY =
  EXPECTED_SEEDED_CARDS + TOTAL_TASKS * HEAVY_DEBUG_CARDS_PER_TASK

type StressCardType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "map"
  | "timeline"
  | "interactive"
  | "form"
  | "sorter"
  | "chat"
  | "text-editor"
  | "code-editor"
  | "whiteboard"
  | "rich-sim"
  | "layout-split"
  | "layout-quad"
  | "layout-gallery"

type SummaryReport = Record<string, unknown> | null

const CARD_TYPES: StressCardType[] = [
  "text",
  "image",
  "video",
  "audio",
  "document",
  "map",
  "timeline",
  "interactive",
  "form",
  "sorter",
  "chat",
  "text-editor",
  "code-editor",
  "whiteboard",
  "rich-sim",
  "layout-split",
  "layout-quad",
  "layout-gallery",
]

const CARD_DIMENSIONS: Record<StressCardType, { width: number; height: number }> = {
  text: { width: 420, height: 320 },
  image: { width: 400, height: 300 },
  video: { width: 480, height: 270 },
  audio: { width: 420, height: 180 },
  document: { width: 420, height: 560 },
  map: { width: 480, height: 360 },
  timeline: { width: 420, height: 480 },
  interactive: { width: 480, height: 280 },
  form: { width: 500, height: 320 },
  sorter: { width: 520, height: 320 },
  chat: { width: 420, height: 320 },
  "text-editor": { width: 520, height: 360 },
  "code-editor": { width: 560, height: 380 },
  whiteboard: { width: 640, height: 420 },
  "rich-sim": { width: 520, height: 320 },
  "layout-split": { width: 642, height: 310 },
  "layout-quad": { width: 642, height: 510 },
  "layout-gallery": { width: 780, height: 520 },
}

const AREA_KINDS = ["instruction", "practice", "feedback"] as const

function isoDate(offsetDays: number) {
  const d = new Date(Date.UTC(2026, 5, 1 + offsetDays, 9, 0, 0))
  return d.toISOString().slice(0, 10)
}

function buildScopedObjectiveNames(sessionNumber: number) {
  return Array.from({ length: TOPICS_PER_SESSION * OBJECTIVES_PER_TOPIC }, (_, index) => {
    const topicNumber = Math.floor(index / OBJECTIVES_PER_TOPIC) + 1
    const objectiveNumber = (index % OBJECTIVES_PER_TOPIC) + 1
    return `Session ${sessionNumber} · Topic ${topicNumber} · Objective ${objectiveNumber}`
  })
}

function buildScopedTaskNames(sessionNumber: number) {
  const verbs = ["Explain", "Compare", "Prototype", "Reflect", "Map", "Debate", "Label", "Synthesize"]
  return Array.from(
    { length: TOPICS_PER_SESSION * OBJECTIVES_PER_TOPIC * TASKS_PER_OBJECTIVE },
    (_, index) => {
      const topicNumber = Math.floor(index / (OBJECTIVES_PER_TOPIC * TASKS_PER_OBJECTIVE)) + 1
      const taskWithinTopic = index % (OBJECTIVES_PER_TOPIC * TASKS_PER_OBJECTIVE)
      const objectiveNumber = Math.floor(taskWithinTopic / TASKS_PER_OBJECTIVE) + 1
      const taskNumber = (taskWithinTopic % TASKS_PER_OBJECTIVE) + 1
      const verb = verbs[index % verbs.length]
      return `Session ${sessionNumber} · Topic ${topicNumber} · Objective ${objectiveNumber} · Task ${taskNumber}: ${verb}`
    },
  )
}

function buildCardContent(
  cardType: StressCardType,
  sessionNumber: number,
  topicNumber: number,
  objectiveNumber: number,
  taskNumber: number,
  cardIndex: number,
): Record<string, unknown> {
  const suffix = `S${sessionNumber} T${topicNumber} O${objectiveNumber} K${taskNumber} C${cardIndex + 1}`
  const longText =
    "This stress payload uses realistic sample content so the create canvas has to render rich text, media frames, timelines, and larger interactive shells at the same time."

  switch (cardType) {
    case "text":
      return {
        title: `Briefing ${suffix}`,
        text: `${longText}\n\nStudents compare evidence, annotate patterns, and document their reasoning before moving to the next activity.`,
      }
    case "image":
      return {
        title: `Image ${suffix}`,
        url: STRESS_IMAGE_URL,
        alt: `Stress image ${suffix}`,
        caption: "Local placeholder image for layout and image-fit testing.",
      }
    case "video":
      return {
        title: `Video ${suffix}`,
        url: STRESS_VIDEO_URL,
        poster: STRESS_IMAGE_URL,
        aspectRatio: "16:9",
        showControls: true,
      }
    case "audio":
      return {
        title: `Audio ${suffix}`,
        url: STRESS_AUDIO_URL,
        transcript: "Audio narration placeholder used to stress media card rendering.",
        transcriptSegments: [
          { id: `audio-${suffix}`, start: 0, end: 12, text: "Audio narration placeholder used to stress media card rendering." },
        ],
      }
    case "document":
      return {
        title: `Document ${suffix}`,
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "PDF",
        pages: 12,
      }
    case "map":
      return {
        title: `Map ${suffix}`,
        lat: 46.948,
        lng: 7.447,
        zoom: 8,
        layers: ["choropleth", "city labels"],
        attribution: "OpenStreetMap",
      }
    case "timeline":
      return {
        title: `Timeline ${suffix}`,
        orientation: "horizontal",
        events: [
          { date: "1859", label: "Launch", description: "The first milestone anchors the narrative." },
          { date: "1905", label: "Acceleration", description: "New methods reshape the field." },
          { date: "1969", label: "Breakthrough", description: "A major systems change expands adoption." },
          { date: "2026", label: "Today", description: "Students connect the history to the current topic." },
        ],
      }
    case "interactive":
      return {
        title: `Assessment ${suffix}`,
        interactionType: "multiple-choice",
        prompt: "Which option best matches the evidence shown in the source set?",
        options: [
          { text: "Option A", correct: false, feedback: "This misses the main causal link." },
          { text: "Option B", correct: true, feedback: "Correct. This aligns with the strongest evidence." },
          { text: "Option C", correct: false, feedback: "This describes an effect, not the cause." },
        ],
      }
    case "form":
      return {
        title: `Reflection form ${suffix}`,
        prompt: "Summarise the strongest insight from this task and justify it with one source.",
        fields: [
          { id: `field-summary-${suffix}`, label: "Key insight", type: "textarea", required: true },
          { id: `field-evidence-${suffix}`, label: "Evidence", type: "text", required: true },
        ],
      }
    case "sorter":
      return {
        title: `Sorter ${suffix}`,
        mode: "match",
        items: [
          { id: `sort-${suffix}-1`, label: "Cause" },
          { id: `sort-${suffix}-2`, label: "Effect" },
          { id: `sort-${suffix}-3`, label: "Primary source" },
          { id: `sort-${suffix}-4`, label: "Secondary source" },
        ],
      }
    case "chat":
      return {
        title: `Character chat ${suffix}`,
        aiPersona: "Historical guide",
        model: "gemma3:4b",
        topic: "Support the learner through a guided discussion of evidence, bias, and interpretation.",
        openingMessage: "Let’s unpack the source material together.",
        conversationStarters: [
          "What is the main claim?",
          "Which evidence is the most reliable?",
          "What might be missing from this perspective?",
        ],
      }
    case "text-editor":
      return {
        title: `Writing studio ${suffix}`,
        mode: "document",
        placeholder: "Draft here...",
        document: `<h2>Writing studio ${suffix}</h2><p>${longText}</p><ul><li>Claim</li><li>Evidence</li><li>Reflection</li></ul>`,
      }
    case "code-editor":
      return {
        title: `Code lab ${suffix}`,
        language: "javascript",
        prompt: "Inspect the data transformation and explain what changes when the filter criteria shift.",
        code: `const samples = [12, 18, 24, 30]\nconst adjusted = samples.map((value) => value + ${sessionNumber + taskNumber})\nconsole.log(adjusted)\n`,
      }
    case "whiteboard":
      return {
        title: `Whiteboard ${suffix}`,
        boardKey: `stress-board-${suffix.toLowerCase().replace(/\s+/g, "-")}`,
        prompt: "Sketch a flow, annotate the media, and connect related concepts.",
      }
    case "rich-sim":
      return {
        title: `Simulation ${suffix}`,
        simType: "systems",
        prompt: "Observe the changing variables and note which factors matter most.",
      }
    case "layout-split":
      return {
        title: `Split layout ${suffix}`,
        slots: {},
      }
    case "layout-quad":
      return {
        title: `Quad layout ${suffix}`,
        slots: {},
      }
    case "layout-gallery":
      return {
        title: `Gallery layout ${suffix}`,
        slots: {},
      }
  }
}

function buildStressSessionRows() {
  return Array.from({ length: SESSION_COUNT }, (_, index) => {
    const sessionNumber = index + 1
    return {
      id: `stress-session-${sessionNumber}`,
      session_number: sessionNumber,
      title: `Stress Session ${sessionNumber}`,
      template_type: "lesson",
      duration_minutes: 95,
      topics: TOPICS_PER_SESSION,
      objectives: OBJECTIVES_PER_TOPIC,
      tasks: TASKS_PER_OBJECTIVE,
      topic_names: Array.from(
        { length: TOPICS_PER_SESSION },
        (_, topicIndex) => `Session ${sessionNumber} Topic ${topicIndex + 1}`,
      ),
      objective_names: buildScopedObjectiveNames(sessionNumber),
      task_names: buildScopedTaskNames(sessionNumber),
      schedule_date: isoDate(index),
    }
  })
}

function buildStressLessons(courseId: string) {
  let globalOrder = 1
  let recipeCursor = 0

  return Array.from({ length: SESSION_COUNT }, (_, sessionIndex) => {
    const sessionNumber = sessionIndex + 1

    const topics = Array.from({ length: TOPICS_PER_SESSION }, (_, topicIndex) => ({
      id: `seed-topic-${sessionNumber}-${topicIndex + 1}`,
      sessionId: `seed-session-${sessionNumber}`,
      label: `Session ${sessionNumber} Topic ${topicIndex + 1}`,
      order: topicIndex,
      objectives: Array.from({ length: OBJECTIVES_PER_TOPIC }, (_, objectiveIndex) => ({
        id: `seed-objective-${sessionNumber}-${topicIndex + 1}-${objectiveIndex + 1}`,
        topicId: `seed-topic-${sessionNumber}-${topicIndex + 1}`,
        label: `Objective ${objectiveIndex + 1}`,
        order: objectiveIndex,
        tasks: Array.from({ length: TASKS_PER_OBJECTIVE }, (_, taskIndex) => ({
          id: `seed-task-${sessionNumber}-${topicIndex + 1}-${objectiveIndex + 1}-${taskIndex + 1}`,
          objectiveId: `seed-objective-${sessionNumber}-${topicIndex + 1}-${objectiveIndex + 1}`,
          label: `Task ${taskIndex + 1}`,
          order: taskIndex,
          droppedCards: Array.from({ length: SEEDED_CARDS_PER_TASK }, (_, cardIndex) => {
            const cardType = CARD_TYPES[recipeCursor % CARD_TYPES.length]
            recipeCursor += 1
            return {
              id: `seed-dropped-${sessionNumber}-${topicIndex + 1}-${objectiveIndex + 1}-${taskIndex + 1}-${cardIndex + 1}`,
              cardId: `seed-card-${sessionNumber}-${topicIndex + 1}-${objectiveIndex + 1}-${taskIndex + 1}-${cardType}-${cardIndex + 1}`,
              cardType,
              taskId: `seed-task-${sessionNumber}-${topicIndex + 1}-${objectiveIndex + 1}-${taskIndex + 1}`,
              areaKind: AREA_KINDS[cardIndex % AREA_KINDS.length],
              blockKey: "assignment",
              position: { x: 0, y: cardIndex * 18 },
              dimensions: CARD_DIMENSIONS[cardType],
              content: buildCardContent(
                cardType,
                sessionNumber,
                topicIndex + 1,
                objectiveIndex + 1,
                taskIndex + 1,
                cardIndex,
              ),
              order: globalOrder++,
            }
          }),
        })),
      })),
    }))

    return {
      course_id: courseId,
      lesson_number: sessionNumber,
      title: `Stress Session ${sessionNumber}`,
      payload: {
        topics,
        canvases: [
          {
            id: `seed-session-${sessionNumber}-canvas-1`,
            sessionId: `seed-session-${sessionNumber}`,
            pageNumber: 1,
          },
        ],
        fieldEnabled: null,
      },
      updated_at: new Date().toISOString(),
    }
  })
}

async function resolveTargetCourse() {
  const admin = createAdminClient()
  const targetCourseId = process.env.STRESS_COURSE_ID

  if (targetCourseId) {
    const { data, error } = await admin
      .from("courses")
      .select("id, course_name")
      .eq("id", targetCourseId)
      .single()

    if (error || !data) {
      throw new Error(`Could not resolve STRESS_COURSE_ID=${targetCourseId}: ${error?.message ?? "missing row"}`)
    }

    return { id: data.id as string, courseName: data.course_name as string }
  }

  const { data, error } = await admin
    .from("courses")
    .select("id, course_name")
    .order("updated_at", { ascending: false })
    .limit(1)

  if (error) throw new Error(`Failed to find latest course: ${error.message}`)

  const latest = data?.[0]
  if (!latest) throw new Error("No existing courses found to stress test.")

  return { id: latest.id as string, courseName: latest.course_name as string }
}

async function seedStressCourse(courseId: string) {
  const admin = createAdminClient()
  const sessionRows = buildStressSessionRows()
  const lessons = buildStressLessons(courseId)

  const { error: courseError } = await admin
    .from("courses")
    .update({
      curriculum_data: {
        module_org: "linear",
        module_count: SESSION_COUNT,
        module_names: ["Foundations", "Applications", "Synthesis"],
        topics: TOPICS_PER_SESSION,
        objectives: OBJECTIVES_PER_TOPIC,
        tasks: TASKS_PER_OBJECTIVE,
        session_rows: sessionRows,
      },
      schedule_settings: {
        generated_entries: sessionRows.map((row, index) => ({
          id: `stress-entry-${index + 1}`,
          session: row.session_number,
          day: ["Mon", "Wed", "Fri"][index % 3],
          date: row.schedule_date,
          start_time: "09:00",
          end_time: "10:30",
        })),
      },
      course_layout: {
        canvas_size: "a4",
        orientation: "portrait",
        bodyBlockGap: 8,
        visualDensity: "balanced",
        margins: { top: 20, right: 20, bottom: 20, left: 20, unit: "mm" },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId)

  if (courseError) {
    throw new Error(`Failed to update course for stress seed: ${courseError.message}`)
  }

  const { error: lessonError } = await admin
    .from("lessons")
    .upsert(lessons, { onConflict: "course_id,lesson_number" })

  if (lessonError) {
    throw new Error(`Failed to upsert stress lessons: ${lessonError.message}`)
  }
}

async function fetchPersistedStats(courseId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("lessons")
    .select("lesson_number, title, payload")
    .eq("course_id", courseId)
    .order("lesson_number")

  if (error) throw new Error(`Failed to fetch persisted lessons: ${error.message}`)

  let canvases = 0
  let topics = 0
  let objectives = 0
  let tasks = 0
  let cards = 0

  for (const row of data ?? []) {
    const payload = (row.payload ?? {}) as Record<string, unknown>
    const topicRows = Array.isArray(payload.topics)
      ? (payload.topics as Array<Record<string, unknown>>)
      : []
    const canvasRows = Array.isArray(payload.canvases)
      ? (payload.canvases as Array<Record<string, unknown>>)
      : []

    canvases += canvasRows.length
    topics += topicRows.length

    for (const topic of topicRows) {
      const objectiveRows = Array.isArray(topic.objectives)
        ? (topic.objectives as Array<Record<string, unknown>>)
        : []
      objectives += objectiveRows.length

      for (const objective of objectiveRows) {
        const taskRows = Array.isArray(objective.tasks)
          ? (objective.tasks as Array<Record<string, unknown>>)
          : []
        tasks += taskRows.length

        for (const task of taskRows) {
          const droppedCards = Array.isArray(task.droppedCards)
            ? (task.droppedCards as Array<Record<string, unknown>>)
            : []
          cards += droppedCards.length
        }
      }
    }
  }

  return {
    lessonCount: data?.length ?? 0,
    canvases,
    topics,
    objectives,
    tasks,
    cards,
  }
}

async function openDebugPanel(page: Page) {
  const toggle = page.getByLabel("Toggle canvas debug panel")
  await expect(toggle).toBeVisible({ timeout: 20_000 })
  await toggle.evaluate((button) => {
    if (button instanceof HTMLButtonElement) button.click()
  })
  await expect(page.getByText("Canvas Debug")).toBeVisible({ timeout: 10_000 })
}

async function captureSummaryFromClipboard(page: Page): Promise<SummaryReport> {
  try {
    await page.getByRole("button", { name: "Summary" }).click()
    await page.waitForTimeout(250)
    const raw = await page.evaluate(() => navigator.clipboard.readText())
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function missingCanvases(summary: SummaryReport): number | null {
  const measurements = summary?.measurements
  if (!measurements || typeof measurements !== "object") return null
  const value = (measurements as Record<string, unknown>).missingCanvases
  return typeof value === "number" ? value : null
}

async function captureSettledSummaryFromClipboard(
  page: Page,
  timeoutMs = 15_000,
): Promise<SummaryReport> {
  const deadline = Date.now() + timeoutMs
  let latest: SummaryReport = null

  while (Date.now() < deadline) {
    latest = await captureSummaryFromClipboard(page)
    if (missingCanvases(latest) === 0) return latest
    await page.waitForTimeout(500)
  }

  return latest
}

async function dragHorizontal(page: Page, testId: string, deltaX: number) {
  const handle = page.getByTestId(testId)
  await expect(handle).toBeVisible()

  const box = await handle.boundingBox()
  if (!box) {
    throw new Error(`Could not resolve bounds for ${testId}`)
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + deltaX, startY, { steps: 10 })
  await page.mouse.up()
}

async function captureDomOverflowSummary(page: Page) {
  const pages = await page.locator('[role="region"][aria-label^="Page"]').evaluateAll((regions) =>
    regions.map((region, index) => {
      const canvas = region.firstElementChild as HTMLElement | null
      const body = canvas?.querySelector<HTMLElement>('[data-canvas-layer="body"]') ?? undefined
      const content = body?.firstElementChild as HTMLElement | undefined
      const contentH = content?.scrollHeight ?? null
      const bodyH = body?.clientHeight ?? null
      const overflow = typeof contentH === "number" && typeof bodyH === "number"
        ? contentH - bodyH > 2
        : false

      return {
        index: index + 1,
        label: region.getAttribute("aria-label"),
        contentH,
        bodyH,
        overflow,
      }
    }),
  )

  return {
    measuredPages: pages.filter((entry) => entry.contentH !== null && entry.bodyH !== null).length,
    overflowCount: pages.filter((entry) => entry.overflow).length,
    overflowExamples: pages.filter((entry) => entry.overflow).slice(0, 10),
  }
}

async function capturePrintSafetySummary(page: Page) {
  const pages = await page.locator('[data-canvas-page-surface]').evaluateAll((surfaces) =>
    surfaces.map((surface, pageIndex) => {
      const el = surface as HTMLElement
      const rect = el.getBoundingClientRect()
      const sheetWidth = Number(el.dataset.sheetWidth)
      const sheetHeight = Number(el.dataset.sheetHeight)
      const safeX = Number(el.dataset.printSafeX)
      const safeY = Number(el.dataset.printSafeY)
      const safeWidth = Number(el.dataset.printSafeWidth)
      const safeHeight = Number(el.dataset.printSafeHeight)
      const scaleX = Number.isFinite(sheetWidth) && sheetWidth > 0 ? rect.width / sheetWidth : 1
      const scaleY = Number.isFinite(sheetHeight) && sheetHeight > 0 ? rect.height / sheetHeight : 1
      const sheetRect = {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      }
      const safeRect = {
        left: rect.left + safeX * scaleX,
        top: rect.top + safeY * scaleY,
        right: rect.left + (safeX + safeWidth) * scaleX,
        bottom: rect.top + (safeY + safeHeight) * scaleY,
      }

      const within = (
        item: { left: number; top: number; right: number; bottom: number },
        bounds: { left: number; top: number; right: number; bottom: number },
        tolerance = 2,
      ) =>
        item.left >= bounds.left - tolerance &&
        item.top >= bounds.top - tolerance &&
        item.right <= bounds.right + tolerance &&
        item.bottom <= bounds.bottom + tolerance

      const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-card-layout-role]"))
      const criticalCards = cards.filter((card) => card.dataset.printSafeCritical === "true")
      const sheetOverflow = cards
        .map((card) => ({ id: card.dataset.cardId ?? card.getAttribute("data-card-id"), rect: card.getBoundingClientRect() }))
        .filter((entry) => !within(entry.rect, sheetRect, 2))
      const criticalOverflow = criticalCards
        .map((card) => ({
          id: card.dataset.cardId ?? card.getAttribute("data-card-id"),
          role: card.dataset.cardLayoutRole,
          rect: card.getBoundingClientRect(),
        }))
        .filter((entry) => !within(entry.rect, safeRect, 2))

      return {
        pageIndex: pageIndex + 1,
        sheetOverflowCount: sheetOverflow.length,
        criticalContentOutsidePrintSafe: criticalOverflow.length,
        sheetOverflowExamples: sheetOverflow.slice(0, 3).map((entry) => entry.id),
        criticalExamples: criticalOverflow.slice(0, 3).map((entry) => ({ id: entry.id, role: entry.role })),
      }
    }),
  )

  return {
    measuredPages: pages.length,
    sheetOverflowCount: pages.reduce((sum, entry) => sum + entry.sheetOverflowCount, 0),
    criticalContentOutsidePrintSafe: pages.reduce((sum, entry) => sum + entry.criticalContentOutsidePrintSafe, 0),
    examples: pages
      .filter((entry) => entry.sheetOverflowCount > 0 || entry.criticalContentOutsidePrintSafe > 0)
      .slice(0, 10),
  }
}

test.describe("Coursebuilder create stress", () => {
  test.use({
    storageState: undefined,
    viewport: { width: 1440, height: 960 },
  })

  test("seeds an existing course and stresses the create view", async ({ page }) => {
    test.setTimeout(180_000)
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })

    const target = await resolveTargetCourse()
    await seedStressCourse(target.id)

    const statsBeforeBrowser = await fetchPersistedStats(target.id)
    expect(statsBeforeBrowser.cards).toBe(EXPECTED_SEEDED_CARDS)

    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    const requestFailures: string[] = []

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text())
      }
    })
    page.on("pageerror", (error) => {
      pageErrors.push(error.message)
    })
    page.on("requestfailed", (request) => {
      requestFailures.push(
        `${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "requestfailed"}`,
      )
    })

    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL })

    await signInAsTeacher(page)

    const navigationStartedAt = Date.now()
    await page.goto(`/teacher/coursebuilder?id=${target.id}&view=create&debugCanvas=1`, {
      waitUntil: "domcontentloaded",
    })

    const firstPage = page.locator('[role="region"][aria-label^="Page"]').first()
    await expect(firstPage).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(3_500)
    const initialLoadMs = Date.now() - navigationStartedAt

    await openDebugPanel(page)
    const summaryBeforeHeavy = await captureSettledSummaryFromClipboard(page)

    await page.screenshot({
      path: path.join(OUTPUT_DIR, "coursebuilder-create-stress-initial.png"),
      fullPage: false,
    })

    const heavySeedButton = page.getByRole("button", { name: /Seed heavy/ })
    await expect(heavySeedButton).toBeEnabled()
    await heavySeedButton.click()

    await page.waitForTimeout(6_000)

    await dragHorizontal(page, "resize-files-panel-handle", 160)
    await dragHorizontal(page, "resize-atlas-panel-handle", -160)

    await page.keyboard.press("Control+=")
    await page.keyboard.press("Control+=")
    await page.keyboard.press("Control+-")

    await page.waitForTimeout(2_500)

    const summaryAfterHeavy = await captureSettledSummaryFromClipboard(page)
    const statsAfterHeavy = await fetchPersistedStats(target.id)
    const domOverflowAfterHeavy = await captureDomOverflowSummary(page)
    const printSafetyAfterHeavy = await capturePrintSafetySummary(page)
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")))
    const printPageCount = await page.getByTestId("canvas-print-page").count()
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")))

    await page.screenshot({
      path: path.join(OUTPUT_DIR, "coursebuilder-create-stress-heavy.png"),
      fullPage: false,
    })

    const visibleCanvasCount = await page.locator('[role="region"][aria-label^="Page"]').count()

    const report = {
      capturedAt: new Date().toISOString(),
      targetCourse: target,
      assumptions: {
        selectedLatestCourse: !process.env.STRESS_COURSE_ID,
      },
      seededShape: {
        sessions: SESSION_COUNT,
        topicsPerSession: TOPICS_PER_SESSION,
        objectivesPerTopic: OBJECTIVES_PER_TOPIC,
        tasksPerObjective: TASKS_PER_OBJECTIVE,
        seededCardsPerTask: SEEDED_CARDS_PER_TASK,
        heavyDebugCardsPerTask: HEAVY_DEBUG_CARDS_PER_TASK,
      },
      expectations: {
        expectedSeededCards: EXPECTED_SEEDED_CARDS,
        expectedTotalCardsAfterHeavy: EXPECTED_TOTAL_AFTER_HEAVY,
      },
      metrics: {
        initialLoadMs,
        visibleCanvasCount,
        statsBeforeBrowser,
        statsAfterHeavy,
        domOverflowAfterHeavy,
        printSafetyAfterHeavy,
        printPageCount,
      },
      debugSummaryBeforeHeavy: summaryBeforeHeavy,
      debugSummaryAfterHeavy: summaryAfterHeavy,
      consoleErrors,
      pageErrors,
      requestFailures: requestFailures.slice(0, 20),
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "coursebuilder-create-stress-report.json"),
      JSON.stringify(report, null, 2),
    )

    console.log(JSON.stringify(report, null, 2))

    expect(statsAfterHeavy.cards).toBeGreaterThanOrEqual(EXPECTED_TOTAL_AFTER_HEAVY)
    expect(domOverflowAfterHeavy.overflowCount).toBe(0)
    expect(printSafetyAfterHeavy.sheetOverflowCount).toBe(0)
    expect(printSafetyAfterHeavy.criticalContentOutsidePrintSafe).toBe(0)
    expect(printPageCount).toBe(statsAfterHeavy.canvases)
  })
})

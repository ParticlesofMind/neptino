import { describe, expect, it } from "vitest"
import { computePageAssignments } from "@/components/coursebuilder/create/layout/layoutEngine"
import {
  estimateProgramHeight,
  estimateTopicHeight,
  isBootstrappedTopic,
} from "@/components/coursebuilder/create/layout/blockHeightModel"
import {
  DEFAULT_PAGE_DIMENSIONS,
} from "@/components/coursebuilder/create/types"
import type {
  CardId,
  CourseSession,
  Topic,
  SessionId,
  TopicId,
  ObjectiveId,
  TaskId,
  CanvasId,
  CourseId,
  DroppedCardId,
} from "@/components/coursebuilder/create/types"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTopic(id: string, label: string, objCount = 1, taskCount = 1): Topic {
  const topicId = id as TopicId
  const objectives = Array.from({ length: objCount }, (_, oi) => {
    const objId = `${id}-o${oi}` as ObjectiveId
    return {
      id:      objId,
      topicId,
      label:   `Objective ${oi + 1}`,
      order:   oi,
      tasks:   Array.from({ length: taskCount }, (_, ki) => ({
        id:           `${objId}-k${ki}` as TaskId,
        objectiveId:  objId,
        label:        `Task ${ki + 1}`,
        order:        ki,
        droppedCards: [],
      })),
    }
  })
  return { id: topicId, sessionId: "s1" as SessionId, label, order: 0, objectives }
}

function makeSession(
  topics: Topic[],
  templateType = "lesson",
  fieldEnabled?: Partial<Record<string, Record<string, boolean>>>,
): CourseSession {
  return {
    id:          "s1" as SessionId,
    courseId:    "c1" as CourseId,
    order:       1,
    title:       "Session 1",
    topics,
    templateType,
    fieldEnabled,
    canvases: [{
      id:         "c1" as CanvasId,
      sessionId:  "s1" as SessionId,
      pageNumber: 1,
      blockKeys:  ["header", "program", "resources", "content", "assignment", "footer"],
    }],
  }
}

const DIMS = DEFAULT_PAGE_DIMENSIONS

// ─── blockHeightModel ────────────────────────────────────────────────────────

describe("estimateProgramHeight", () => {
  it("returns a value above the minimum (header + table header) for no topics", () => {
    const h = estimateProgramHeight([])
    expect(h).toBeGreaterThanOrEqual(50) // border + section header + table header at least
  })

  it("grows with more task rows", () => {
    const small = estimateProgramHeight([makeTopic("t1", "T1", 1, 1)])
    const large = estimateProgramHeight([makeTopic("t1", "T1", 2, 3)])
    expect(large).toBeGreaterThan(small)
  })
})

describe("estimateTopicHeight", () => {
  it("returns positive height for a normal topic", () => {
    const topic = makeTopic("t1", "Topic 1", 1, 1)
    const h = estimateTopicHeight(topic, false, 3)
    expect(h).toBeGreaterThan(0)
  })

  it("is shorter when bootstrapped (no labels)", () => {
    const normal     = makeTopic("t1", "Topic 1", 1, 1)
    const bootstrapped: Topic = {
      ...makeTopic("t2", "", 1, 1),
      objectives: [{ ...makeTopic("t2", "", 1, 1).objectives[0]!, label: "" }],
    }
    const normalH = estimateTopicHeight(normal, false, 3)
    const bootH   = estimateTopicHeight(bootstrapped, true, 3)
    expect(normalH).toBeGreaterThan(bootH)
  })

  it("grows with more area count", () => {
    const topic = makeTopic("t1", "Topic 1", 1, 1)
    const h1 = estimateTopicHeight(topic, false, 1)
    const h3 = estimateTopicHeight(topic, false, 3)
    expect(h3).toBeGreaterThan(h1)
  })
})

describe("isBootstrappedTopic", () => {
  it("identifies empty single-objective topics as bootstrapped", () => {
    const t: Topic = {
      id: "t1" as TopicId, sessionId: "s1" as SessionId, label: "", order: 0,
      objectives: [{ id: "o1" as ObjectiveId, topicId: "t1" as TopicId,
        label: "", order: 0, tasks: [] }],
    }
    expect(isBootstrappedTopic(t)).toBe(true)
  })

  it("named topics are not bootstrapped", () => {
    expect(isBootstrappedTopic(makeTopic("t1", "Real Topic"))).toBe(false)
  })
})

// ─── computePageAssignments ───────────────────────────────────────────────────

describe("computePageAssignments — basic", () => {
  it("returns one page for a session with no topics", () => {
    const session = makeSession([])
    const result = computePageAssignments(session, DIMS)
    expect(result).toHaveLength(1)
    expect(result[0]!.blockKeys).toContain("content")
  })

  it("returns at least one page for any session", () => {
    const session = makeSession([makeTopic("t1", "Topic 1")])
    const result = computePageAssignments(session, DIMS)
    expect(result.length).toBeGreaterThanOrEqual(1)
  })

  it("first page blockKeys include fixed blocks (program, resources)", () => {
    const session = makeSession([makeTopic("t1", "T1")])
    const result = computePageAssignments(session, DIMS)
    const first = result[0]!
    expect(first.blockKeys).toContain("program")
    expect(first.blockKeys).toContain("resources")
  })

  it("certificate template (no content blocks) returns one page", () => {
    const session: CourseSession = {
      ...makeSession([]),
      templateType: "certificate",
      canvases: [{
        id: "c1" as CanvasId, sessionId: "s1" as SessionId, pageNumber: 1,
        blockKeys: ["header", "footer"],
      }],
    }
    const result = computePageAssignments(session, DIMS)
    expect(result).toHaveLength(1)
  })
})

describe("computePageAssignments — topic splitting", () => {
  it("first content page has topicRange starting at 0", () => {
    // Create enough large topics to force pagination
    const topics = Array.from({ length: 8 }, (_, i) =>
      makeTopic(`t${i}`, `Topic ${i + 1}`, 2, 2),
    )
    const session = makeSession(topics)
    const result = computePageAssignments(session, DIMS)
    // Find first page that has a topicRange (the first content page)
    const firstContentPage = result.find((p) => p.topicRange !== undefined)
    expect(firstContentPage).toBeDefined()
    expect(firstContentPage!.topicRange!.start).toBe(0)
  })

  it("when multiple content pages exist, pagination makes forward progress", () => {
    const topics = Array.from({ length: 8 }, (_, i) =>
      makeTopic(`t${i}`, `Topic ${i + 1}`, 2, 2),
    )
    const session = makeSession(topics)
    const result = computePageAssignments(session, DIMS)
    // Exclude empty placeholder pages (end === start: no topics rendered)
    const contentPages = result.filter(
      (p) => p.topicRange !== undefined &&
             (p.topicRange.end === undefined || p.topicRange.end > p.topicRange.start),
    )
    if (contentPages.length > 1) {
      const first  = contentPages[0]!
      const second = contentPages[1]!
      // Progress: higher topic start, later objective boundary, or later task boundary.
      const advancedTopic = second.topicRange!.start > first.topicRange!.start
      const advancedObjective =
        second.topicRange!.start === first.topicRange!.start &&
        second.objectiveRange !== undefined &&
        (second.objectiveRange.start ?? 0) > (first.objectiveRange?.start ?? 0)
      const advancedTask =
        second.topicRange!.start === first.topicRange!.start &&
        (second.objectiveRange?.start ?? 0) === (first.objectiveRange?.start ?? 0) &&
        second.taskRange !== undefined &&
        second.taskRange.start > (first.taskRange?.start ?? 0)
      const advancedCard =
        second.topicRange!.start === first.topicRange!.start &&
        (second.objectiveRange?.start ?? 0) === (first.objectiveRange?.start ?? 0) &&
        (second.taskRange?.start ?? 0) === (first.taskRange?.start ?? 0) &&
        second.cardRange !== undefined &&
        second.cardRange.start > (first.cardRange?.start ?? 0)
      expect(advancedTopic || advancedObjective || advancedTask || advancedCard).toBe(true)
    }
  })

  it("topic coverage is complete and each topic is covered contiguously", () => {
    const topics = Array.from({ length: 6 }, (_, i) =>
      makeTopic(`t${i}`, `Topic ${i + 1}`, 2, 2),
    )
    const session = makeSession(topics)
    const result = computePageAssignments(session, DIMS)

    // Collect the last-seen topicRange end for each unique topic start.
    // Multiple pages share the same start when splitting at objective or task
    // level — de-duplicate by keeping the widest (last-seen) end value.
    // Skip empty placeholder pages where end === start (no topics rendered).
    const seen = new Map<number, number | undefined>()
    for (const page of result) {
      if (!page.topicRange) continue
      const { start, end } = page.topicRange
      if (end !== undefined && end <= start) continue // empty placeholder
      seen.set(start, end)
    }

    const sorted = [...seen.entries()].sort((a, b) => a[0] - b[0])
    let nextExpected = 0
    for (const [start, end] of sorted) {
      expect(start).toBe(nextExpected)
      nextExpected = end ?? topics.length
    }
    expect(nextExpected).toBe(topics.length)
  })

  it("last page has topicRange.end === undefined (open-ended)", () => {
    const topics = Array.from({ length: 6 }, (_, i) =>
      makeTopic(`t${i}`, `Topic ${i + 1}`, 2, 2),
    )
    const session = makeSession(topics)
    const result = computePageAssignments(session, DIMS)
    const last = result[result.length - 1]!
    if (last.topicRange) {
      expect(last.topicRange.end).toBeUndefined()
    }
  })

  it("continuation page blockKeys do NOT include program or resources", () => {
    const topics = Array.from({ length: 8 }, (_, i) =>
      makeTopic(`t${i}`, `Topic ${i + 1}`, 2, 2),
    )
    const session = makeSession(topics)
    const result = computePageAssignments(session, DIMS)
    const contentPages = result.filter(
      (p) => p.blockKeys.includes("content") || p.blockKeys.includes("assignment"),
    )
    if (contentPages.length > 1) {
      expect(contentPages[1]!.blockKeys).not.toContain("program")
      expect(contentPages[1]!.blockKeys).not.toContain("resources")
    }
  })

  it("splits overflowing program/resources rows across dedicated fixed pages", () => {
    const topics = Array.from({ length: 2 }, (_, i) =>
      makeTopic(`t${i}`, `Topic ${i + 1}`, 1, 15),
    )
    const session = makeSession(topics)
    const result = computePageAssignments(session, DIMS)

    const fixedContinuationPages = result.filter(
      (p) => p.blockKeys.includes("program") && p.blockKeys.includes("resources") && p.taskRange,
    )

    expect(fixedContinuationPages.length).toBeGreaterThan(1)
    expect(fixedContinuationPages[0]!.taskRange!.start).toBe(0)
    expect(fixedContinuationPages[0]!.taskRange!.end).toBeDefined()
    expect(fixedContinuationPages[1]!.taskRange!.start).toBe(fixedContinuationPages[0]!.taskRange!.end)
  })

  it("never orders assignment before content on any page", () => {
    // use a couple of topics to generate multiple pages
    const topics = Array.from({ length: 6 }, (_, i) =>
      makeTopic(`t${i}`, `Topic ${i + 1}`, 3, 3),
    )
    const session = makeSession(topics)
    const result = computePageAssignments(session, DIMS)
    for (const page of result) {
      const keys = page.blockKeys
      const contentIdx = keys.indexOf("content")
      const assignmentIdx = keys.indexOf("assignment")
      if (assignmentIdx !== -1 && contentIdx !== -1) {
        expect(contentIdx).toBeLessThan(assignmentIdx)
      }
    }
  })

  it("uses sequential single-container flows for content then assignment", () => {
    const topics = Array.from({ length: 8 }, (_, i) =>
      makeTopic(`t${i}`, `Topic ${i + 1}`, 3, 3),
    )
    const session = makeSession(topics)
    const result = computePageAssignments(session, DIMS)

    const flowPages = result.filter((page) =>
      page.blockKeys.includes("content") || page.blockKeys.includes("assignment"),
    )

    // Every flow page must carry exactly one container block key.
    for (const page of flowPages) {
      const containerCount =
        Number(page.blockKeys.includes("content"))
        + Number(page.blockKeys.includes("assignment"))
      expect(containerCount).toBe(1)
    }

    const flowKinds = flowPages.map((page) => (page.blockKeys.includes("assignment") ? "assignment" : "content"))
    const firstAssignment = flowKinds.indexOf("assignment")
    if (firstAssignment !== -1) {
      expect(flowKinds.slice(0, firstAssignment).every((k) => k === "content")).toBe(true)
      expect(flowKinds.slice(firstAssignment).every((k) => k === "assignment")).toBe(true)
    }
  })

  it("emits deterministic card ranges for task-split pages", () => {
    const topic = makeTopic("t1", "Topic 1", 1, 12)
    topic.objectives[0]!.tasks = topic.objectives[0]!.tasks.map((task, i) => ({
      ...task,
      droppedCards: [
        {
          id: `${task.id}-card-a` as DroppedCardId,
          cardId: `${task.id}-base-a` as CardId,
          cardType: "text",
          taskId: task.id,
          areaKind: "instruction",
          position: { x: 0, y: 0 },
          dimensions: { width: 220, height: 72 },
          content: { text: `Card ${i + 1}.A` },
          order: i * 2,
        },
        {
          id: `${task.id}-card-b` as DroppedCardId,
          cardId: `${task.id}-base-b` as CardId,
          cardType: "text",
          taskId: task.id,
          areaKind: "practice",
          position: { x: 0, y: 0 },
          dimensions: { width: 220, height: 72 },
          content: { text: `Card ${i + 1}.B` },
          order: i * 2 + 1,
        },
      ],
    }))

    const session = makeSession([topic])
    const result = computePageAssignments(session, DIMS)

    const taskPages = result.filter((page) => page.taskRange !== undefined)
    expect(taskPages.length).toBeGreaterThan(1)
    for (const page of taskPages) {
      expect(page.cardRange).toBeDefined()
    }

    const first = taskPages[0]!
    const second = taskPages[1]!
    expect((second.cardRange?.start ?? 0)).toBeGreaterThanOrEqual(first.cardRange?.start ?? 0)
  })

  it("keeps task and card boundaries perfectly aligned across pages", () => {
    const topic = makeTopic("t2", "Topic 2", 1, 10)
    const cardCounts = [1, 3, 2, 4, 1, 5, 2, 1, 3, 2]
    topic.objectives[0]!.tasks = topic.objectives[0]!.tasks.map((task, i) => ({
      ...task,
      droppedCards: Array.from({ length: cardCounts[i] ?? 1 }, (_, j) => ({
        id: `${task.id}-card-${j}` as DroppedCardId,
        cardId: `${task.id}-base-${j}` as CardId,
        cardType: "text",
        taskId: task.id,
        areaKind: "instruction",
        position: { x: 0, y: 0 },
        dimensions: { width: 220, height: 72 },
        content: { text: `Task ${i + 1} Card ${j + 1}` },
        order: i * 10 + j,
      })),
    }))

    const session = makeSession([topic])
    const firstRun = computePageAssignments(session, DIMS)
    const secondRun = computePageAssignments(session, DIMS)
    expect(JSON.stringify(firstRun)).toBe(JSON.stringify(secondRun))

    const taskToCardStart: number[] = [0]
    for (let i = 0; i < cardCounts.length; i++) {
      taskToCardStart.push((taskToCardStart[i] ?? 0) + (cardCounts[i] ?? 0))
    }

    const taskPages = firstRun.filter((page) => page.taskRange !== undefined)
    expect(taskPages.length).toBeGreaterThan(0)

    for (const page of taskPages) {
      const t = page.taskRange!
      const c = page.cardRange
      expect(c).toBeDefined()
      expect(c!.start).toBe(taskToCardStart[t.start])
      if (t.end !== undefined) {
        expect(c!.end).toBe(taskToCardStart[t.end])
      }
    }
  })

  it("packs a trailing card slice with the following task when they fit", () => {
    const topic = makeTopic("packing-topic", "Packing Topic", 1, 2)
    const firstTask = topic.objectives[0]!.tasks[0]!
    const secondTask = topic.objectives[0]!.tasks[1]!

    firstTask.droppedCards = Array.from({ length: 3 }, (_, index) => ({
      id: `${firstTask.id}-large-card-${index}` as DroppedCardId,
      cardId: `${firstTask.id}-large-base-${index}` as CardId,
      cardType: "text-editor",
      taskId: firstTask.id,
      areaKind: "instruction",
      blockKey: "content",
      position: { x: 0, y: 0 },
      dimensions: { width: 520, height: 300 },
      content: { title: `Large card ${index + 1}`, text: "Large card content" },
      order: index,
    }))

    secondTask.droppedCards = [{
      id: `${secondTask.id}-large-card` as DroppedCardId,
      cardId: `${secondTask.id}-large-base` as CardId,
      cardType: "text-editor",
      taskId: secondTask.id,
      areaKind: "instruction",
      blockKey: "content",
      position: { x: 0, y: 0 },
      dimensions: { width: 520, height: 300 },
      content: { title: "Following task card", text: "Following task content" },
      order: 3,
    }]

    const session = makeSession([topic], "lesson", {
      content: { _split: false },
      assignment: { _split: false },
    })
    const result = computePageAssignments(session, DIMS)
    const contentPages = result.filter((page) => page.blockKeys.includes("content") && page.cardRange)

    expect(contentPages).toContainEqual(
      expect.objectContaining({
        taskRange: { start: 0 },
        cardRange: { start: 2 },
      }),
    )
    expect(contentPages).not.toContainEqual(
      expect.objectContaining({
        taskRange: { start: 0, end: 1 },
        cardRange: { start: 2, end: 3 },
      }),
    )
  })

  it("splits an oversized single task at top-level layout-card boundaries", () => {
    const topic = makeTopic("layout-topic", "Layout Topic", 1, 1)
    const task = topic.objectives[0]!.tasks[0]!
    const longText = "The water cycle describes the continuous movement of water through Earth's systems. ".repeat(8)
    task.droppedCards = Array.from({ length: 5 }, (_, i) => ({
      id: `${task.id}-layout-${i}` as DroppedCardId,
      cardId: `${task.id}-layout-base-${i}` as CardId,
      cardType: "layout-split",
      taskId: task.id,
      areaKind: "instruction",
      blockKey: "content",
      position: { x: 0, y: 0 },
      dimensions: { width: 520, height: 120 },
      content: {
        slots: {
          0: [{
            id: `${task.id}-layout-${i}-left` as DroppedCardId,
            cardId: `${task.id}-text-left-${i}` as CardId,
            cardType: "text",
            taskId: task.id,
            areaKind: "instruction",
            blockKey: "content",
            position: { x: 0, y: 0 },
            dimensions: { width: 250, height: 72 },
            content: { title: `Left ${i + 1}`, text: longText },
            order: i * 10,
          }],
          1: [{
            id: `${task.id}-layout-${i}-right` as DroppedCardId,
            cardId: `${task.id}-text-right-${i}` as CardId,
            cardType: "text",
            taskId: task.id,
            areaKind: "instruction",
            blockKey: "content",
            position: { x: 0, y: 0 },
            dimensions: { width: 250, height: 72 },
            content: { title: `Right ${i + 1}`, text: longText },
            order: i * 10 + 1,
          }],
        },
      },
      order: i,
    }))

    const session = makeSession([topic])
    const result = computePageAssignments(session, DIMS)
    const cardPages = result.filter((page) => page.cardRange !== undefined)

    expect(cardPages.length).toBeGreaterThan(1)
    expect(cardPages[0]!.cardRange!.start).toBe(0)
    expect(cardPages[0]!.cardRange!.end).toBeLessThan(task.droppedCards.length)
    expect(cardPages[1]!.cardRange!.start).toBe(cardPages[0]!.cardRange!.end)
  })

  it("uses global card bounds that match block-scoped card budgeting", () => {
    const topic = makeTopic("mixed-topic", "Mixed Topic", 1, 1)
    const task = topic.objectives[0]!.tasks[0]!

    task.droppedCards = [
      { blockKey: "assignment", order: 0, suffix: "assignment-a" },
      { blockKey: "content", order: 1, suffix: "content-a" },
      { blockKey: "assignment", order: 2, suffix: "assignment-b" },
      { blockKey: "content", order: 3, suffix: "content-b" },
    ].map(({ blockKey, order, suffix }) => ({
      id: `${task.id}-${suffix}` as DroppedCardId,
      cardId: `${task.id}-base-${suffix}` as CardId,
      cardType: "text-editor",
      taskId: task.id,
      areaKind: "instruction",
      blockKey,
      position: { x: 0, y: 0 },
      dimensions: { width: 520, height: 420 },
      content: { title: suffix, text: "Large scoped card" },
      order,
    }))

    const session = makeSession([topic])
    const result = computePageAssignments(session, DIMS)

    const contentCardPages = result.filter((page) =>
      page.blockKeys.includes("content") && page.cardRange,
    )
    const assignmentCardPages = result.filter((page) =>
      page.blockKeys.includes("assignment") && page.cardRange,
    )

    expect(contentCardPages.length).toBeGreaterThanOrEqual(2)
    expect(assignmentCardPages.length).toBeGreaterThanOrEqual(2)
    expect(contentCardPages[0]!.cardRange).toEqual({ start: 1, end: 2 })
    expect(contentCardPages[1]!.cardRange).toEqual({ start: 3, end: 4 })
    expect(assignmentCardPages[0]!.cardRange).toEqual({ start: 0, end: 1 })
    expect(assignmentCardPages[1]!.cardRange).toEqual({ start: 2, end: 3 })
  })
})

describe("computePageAssignments — determinism", () => {
  it("produces identical output for identical input", () => {
    const topics = Array.from({ length: 4 }, (_, i) =>
      makeTopic(`t${i}`, `Topic ${i + 1}`, 1, 1),
    )
    const session = makeSession(topics)
    const a = computePageAssignments(session, DIMS)
    const b = computePageAssignments(session, DIMS)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

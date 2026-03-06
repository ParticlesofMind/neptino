import { describe, expect, it } from "vitest"

import {
  mapRowToSession,
  mergeSavedLesson,
  type RawSessionRow,
  type CourseMeta,
} from "@/components/coursebuilder/create/hooks/course-session-mapper"
import { getDefaultBlocksForType } from "@/lib/curriculum/template-blocks"
import type { LessonRow } from "@/components/coursebuilder/course-queries"
import type { CourseId } from "@/components/coursebuilder/create/types"

// Minimal CourseMeta shared across tests
const META: CourseMeta = {
  courseTitle: "Test Course",
  institution: "Test School",
  teacherName: "Teacher A",
  pedagogy: "balanced",
  moduleNames: [],
  totalSessions: 8,
  topicsPerLesson: 2,
  objectivesPerTopic: 2,
  tasksPerObjective: 2,
}

// Variant with more topics so continuation-page scenarios make sense
const META_4T: CourseMeta = { ...META, topicsPerLesson: 4 }

const COURSE_ID = "course-abc" as CourseId

// ---------------------------------------------------------------------------
// mapRowToSession — blockKeys are derived from template_type
// ---------------------------------------------------------------------------

describe("mapRowToSession — template_type → blockKeys", () => {
  it("defaults to lesson blocks when template_type is absent", () => {
    const row: RawSessionRow = { id: "s1", session_number: 1, title: "Session 1" }
    const session = mapRowToSession(row, 0, COURSE_ID, META)

    expect(session.templateType).toBe("lesson")
    expect(session.canvases).toHaveLength(1)
    expect(session.canvases[0]!.blockKeys).toEqual(getDefaultBlocksForType("lesson"))
  })

  it("derives lesson blocks for template_type='lesson'", () => {
    const row: RawSessionRow = { id: "s1", session_number: 1, template_type: "lesson" }
    const session = mapRowToSession(row, 0, COURSE_ID, META)

    expect(session.templateType).toBe("lesson")
    expect(session.canvases[0]!.blockKeys).toEqual(
      expect.arrayContaining(["header", "program", "resources", "content", "assignment", "footer"]),
    )
    expect(session.canvases[0]!.blockKeys).toHaveLength(6)
  })

  it("derives quiz blocks for template_type='quiz'", () => {
    const row: RawSessionRow = { id: "s2", session_number: 2, template_type: "quiz" }
    const session = mapRowToSession(row, 1, COURSE_ID, META)

    expect(session.templateType).toBe("quiz")
    expect(session.canvases[0]!.blockKeys).toEqual(getDefaultBlocksForType("quiz"))
    // quiz: header, resources, scoring, footer — no program/content/assignment
    expect(session.canvases[0]!.blockKeys).not.toContain("program")
    expect(session.canvases[0]!.blockKeys).not.toContain("content")
    expect(session.canvases[0]!.blockKeys).not.toContain("assignment")
    expect(session.canvases[0]!.blockKeys).toContain("scoring")
  })

  it("derives certificate blocks for template_type='certificate'", () => {
    const row: RawSessionRow = { id: "s3", session_number: 3, template_type: "certificate" }
    const session = mapRowToSession(row, 2, COURSE_ID, META)

    expect(session.templateType).toBe("certificate")
    const keys = session.canvases[0]!.blockKeys ?? []
    expect(keys).toEqual(getDefaultBlocksForType("certificate"))
    // certificate: only header + footer
    expect(keys).toHaveLength(2)
    expect(keys).toContain("header")
    expect(keys).toContain("footer")
    expect(keys).not.toContain("content")
    expect(keys).not.toContain("scoring")
  })

  it("derives assessment blocks for template_type='assessment'", () => {
    const row: RawSessionRow = { id: "s4", session_number: 4, template_type: "assessment" }
    const session = mapRowToSession(row, 3, COURSE_ID, META)

    expect(session.templateType).toBe("assessment")
    expect(session.canvases[0]!.blockKeys).toEqual(getDefaultBlocksForType("assessment"))
  })

  it("derives exam blocks for template_type='exam'", () => {
    const row: RawSessionRow = { id: "s5", session_number: 5, template_type: "exam" }
    const session = mapRowToSession(row, 4, COURSE_ID, META)

    expect(session.templateType).toBe("exam")
    expect(session.canvases[0]!.blockKeys).toEqual(getDefaultBlocksForType("exam"))
  })

  it("falls back to lesson blocks for an unknown template_type", () => {
    const row: RawSessionRow = { id: "s6", session_number: 6, template_type: "unknown-type" }
    const session = mapRowToSession(row, 5, COURSE_ID, META)

    // getDefaultBlocksForType falls back to lesson for unknown types
    expect(session.canvases[0]!.blockKeys).toEqual(getDefaultBlocksForType("lesson"))
  })

  it("the canvas is NOT flagged as template-free (blockKeys are set)", () => {
    const row: RawSessionRow = { id: "s1", session_number: 1, template_type: "lesson" }
    const session = mapRowToSession(row, 0, COURSE_ID, META)
    const canvas = session.canvases[0]!

    // isTemplateFreeCanvas = !blockKeys || blockKeys.length === 0
    const isTemplateFree = !canvas.blockKeys || canvas.blockKeys.length === 0
    expect(isTemplateFree).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// mergeSavedLesson — blockKeys re-derived from derived.templateType
// ---------------------------------------------------------------------------

describe("mergeSavedLesson — blockKeys follow derived templateType", () => {
  function makeSavedLesson(lessonNumber: number): LessonRow {
    return {
      lesson_number: lessonNumber,
      title: `Session ${lessonNumber}`,
      payload: {
        topics: [],
        canvases: [
          {
            id: `old-session-canvas-1`,
            sessionId: "old-session",
            pageNumber: 1,
            // Saved with no blockKeys (old template-free mode)
          },
        ],
      },
    }
  }

  it("re-applies lesson blockKeys after merge, replacing saved undefined blockKeys", () => {
    const row: RawSessionRow = { id: "s1", session_number: 1, template_type: "lesson" }
    const derived = mapRowToSession(row, 0, COURSE_ID, META)
    const merged = mergeSavedLesson(derived, makeSavedLesson(1))

    expect(merged.templateType).toBe("lesson")
    merged.canvases.forEach((canvas) => {
      expect(canvas.blockKeys).toEqual(getDefaultBlocksForType("lesson"))
    })
  })

  it("re-applies quiz blockKeys after merge", () => {
    const row: RawSessionRow = { id: "s2", session_number: 2, template_type: "quiz" }
    const derived = mapRowToSession(row, 1, COURSE_ID, META)
    const merged = mergeSavedLesson(derived, makeSavedLesson(2))

    expect(merged.templateType).toBe("quiz")
    merged.canvases.forEach((canvas) => {
      expect(canvas.blockKeys).toEqual(getDefaultBlocksForType("quiz"))
      expect(canvas.blockKeys).toContain("scoring")
      expect(canvas.blockKeys).not.toContain("content")
    })
  })

  it("re-anchors canvas IDs to the derived session while keeping correct blockKeys", () => {
    const row: RawSessionRow = { id: "new-session-id", session_number: 3, template_type: "assessment" }
    const derived = mapRowToSession(row, 2, COURSE_ID, META)
    const merged = mergeSavedLesson(derived, makeSavedLesson(3))

    // Canvas IDs should be anchored to the new session
    expect(merged.canvases[0]!.id).toBe("new-session-id-canvas-1")
    // Block keys should be assessment blocks
    expect(merged.canvases[0]!.blockKeys).toEqual(getDefaultBlocksForType("assessment"))
  })
})

// ---------------------------------------------------------------------------
// mergeSavedLesson — continuation page range enforcement (card-duplication fix)
// ---------------------------------------------------------------------------

describe("mergeSavedLesson — continuation page range enforcement", () => {
  const ROW_4T: RawSessionRow = { id: "s1", session_number: 1, template_type: "lesson" }

  it("drops a continuation page that has no range set (old broken save)", () => {
    const derived = mapRowToSession(ROW_4T, 0, COURSE_ID, META_4T)
    const saved: LessonRow = {
      lesson_number: 1,
      title: "Session 1",
      payload: {
        topics: [],
        canvases: [
          { id: "old-c1", sessionId: "old-s1", pageNumber: 1 },
          // Continuation page with no contentTopicRange — must be dropped
          { id: "old-c2", sessionId: "old-s1", pageNumber: 2 },
        ],
      },
    }
    const merged = mergeSavedLesson(derived, saved)
    expect(merged.canvases).toHaveLength(1)
  })

  it("keeps a continuation page that has contentTopicRange", () => {
    const derived = mapRowToSession(ROW_4T, 0, COURSE_ID, META_4T)
    const saved: LessonRow = {
      lesson_number: 1,
      title: "Session 1",
      payload: {
        topics: [],
        canvases: [
          { id: "old-c1", sessionId: "old-s1", pageNumber: 1 },
          { id: "old-c2", sessionId: "old-s1", pageNumber: 2, contentTopicRange: { start: 2 } },
        ],
      },
    }
    const merged = mergeSavedLesson(derived, saved)
    expect(merged.canvases).toHaveLength(2)
  })

  it("keeps a continuation page that has contentObjectiveRange (objective-level split)", () => {
    const derived = mapRowToSession(ROW_4T, 0, COURSE_ID, META_4T)
    const saved: LessonRow = {
      lesson_number: 1,
      title: "Session 1",
      payload: {
        topics: [],
        canvases: [
          { id: "old-c1", sessionId: "old-s1", pageNumber: 1 },
          { id: "old-c2", sessionId: "old-s1", pageNumber: 2, contentObjectiveRange: { start: 4 } },
        ],
      },
    }
    const merged = mergeSavedLesson(derived, saved)
    expect(merged.canvases).toHaveLength(2)
  })

  it("re-anchors continuation canvas IDs to the derived session ID", () => {
    const derived = mapRowToSession({ ...ROW_4T, id: "new-sid" }, 0, COURSE_ID, META_4T)
    const saved: LessonRow = {
      lesson_number: 1,
      title: "Session 1",
      payload: {
        topics: [],
        canvases: [
          { id: "old-c1", sessionId: "old-s1", pageNumber: 1 },
          { id: "old-c2", sessionId: "old-s1", pageNumber: 2, contentTopicRange: { start: 2 } },
        ],
      },
    }
    const merged = mergeSavedLesson(derived, saved)
    expect(merged.canvases[0]!.id).toBe("new-sid-canvas-1")
    expect(merged.canvases[1]!.id).toBe("new-sid-canvas-2")
  })

  it("continuation pages keep only content-type block keys (no fixed header/footer blocks)", () => {
    const derived = mapRowToSession(ROW_4T, 0, COURSE_ID, META_4T)
    const saved: LessonRow = {
      lesson_number: 1,
      title: "Session 1",
      payload: {
        topics: [],
        canvases: [
          { id: "old-c1", sessionId: "old-s1", pageNumber: 1 },
          // Saved with full lesson blockKeys — must be replaced with ["content"]
          {
            id: "old-c2",
            sessionId: "old-s1",
            pageNumber: 2,
            contentTopicRange: { start: 2 },
            blockKeys: ["header", "program", "resources", "content", "assignment", "footer"],
          },
        ],
      },
    }
    const merged = mergeSavedLesson(derived, saved)
    expect(merged.canvases[0]!.blockKeys).toEqual(getDefaultBlocksForType("lesson"))
    expect(merged.canvases[1]!.blockKeys).toEqual(expect.arrayContaining(["content"]))
    expect(merged.canvases[1]!.blockKeys).not.toContain("header")
    expect(merged.canvases[1]!.blockKeys).not.toContain("program")
    expect(merged.canvases[1]!.blockKeys).not.toContain("resources")
    expect(merged.canvases[1]!.blockKeys).not.toContain("footer")
  })

  // ── Backward fill: missing-end normalisation (card-duplication bug fix) ──

  it("backward fill: page 1 with no contentTopicRange gets capped by page 2's start", () => {
    // Reproduces the classic duplication bug: old save where page 1 was
    // persisted before the overflow hook had a chance to narrow its range.
    const derived = mapRowToSession(ROW_4T, 0, COURSE_ID, META_4T)
    const saved: LessonRow = {
      lesson_number: 1,
      title: "Session 1",
      payload: {
        topics: [],
        canvases: [
          // Page 1: no contentTopicRange — shows all topics without the fix
          { id: "old-c1", sessionId: "old-s1", pageNumber: 1 },
          // Page 2: topics from index 2 onward
          { id: "old-c2", sessionId: "old-s1", pageNumber: 2, contentTopicRange: { start: 2 } },
        ],
      },
    }
    const merged = mergeSavedLesson(derived, saved)
    expect(merged.canvases).toHaveLength(2)
    // After backward fill page 1 must be capped at topic 2 to avoid overlap
    expect(merged.canvases[0]!.contentTopicRange).toEqual({ start: 0, end: 2 })
    // Page 2 retains its start (end still open — shows remaining topics)
    expect(merged.canvases[1]!.contentTopicRange?.start).toBe(2)
  })

  it("backward fill: page 1 with open-ended contentTopicRange gets its end filled", () => {
    const derived = mapRowToSession(ROW_4T, 0, COURSE_ID, META_4T)
    const saved: LessonRow = {
      lesson_number: 1,
      title: "Session 1",
      payload: {
        topics: [],
        canvases: [
          // Page 1: has range but no end (open-ended → shows topic 0..N)
          { id: "old-c1", sessionId: "old-s1", pageNumber: 1, contentTopicRange: { start: 0 } },
          { id: "old-c2", sessionId: "old-s1", pageNumber: 2, contentTopicRange: { start: 2 } },
        ],
      },
    }
    const merged = mergeSavedLesson(derived, saved)
    expect(merged.canvases[0]!.contentTopicRange).toEqual({ start: 0, end: 2 })
    expect(merged.canvases[1]!.contentTopicRange?.start).toBe(2)
  })

  it("backward fill: page 1 with correct end range is unchanged", () => {
    // Correctly-saved session — backward fill must be a no-op
    const derived = mapRowToSession(ROW_4T, 0, COURSE_ID, META_4T)
    const saved: LessonRow = {
      lesson_number: 1,
      title: "Session 1",
      payload: {
        topics: [],
        canvases: [
          { id: "old-c1", sessionId: "old-s1", pageNumber: 1, contentTopicRange: { start: 0, end: 2 } },
          { id: "old-c2", sessionId: "old-s1", pageNumber: 2, contentTopicRange: { start: 2 } },
        ],
      },
    }
    const merged = mergeSavedLesson(derived, saved)
    expect(merged.canvases[0]!.contentTopicRange).toEqual({ start: 0, end: 2 })
  })

  it("backward fill: objective-level split — page 1 missing obj end gets filled", () => {
    const derived = mapRowToSession(ROW_4T, 0, COURSE_ID, META_4T)
    const saved: LessonRow = {
      lesson_number: 1,
      title: "Session 1",
      payload: {
        topics: [],
        canvases: [
          // Same topic range on both pages (objective-level split within one large topic)
          {
            id: "old-c1", sessionId: "old-s1", pageNumber: 1,
            contentTopicRange: { start: 0, end: 1 },
            // No contentObjectiveRange — would show all objectives without the fix
          },
          {
            id: "old-c2", sessionId: "old-s1", pageNumber: 2,
            contentTopicRange: { start: 0, end: 1 },
            contentObjectiveRange: { start: 4 },
          },
        ],
      },
    }
    const merged = mergeSavedLesson(derived, saved)
    // After backward fill page 1 must be capped at objective 4
    expect(merged.canvases[0]!.contentObjectiveRange).toEqual({ start: 0, end: 4 })
    expect(merged.canvases[1]!.contentObjectiveRange?.start).toBe(4)
  })
})

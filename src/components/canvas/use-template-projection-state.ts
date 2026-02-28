"use client"

import { useMemo } from "react"
import {
  buildTemplateFieldState,
  planLessonBodyLayout,
  type LessonCanvasPageProjection,
} from "@/lib/curriculum/canvas-projection"
import { formatTemplateFieldValue } from "@/lib/curriculum/template-source-of-truth"
import { BLOCK_FIELDS, type BlockId, type TemplateFieldState } from "@/components/coursebuilder/sections/templates-section"
import { buildStableTaskKey, type TemplateBlueprintData } from "@/components/coursebuilder/template-blueprint"

export function useTemplateProjectionState({
  currentLessonPage,
  clampedCurrentPage,
  totalPages,
  courseTitle,
  courseType,
  courseLanguage,
  teacherName,
  institutionName,
}: {
  currentLessonPage: LessonCanvasPageProjection | null
  clampedCurrentPage: number
  totalPages: number
  courseTitle: string
  courseType: string
  courseLanguage: string
  teacherName: string
  institutionName: string
}) {
  type TaskRow = {
    topic: string
    objective: string
    task: string
    stableTaskKey: string
    instructionArea: string
    studentArea: string
    teacherArea: string
  }

  const currentEnabledBlocks = useMemo(
    () => currentLessonPage?.enabledBlocks ?? [],
    [currentLessonPage?.enabledBlocks],
  )
  const hasHeaderBlock = currentEnabledBlocks.includes("header")
  const hasFooterBlock = currentEnabledBlocks.includes("footer")

  const templateEnabledMap = useMemo<Record<BlockId, boolean>>(() => {
    const enabledSet = new Set(currentEnabledBlocks)
    return {
      header: enabledSet.has("header"),
      program: enabledSet.has("program"),
      resources: enabledSet.has("resources"),
      content: enabledSet.has("content"),
      assignment: enabledSet.has("assignment"),
      scoring: enabledSet.has("scoring"),
      footer: enabledSet.has("footer"),
    }
  }, [currentEnabledBlocks])

  const templateFieldEnabled = useMemo<TemplateFieldState>(
    () => currentLessonPage?.enabledFields ?? buildTemplateFieldState(currentLessonPage?.templateType ?? "lesson"),
    [currentLessonPage?.enabledFields, currentLessonPage?.templateType],
  )

  const bodyTemplateEnabledMap = useMemo<Record<BlockId, boolean>>(
    () => ({ ...templateEnabledMap, header: false, footer: false }),
    [templateEnabledMap],
  )

  const lessonBlockPagination = useMemo(() => {
    const emptySlices: Partial<Record<BlockId, { start: number; end: number }>> = {}
    const emptyContinuation: Partial<Record<BlockId, boolean>> = {}
    if (!currentLessonPage) {
      return {
        slices: emptySlices,
        activeBlocks: [] as BlockId[],
        continuation: emptyContinuation,
      }
    }

    const topicsPerLesson = Math.max(1, currentLessonPage.topicCount || currentLessonPage.topics.length || 1)
    const objectivesPerTopic = Math.max(1, currentLessonPage.objectiveCount || currentLessonPage.objectives.length || 1)
    const tasksPerObjective = Math.max(1, currentLessonPage.taskCount || currentLessonPage.tasks.length || 1)
    const enabledBlocks = [
      bodyTemplateEnabledMap.program ? "program" : null,
      bodyTemplateEnabledMap.resources ? "resources" : null,
      bodyTemplateEnabledMap.content ? "content" : null,
      bodyTemplateEnabledMap.assignment ? "assignment" : null,
      bodyTemplateEnabledMap.scoring ? "scoring" : null,
    ].filter((block): block is "program" | "resources" | "content" | "assignment" | "scoring" => Boolean(block))

    const layoutPlan = planLessonBodyLayout({
      topicCount: topicsPerLesson,
      objectiveCount: objectivesPerTopic,
      taskCount: tasksPerObjective,
      enabledBlocks,
    })

    const localPage = currentLessonPage.localPage ?? 1
    const chunksOnPage = layoutPlan.chunks.filter((chunk) => chunk.page === localPage)
    const slices: Partial<Record<BlockId, { start: number; end: number }>> = {}
    const continuation: Partial<Record<BlockId, boolean>> = {}

    chunksOnPage.forEach((chunk) => {
      slices[chunk.blockId] = { start: chunk.itemStart, end: chunk.itemEnd }
      continuation[chunk.blockId] = chunk.continuation
    })

    return {
      slices,
      activeBlocks: chunksOnPage.map((chunk) => chunk.blockId),
      continuation,
    }
  }, [currentLessonPage, bodyTemplateEnabledMap])

  const perPageTemplateEnabledMap = useMemo<Record<BlockId, boolean>>(() => {
    const map: Record<BlockId, boolean> = {
      header: false,
      program: false,
      resources: false,
      content: false,
      assignment: false,
      scoring: false,
      footer: false,
    }

    lessonBlockPagination.activeBlocks.forEach((blockId) => {
      map[blockId] = true
    })

    return map
  }, [lessonBlockPagination.activeBlocks])

  const headerFieldValues = useMemo(() => {
    if (!currentLessonPage || !hasHeaderBlock) return [] as Array<{ key: string; value: string }>
    const context = {
      lessonNumber: currentLessonPage.lessonNumber,
      lessonTitle: currentLessonPage.lessonTitle,
      lessonNotes: currentLessonPage.lessonNotes,
      moduleName: currentLessonPage.moduleName,
      courseTitle,
      courseType,
      courseLanguage,
      teacherName,
      institutionName,
      templateType: currentLessonPage.templateType,
      scheduleDay: currentLessonPage.scheduleDay,
      scheduleDate: currentLessonPage.scheduleDate,
      scheduleStart: currentLessonPage.scheduleStart,
      scheduleEnd: currentLessonPage.scheduleEnd,
      durationMinutes: currentLessonPage.durationMinutes,
      topics: currentLessonPage.topics,
      objectives: currentLessonPage.objectives,
      tasks: currentLessonPage.tasks,
      currentPage: clampedCurrentPage,
      totalPages,
    }

    return BLOCK_FIELDS.header
      .filter((field) => field.forTypes.includes(currentLessonPage.templateType as never))
      .filter((field) => field.required || Boolean(templateFieldEnabled.header?.[field.key]))
      .map((field) => ({
        key: field.key,
        value: formatTemplateFieldValue(field.key, context),
      }))
  }, [currentLessonPage, hasHeaderBlock, courseTitle, courseType, courseLanguage, teacherName, institutionName, clampedCurrentPage, totalPages, templateFieldEnabled])

  const footerFieldValues = useMemo(() => {
    if (!currentLessonPage || !hasFooterBlock) return [] as Array<{ key: string; value: string }>
    const context = {
      lessonNumber: currentLessonPage.lessonNumber,
      lessonTitle: currentLessonPage.lessonTitle,
      lessonNotes: currentLessonPage.lessonNotes,
      moduleName: currentLessonPage.moduleName,
      courseTitle,
      courseType,
      courseLanguage,
      teacherName,
      institutionName,
      templateType: currentLessonPage.templateType,
      scheduleDay: currentLessonPage.scheduleDay,
      scheduleDate: currentLessonPage.scheduleDate,
      scheduleStart: currentLessonPage.scheduleStart,
      scheduleEnd: currentLessonPage.scheduleEnd,
      durationMinutes: currentLessonPage.durationMinutes,
      topics: currentLessonPage.topics,
      objectives: currentLessonPage.objectives,
      tasks: currentLessonPage.tasks,
      currentPage: clampedCurrentPage,
      totalPages,
    }

    return BLOCK_FIELDS.footer
      .filter((field) => field.forTypes.includes(currentLessonPage.templateType as never))
      .filter((field) => field.required || Boolean(templateFieldEnabled.footer?.[field.key]))
      .map((field) => ({
        key: field.key,
        value: formatTemplateFieldValue(field.key, context),
      }))
  }, [currentLessonPage, hasFooterBlock, courseTitle, courseType, courseLanguage, teacherName, institutionName, clampedCurrentPage, totalPages, templateFieldEnabled])

  const headerFieldMap = useMemo(() => {
    return Object.fromEntries(headerFieldValues.map((entry) => [entry.key, entry.value]))
  }, [headerFieldValues])

  const templateData = useMemo<TemplateBlueprintData | undefined>(() => {
    if (!currentLessonPage) return undefined

    const headerValues = Object.fromEntries(headerFieldValues.map((entry) => [entry.key, entry.value]))
    const footerValues = Object.fromEntries(footerFieldValues.map((entry) => [entry.key, entry.value]))

    const joinedObjectives = currentLessonPage.objectives.join(" · ")
    const joinedTasks = currentLessonPage.tasks.join(" · ")
    const context = {
      lessonNumber: currentLessonPage.lessonNumber,
      lessonTitle: currentLessonPage.lessonTitle,
      lessonNotes: currentLessonPage.lessonNotes,
      moduleName: currentLessonPage.moduleName,
      courseTitle,
      courseType,
      courseLanguage,
      teacherName,
      institutionName,
      templateType: currentLessonPage.templateType,
      scheduleDay: currentLessonPage.scheduleDay,
      scheduleDate: currentLessonPage.scheduleDate,
      scheduleStart: currentLessonPage.scheduleStart,
      scheduleEnd: currentLessonPage.scheduleEnd,
      durationMinutes: currentLessonPage.durationMinutes,
      topics: currentLessonPage.topics,
      objectives: currentLessonPage.objectives,
      tasks: currentLessonPage.tasks,
      currentPage: clampedCurrentPage,
      totalPages,
    }

    const scalarFieldValues: Record<string, string> = {
      lesson_number: formatTemplateFieldValue("lesson_number", context) || "—",
      lesson_title: formatTemplateFieldValue("lesson_title", context) || "—",
      module_title: formatTemplateFieldValue("module_title", context) || "—",
      course_title: formatTemplateFieldValue("course_title", context) || "—",
      institution_name: formatTemplateFieldValue("institution_name", context) || "—",
      teacher_name: formatTemplateFieldValue("teacher_name", context) || "—",
      date: formatTemplateFieldValue("date", context) || "—",
      competence: formatTemplateFieldValue("competence", context) || "—",
      topic: formatTemplateFieldValue("topic", context) || "—",
      objective: formatTemplateFieldValue("objective", context) || "—",
      task: formatTemplateFieldValue("task", context) || "—",
      program_method: currentLessonPage.lessonNotes || "Guided instruction",
      program_social_form: "Class / Group",
      program_time: formatTemplateFieldValue("program_time", context) || "—",
      type: formatTemplateFieldValue("type", context) || "—",
      origin: formatTemplateFieldValue("origin", context) || "—",
      state: formatTemplateFieldValue("state", context) || "—",
      quality: formatTemplateFieldValue("quality", context) || "—",
      instruction_area: currentLessonPage.lessonNotes || "Instruction guidance",
      student_area: joinedTasks || "Student practice",
      teacher_area: joinedObjectives || "Facilitation notes",
      due_date: formatTemplateFieldValue("due_date", context) || "—",
      submission_format: formatTemplateFieldValue("submission_format", context) || "—",
      criterion: formatTemplateFieldValue("criterion", context) || "—",
      weight: formatTemplateFieldValue("weight", context) || "—",
      max_points: formatTemplateFieldValue("max_points", context) || "—",
      feedback: formatTemplateFieldValue("feedback", context) || "—",
    }

    const buildBlockFieldValues = (blockId: BlockId): Record<string, string> => {
      const fields = BLOCK_FIELDS[blockId]
        .filter((field) => field.forTypes.includes(currentLessonPage.templateType as never))
        .filter((field) => field.required || Boolean(templateFieldEnabled[blockId]?.[field.key]))

      return Object.fromEntries(fields.map((field) => [field.key, scalarFieldValues[field.key] ?? "—"]))
    }

    const topicsPerLesson = Math.max(1, currentLessonPage.topicCount || currentLessonPage.topics.length || 1)
    const objectivesPerTopic = Math.max(1, currentLessonPage.objectiveCount || currentLessonPage.objectives.length || 1)
    const tasksPerObjective = Math.max(1, currentLessonPage.taskCount || currentLessonPage.tasks.length || 1)
    const lessonDurationMinutes = Math.max(0, Number(currentLessonPage.durationMinutes ?? 0) || 0)
    const activeBlockSet = new Set(lessonBlockPagination.activeBlocks)

    const sliceForBlockPage = <T,>(blockId: BlockId, values: T[]): T[] => {
      if (values.length === 0) return []
      const slice = lessonBlockPagination.slices[blockId]
      if (!slice) return []
      const start = Math.max(0, Math.min(values.length, slice.start))
      const end = Math.max(start, Math.min(values.length, slice.end))
      return values.slice(start, Math.max(start + 1, end))
    }

    const splitMinutesAcrossTopics = (totalMinutes: number, topicCount: number): number[] => {
      if (topicCount <= 0 || totalMinutes <= 0) return Array.from({ length: Math.max(1, topicCount) }, () => 0)
      const baseMinutes = Math.floor(totalMinutes / topicCount)
      const remainder = totalMinutes % topicCount
      return Array.from({ length: topicCount }, (_, idx) => baseMinutes + (idx < remainder ? 1 : 0))
    }

    const groupTaskRowsByHierarchy = (rows: TaskRow[]) => {
      const topicOrder: string[] = []
      const groupedByTopic = new Map<string, Map<string, TaskRow[]>>()

      rows.forEach((row) => {
        if (!groupedByTopic.has(row.topic)) {
          groupedByTopic.set(row.topic, new Map<string, TaskRow[]>())
          topicOrder.push(row.topic)
        }
        const objectivesMap = groupedByTopic.get(row.topic)!
        if (!objectivesMap.has(row.objective)) {
          objectivesMap.set(row.objective, [])
        }
        objectivesMap.get(row.objective)!.push(row)
      })

      return topicOrder.map((topic) => {
        const objectivesMap = groupedByTopic.get(topic)!
        const objectiveEntries = Array.from(objectivesMap.entries())
        return {
          topic,
          objectives: objectiveEntries.map(([objective, taskRows]) => ({
            objective,
            tasks: taskRows.map((taskRow) => ({
              task: taskRow.task,
              stableTaskKey: taskRow.stableTaskKey,
              instructionArea: taskRow.instructionArea,
              studentArea: taskRow.studentArea,
              teacherArea: taskRow.teacherArea,
            })),
          })),
        }
      })
    }

    const resolvedTopics = Array.from({ length: topicsPerLesson }, (_, topicIdx) => (
      currentLessonPage.topics[topicIdx] || `Topic ${topicIdx + 1}`
    ))
    const resolvedObjectives = Array.from({ length: objectivesPerTopic }, (_, objectiveIdx) => (
      currentLessonPage.objectives[objectiveIdx] || `Objective ${objectiveIdx + 1}`
    ))
    const resolvedTasks = Array.from({ length: tasksPerObjective }, (_, taskIdx) => (
      currentLessonPage.tasks[taskIdx] || `Task ${taskIdx + 1}`
    ))
    const topicMinuteAllocations = splitMinutesAcrossTopics(lessonDurationMinutes, resolvedTopics.length)

    const buildTaskRows = (block: "content" | "assignment"): TaskRow[] => {
      return resolvedTopics.flatMap((topic, topicIdx) => (
        resolvedObjectives.flatMap((objective, objectiveIdx) => (
          resolvedTasks.map((task, taskIdx) => ({
            topic,
            objective,
            task: `${topicIdx + 1}.${objectiveIdx + 1}.${taskIdx + 1} ${task}`,
            stableTaskKey: buildStableTaskKey({ block, topic, objective, task }),
            instructionArea: scalarFieldValues.instruction_area,
            studentArea: scalarFieldValues.student_area,
            teacherArea: scalarFieldValues.teacher_area,
          }))
        ))
      ))
    }

    const programRows = activeBlockSet.has("program")
      ? sliceForBlockPage("program", resolvedTopics.map((topic, topicIdx) => {
        const objectiveCell = resolvedObjectives
          .map((objective, objectiveIdx) => `${topicIdx + 1}.${objectiveIdx + 1} ${objective}`)
          .join("\n")
        const taskCell = resolvedObjectives
          .flatMap((objective, objectiveIdx) => (
            resolvedTasks.map((task, taskIdx) => `${topicIdx + 1}.${objectiveIdx + 1}.${taskIdx + 1} ${objective}: ${task}`)
          ))
          .join("\n")

        return {
          topic,
          objective: objectiveCell,
          task: taskCell,
          program_time: topicMinuteAllocations[topicIdx] > 0 ? `${topicMinuteAllocations[topicIdx]} min` : scalarFieldValues.program_time,
          program_method: scalarFieldValues.program_method,
          program_social_form: scalarFieldValues.program_social_form,
        }
      }))
      : []

    const resourceRowsPaged = activeBlockSet.has("resources")
      ? sliceForBlockPage("resources", resolvedTopics.flatMap((topic, topicIdx) => (
        resolvedObjectives.flatMap((objective, objectiveIdx) => (
          resolvedTasks.map((task, taskIdx) => ({
            task: `${topicIdx + 1}.${objectiveIdx + 1}.${taskIdx + 1} ${topic}: ${objective} — ${task}`,
            type: scalarFieldValues.type,
            origin: scalarFieldValues.origin,
            state: scalarFieldValues.state,
            quality: scalarFieldValues.quality,
          }))
        ))
      )))
      : []

    const contentTaskRowsPaged = activeBlockSet.has("content")
      ? sliceForBlockPage("content", buildTaskRows("content"))
      : []
    const contentTopicGroups = contentTaskRowsPaged.length > 0 ? groupTaskRowsByHierarchy(contentTaskRowsPaged) : []

    const assignmentTaskRowsPaged = activeBlockSet.has("assignment")
      ? sliceForBlockPage("assignment", buildTaskRows("assignment"))
      : []
    const assignmentTasks = assignmentTaskRowsPaged.map((row) => `${row.topic}: ${row.objective} — ${row.task}`)
    const assignmentGroups = assignmentTaskRowsPaged.length > 0 ? groupTaskRowsByHierarchy(assignmentTaskRowsPaged) : []

    const scoringItemsPaged = activeBlockSet.has("scoring")
      ? sliceForBlockPage("scoring", currentLessonPage.objectives.map((objective, idx) => `Criterion ${idx + 1}: ${objective}`))
      : []

    const assignmentGroupsFromContent = contentTopicGroups.map((topicGroup, topicIndex) => ({
      topic: topicGroup.topic,
      objectives: topicGroup.objectives.map((objective) => ({
        objective: objective.objective,
        tasks: objective.tasks.map((task, taskIndex) => ({
          task: `${topicIndex + 1}.${taskIndex + 1} ${task.task}`,
          stableTaskKey: task.stableTaskKey,
          instructionArea: task.instructionArea,
          studentArea: task.studentArea,
          teacherArea: task.teacherArea,
        })),
      })),
    }))

    return {
      fieldValues: {
        header: headerValues,
        program: buildBlockFieldValues("program"),
        resources: buildBlockFieldValues("resources"),
        content: buildBlockFieldValues("content"),
        assignment: buildBlockFieldValues("assignment"),
        scoring: buildBlockFieldValues("scoring"),
        footer: footerValues,
      },
      programRows,
      resourceRows: resourceRowsPaged,
      contentItems: {
        topics: resolvedTopics,
        objectives: resolvedObjectives,
        tasks: resolvedTasks,
        topicGroups: contentTopicGroups,
      },
      assignmentItems: {
        tasks: assignmentTasks,
        topicGroups: assignmentGroups.length > 0 ? assignmentGroups : assignmentGroupsFromContent,
      },
      resourceItems: resourceRowsPaged.map((row, idx) => `Resource ${idx + 1}: ${row.task}`),
      scoringItems: scoringItemsPaged,
      continuation: lessonBlockPagination.continuation,
    }
  }, [currentLessonPage, lessonBlockPagination, headerFieldValues, footerFieldValues, courseTitle, courseType, courseLanguage, teacherName, institutionName, clampedCurrentPage, totalPages, templateFieldEnabled])

  const lessonHeaderTooltip = useMemo(() => {
    if (!currentLessonPage) return ""

    const skipKeys = new Set(["lesson_number", "lesson_title", "module_title", "course_title"])
    const extraLines = headerFieldValues
      .filter((entry) => !skipKeys.has(entry.key))
      .map((entry) => `${entry.key.replace(/_/g, " ")}: ${entry.value}`)

    return [
      `Lesson ${currentLessonPage.lessonNumber}: ${currentLessonPage.lessonTitle}`,
      `Module: ${currentLessonPage.moduleName}`,
      `Course: ${courseTitle}`,
      ...extraLines,
    ].join("\n")
  }, [currentLessonPage, headerFieldValues, courseTitle])

  const lessonMetaText = useMemo(() => {
    const dateValue = headerFieldMap.date
    const teacherValue = headerFieldMap.teacher_name
    const institutionValue = headerFieldMap.institution_name
    return [dateValue, teacherValue, institutionValue].filter(Boolean).join(" · ")
  }, [headerFieldMap])

  return {
    hasHeaderBlock,
    hasFooterBlock,
    templateFieldEnabled,
    perPageTemplateEnabledMap,
    headerFieldValues,
    footerFieldValues,
    templateData,
    lessonHeaderTooltip,
    lessonMetaText,
  }
}

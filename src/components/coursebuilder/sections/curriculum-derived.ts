import type { TemplateType } from "@/lib/curriculum/template-blocks"

export type CourseType = "minimalist" | "essential" | "complete" | "custom"
export type CertificateMode = "end-module" | "end-course" | "never"

export interface SavedTemplateLike {
  id: string
  name: string
  type: string
}

export interface ModulePreviewItem {
  title: string
  lessonStart: number
  lessonEnd: number
  index: number
}

export function deriveTemplateOptions(args: {
  savedTemplates: SavedTemplateLike[]
  selectedCourseType: CourseType
  certificateMode: CertificateMode
  courseTypeTemplateFilters: Record<CourseType, string[]>
}): {
  filteredTemplates: SavedTemplateLike[]
  availableTemplateTypes: TemplateType[]
  defaultTemplateOptions: TemplateType[]
  lessonTemplateOptions: TemplateType[]
} {
  const { savedTemplates, selectedCourseType, certificateMode, courseTypeTemplateFilters } = args
  const filteredTemplates = savedTemplates.filter((template) => {
    const allowed = courseTypeTemplateFilters[selectedCourseType]
    return allowed.length === 0 || allowed.includes(template.type)
  })

  const availableTemplateTypes = Array.from(
    new Set(
      filteredTemplates
        .map((template) => template.type)
        .filter((type): type is TemplateType => ["lesson", "quiz", "exam", "assessment", "certificate"].includes(type)),
    ),
  )

  const defaultTemplateOptions: TemplateType[] = availableTemplateTypes.length > 0 ? availableTemplateTypes : ["lesson"]
  const lessonTemplateOptions: TemplateType[] = defaultTemplateOptions.includes("certificate") || certificateMode === "never"
    ? defaultTemplateOptions
    : [...defaultTemplateOptions, "certificate"]

  return {
    filteredTemplates,
    availableTemplateTypes,
    defaultTemplateOptions,
    lessonTemplateOptions,
  }
}

export function buildCertificateLessonIndexes(args: {
  certificateMode: CertificateMode
  effectiveLessonCount: number
  moduleOrg: string
  moduleCount: number
}): Set<number> {
  const { certificateMode, effectiveLessonCount, moduleOrg, moduleCount } = args

  if (certificateMode === "never" || effectiveLessonCount < 1) return new Set<number>()
  if (certificateMode === "end-course") return new Set<number>([effectiveLessonCount - 1])

  const modules = Math.max(1, moduleOrg === "linear" ? 1 : moduleCount)
  const perModule = Math.ceil(effectiveLessonCount / modules)
  const indexes = new Set<number>()

  for (let moduleIndex = 0; moduleIndex < modules; moduleIndex += 1) {
    const moduleEnd = Math.min((moduleIndex + 1) * perModule, effectiveLessonCount)
    indexes.add(Math.max(0, moduleEnd - 1))
  }

  return indexes
}

export function buildModulesForPreview(args: {
  moduleOrg: string
  moduleCount: number
  moduleNames: string[]
  effectiveLessonCount: number
}): ModulePreviewItem[] {
  const { moduleOrg, moduleCount, moduleNames, effectiveLessonCount } = args

  if (moduleOrg === "linear") {
    return [{ title: moduleNames[0] || "Module 1", lessonStart: 1, lessonEnd: effectiveLessonCount, index: 0 }]
  }

  const modules = Math.max(1, moduleCount)
  const perModule = Math.ceil(effectiveLessonCount / modules)

  return Array.from({ length: modules }, (_, moduleIndex) => {
    const lessonStart = moduleIndex * perModule + 1
    const lessonEnd = Math.min((moduleIndex + 1) * perModule, effectiveLessonCount)
    return {
      title: moduleNames[moduleIndex] || `Module ${moduleIndex + 1}`,
      lessonStart,
      lessonEnd: Math.max(lessonStart, lessonEnd),
      index: moduleIndex,
    }
  })
}

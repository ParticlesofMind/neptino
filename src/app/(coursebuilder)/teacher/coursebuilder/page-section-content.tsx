import { ClassificationSection } from "@/components/coursebuilder/sections/classification-section"
import { CurriculumSection } from "@/components/coursebuilder/sections/curriculum-section"
import { EssentialsSection } from "@/components/coursebuilder/sections/essentials-section"
import { InterfaceSection } from "@/components/coursebuilder/sections/interface-section"
import { LLMSection } from "@/components/coursebuilder/sections/llm-section"
import { PedagogySection } from "@/components/coursebuilder/sections/pedagogy-section"
import { ResourcesSection } from "@/components/coursebuilder/sections/resources-section"
import { ScheduleSection } from "@/components/coursebuilder/sections/schedule-section"
import { StudentsSection } from "@/components/coursebuilder/sections/students-section"
import { TemplatesSection } from "@/components/coursebuilder/sections/templates-section"
import { VisibilitySection } from "@/components/coursebuilder/sections/visibility-section"
import { MarketplaceSection } from "@/components/coursebuilder/sections/marketplace-section"
import { PricingSection } from "@/components/coursebuilder/sections/pricing-section"
import { IntegrationsSection } from "@/components/coursebuilder/sections/integrations-section"
import { CommunicationSection } from "@/components/coursebuilder/sections/communication-section"
import { PageSetupSection } from "@/components/coursebuilder/sections/page-setup-section"
import { AdvancedSection } from "@/components/coursebuilder/sections/advanced-section"
import { PreviewView } from "@/components/coursebuilder/sections/preview-view"
import { LaunchView } from "@/components/coursebuilder/sections/launch-view"
import type { CanvasPageConfig } from "@/lib/page-config"
import type { CourseCreatedData } from "@/components/coursebuilder/builder-types"
import { type SectionId, Placeholder } from "./page-section-registry"

export interface SectionContentProps {
  id: SectionId
  onCourseCreated: (courseId: string, data: CourseCreatedData) => void
  courseCreatedData: CourseCreatedData | null
  initialEssentials: CourseCreatedData | null
  existingCourseId: string | null
  pageConfig?: CanvasPageConfig | null
  onPageConfigChange?: (cfg: CanvasPageConfig) => void
}

export function SectionContent({
  id,
  onCourseCreated,
  courseCreatedData,
  initialEssentials,
  existingCourseId,
  pageConfig,
  onPageConfigChange,
}: SectionContentProps) {
  switch (id) {
    case "essentials":     return <EssentialsSection key={existingCourseId ?? "new"} onCourseCreated={onCourseCreated} initialData={initialEssentials} existingCourseId={existingCourseId} />
    case "classification": return <ClassificationSection courseCreatedData={courseCreatedData} courseId={existingCourseId} />
    case "students":       return <StudentsSection courseId={existingCourseId} />
    case "pedagogy":       return <PedagogySection       courseId={existingCourseId} />
    case "interface":      return <InterfaceSection      courseId={existingCourseId} />
    case "templates":      return <TemplatesSection     courseId={existingCourseId} />
    case "schedule":       return <ScheduleSection      courseId={existingCourseId} />
    case "resources":      return <ResourcesSection     courseId={existingCourseId} />
    case "curriculum":     return <CurriculumSection    courseId={existingCourseId} />
    case "llm":            return <LLMSection           courseId={existingCourseId} />
    case "visibility":     return <VisibilitySection    courseId={existingCourseId} />
    case "marketplace":    return <MarketplaceSection   courseId={existingCourseId} />
    case "pricing":        return <PricingSection        courseId={existingCourseId} />
    case "integrations":   return <IntegrationsSection   courseId={existingCourseId} />
    case "communication":  return <CommunicationSection  courseId={existingCourseId} />
    case "page-setup":     return <PageSetupSection key={`${existingCourseId ?? "new"}-${pageConfig?.pageCount ?? 1}`} courseId={existingCourseId} initialConfig={pageConfig} onSaved={onPageConfigChange} />
    case "advanced":       return <AdvancedSection courseId={existingCourseId} />
    default:               return <Placeholder />
  }
}

export { PreviewView, LaunchView }

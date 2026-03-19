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
  courseId: string | null
  pageConfig?: CanvasPageConfig | null
  onPageConfigChange?: (cfg: CanvasPageConfig) => void
}

export function SectionContent({
  id,
  onCourseCreated,
  courseCreatedData,
  initialEssentials,
  courseId,
  pageConfig,
  onPageConfigChange,
}: SectionContentProps) {
  switch (id) {
    case "essentials":     return <EssentialsSection key={courseId ?? "new"} onCourseCreated={onCourseCreated} initialData={initialEssentials} courseId={courseId} />
    case "classification": return <ClassificationSection courseCreatedData={courseCreatedData} courseId={courseId} />
    case "students":       return <StudentsSection courseId={courseId} />
    case "pedagogy":       return <PedagogySection       courseId={courseId} />
    case "interface":      return <InterfaceSection      courseId={courseId} />
    case "templates":      return <TemplatesSection     courseId={courseId} />
    case "schedule":       return <ScheduleSection      courseId={courseId} />
    case "resources":      return <ResourcesSection     courseId={courseId} />
    case "curriculum":     return <CurriculumSection    courseId={courseId} />
    case "llm":            return <LLMSection           courseId={courseId} />
    case "visibility":     return <VisibilitySection    courseId={courseId} />
    case "marketplace":    return <MarketplaceSection   courseId={courseId} />
    case "pricing":        return <PricingSection        courseId={courseId} />
    case "integrations":   return <IntegrationsSection   courseId={courseId} />
    case "communication":  return <CommunicationSection  courseId={courseId} />
    case "page-setup":     return <PageSetupSection key={`${courseId ?? "new"}-${pageConfig?.pageCount ?? 1}`} courseId={courseId} initialConfig={pageConfig} onSaved={onPageConfigChange} />
    case "advanced":       return <AdvancedSection courseId={courseId} />
    default:               return <Placeholder />
  }
}

export { PreviewView, LaunchView }

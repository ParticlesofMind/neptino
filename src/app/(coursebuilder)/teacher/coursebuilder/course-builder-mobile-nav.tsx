import { Check } from "lucide-react"
import { type SectionId, SECTIONS, SETUP_SECTION_IDS } from "./page-section-registry"

interface CourseBuilderMobileNavProps {
  activeSection: SectionId
  setActiveSection: (id: SectionId) => void
  completedSetupSections: Record<string, boolean>
}

export function CourseBuilderMobileNav({
  activeSection,
  setActiveSection,
  completedSetupSections,
}: CourseBuilderMobileNavProps) {
  return (
    <div className="no-scrollbar flex shrink-0 items-center gap-0.5 overflow-x-auto border-t border-border bg-muted/5 px-1.5 py-1.5 md:hidden">
      {SECTIONS.flatMap((group) => group.items).map(({ id, label, icon: Icon }) => {
        const isSetupItem = SETUP_SECTION_IDS.includes(id)
        const isCompleted = Boolean(completedSetupSections[id])
        const isActive = activeSection === id
        return (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            title={label}
            className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-[10px] font-medium whitespace-nowrap transition-all duration-200 border ${
              isActive
                ? "border-primary bg-primary text-white shadow-md"
                : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
            }`}
          >
            <Icon className={`h-4 w-4 transition-colors ${
              isActive ? "text-white" : "text-muted-foreground"
            }`} />
            <span className="hidden sm:block">{label}</span>
            {isSetupItem && isCompleted && (
              <Check className={`absolute h-3 w-3 ${isActive ? "text-white" : "text-primary"}`} />
            )}
          </button>
        )
      })}
    </div>
  )
}

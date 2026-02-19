"use client"

import { BookOpen, Home, Layers3, MessageSquare, Settings } from "lucide-react"

export type TeacherSection = "home" | "courses" | "classes" | "messages" | "settings"

const items: { id: TeacherSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "classes", label: "Classes", icon: Layers3 },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
]

type TeacherSidebarProps = {
  activeSection: TeacherSection
  onSectionChange: (section: TeacherSection) => void
}

export function TeacherSidebar({ activeSection, onSectionChange }: TeacherSidebarProps) {

  return (
    <aside className="w-60 shrink-0">
      <div className="rounded-2xl border border-border bg-background p-3">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Menu</p>
        <nav className="space-y-1">
          {items.map((item) => {
            const active = activeSection === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={
                  active
                    ? "flex w-full items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary"
                    : "flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground transition-colors"
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

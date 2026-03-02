"use client"

import {
  BarChart3, Bell, BookMarked, BookOpen, Calendar,
  DollarSign, FileText, Folder, Home, LayoutTemplate,
  Layers3, MessageSquare, Settings, Users,
} from "lucide-react"

export type TeacherSection =
  | "home" | "analytics" | "calendar"
  | "courses" | "lessons" | "templates" | "resources"
  | "students" | "classes" | "submissions"
  | "messages" | "announcements"
  | "earnings" | "settings"

interface SidebarItem {
  id: TeacherSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface SidebarGroup {
  heading: string
  items: SidebarItem[]
}

const GROUPS: SidebarGroup[] = [
  {
    heading: "Workspace",
    items: [
      { id: "home",      label: "Home",      icon: Home },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "calendar",  label: "Calendar",  icon: Calendar },
    ],
  },
  {
    heading: "Courses",
    items: [
      { id: "courses",   label: "Courses",   icon: BookOpen },
      { id: "lessons",   label: "Lessons",   icon: BookMarked },
      { id: "templates", label: "Templates", icon: LayoutTemplate },
      { id: "resources", label: "Resources", icon: Folder },
    ],
  },
  {
    heading: "Students",
    items: [
      { id: "students",    label: "Students",    icon: Users },
      { id: "classes",     label: "Classes",     icon: Layers3 },
      { id: "submissions", label: "Submissions", icon: FileText },
    ],
  },
  {
    heading: "Communicate",
    items: [
      { id: "messages",      label: "Messages",      icon: MessageSquare },
      { id: "announcements", label: "Announcements", icon: Bell },
    ],
  },
  {
    heading: "Account",
    items: [
      { id: "earnings", label: "Earnings", icon: DollarSign },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
]

type TeacherSidebarProps = {
  activeSection: TeacherSection
  onSectionChange: (section: TeacherSection) => void
}

export function TeacherSidebar({ activeSection, onSectionChange }: TeacherSidebarProps) {
  return (
    <aside className="no-scrollbar w-60 shrink-0 overflow-y-auto">
      <div className="rounded-2xl border border-border bg-background p-3 space-y-4">
        {GROUPS.map((group) => (
          <div key={group.heading}>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.heading}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = activeSection === item.id
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSectionChange(item.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/30 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-muted-foreground"}`} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

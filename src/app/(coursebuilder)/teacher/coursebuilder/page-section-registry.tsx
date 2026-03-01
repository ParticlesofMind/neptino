"use client"
// Section navigation data, types, and helper components for the course builder page.

import React from "react"
import {
  Brain,
  FileText,
  AlignJustify,
  Users,
  BookOpen,
  LayoutTemplate,
  Calendar,
  BookMarked,
  Eye,
  Store,
  DollarSign,
  Plug,
  MessageSquare,
  Layers,
  Monitor,
  Palette,
  Smile,
  Bell,
  Database,
  Settings,
} from "lucide-react"
import type { View } from "@/components/coursebuilder/builder-types"

export type SectionId = string

export const VIEW_SEQUENCE: View[] = ["setup", "create", "preview", "launch"]

export const VIEW_LABELS: Record<View, string> = {
  setup:   "Setup",
  create:  "Create",
  preview: "Preview",
  launch:  "Launch",
}

export function isView(value: string | null): value is View {
  return typeof value === "string" && VIEW_SEQUENCE.includes(value as View)
}

export function getPrevView(v: View): View | null {
  const idx = VIEW_SEQUENCE.indexOf(v)
  return idx > 0 ? VIEW_SEQUENCE[idx - 1] : null
}

export function getNextView(v: View): View | null {
  const idx = VIEW_SEQUENCE.indexOf(v)
  return idx < VIEW_SEQUENCE.length - 1 ? VIEW_SEQUENCE[idx + 1] : null
}

export interface SectionItem {
  id: SectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export interface SectionGroup {
  heading: string
  items: SectionItem[]
}

export function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0
}

// ─── Section registry ─────────────────────────────────────────────────────────

export const SECTIONS: SectionGroup[] = [
  {
    heading: "SETUP",
    items: [
      { id: "essentials", label: "Essentials", icon: FileText },
      { id: "classification", label: "Classification", icon: AlignJustify },
      { id: "students", label: "Students", icon: Users },
      { id: "pedagogy", label: "Pedagogy", icon: BookOpen },
      { id: "templates", label: "Templates", icon: LayoutTemplate },
      { id: "schedule", label: "Schedule", icon: Calendar },
      { id: "resources", label: "Resources", icon: BookOpen },
      { id: "curriculum", label: "Curriculum", icon: BookMarked },
    ],
  },
  {
    heading: "PUBLISHING",
    items: [
      { id: "visibility", label: "Course Visibility", icon: Eye },
      { id: "marketplace", label: "Marketplace", icon: Store },
      { id: "pricing", label: "Pricing & Monetization", icon: DollarSign },
      { id: "integrations", label: "External Integrations", icon: Plug },
      { id: "communication", label: "Communication", icon: MessageSquare },
    ],
  },
  {
    heading: "ENGINE",
    items: [
      { id: "page-setup", label: "Page Setup", icon: Layers },
      { id: "interface", label: "Interface", icon: Monitor },
      { id: "themes", label: "Themes", icon: Palette },
      { id: "accessibility", label: "Accessibility", icon: Smile },
    ],
  },
  {
    heading: "SETTINGS",
    items: [
      { id: "llm", label: "AI Model", icon: Brain },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "data-management", label: "Data Management", icon: Database },
      { id: "advanced", label: "Advanced Settings", icon: Settings },
    ],
  },
]

export const SETUP_SECTION_IDS = SECTIONS.find((group) => group.heading === "SETUP")?.items.map((item) => item.id) ?? []
export const ALL_SECTION_IDS = SECTIONS.flatMap((group) => group.items.map((item) => item.id))

export function isSectionId(value: string | null): value is SectionId {
  return typeof value === "string" && ALL_SECTION_IDS.includes(value)
}

export function Placeholder() {
  return (
    <div className="space-y-6">
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
        <p className="text-sm text-muted-foreground">This section is under construction.</p>
      </div>
    </div>
  )
}

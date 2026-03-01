import {
  BarChart3,
  BookOpen,
  Boxes,
  CheckSquare,
  Database,
  FileText,
  HelpCircle,
  Layers,
  LayoutTemplate,
  Lightbulb,
  List,
  NotebookPen,
  Trophy,
  Users,
} from "lucide-react"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import type { BlockId } from "./template-section-data"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateMeta {
  label: string
  description: string
  badge: string
  icon: React.ReactNode
}

interface BlockMeta {
  icon: React.ReactNode
}

// ─── Template type meta ───────────────────────────────────────────────────────

export const TEMPLATE_TYPE_META: Record<TemplateType, TemplateMeta> = {
  lesson:            { label: "Lesson",            description: "Standard instructional lesson page",               badge: "border-border bg-muted/60 text-foreground", icon: <BookOpen className="h-4 w-4" /> },
  quiz:              { label: "Quiz",              description: "Short formative assessment",                       badge: "border-border bg-muted/60 text-foreground", icon: <HelpCircle className="h-4 w-4" /> },
  assessment:        { label: "Assessment",        description: "Formal summative evaluation",                      badge: "border-border bg-muted/60 text-foreground", icon: <LayoutTemplate className="h-4 w-4" /> },
  exam:              { label: "Exam",              description: "Comprehensive final examination",                   badge: "border-border bg-muted/60 text-foreground", icon: <Trophy className="h-4 w-4" /> },
  certificate:       { label: "Certificate",       description: "Course completion certificate",                     badge: "border-border bg-muted/60 text-foreground", icon: <Trophy className="h-4 w-4" /> },
  project:           { label: "Project",           description: "Long-term capstone or portfolio project",           badge: "border-border bg-muted/60 text-foreground", icon: <Database className="h-4 w-4" /> },
  lab:               { label: "Lab",               description: "Hands-on practical laboratory exercise",            badge: "border-border bg-muted/60 text-foreground", icon: <Boxes className="h-4 w-4" /> },
  workshop:          { label: "Workshop",          description: "Intensive collaborative learning session",           badge: "border-border bg-muted/60 text-foreground", icon: <Lightbulb className="h-4 w-4" /> },
  discussion:        { label: "Discussion",        description: "Structured peer dialogue and debate",                badge: "border-border bg-muted/60 text-foreground", icon: <Users className="h-4 w-4" /> },
  reflection:        { label: "Reflection",        description: "Guided introspection and learning journal",          badge: "border-border bg-muted/60 text-foreground", icon: <NotebookPen className="h-4 w-4" /> },
  survey:            { label: "Survey",            description: "Data collection and feedback form",                  badge: "border-border bg-muted/60 text-foreground", icon: <HelpCircle className="h-4 w-4" /> },
  table_of_contents: { label: "Table of Contents", description: "Structured listing of modules, lessons, and page numbers", badge: "border-border bg-muted/60 text-foreground", icon: <List className="h-4 w-4" /> },
}

// ─── Block icon meta ──────────────────────────────────────────────────────────

export const BLOCK_META: Record<BlockId, BlockMeta> = {
  header:     { icon: <FileText className="h-4 w-4" /> },
  program:    { icon: <Lightbulb className="h-4 w-4" /> },
  resources:  { icon: <Boxes className="h-4 w-4" /> },
  content:    { icon: <BookOpen className="h-4 w-4" /> },
  assignment: { icon: <CheckSquare className="h-4 w-4" /> },
  scoring:    { icon: <BarChart3 className="h-4 w-4" /> },
  footer:     { icon: <Layers className="h-4 w-4" /> },
}

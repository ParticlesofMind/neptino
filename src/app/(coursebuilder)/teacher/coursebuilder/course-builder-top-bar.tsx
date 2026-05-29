"use client"

import { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { View } from "@/components/coursebuilder/builder-types"
import { VIEW_LABELS, VIEW_SEQUENCE, getPrevView, getNextView } from "./page-section-registry"

interface CourseBuilderTopBarProps {
  view: View
  setView: (v: View) => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
}

export function CourseBuilderTopBar({ view, setView }: CourseBuilderTopBarProps) {
  const prevView = getPrevView(view)
  const nextView = getNextView(view)

  const stepNumber = (targetView: View) => VIEW_SEQUENCE.indexOf(targetView) + 1
  const shortcutHint = (targetView: View) => (
    <span className="inline-flex items-center whitespace-nowrap text-[10px] font-semibold text-muted-foreground/75">
      Cmd/Ctrl + {stepNumber(targetView)}
    </span>
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (isEditableTarget(event.target)) return

      const nextIndex = Number(event.key) - 1
      const nextViewByNumber = VIEW_SEQUENCE[nextIndex]
      if (!nextViewByNumber) return

      event.preventDefault()
      setView(nextViewByNumber)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setView])

  const previousControl = prevView === null ? (
    <Link
      href="/teacher/courses"
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Courses
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => setView(prevView)}
      title={`Go to ${VIEW_LABELS[prevView]} (Cmd/Ctrl + ${stepNumber(prevView)})`}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {VIEW_LABELS[prevView]}
      {shortcutHint(prevView)}
    </button>
  )

  const nextControl = nextView !== null ? (
    <button
      type="button"
      onClick={() => setView(nextView)}
      title={`Go to ${VIEW_LABELS[nextView]} (Cmd/Ctrl + ${stepNumber(nextView)})`}
      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
    >
      {shortcutHint(nextView)}
      {VIEW_LABELS[nextView]}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  ) : (
    <span className="h-8 w-16" aria-hidden="true" />
  )

  return (
    <div className="shrink-0 border-b border-border bg-background">
      <div className="flex h-10 items-center justify-between gap-2 px-2 sm:hidden">
        {previousControl}
        <Link
          href="/teacher"
          aria-label="Teacher dashboard"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
        >
          <Image src="/octopus-logo.png" alt="Neptino" width={22} height={22} className="h-[22px] w-[22px]" />
        </Link>
        {nextControl}
      </div>

      <div className="hidden h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 sm:grid md:px-4">
        <div className="flex min-w-0 items-center justify-start gap-2">
          {previousControl}
        </div>

        <div className="flex items-center justify-center gap-2">
          <Link
            href="/teacher"
            aria-label="Teacher dashboard"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
          >
            <Image src="/octopus-logo.png" alt="Neptino" width={24} height={24} className="h-6 w-6" />
          </Link>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          {nextControl}
        </div>
      </div>
    </div>
  )
}

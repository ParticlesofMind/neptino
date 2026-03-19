"use client"

import type { Dispatch, SetStateAction, KeyboardEvent } from "react"
import { FieldLabel } from "@/components/coursebuilder"

// ─── Types ────────────────────────────────────────────────────────────────────

interface StringListHandle {
  items: string[]
  draft: string
  updateDraft: (next: string) => void
  onDraftKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  canAdd: boolean
  addDraft: () => void
  removeAt: (index: number) => void
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  priorKnowledge: string
  setPriorKnowledge: Dispatch<SetStateAction<string>>
  keyTerms: StringListHandle
  mandatoryTopics: StringListHandle
  applicationContext: string
  setApplicationContext: Dispatch<SetStateAction<string>>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClassificationContextFields({
  priorKnowledge,
  setPriorKnowledge,
  keyTerms,
  mandatoryTopics,
  applicationContext,
  setApplicationContext,
}: Props) {
  return (
    <>
      <div>
        <FieldLabel hint="What students should already know">Prior Knowledge Baseline</FieldLabel>
        <textarea
          value={priorKnowledge}
          onChange={(e) => setPriorKnowledge(e.target.value.slice(0, 500))}
          placeholder="e.g., Students have completed Algebra I and basic geometry. They can solve linear equations and understand coordinate planes."
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{priorKnowledge.length}/500</p>
      </div>

      <div>
        <FieldLabel hint="Domain-specific terminology students will encounter">Key Terms / Seed Vocabulary</FieldLabel>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {keyTerms.items.map((term, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-xs text-foreground">
              {term}
              <button type="button" onClick={() => keyTerms.removeAt(i)} className="text-muted-foreground hover:text-destructive transition">×</button>
            </span>
          ))}
        </div>
        {keyTerms.items.length < 30 && (
          <div className="flex gap-2">
            <input
              value={keyTerms.draft}
              onChange={(e) => keyTerms.updateDraft(e.target.value)}
              onKeyDown={keyTerms.onDraftKeyDown}
              placeholder="e.g., photosynthesis"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
            />
            <button
              type="button"
              disabled={!keyTerms.canAdd}
              onClick={keyTerms.addDraft}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        )}
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{keyTerms.items.length}/30 terms</p>
      </div>

      <div>
        <FieldLabel hint="Topics required by curriculum standards">Mandatory Topics</FieldLabel>
        <div className="space-y-1.5 mb-2">
          {mandatoryTopics.items.map((t, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
              <span className="flex-1 text-sm text-foreground">{t}</span>
              <button type="button" onClick={() => mandatoryTopics.removeAt(i)} className="text-xs text-muted-foreground hover:text-destructive transition">×</button>
            </div>
          ))}
        </div>
        {mandatoryTopics.items.length < 20 && (
          <div className="flex gap-2">
            <input
              value={mandatoryTopics.draft}
              onChange={(e) => mandatoryTopics.updateDraft(e.target.value)}
              onKeyDown={mandatoryTopics.onDraftKeyDown}
              placeholder="e.g., Cell Division and Mitosis"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
            />
            <button
              type="button"
              disabled={!mandatoryTopics.canAdd}
              onClick={mandatoryTopics.addDraft}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        )}
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{mandatoryTopics.items.length}/20 topics</p>
      </div>

      <div>
        <FieldLabel hint="How the subject applies in context">Application Context / Domain Lens</FieldLabel>
        <textarea
          value={applicationContext}
          onChange={(e) => setApplicationContext(e.target.value.slice(0, 500))}
          placeholder="e.g., This biology course is taught through a medical sciences lens. Examples should use clinical scenarios, patient cases, and healthcare applications."
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{applicationContext.length}/500</p>
      </div>
    </>
  )
}

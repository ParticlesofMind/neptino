"use client"
// Static slot view components used in the JSON-driven blueprint renderer.

import React from "react"

export function SlotSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
      {children}
    </p>
  )
}

export function TableSlotView({
  label,
  columns,
}: {
  label: string
  columns: Array<{ key: string; label: string }>
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-1.5 py-0.5">
        <SlotSectionLabel>{label}</SlotSectionLabel>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[8px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-left font-semibold text-neutral-500 last:border-r-0"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1].map((rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key}
                    className="border-b border-r border-neutral-100 bg-white px-1.5 py-1 last:border-r-0"
                  >
                    <div
                      className="h-2 rounded-sm bg-neutral-200"
                      style={{ width: colIdx === 0 ? "80%" : colIdx === columns.length - 1 ? "55%" : "70%" }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function NestedSlotView({
  label,
  areas,
}: {
  label: string
  areas: ("instruction" | "practice" | "feedback")[]
}) {
  const areaLabels: Record<string, string> = {
    instruction: "Instruction",
    practice: "Practice",
    feedback: "Feedback",
  }
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-1.5 py-0.5">
        <SlotSectionLabel>{label}</SlotSectionLabel>
      </div>
      <div className="bg-white p-1.5 space-y-1">
        <div className="rounded border border-neutral-200 bg-neutral-50 p-1">
          <p className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-neutral-400">Topic</p>
          <div className="h-1.5 w-4/5 rounded-sm bg-neutral-200" />
          <div className="mt-1 ml-1.5 rounded border border-neutral-200 bg-white p-1">
            <p className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-neutral-400">Objective</p>
            <div className="h-1.5 w-3/4 rounded-sm bg-neutral-200" />
            <div className="mt-1 ml-1.5 rounded border border-neutral-100 bg-neutral-50 p-1">
              <p className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-neutral-400">Task</p>
              <div className="ml-1 space-y-0.5">
                {areas.map((area) => (
                  <div key={area} className="flex items-center gap-1">
                    <span className="w-12 flex-shrink-0 text-[6px] font-medium uppercase tracking-[0.08em] text-neutral-400">
                      {areaLabels[area]}
                    </span>
                    <div className="h-1.5 flex-1 rounded-sm bg-neutral-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ScoringRubricView({
  columns,
}: {
  columns: Array<{ key: string; label: string }>
}) {
  const previewWeights = ["30 %", "20 %", "25 %"]
  const previewPoints = ["30", "20", "25"]
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-1.5 py-0.5">
        <SlotSectionLabel>Scoring</SlotSectionLabel>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[8px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-left font-semibold text-neutral-500 last:border-r-0"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key}
                    className="border-b border-r border-neutral-100 bg-white px-1.5 py-1 last:border-r-0"
                  >
                    {col.key === "weight" ? (
                      <span className="text-[8px] text-neutral-500">{previewWeights[rowIdx]}</span>
                    ) : col.key === "max_points" ? (
                      <span className="text-[8px] text-neutral-500">{previewPoints[rowIdx]}</span>
                    ) : (
                      <div
                        className="h-2 rounded-sm bg-neutral-200"
                        style={{ width: colIdx === 0 ? "85%" : "65%" }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function TocListView() {
  const entries = [
    { level: "module", label: "Module 1 — Introduction",     page: "1" },
    { level: "lesson", label: "Lesson 1.1 — Overview",        page: "2" },
    { level: "lesson", label: "Lesson 1.2 — Core Concepts",   page: "4" },
    { level: "module", label: "Module 2 — Fundamentals",      page: "7" },
    { level: "lesson", label: "Lesson 2.1 — Principles",      page: "8" },
    { level: "lesson", label: "Lesson 2.2 — Application",     page: "10"},
    { level: "module", label: "Module 3 — Advanced Topics",   page: "13"},
    { level: "lesson", label: "Lesson 3.1 — Deep Dive",       page: "14"},
  ]
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
        <SlotSectionLabel>Table of Contents</SlotSectionLabel>
      </div>
      <div className="p-2">
        <div className="space-y-0.5">
          {entries.map((entry, idx) => (
            <div
              key={idx}
              className={`flex items-baseline gap-1 ${entry.level === "lesson" ? "pl-3" : ""}`}
            >
              <span
                className={`flex-shrink-0 text-[8px] leading-snug ${
                  entry.level === "module"
                    ? "font-semibold text-foreground/70"
                    : "text-muted-foreground/65"
                }`}
              >
                {entry.label}
              </span>
              <span className="flex-1 overflow-hidden text-[7px] leading-snug text-muted-foreground/25 tracking-widest">
                ···································································
              </span>
              <span className="flex-shrink-0 text-[8px] font-semibold tabular-nums text-muted-foreground/60">
                {entry.page}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CertificateBodyView() {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-1.5 py-0.5">
        <SlotSectionLabel>Certificate</SlotSectionLabel>
      </div>
      <div className="flex flex-col items-center gap-2 bg-white p-4 text-center">
        <div className="h-px w-full bg-neutral-200" />
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-600">
          Certificate of Completion
        </p>
        <div className="h-px w-full bg-neutral-200" />
        <div className="space-y-1.5 py-1">
          <p className="text-[8px] text-neutral-400">This is to certify that</p>
          <div className="mx-auto h-px w-32 bg-neutral-300" />
          <p className="text-[8px] text-neutral-400">has successfully completed</p>
          <div className="mx-auto h-2 w-36 rounded-sm bg-neutral-200" />
        </div>
        <div className="flex w-full items-end justify-around pt-1">
          {["Signature", "Date"].map((label) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <div className="h-px w-20 bg-neutral-300" />
              <p className="text-[7px] text-neutral-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DiscussionPromptView() {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-1.5 py-0.5">
        <SlotSectionLabel>Discussion Prompt</SlotSectionLabel>
      </div>
      <div className="bg-white p-1.5 space-y-2">
        <div className="rounded border border-neutral-200 bg-neutral-50 p-1.5 space-y-1">
          {[1, 0.85, 0.6].map((w, i) => (
            <div key={i} className="h-1.5 rounded-sm bg-neutral-200" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
        <div className="space-y-0.5">
          <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Response</p>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-px w-full border-b border-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ReflectionJournalView() {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-1.5 py-0.5">
        <SlotSectionLabel>Reflection Journal</SlotSectionLabel>
      </div>
      <div className="bg-white p-1.5 space-y-0.5">
        <div className="mb-2 h-1.5 w-3/4 rounded-sm bg-neutral-200" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-px w-full border-b border-neutral-100" />
        ))}
      </div>
    </div>
  )
}

export function SurveyFormView() {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-1.5 py-0.5">
        <SlotSectionLabel>Survey</SlotSectionLabel>
      </div>
      <div className="bg-white p-1.5 space-y-2">
        {[1, 2, 3].map((qNum) => (
          <div key={qNum} className="space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-semibold text-neutral-400">{qNum}.</span>
              <div className="h-1.5 flex-1 rounded-sm bg-neutral-200" />
            </div>
            <div className="flex items-center gap-2 pl-3">
              {["A", "B", "C", "D"].map((opt) => (
                <span key={opt} className="inline-flex items-center gap-0.5 text-[7px] text-neutral-400">
                  <span className="h-1.5 w-1.5 rounded-full border border-neutral-300" />
                  {opt}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


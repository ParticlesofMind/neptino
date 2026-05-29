"use client"

import { AlertTriangle, BookOpenCheck, CheckCircle2, MessageSquareText, ShieldQuestion } from "lucide-react"
import { normalizeSourceProvenance } from "@/lib/atlas/source-provenance"

interface SourceProvenanceStripProps {
  content: Record<string, unknown>
}

function confidenceLabel(value: number): string | null {
  if (value <= 0) return null
  return `${Math.round(value * 100)}%`
}

function reviewLabel(status: ReturnType<typeof normalizeSourceProvenance>["reviewStatus"]): string {
  switch (status) {
    case "teacher-reviewed":
      return "Teacher reviewed"
    case "disputed":
      return "Disputed"
    case "approved":
      return "Approved"
    case "rejected":
      return "Rejected"
    default:
      return "Unreviewed"
  }
}

function reviewTone(status: ReturnType<typeof normalizeSourceProvenance>["reviewStatus"]): string {
  switch (status) {
    case "approved":
    case "teacher-reviewed":
      return "border-[#d6ede3] bg-[#d6ede3]/60 text-[#2e6b4a]"
    case "disputed":
    case "rejected":
      return "border-[#f0d8d8] bg-[#f0d8d8]/70 text-[#8a3030]"
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-500"
  }
}

export function SourceProvenanceStrip({ content }: SourceProvenanceStripProps) {
  const provenance = normalizeSourceProvenance(content)
  const primaryCitation = provenance.citations[0]
  const primaryRecord = provenance.sourceRecords[0]
  const sourceLabel = primaryCitation?.sourceLabel ?? primaryCitation?.title ?? primaryRecord?.sourceLabel
  const confidence = confidenceLabel(provenance.confidence)
  const hasVisiblePayload = Boolean(
    sourceLabel ||
    confidence ||
    provenance.warnings.length > 0 ||
    provenance.teacherFeedback.length > 0 ||
    provenance.reviewStatus !== "unreviewed",
  )

  if (!hasVisiblePayload) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-100 bg-neutral-50/70 px-2.5 py-1.5 text-[9px] font-semibold text-neutral-500">
      {sourceLabel && (
        <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-0.5">
          <BookOpenCheck size={10} className="shrink-0 text-neutral-400" />
          <span className="truncate">{sourceLabel}</span>
          {(primaryCitation?.sourceRank ?? primaryRecord?.sourceRank) && (
            <span className="shrink-0 text-neutral-400">{primaryCitation?.sourceRank ?? primaryRecord?.sourceRank}</span>
          )}
        </span>
      )}
      <span className={["inline-flex items-center gap-1 rounded border px-1.5 py-0.5", reviewTone(provenance.reviewStatus)].join(" ")}>
        {provenance.reviewStatus === "approved" || provenance.reviewStatus === "teacher-reviewed"
          ? <CheckCircle2 size={10} />
          : <ShieldQuestion size={10} />}
        {reviewLabel(provenance.reviewStatus)}
      </span>
      {confidence && (
        <span className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-neutral-500">
          Confidence {confidence}
        </span>
      )}
      {provenance.warnings.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded border border-[#f1dfb8] bg-[#fff7e6] px-1.5 py-0.5 text-[#8a5b16]">
          <AlertTriangle size={10} />
          {provenance.warnings.length} warning{provenance.warnings.length === 1 ? "" : "s"}
        </span>
      )}
      {provenance.teacherFeedback.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-neutral-500">
          <MessageSquareText size={10} />
          {provenance.teacherFeedback.length} review{provenance.teacherFeedback.length === 1 ? "" : "s"}
        </span>
      )}
    </div>
  )
}

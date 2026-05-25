"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Copy, ExternalLink, Link2, RefreshCw, Users } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { selectEnrollmentsByCourseId, type CourseEnrollmentRow } from "@/components/coursebuilder"
import { createClient } from "@/lib/supabase/client"

function readMetadataString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key]
  return typeof value === "string" ? value.trim() : ""
}

function participantName(row: CourseEnrollmentRow) {
  const displayName = readMetadataString(row.metadata, "display_name")
  const firstName = readMetadataString(row.metadata, "first_name")
  const lastName = readMetadataString(row.metadata, "last_name")
  const email = readMetadataString(row.metadata, "email")
  const joinedName = [firstName, lastName].filter(Boolean).join(" ")

  return displayName || joinedName || email || `Student ${row.student_id.slice(0, 8)}`
}

function participantDetail(row: CourseEnrollmentRow) {
  return readMetadataString(row.metadata, "email") || row.student_id
}

export function LaunchView({
  courseId,
}: {
  courseId:   string | null
}) {
  const [origin, setOrigin] = useState("")
  const [copied, setCopied] = useState(false)
  const [participants, setParticipants] = useState<CourseEnrollmentRow[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [participantsError, setParticipantsError] = useState<string | null>(null)

  const shareLink = useMemo(() => {
    if (!courseId || !origin) return ""
    return `${origin}/join/${courseId}?source=launch`
  }, [courseId, origin])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOrigin(window.location.origin)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const loadParticipants = useCallback(async () => {
    if (!courseId) {
      setParticipants([])
      return
    }

    setParticipantsLoading(true)
    setParticipantsError(null)
    const { data, error: loadError } = await selectEnrollmentsByCourseId(courseId)
    setParticipantsLoading(false)

    if (loadError) {
      setParticipantsError(loadError.message)
      return
    }

    setParticipants(data)
  }, [courseId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadParticipants()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadParticipants])

  useEffect(() => {
    if (!courseId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`course-launch-enrollments-${courseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enrollments",
          filter: `course_id=eq.${courseId}`,
        },
        () => {
          void loadParticipants()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [courseId, loadParticipants])

  async function handleCopyLink() {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const activeParticipants = participants.filter((row) => row.status === "active")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-semibold text-foreground">Share Course</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Invite students with a QR code or shareable link, then watch the session roster fill as they join.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Invite access
                </p>
                <h3 className="mt-2 text-base font-semibold text-foreground">QR code and share link</h3>
              </div>
              <Link2 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)]">
              <div className="flex h-52 w-52 items-center justify-center rounded-lg border border-border bg-white p-4">
                {shareLink ? (
                  <QRCodeSVG value={shareLink} size={176} marginSize={2} />
                ) : (
                  <span className="text-center text-xs text-muted-foreground">Create the course to generate a QR code.</span>
                )}
              </div>

              <div className="flex min-w-0 flex-col justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Students join from this link.</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Signed-in students are enrolled automatically when they open the link. Visitors who are not signed in are sent through login or signup first.
                  </p>
                </div>

                <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-3">
                  <p className="truncate font-mono text-xs text-foreground">{shareLink || "Launch link appears here"}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={!shareLink}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  {shareLink && (
                    <a
                      href={shareLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open join page
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-5 py-4">
            <div>
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Joined
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {activeParticipants.length} active {activeParticipants.length === 1 ? "student" : "students"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadParticipants()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              aria-label="Refresh joined students"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${participantsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {participantsError ? (
            <p className="m-5 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {participantsError}
            </p>
          ) : activeParticipants.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium text-foreground">No students have joined yet.</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Joined students appear here as soon as they open the launch link and enroll.
              </p>
            </div>
          ) : (
            <div className="max-h-[32rem] divide-y divide-border overflow-y-auto">
              {activeParticipants.map((participant) => (
                <div key={participant.id} className="px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#5c9970]/30 bg-[#5c9970]/10 text-xs font-semibold text-[#447856]">
                      {participantName(participant).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{participantName(participant)}</p>
                      <p className="truncate text-xs text-muted-foreground">{participantDetail(participant)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

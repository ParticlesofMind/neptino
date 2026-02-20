"use client"

import { useCallback, useRef, useState } from "react"
import { SetupColumn, SetupPanelLayout, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"

type CourseEssentials = {
  title: string
  subtitle: string
  description: string
  language: string
  courseType: string
  imageName: string | null
}

type CourseCreatedData = CourseEssentials & {
  imageUrl: string | null
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
    />
  )
}

function SelectInput({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
    >
      {children}
    </select>
  )
}

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <p className="mt-1 text-right text-[11px] text-muted-foreground">
      {value.length}/{max}
    </p>
  )
}

export function EssentialsSection({
  onCourseCreated,
  initialData,
  existingCourseId,
}: {
  onCourseCreated: (id: string, data: CourseCreatedData) => void
  initialData?: CourseCreatedData | null
  existingCourseId?: string | null
}) {
  const [data, setData] = useState<CourseEssentials>({
    title: initialData?.title ?? "",
    subtitle: initialData?.subtitle ?? "",
    description: initialData?.description ?? "",
    language: initialData?.language ?? "",
    courseType: initialData?.courseType ?? "",
    imageName: initialData?.imageName ?? null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const imageFileRef = useRef<File | null>(null)

  const set = <K extends keyof CourseEssentials>(k: K, v: CourseEssentials[K]) =>
    setData((prev) => ({ ...prev, [k]: v }))

  const previewImageUrl = imageObjectUrl ?? initialData?.imageUrl ?? null

  const persistEssentials = useCallback(async () => {
    setError(null)
    if (!data.title.trim() || data.title.trim().length < 3) {
      setSaveStatus("empty")
      return
    }
    if (!data.description.trim() || data.description.trim().length < 10) {
      setSaveStatus("empty")
      return
    }
    if (!data.language || !data.courseType) {
      setSaveStatus("empty")
      return
    }

    const activeCourseId = existingCourseId ?? createdCourseId
    setSaveStatus("saving")
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("You must be signed in.")
        setSaveStatus("error")
        return
      }

      let imageUrl: string | null = initialData?.imageUrl ?? null
      if (imageFileRef.current) {
        const file = imageFileRef.current
        const ext = file.name.split(".").pop()
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from("courses").upload(path, file, { upsert: false })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("courses").getPublicUrl(path)
          imageUrl = urlData.publicUrl
        }
      }

      const payload = {
        course_name: data.title.trim(),
        course_subtitle: data.subtitle.trim() || null,
        course_description: data.description.trim(),
        course_language: data.language,
        course_type: data.courseType,
        course_image: imageUrl,
      }

      if (activeCourseId) {
        const { error: updateError } = await supabase.from("courses").update(payload).eq("id", activeCourseId)
        if (updateError) {
          setError(updateError.message)
          setSaveStatus("error")
          return
        }
        onCourseCreated(activeCourseId, { ...data, title: data.title.trim(), imageUrl })
      } else {
        const { data: course, error: insertError } = await supabase
          .from("courses")
          .insert({
            ...payload,
            teacher_id: user.id,
            institution: user.user_metadata?.institution ?? "Independent",
            generation_settings: {},
            students_overview: { total: 0, synced: 0 },
          })
          .select("id")
          .single()

        if (insertError) {
          setError(insertError.message)
          setSaveStatus("error")
          return
        }
        setCreatedCourseId(course.id)
        onCourseCreated(course.id, { ...data, title: data.title.trim(), imageUrl })
      }

      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    } finally {
      setLoading(false)
    }
  }, [data, existingCourseId, createdCourseId, initialData?.imageUrl, onCourseCreated])

  useDebouncedChangeSave(persistEssentials, 800)

  return (
    <SetupSection
      title="Essentials"
      description="Core information about your course."
    >
      <SetupPanelLayout>
        <SetupColumn className="space-y-4">
          <div>
            <FieldLabel>Course Title</FieldLabel>
            <TextInput
              value={data.title}
              onChange={(e) => set("title", e.target.value.slice(0, 50))}
              placeholder="Enter course title"
            />
            <CharCount value={data.title} max={50} />
          </div>
          <div>
            <FieldLabel hint="optional">Course Subtitle</FieldLabel>
            <TextInput
              value={data.subtitle}
              onChange={(e) => set("subtitle", e.target.value.slice(0, 75))}
              placeholder="Enter course subtitle"
            />
            <CharCount value={data.subtitle} max={75} />
          </div>
          <div>
            <FieldLabel>Course Description</FieldLabel>
            <textarea
              value={data.description}
              onChange={(e) => set("description", e.target.value.slice(0, 999))}
              placeholder="Describe what students will learn"
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary resize-none"
            />
            <CharCount value={data.description} max={999} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Course Language</FieldLabel>
              <SelectInput value={data.language} onChange={(e) => set("language", e.target.value)}>
                <option value="">Select language...</option>
                {["English", "French", "Spanish", "German", "Arabic", "Mandarin"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Course Type</FieldLabel>
              <SelectInput value={data.courseType} onChange={(e) => set("courseType", e.target.value)}>
                <option value="">Select type...</option>
                {["In-person", "Online", "Hybrid"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectInput>
            </div>
          </div>
          <div>
            <FieldLabel>Course Image</FieldLabel>
            <div
              onClick={() => imageRef.current?.click()}
              className="flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-border bg-background px-6 py-8 text-center transition hover:border-primary/40 hover:bg-muted/40"
            >
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  imageFileRef.current = file
                  if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
                  const url = file ? URL.createObjectURL(file) : null
                  setImageObjectUrl(url)
                  set("imageName", file?.name ?? null)
                }}
              />
              {data.imageName ? (
                <p className="text-sm text-foreground">{data.imageName}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">Upload course image</p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP — up to 5 MB</p>
                </>
              )}
            </div>
          </div>
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </SetupColumn>

        <SetupColumn className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <div className={`relative h-56 ${previewImageUrl ? "overflow-hidden" : "flex items-center justify-center bg-muted/50"}`}>
              {previewImageUrl ? (
                <img src={previewImageUrl} alt="Course cover" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs italic text-muted-foreground/50">No image uploaded</span>
              )}
            </div>
            <div className="p-5 space-y-2.5">
              <h3
                className={`text-lg font-semibold leading-snug ${
                  data.title ? "text-foreground" : "italic text-muted-foreground/50"
                }`}
              >
                {data.title || "Course title…"}
              </h3>
              {data.subtitle && <p className="text-sm text-muted-foreground leading-relaxed">{data.subtitle}</p>}
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                {data.description || <span className="italic">No description yet.</span>}
              </p>
              {(data.language || data.courseType) && (
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {data.language && (
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {data.language}
                    </span>
                  )}
                  {data.courseType && (
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {data.courseType}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </SetupColumn>
      </SetupPanelLayout>
    </SetupSection>
  )
}

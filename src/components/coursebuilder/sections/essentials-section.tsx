"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  buildEssentialsGenerationSettings,
  CharCount,
  CourseImagePreview,
  CoursePreviewCard,
  CoursePreviewChip,
  FieldLabel,
  getAuthUserDisplayName,
  getAuthUserInstitution,
  getCurrentAuthUser,
  insertCourseReturningId,
  mapGenerationSettingsToState,
  SelectInput,
  SetupColumn,
  SetupPanelLayout,
  SetupSection,
  TextInput,
  updateCourseById,
  uploadCourseImage,
  useCourseRowLoader,
  useCourseSectionSave,
  useDebouncedChangeSave,
} from "@/components/coursebuilder"

type CourseEssentials = {
  title: string
  subtitle: string
  description: string
  language: string
  courseType: string
  teacherId: string
  teacherName: string
  institution: string
  imageName: string | null
}

type CourseCreatedData = CourseEssentials & {
  imageUrl: string | null
}

type EssentialsSettingsRow = {
  generation_settings: Record<string, unknown> | null
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
    teacherId: initialData?.teacherId ?? "",
    teacherName: initialData?.teacherName ?? "",
    institution: initialData?.institution ?? "Independent",
    imageName: initialData?.imageName ?? null,
  })
  const [error, setError] = useState<string | null>(null)
  const { saveStatus, lastSavedAt, markEmpty, markError, markSaved, markSaving } = useCourseSectionSave()
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const imageFileRef = useRef<File | null>(null)
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id: string; name: string }>>([])
  const [institutionOptions, setInstitutionOptions] = useState<string[]>(["Independent"])
  const generationSettingsRef = useRef<Record<string, unknown> | null>(null)

  const set = <K extends keyof CourseEssentials>(k: K, v: CourseEssentials[K]) =>
    setData((prev) => ({ ...prev, [k]: v }))

  const initialImageUrl = initialData?.imageUrl ?? null
  const previewImageUrl = imageObjectUrl ?? initialData?.imageUrl ?? null

  useEffect(() => {
    void (async () => {
      const user = await getCurrentAuthUser()
      if (!user) return

      const me = { id: user.id, name: getAuthUserDisplayName(user) }
      const metadataInstitution = getAuthUserInstitution(user)
      const options = Array.from(new Set(["Independent", metadataInstitution, initialData?.institution ?? ""].filter(Boolean)))

      setTeacherOptions([me])
      setInstitutionOptions(options)
      setData((prev) => ({
        ...prev,
        teacherId: prev.teacherId || me.id,
        teacherName: prev.teacherName || me.name,
        institution: prev.institution || metadataInstitution || "Independent",
      }))
    })()
  }, [initialData?.institution])

  useCourseRowLoader<EssentialsSettingsRow>({
    courseId: existingCourseId ?? null,
    select: "generation_settings",
    onLoaded: (row) => {
      generationSettingsRef.current = row.generation_settings
      const hydrated = mapGenerationSettingsToState(row.generation_settings)
      if (!hydrated) return

      if (hydrated.teacherId || hydrated.teacherName) {
        setData((prev) => ({
          ...prev,
          teacherId: hydrated.teacherId || prev.teacherId,
          teacherName: hydrated.teacherName || prev.teacherName,
        }))
      }
    },
  })

  const persistEssentials = useCallback(async () => {
    setError(null)
    if (!data.title.trim() || data.title.trim().length < 3) {
      markEmpty()
      return
    }
    if (!data.description.trim() || data.description.trim().length < 10) {
      markEmpty()
      return
    }
    if (!data.language || !data.courseType || !data.teacherId || !data.teacherName || !data.institution) {
      markEmpty()
      return
    }

    const activeCourseId = existingCourseId ?? createdCourseId
    markSaving()
    try {
      const user = await getCurrentAuthUser()
      if (!user) {
        setError("You must be signed in.")
        markError()
        return
      }

      let imageUrl: string | null = initialImageUrl
      if (imageFileRef.current) {
        const uploadedImageUrl = await uploadCourseImage(imageFileRef.current, user.id)
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl
        }
      }

      const payload: Record<string, unknown> = {
        course_name: data.title.trim(),
        course_subtitle: data.subtitle.trim() || null,
        course_description: data.description.trim(),
        course_language: data.language,
        course_type: data.courseType,
        teacher_id: data.teacherId,
        institution: data.institution,
        course_image: imageUrl,
      }

      const generationSettingsPayload = buildEssentialsGenerationSettings({
        existing: generationSettingsRef.current,
        teacherId: data.teacherId,
        teacherName: data.teacherName,
      })

      if (activeCourseId) {
        payload.generation_settings = generationSettingsPayload

        const { error: updateError } = await updateCourseById(activeCourseId, payload)
        if (updateError) {
          setError(updateError.message)
          markError()
          return
        }
        generationSettingsRef.current = payload.generation_settings as Record<string, unknown>
        onCourseCreated(activeCourseId, { ...data, title: data.title.trim(), imageUrl })
      } else {
        const { data: course, error: insertError } = await insertCourseReturningId({
          ...payload,
          teacher_id: user.id,
          generation_settings: generationSettingsPayload,
          students_overview: { total: 0, synced: 0 },
        })

        if (insertError) {
          setError(insertError.message)
          markError()
          return
        }
        setCreatedCourseId(course.id)
        generationSettingsRef.current = generationSettingsPayload
        onCourseCreated(course.id, { ...data, title: data.title.trim(), imageUrl })
      }

      markSaved()
    } catch {
      markError()
    }
  }, [data, existingCourseId, createdCourseId, initialImageUrl, onCourseCreated, markEmpty, markError, markSaved, markSaving])

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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Teacher</FieldLabel>
              <SelectInput
                value={data.teacherId}
                onChange={(e) => {
                  const selectedId = e.target.value
                  const selected = teacherOptions.find((option) => option.id === selectedId)
                  set("teacherId", selectedId)
                  set("teacherName", selected?.name ?? data.teacherName)
                }}
                disabled={teacherOptions.length === 0}
              >
                <option value="">Select teacher...</option>
                {teacherOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Institution</FieldLabel>
              <SelectInput
                value={data.institution}
                onChange={(e) => set("institution", e.target.value)}
              >
                <option value="">Select institution...</option>
                {institutionOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
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
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="hidden text-xs text-muted-foreground md:block">
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "error"
                  ? "Could not save"
                  : lastSavedAt
                    ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
            </span>
            <button
              type="button"
              onClick={() => void persistEssentials()}
              disabled={saveStatus === "saving"}
              className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveStatus === "saving"
                ? "Saving…"
                : existingCourseId ?? createdCourseId
                  ? "Save Changes"
                  : "Create Course"}
            </button>
          </div>
        </SetupColumn>

        <SetupColumn className="space-y-3">
          <CoursePreviewCard>
            <CourseImagePreview
              imageUrl={previewImageUrl}
              alt="Course cover"
              heightClassName="h-56"
              emptyText="No image uploaded"
            />
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
              {(data.language || data.courseType || data.teacherName || data.institution) && (
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {data.language && <CoursePreviewChip>{data.language}</CoursePreviewChip>}
                  {data.courseType && <CoursePreviewChip>{data.courseType}</CoursePreviewChip>}
                  {data.teacherName && <CoursePreviewChip>{data.teacherName}</CoursePreviewChip>}
                  {data.institution && <CoursePreviewChip>{data.institution}</CoursePreviewChip>}
                </div>
              )}
            </div>
          </CoursePreviewCard>
        </SetupColumn>
      </SetupPanelLayout>
    </SetupSection>
  )
}

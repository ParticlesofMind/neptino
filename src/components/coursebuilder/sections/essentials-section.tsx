"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Cropper from "react-easy-crop"
import type { Area, Point } from "react-easy-crop"
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
  PRIMARY_ACTION_BUTTON_CLASS,
  SetupSection,
  TextInput,
  updateCourseById,
  uploadCourseImage,
  useCourseRowLoader,
  useCourseSectionSave,
  useDebouncedChangeSave,
} from "@/components/coursebuilder"
import type { CourseCreatedData, CourseEssentials } from "@/components/coursebuilder/builder-types"

type EssentialsSettingsRow = {
  generation_settings: Record<string, unknown> | null
}

const CROP_ASPECT_OPTIONS = [
  { value: "16:9", label: "Wide 16:9", ratio: 16 / 9 },
  { value: "4:3", label: "Standard 4:3", ratio: 4 / 3 },
  { value: "1:1", label: "Square 1:1", ratio: 1 },
  { value: "3:4", label: "Portrait 3:4", ratio: 3 / 4 },
] as const

type CropAspectValue = (typeof CROP_ASPECT_OPTIONS)[number]["value"]

function buildEssentialsSnapshot(data: CourseEssentials, imageUrl: string | null) {
  return JSON.stringify({
    title: data.title.trim(),
    subtitle: data.subtitle.trim() || null,
    description: data.description.trim(),
    language: data.language,
    courseType: data.courseType,
    teacherId: data.teacherId,
    teacherName: data.teacherName,
    institution: data.institution,
    imageUrl,
  })
}

async function makeCroppedImageFile(src: string, croppedAreaPixels: Area, fileName: string): Promise<File> {
  const image = new Image()
  image.crossOrigin = "anonymous"
  image.src = src

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error("Failed to load selected image for cropping."))
  })

  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(croppedAreaPixels.width))
  canvas.height = Math.max(1, Math.round(croppedAreaPixels.height))

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Unable to prepare image crop.")
  }

  context.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  })

  if (!blob) {
    throw new Error("Failed to export cropped image.")
  }

  const baseName = fileName.includes(".") ? fileName.slice(0, fileName.lastIndexOf(".")) : fileName
  return new File([blob], `${baseName || "course-image"}-cropped.jpg`, { type: "image/jpeg" })
}

export function EssentialsSection({
  onCourseCreated,
  initialData,
  courseId,
}: {
  onCourseCreated: (id: string, data: CourseCreatedData) => void
  initialData?: CourseCreatedData | null
  courseId?: string | null
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
  const { markEmpty, markError, markSaved, markSaving } = useCourseSectionSave()
  const [isManualSaving, setIsManualSaving] = useState(false)
  const [showManualSaving, setShowManualSaving] = useState(false)
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)
  const [pendingImageName, setPendingImageName] = useState<string>("course-image")
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropAspect, setCropAspect] = useState<CropAspectValue>("3:4")
  const [cropPixels, setCropPixels] = useState<Area | null>(null)
  const [applyingCrop, setApplyingCrop] = useState(false)
  const [lastPersistedSnapshot, setLastPersistedSnapshot] = useState<string>("")
  const imageRef = useRef<HTMLInputElement>(null)
  const imageFileRef = useRef<File | null>(null)
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id: string; name: string }>>([])
  const [institutionOptions, setInstitutionOptions] = useState<string[]>(["Independent"])
  const generationSettingsRef = useRef<Record<string, unknown> | null>(null)

  const set = <K extends keyof CourseEssentials>(k: K, v: CourseEssentials[K]) =>
    setData((prev) => ({ ...prev, [k]: v }))

  const initialImageUrl = initialData?.imageUrl ?? null
  const previewImageUrl = imageObjectUrl ?? initialData?.imageUrl ?? null

  const currentSnapshot = useMemo(
    () => buildEssentialsSnapshot(data, previewImageUrl),
    [data, previewImageUrl],
  )
  const hasPendingImageUpload = Boolean(imageFileRef.current)
  const hasUnsavedChanges = hasPendingImageUpload || currentSnapshot !== lastPersistedSnapshot

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
      if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc)
    }
  }, [imageObjectUrl, pendingImageSrc])

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
    courseId: courseId ?? null,
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

  useEffect(() => {
    setLastPersistedSnapshot(buildEssentialsSnapshot(data, previewImageUrl))
    // Intentionally baseline on incoming/loaded course identity.
    // Subsequent edits will diverge currentSnapshot and enable saving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, initialData])

  const persistEssentials = useCallback(async (options?: { allowCreate?: boolean }) => {
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

    const activeCourseId = courseId ?? createdCourseId
    const allowCreate = options?.allowCreate ?? false
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
        imageFileRef.current = null
        setLastPersistedSnapshot(buildEssentialsSnapshot(data, imageUrl))
      } else {
        if (!allowCreate) {
          markEmpty()
          return
        }

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
        imageFileRef.current = null
        setLastPersistedSnapshot(buildEssentialsSnapshot(data, imageUrl))
      }

      markSaved()
    } catch {
      markError()
    }
  }, [data, courseId, createdCourseId, initialImageUrl, onCourseCreated, markEmpty, markError, markSaved, markSaving])

  useDebouncedChangeSave(() => {
    if (!(courseId ?? createdCourseId)) return
    void persistEssentials({ allowCreate: false })
  }, 800)

  const handleManualSave = useCallback(async () => {
    setIsManualSaving(true)
    setShowManualSaving(false)

    const savingLabelTimer = window.setTimeout(() => {
      setShowManualSaving(true)
    }, 180)

    try {
      await persistEssentials({ allowCreate: true })
    } finally {
      window.clearTimeout(savingLabelTimer)
      setShowManualSaving(false)
      setIsManualSaving(false)
    }
  }, [persistEssentials])

  const closeCropModal = useCallback(() => {
    setCropModalOpen(false)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCropAspect("3:4")
    setCropPixels(null)
    setApplyingCrop(false)
    if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc)
    setPendingImageSrc(null)
    if (imageRef.current) imageRef.current.value = ""
  }, [pendingImageSrc])

  const applyCroppedImage = useCallback(async () => {
    if (!pendingImageSrc || !cropPixels) return
    setApplyingCrop(true)
    setError(null)
    try {
      const croppedFile = await makeCroppedImageFile(pendingImageSrc, cropPixels, pendingImageName)
      imageFileRef.current = croppedFile

      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
      const nextPreviewUrl = URL.createObjectURL(croppedFile)
      setImageObjectUrl(nextPreviewUrl)
      set("imageName", croppedFile.name)
      closeCropModal()
    } catch {
      setError("Could not crop the selected image. Please try another file.")
      setApplyingCrop(false)
    }
  }, [closeCropModal, cropPixels, imageObjectUrl, pendingImageName, pendingImageSrc])

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
                  if (!file) return

                  if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc)
                  const sourceUrl = URL.createObjectURL(file)

                  setPendingImageSrc(sourceUrl)
                  setPendingImageName(file.name)
                  setCrop({ x: 0, y: 0 })
                  setZoom(1)
                  setCropAspect("3:4")
                  setCropPixels(null)
                  setCropModalOpen(true)
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
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => void handleManualSave()}
              disabled={isManualSaving || (Boolean(courseId ?? createdCourseId) && !hasUnsavedChanges)}
              className={`${PRIMARY_ACTION_BUTTON_CLASS} ml-auto`}
            >
              {isManualSaving && showManualSaving
                ? "Saving..."
                : courseId ?? createdCourseId
                  ? hasUnsavedChanges
                    ? "Save Changes"
                    : "No Changes"
                  : "Create Course"}
            </button>
          </div>
        </SetupColumn>

        <SetupColumn className="space-y-3">
          <CoursePreviewCard>
            <CourseImagePreview
              imageUrl={previewImageUrl}
              alt="Course cover"
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

      {cropModalOpen && pendingImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close image crop modal"
            className="absolute inset-0 bg-black/50"
            onClick={closeCropModal}
          />

          <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Crop course image</p>
                <p className="text-xs text-muted-foreground">Adjust framing, then upload the cropped image.</p>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="relative h-[52vh] min-h-[320px] w-full overflow-hidden rounded-lg bg-black/80">
                <Cropper
                  image={pendingImageSrc}
                  crop={crop}
                  zoom={zoom}
                  minZoom={0.6}
                  maxZoom={4}
                  objectFit="contain"
                  aspect={CROP_ASPECT_OPTIONS.find((option) => option.value === cropAspect)?.ratio ?? 3 / 4}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setCropPixels(pixels)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="course-image-ratio" className="mb-1 block text-xs text-muted-foreground">Crop ratio</label>
                  <SelectInput
                    id="course-image-ratio"
                    value={cropAspect}
                    onChange={(e) => setCropAspect(e.target.value as CropAspectValue)}
                  >
                    {CROP_ASPECT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </SelectInput>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="course-image-zoom" className="text-xs text-muted-foreground">Zoom</label>
                <input
                  id="course-image-zoom"
                  type="range"
                  min={0.6}
                  max={4}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={closeCropModal}
                  className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void applyCroppedImage()}
                  disabled={applyingCrop}
                  className={`${PRIMARY_ACTION_BUTTON_CLASS} text-xs`}
                >
                  {applyingCrop ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SetupSection>
  )
}

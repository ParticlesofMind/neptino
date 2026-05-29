import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { resolveServerInstitutionContext } from "@/lib/institutions/server"
import { ProgramSetupClient } from "./program-setup-client"

type CourseOption = {
  id: string
  course_name: string
}

type SearchParams = Record<string, string | string[] | undefined>

type ProgramRow = {
  id: string
  institution_id: string
  name: string
  description: string | null
  duration_label: string | null
  program_image: string | null
  credential_label: string | null
  progression_policy: string | null
  education_context: Record<string, unknown> | null
  syllabus: Record<string, unknown> | null
  program_courses: Array<{ course_id: string }> | null
}

function getSingleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

async function uploadProgramImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  image: FormDataEntryValue | null,
  userId: string,
): Promise<string | null> {
  if (!(image instanceof File) || image.size === 0) return null

  const ext = image.name.split(".").pop() || "jpg"
  const path = `${userId}/programs/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from("courses")
    .upload(path, image, { upsert: false, contentType: image.type || undefined })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from("courses").getPublicUrl(path)
  return data.publicUrl || null
}

async function saveProgram(formData: FormData) {
  "use server"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const institutionContext = await resolveServerInstitutionContext(supabase, user.id)
  const institutionId = institutionContext.current?.institutionId ?? null
  if (!institutionId) redirect("/teacher/courses")

  const programId = String(formData.get("program_id") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const programSubtitle = String(formData.get("program_subtitle") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const durationLabel = String(formData.get("duration_label") ?? "").trim()
  const credentialLabel = String(formData.get("credential_label") ?? "").trim()
  const progressionPolicy = String(formData.get("progression_policy") ?? "").trim()
  const educationCountry = String(formData.get("education_country") ?? "").trim()
  const educationRegion = String(formData.get("education_region") ?? "").trim()
  const schoolContext = String(formData.get("school_context") ?? "").trim()
  const programType = String(formData.get("program_type") ?? "").trim()
  const pathway = String(formData.get("pathway") ?? "").trim()
  const instructionLanguage = String(formData.get("instruction_language") ?? "").trim()
  const subjectArea = String(formData.get("subject_area") ?? "").trim()
  const subjectTrack = String(formData.get("subject_track") ?? "").trim()
  const levelBand = String(formData.get("level_band") ?? "").trim()
  const learnerStage = String(formData.get("learner_stage") ?? "").trim()
  const programIntent = String(formData.get("program_intent") ?? "").trim()
  const enrollmentModel = String(formData.get("enrollment_model") ?? "").trim()
  const outcomes = String(formData.get("outcomes") ?? "").trim()
  const admissionExpectations = String(formData.get("admission_expectations") ?? "").trim()
  const assessmentNotes = String(formData.get("assessment_notes") ?? "").trim()
  const courseRelationship = String(formData.get("course_relationship") ?? "").trim()
  const initialCourseIds = formData
    .getAll("course_ids")
    .map((value) => String(value))
    .filter((value) => value.length > 0)
  const inheritancePolicy = {
    classification: formData.get("inherit_classification") === "on",
    education_context: formData.get("inherit_education_context") === "on",
    syllabus: formData.get("inherit_syllabus") === "on",
    progression_policy: formData.get("inherit_progression_policy") === "on",
  }

  if (name.length < 3) return
  const uploadedImageUrl = await uploadProgramImage(supabase, formData.get("program_image"), user.id)

  let existingProgramImage: string | null = null

  if (programId) {
    const { data: existing, error: existingError } = await supabase
      .from("programs")
      .select("id, institution_id, program_image")
      .eq("id", programId)
      .single()

    if (existingError || existing?.institution_id !== institutionId) return
    existingProgramImage = (existing.program_image as string | null) ?? null
  } else if (!uploadedImageUrl) {
    return
  }

  const programPayload = {
    institution_id: institutionId,
    name,
    description: description || null,
    duration_label: durationLabel || null,
    program_image: uploadedImageUrl || existingProgramImage,
    credential_label: credentialLabel || null,
    progression_policy: progressionPolicy || null,
    created_by: user.id,
    education_context: {
      program_subtitle: programSubtitle || null,
      education_country: educationCountry || null,
      education_region: educationRegion || null,
      school_context: schoolContext || null,
      program_type: programType || null,
      pathway: pathway || null,
      instruction_language: instructionLanguage || null,
      subject_area: subjectArea || null,
      subject_track: subjectTrack || null,
      level_band: levelBand || null,
      learner_stage: learnerStage || null,
      program_intent: programIntent || null,
      enrollment_model: enrollmentModel || null,
      inheritance_policy: inheritancePolicy,
    },
    syllabus: {
      outcomes: outcomes || null,
      admission_expectations: admissionExpectations || null,
      assessment_notes: assessmentNotes || null,
      course_relationship: courseRelationship || null,
    },
  }

  let savedProgramId = programId

  if (programId) {
    const { error } = await supabase
      .from("programs")
      .update(programPayload)
      .eq("id", programId)
      .eq("institution_id", institutionId)

    if (error) return
  } else {
    const { data: program, error } = await supabase
      .from("programs")
      .insert(programPayload)
      .select("id")
      .single()

    if (error) return
    savedProgramId = program.id as string
  }

  if (savedProgramId) {
    await supabase
      .from("program_courses")
      .delete()
      .eq("program_id", savedProgramId)
  }

  if (savedProgramId && initialCourseIds.length > 0) {
    await supabase
      .from("program_courses")
      .insert(initialCourseIds.map((courseId, index) => ({
        program_id: savedProgramId,
        course_id: courseId,
        sequence_index: index + 1,
        required: true,
      })))
  }

  redirect(`/teacher/programs/new?id=${savedProgramId}`)
}

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const institutionContext = await resolveServerInstitutionContext(supabase, user.id)
  const currentInstitution = institutionContext.current
  const params = (await searchParams) ?? {}
  const programId = getSingleParam(params.id)
  let courseOptions: CourseOption[] = []
  let program: ProgramRow | null = null

  if (currentInstitution?.institutionId) {
    const { data: courses } = await supabase
      .from("courses")
      .select("id, course_name")
      .eq("institution_id", currentInstitution.institutionId)
      .order("course_name", { ascending: true })

    courseOptions = (courses as CourseOption[] | null) ?? []

    if (programId) {
      const { data } = await supabase
        .from("programs")
        .select("id, institution_id, name, description, duration_label, program_image, credential_label, progression_policy, education_context, syllabus, program_courses(course_id)")
        .eq("id", programId)
        .eq("institution_id", currentInstitution.institutionId)
        .single()

      program = (data as ProgramRow | null) ?? null
    }
  }

  if (!currentInstitution) {
    return (
      <div className="flex h-[100dvh] min-h-[100dvh] items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm">
          <p className="text-sm font-medium text-foreground">No institution selected</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Select or create an institution before creating a program.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ProgramSetupClient
      action={saveProgram}
      programId={program?.id ?? null}
      initialProgram={program ? {
        name: program.name,
        subtitle: getString(program.education_context?.program_subtitle),
        description: program.description ?? "",
        durationLabel: program.duration_label ?? "",
        imageUrl: program.program_image ?? "",
        credentialLabel: program.credential_label ?? "",
        progressionPolicy: program.progression_policy ?? "",
        educationCountry: getString(program.education_context?.education_country),
        educationRegion: getString(program.education_context?.education_region),
        schoolContext: getString(program.education_context?.school_context),
        programType: getString(program.education_context?.program_type),
        pathway: getString(program.education_context?.pathway),
        instructionLanguage: getString(program.education_context?.instruction_language),
        subjectArea: getString(program.education_context?.subject_area),
        subjectTrack: getString(program.education_context?.subject_track),
        levelBand: getString(program.education_context?.level_band),
        learnerStage: getString(program.education_context?.learner_stage),
        programIntent: getString(program.education_context?.program_intent),
        enrollmentModel: getString(program.education_context?.enrollment_model),
        inheritClassification: Boolean((program.education_context?.inheritance_policy as Record<string, unknown> | undefined)?.classification),
        inheritEducationContext: Boolean((program.education_context?.inheritance_policy as Record<string, unknown> | undefined)?.education_context),
        inheritSyllabus: Boolean((program.education_context?.inheritance_policy as Record<string, unknown> | undefined)?.syllabus),
        inheritProgressionPolicy: Boolean((program.education_context?.inheritance_policy as Record<string, unknown> | undefined)?.progression_policy),
        outcomes: getString(program.syllabus?.outcomes),
        admissionExpectations: getString(program.syllabus?.admission_expectations),
        assessmentNotes: getString(program.syllabus?.assessment_notes),
        courseRelationship: getString(program.syllabus?.course_relationship),
        courseIds: (program.program_courses ?? []).map((row) => row.course_id),
      } : null}
      institutionName={currentInstitution.institutionName}
      courseOptions={courseOptions}
    />
  )
}

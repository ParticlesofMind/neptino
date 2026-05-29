export type SignupIntent = "learn_independently" | "join_course" | "create_courses" | "setup_institution"

export type LegacyUserRole = "student" | "teacher" | "admin"

export type InstitutionRole = "owner" | "admin" | "teacher" | "student"

export type MembershipRow = {
  institution_id: string
  role: string
  status: string
  institutions:
    | {
        id: string
        name: string
        slug: string | null
        institution_type: string | null
      }
    | Array<{
        id: string
        name: string
        slug: string | null
        institution_type: string | null
      }>
    | null
}

type NestedInstitution = NonNullable<MembershipRow["institutions"]> extends Array<infer T>
  ? T
  : Exclude<MembershipRow["institutions"], unknown[] | null>

export type InstitutionContext = {
  institutionId: string
  institutionName: string
  institutionSlug: string | null
  institutionType: string | null
  roles: InstitutionRole[]
  primaryRole: InstitutionRole
  dashboardPath: string
}

export type SignupProvisioning = {
  intent: SignupIntent
  legacyRole: LegacyUserRole
  membershipRoles: InstitutionRole[]
  institutionName: string | null
  institutionType: string | null
}

const ROLE_PRIORITY: Record<InstitutionRole, number> = {
  owner: 0,
  admin: 1,
  teacher: 2,
  student: 3,
}

export const INSTITUTION_TYPE_OPTIONS = [
  { value: "private_school", label: "Private school" },
  { value: "public_school", label: "Public school" },
  { value: "higher_education", label: "Higher education" },
  { value: "tutoring_center", label: "Tutoring center" },
  { value: "training_provider", label: "Training provider" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "company", label: "Company" },
  { value: "other", label: "Other" },
] as const

export function isSignupIntent(value: string | null | undefined): value is SignupIntent {
  return value === "learn_independently" || value === "join_course" || value === "create_courses" || value === "setup_institution"
}

export function isInstitutionRole(value: string): value is InstitutionRole {
  return value === "owner" || value === "admin" || value === "teacher" || value === "student"
}

export function sortInstitutionRoles(roles: InstitutionRole[]): InstitutionRole[] {
  return Array.from(new Set(roles)).sort((a, b) => ROLE_PRIORITY[a] - ROLE_PRIORITY[b])
}

export function getPrimaryInstitutionRole(roles: InstitutionRole[]): InstitutionRole {
  return sortInstitutionRoles(roles)[0] ?? "student"
}

export function getDashboardPathForRole(role: InstitutionRole): string {
  if (role === "owner" || role === "admin") return "/admin"
  if (role === "teacher") return "/teacher"
  return "/student"
}

export function getLegacyRoleForMemberships(roles: InstitutionRole[]): LegacyUserRole {
  if (roles.some((role) => role === "owner" || role === "admin")) return "admin"
  if (roles.includes("teacher")) return "teacher"
  return "student"
}

export function getSignupProvisioning(input: {
  intent: SignupIntent
  firstName?: string
  lastName?: string
  institutionName?: string
  institutionType?: string
}): SignupProvisioning {
  const firstName = input.firstName?.trim() ?? ""
  const lastName = input.lastName?.trim() ?? ""
  const fullName = [firstName, lastName].filter(Boolean).join(" ")

  if (input.intent === "create_courses") {
    return {
      intent: input.intent,
      legacyRole: "teacher",
      membershipRoles: ["owner", "admin", "teacher"],
      institutionName: input.institutionName?.trim() || (fullName ? `${fullName} Studio` : null),
      institutionType: "independent",
    }
  }

  if (input.intent === "setup_institution") {
    return {
      intent: input.intent,
      legacyRole: "admin",
      membershipRoles: ["owner", "admin"],
      institutionName: input.institutionName?.trim() || null,
      institutionType: input.institutionType?.trim() || "other",
    }
  }

  return {
    intent: input.intent,
    legacyRole: "student",
    membershipRoles: [],
    institutionName: null,
    institutionType: null,
  }
}

function normalizeNestedInstitution(row: MembershipRow): NestedInstitution | null {
  const value = row.institutions
  return (Array.isArray(value) ? value[0] : value) ?? null
}

export function groupMembershipRows(rows: MembershipRow[]): InstitutionContext[] {
  const grouped = new Map<string, InstitutionContext>()

  for (const row of rows) {
    if (row.status !== "active" || !isInstitutionRole(row.role)) continue

    const institution = normalizeNestedInstitution(row)
    if (!institution?.id || !institution.name) continue

    const existing = grouped.get(institution.id)
    if (existing) {
      existing.roles = sortInstitutionRoles([...existing.roles, row.role])
      existing.primaryRole = getPrimaryInstitutionRole(existing.roles)
      existing.dashboardPath = getDashboardPathForRole(existing.primaryRole)
      continue
    }

    const roles = sortInstitutionRoles([row.role])
    const primaryRole = getPrimaryInstitutionRole(roles)
    grouped.set(institution.id, {
      institutionId: institution.id,
      institutionName: institution.name,
      institutionSlug: institution.slug,
      institutionType: institution.institution_type,
      roles,
      primaryRole,
      dashboardPath: getDashboardPathForRole(primaryRole),
    })
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const roleDelta = ROLE_PRIORITY[a.primaryRole] - ROLE_PRIORITY[b.primaryRole]
    if (roleDelta !== 0) return roleDelta
    return a.institutionName.localeCompare(b.institutionName)
  })
}

export function resolveActiveInstitutionContext(
  contexts: InstitutionContext[],
  activeInstitutionId?: string | null,
): InstitutionContext | null {
  if (contexts.length === 0) return null
  if (activeInstitutionId) {
    const active = contexts.find((context) => context.institutionId === activeInstitutionId)
    if (active) return active
  }
  return contexts[0]
}

export function formatInstitutionRoles(roles: InstitutionRole[]): string {
  return sortInstitutionRoles(roles)
    .map((role) => (role === "owner" ? "Owner" : role.charAt(0).toUpperCase() + role.slice(1)))
    .join(", ")
}

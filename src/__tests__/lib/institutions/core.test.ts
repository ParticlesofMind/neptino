import { describe, expect, it } from "vitest"
import {
  formatInstitutionRoles,
  getLegacyRoleForMemberships,
  getSignupProvisioning,
  groupMembershipRows,
  resolveActiveInstitutionContext,
  type MembershipRow,
} from "@/lib/institutions/core"

describe("institution membership helpers", () => {
  it("maps signup intents to legacy roles and memberships", () => {
    expect(getSignupProvisioning({ intent: "learn_independently" })).toMatchObject({
      legacyRole: "student",
      membershipRoles: [],
      institutionName: null,
    })

    expect(getSignupProvisioning({ intent: "join_course" })).toMatchObject({
      legacyRole: "student",
      membershipRoles: [],
      institutionName: null,
    })

    expect(getSignupProvisioning({
      intent: "create_courses",
      firstName: "Alex",
      lastName: "Rivera",
    })).toMatchObject({
      legacyRole: "teacher",
      membershipRoles: ["owner", "admin", "teacher"],
      institutionName: "Alex Rivera Studio",
      institutionType: "independent",
    })

    expect(getSignupProvisioning({
      intent: "setup_institution",
      institutionName: "North Academy",
      institutionType: "private_school",
    })).toMatchObject({
      legacyRole: "admin",
      membershipRoles: ["owner", "admin"],
      institutionName: "North Academy",
      institutionType: "private_school",
    })
  })

  it("maps active memberships to the compatibility role", () => {
    expect(getLegacyRoleForMemberships(["student"])).toBe("student")
    expect(getLegacyRoleForMemberships(["teacher", "student"])).toBe("teacher")
    expect(getLegacyRoleForMemberships(["teacher", "admin"])).toBe("admin")
    expect(getLegacyRoleForMemberships(["owner", "teacher"])).toBe("admin")
  })

  it("groups multiple roles within the same institution", () => {
    const rows: MembershipRow[] = [
      row("inst-a", "Alex Studio", "teacher"),
      row("inst-a", "Alex Studio", "admin"),
      row("inst-b", "Example School", "student"),
      row("inst-b", "Example School", "teacher", "removed"),
    ]

    const contexts = groupMembershipRows(rows)

    expect(contexts).toHaveLength(2)
    expect(contexts[0]).toMatchObject({
      institutionId: "inst-a",
      institutionName: "Alex Studio",
      roles: ["admin", "teacher"],
      primaryRole: "admin",
      dashboardPath: "/admin",
    })
    expect(contexts[1]).toMatchObject({
      institutionId: "inst-b",
      roles: ["student"],
      dashboardPath: "/student",
    })
  })

  it("resolves active institution from cookie value with priority fallback", () => {
    const contexts = groupMembershipRows([
      row("student-inst", "Student Program", "student"),
      row("admin-inst", "Admin School", "admin"),
    ])

    expect(resolveActiveInstitutionContext(contexts, "student-inst")?.institutionName).toBe("Student Program")
    expect(resolveActiveInstitutionContext(contexts, "missing")?.institutionName).toBe("Admin School")
    expect(resolveActiveInstitutionContext([], "missing")).toBeNull()
  })

  it("formats role labels by priority", () => {
    expect(formatInstitutionRoles(["teacher", "owner", "admin"])).toBe("Owner, Admin, Teacher")
  })
})

function row(
  institutionId: string,
  institutionName: string,
  role: string,
  status = "active",
): MembershipRow {
  return {
    institution_id: institutionId,
    role,
    status,
    institutions: {
      id: institutionId,
      name: institutionName,
      slug: institutionName.toLowerCase().replace(/\s+/g, "-"),
      institution_type: "independent",
    },
  }
}

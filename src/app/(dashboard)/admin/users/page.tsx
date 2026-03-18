"use client"
import { useState } from "react"
import { Search, Users, GraduationCap, BookOpen } from "lucide-react"

type Role = "student" | "teacher" | "admin"
type Status = "active" | "suspended"

type User = {
  id: string
  name: string
  email: string
  role: Role
  institution: string
  joined: string
  status: Status
}

const USERS: User[] = [
  { id: "1", name: "Dr. Anna Mueller", email: "anna.mueller@example.com", role: "teacher", institution: "Berlin Institute", joined: "Jan 2025", status: "active" },
  { id: "2", name: "James Park", email: "james.park@example.com", role: "teacher", institution: "Seoul University", joined: "Feb 2025", status: "active" },
  { id: "3", name: "Prof. Sarah Lin", email: "sarah.lin@example.com", role: "teacher", institution: "MIT Extension", joined: "Mar 2024", status: "active" },
  { id: "4", name: "Jane Student", email: "jane@example.com", role: "student", institution: "Berlin Institute", joined: "Sep 2025", status: "active" },
  { id: "5", name: "Lena Kovacs", email: "lena.kovacs@example.com", role: "student", institution: "Budapest Tech", joined: "Sep 2025", status: "active" },
  { id: "6", name: "Marco Rossi", email: "marco.rossi@example.com", role: "student", institution: "Politecnico Milano", joined: "Oct 2025", status: "suspended" },
  { id: "7", name: "sophie.kim", email: "sophie.kim@neptino.io", role: "admin", institution: "Neptino", joined: "Jun 2024", status: "active" },
  { id: "8", name: "Thomas Weber", email: "t.weber@example.com", role: "teacher", institution: "Vienna University", joined: "Apr 2025", status: "active" },
]

const roleStyle: Record<Role, { bg: string; color: string; label: string }> = {
  teacher: { bg: "#6b8fc4", color: "#fff", label: "Teacher" },
  student: { bg: "#5c9970", color: "#fff", label: "Student" },
  admin: { bg: "#a89450", color: "#fff", label: "Admin" },
}

const ROLE_FILTERS: Array<{ value: Role | "all"; label: string }> = [
  { value: "all", label: "All roles" },
  { value: "teacher", label: "Teachers" },
  { value: "student", label: "Students" },
  { value: "admin", label: "Admins" },
]

export default function AdminUsersPage() {
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all")

  const total = USERS.length
  const teachers = USERS.filter((u) => u.role === "teacher").length
  const students = USERS.filter((u) => u.role === "student").length

  const filtered = USERS.filter((u) => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    const matchesQuery =
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.institution.toLowerCase().includes(query.toLowerCase())
    return matchesRole && matchesQuery
  })

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Users", value: String(total), Icon: Users },
          { label: "Teachers", value: String(teachers), Icon: BookOpen },
          { label: "Students", value: String(students), Icon: GraduationCap },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-lg border border-border bg-background px-5 py-4">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-muted py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setRoleFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === f.value
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "border border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <div className="divide-y divide-border">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 bg-muted">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">User</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Institution</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Joined</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
          </div>

          {filtered.length === 0 && (
            <p className="px-5 py-8 text-sm text-muted-foreground">No users match your filters.</p>
          )}

          {filtered.map((user) => (
            <div key={user.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <p className="text-sm text-muted-foreground truncate">{user.institution}</p>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: roleStyle[user.role].bg, color: roleStyle[user.role].color }}
              >
                {roleStyle[user.role].label}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{user.joined}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  user.status === "active"
                    ? "bg-[#5c9970]/10 text-[#5c9970]"
                    : "bg-[#b87070]/10 text-[#b87070]"
                }`}
              >
                {user.status === "active" ? "Active" : "Suspended"}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

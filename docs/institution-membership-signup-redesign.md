# Institution Membership And Signup Redesign

Planning date: 2026-05-25

Related checklist: [Institution Brand Verification Todo](./institution-brand-verification-todo.md)

## Executive Summary

Neptino's primary customer is the institution: schools, independent schools, private academies, public institutions, higher education providers, tutoring organizations, and independent teachers operating as one-person institutions.

The current signup model asks users to choose a global role: `student`, `teacher`, or `admin`. That creates unnecessary cognitive load and causes a deeper product problem: it treats a person's identity as if it can only belong to one institutional context.

The new model should make **identity global** and **roles contextual**.

One person should have one Neptino account. That account can hold different memberships in different institutions.

```text
User identity
  -> Institution A: admin, teacher
  -> Institution B: teacher
  -> Institution C: student
```

This avoids duplicate accounts when, for example, an independent teacher discovers Neptino before their school later adopts it.

## Core Product Decision

Do not ask new users "Are you a student, teacher, or admin?" as the first signup question.

Ask what they are trying to do.

| User intent | User-facing option | Backend result |
|---|---|---|
| Learn independently | `Learn independently` | Create/sign into account as a learner, without institution membership until they join a course. |
| Join a course | Invite link, course link, or course code | Create/sign into account, then attach course enrollment and student membership if the course is institution-scoped. |
| Teach independently | `Create courses` | Create/sign into account, create a one-person institution, add admin and teacher memberships. |
| Set up a school or organization | `Set up an institution` | Create/sign into account, create institution, add admin membership. |
| Accept an invite | Invite link or email flow | Create/sign into account, then activate pending membership. |

Internally, an independent teacher is an institution admin and teacher. Externally, the signup copy should not force them to understand that distinction before they have an account.

## Why This Matters

### Current Risk

The current system stores role and institution directly on `public.users`.

```text
users.role
users.institution
```

That implies:

- A user has one role.
- A user belongs to one institution.
- A teacher who later joins a school may need another profile.
- An admin can be tempted to create accounts for people who already exist.

This is not strong enough for Neptino's institutional direction.

### Target Principle

```text
Nobody except Supabase Auth creates a real user identity.
Admins create invitations and memberships, not duplicate user accounts.
```

The system should use email as the invitation anchor, but user identity should be resolved through Supabase Auth.

## Target Data Model

### `users`

Global human identity and profile details.

Recommended role:

- Keep `users.id` aligned with `auth.users.id`.
- Keep identity/profile fields such as email, first name, last name, avatar, language.
- Treat `users.role` and `users.institution` as legacy compatibility fields until removed.
- Do not use `users.role` or `users.institution` as the long-term authorization source.

Suggested direction:

```text
users
  id uuid primary key
  email text unique not null
  first_name text
  last_name text
  language text
  created_at timestamptz
  updated_at timestamptz
```

### `institutions`

Protected institutional workspace and brand identity.

```text
institutions
  id uuid primary key
  name text not null
  slug text unique not null
  institution_type text not null
  legal_name text
  brand_name text
  website_url text
  logo_url text
  created_by uuid references users(id)
  created_at timestamptz
  updated_at timestamptz
```

Important constraints:

- `name` should be unique enough to protect institutional identity.
- `slug` must be unique.
- If trademark/legal verification is introduced later, add `verification_status`, `verified_at`, and `verified_by`.

Recommended `institution_type` values:

```text
independent
private_school
public_school
higher_education
tutoring_center
training_provider
nonprofit
company
other
```

### `institution_memberships`

Role assignment within an institution.

```text
institution_memberships
  id uuid primary key
  institution_id uuid references institutions(id)
  user_id uuid references users(id)
  role text not null
  status text not null
  invited_by uuid references users(id)
  joined_at timestamptz
  created_at timestamptz
  updated_at timestamptz
```

Recommended role values:

```text
owner
admin
teacher
student
```

Recommended status values:

```text
invited
active
suspended
left
removed
```

Required unique constraint:

```text
unique (institution_id, user_id, role)
```

This allows the same user to be both admin and teacher in the same independent institution without creating a second account.

### `institution_invites`

Pending invite records anchored by email.

```text
institution_invites
  id uuid primary key
  institution_id uuid references institutions(id)
  email text not null
  role text not null
  token_hash text unique not null
  invited_by uuid references users(id)
  status text not null
  expires_at timestamptz not null
  accepted_by uuid references users(id)
  accepted_at timestamptz
  created_at timestamptz
  updated_at timestamptz
```

Recommended status values:

```text
pending
accepted
expired
revoked
```

Important behavior:

- If the invited email already belongs to a Neptino user, do not create a new account.
- If the invited email has no account, keep the invite pending until signup.
- For privacy, the admin UI should not reveal whether the email already has a Neptino account.

### `programs`

Programs are larger arcs offered by institutions and composed of courses.

```text
programs
  id uuid primary key
  institution_id uuid references institutions(id)
  name text not null
  description text
  duration_label text
  created_by uuid references users(id)
  created_at timestamptz
  updated_at timestamptz
```

### `program_courses`

Connect courses into a program sequence.

```text
program_courses
  id uuid primary key
  program_id uuid references programs(id)
  course_id uuid references courses(id)
  sequence_index integer not null
  required boolean not null default true
```

### `courses`

Courses should eventually reference `institution_id` directly.

Current course rows store `institution` as text. That can remain temporarily for compatibility, but the target shape is:

```text
courses
  institution_id uuid references institutions(id)
  teacher_id uuid references users(id)
```

Recommended transition:

- Add `institution_id` nullable first.
- Backfill from `courses.institution` where possible.
- Update new course creation to set both `institution_id` and legacy `institution`.
- Later make `institution_id` required.
- Later remove or demote legacy `institution` text.

## Signup UX

### Public Signup Entry

Replace the role picker with intent cards.

```text
Create your account

[ Learn independently ]
For adult learners and private students joining courses from teachers.

[ Teach independently ]
For independent teachers and tutors.

[ Set up a school or organization ]
For schools, academies, universities, and organizations.
```

Recommended state values:

```text
signup_intent = learn_independently | join_course | create_courses | setup_institution
```

`join_course` should normally be set by a course link, invitation, or course code flow. Direct public signup should show `learn_independently`, not imply that every student must already belong to an institution.

### Join A Course

Best entry points:

- `/join/[courseId]`
- invite token
- course code

Flow:

```text
Open join link
  -> Sign in or create account
  -> Ensure profile exists
  -> Ensure institution student membership exists
  -> Create course enrollment
  -> Redirect to student course page
```

### Create Courses

For independent teachers and tutors.

Flow:

```text
Create account
  -> Ask for teaching name or organization name
  -> Create institution with type = independent
  -> Add memberships: owner, admin, teacher
  -> Redirect to teacher dashboard or course builder
```

Default institution naming:

```text
{First name} {Last name} Studio
```

Allow the user to rename it immediately.

### Set Up An Institution

For formal schools and organizations.

Flow:

```text
Create account
  -> Ask for institution name and type
  -> Create institution
  -> Add memberships: owner, admin
  -> Redirect to admin onboarding
```

Admin onboarding should then offer:

- Invite teachers.
- Invite admins.
- Configure brand.
- Configure institution virtues/defaults.
- Create first program or course.

## Login And Routing

Login should no longer route only from `users.role`.

Recommended routing:

```text
Sign in
  -> Load active institution context
  -> Load memberships
  -> If next path exists, continue
  -> If one active membership, route by membership role
  -> If multiple memberships/institutions, show context switcher
```

Role priority for initial dashboard:

```text
owner/admin -> /admin
teacher -> /teacher
student -> /student
```

If a user has multiple roles in the same institution, choose the highest operational role by default, but keep a role/institution switcher available.

## Institution Switcher

Add a workspace-style switcher to authenticated layouts.

It should show:

- Current institution name.
- Current role or roles.
- Other institutions the user belongs to.
- Quick actions based on role.

Example:

```text
Alex Independent Studio
Admin, Teacher

Switch to:
- Example School, Teacher
- Professional Development Program, Student
```

The active institution should be stored in one of:

- Server-readable cookie.
- User preference table.
- URL segment in future multi-tenant routing.

Recommended first version:

```text
active_institution_id cookie
```

## Invitation Rules

### Admin Invites Teacher

```text
Admin enters email
  -> Create institution_invites row
  -> Send email
  -> Do not disclose whether account exists
```

If user exists:

```text
Teacher signs in
  -> Accepts invite
  -> Create active membership
```

If user does not exist:

```text
Teacher opens invite
  -> Creates account
  -> Accepts invite
  -> Create active membership
```

### Preventing Duplicate Accounts

Rules:

- Admins cannot manually create `users` rows for teachers or students.
- Admins invite by email.
- Signup checks pending invites for the signing-up email.
- Accepting an invite attaches membership to the authenticated user.
- Email uniqueness on `users.email` remains important.

Edge cases:

| Case | Required behavior |
|---|---|
| Same email already exists | Attach new membership to existing account. |
| Same person has personal and school emails | Provide account-linking later; do not auto-merge without verification. |
| Admin imports roster | Create pending invites or course-scoped roster entries, not fake global users. |
| Student later becomes teacher | Add teacher membership; do not overwrite their student history. |
| Teacher leaves institution | Mark membership `left` or `removed`; preserve course audit history. |

## Authorization Direction

Short-term compatibility may still check `users.role`, but new code should check membership.

Recommended helper:

```text
requireInstitutionRole(user_id, institution_id, allowed_roles)
```

Examples:

| Action | Required membership |
|---|---|
| Manage institution settings | owner or admin |
| Invite teachers | owner or admin |
| Create institution course | owner, admin, or teacher |
| Edit own course | teacher assigned to course, or institution admin |
| View student course | active student membership plus active enrollment |
| Manage Atlas repository | teacher/admin membership in active institution, later more granular |

RLS policies should move toward membership checks instead of global role checks.

## Backend Implementation Plan

### Phase 1: Add New Tables Without Breaking Current Flows

Create a migration for:

- `institutions`
- `institution_memberships`
- `institution_invites`
- `programs`
- `program_courses`
- `courses.institution_id`

Do not remove `users.role` or `users.institution` yet.

Backfill:

- Create an `Independent` institution for existing independent users where needed.
- Create institution rows for distinct existing `users.institution` values.
- Add membership rows based on existing `users.role`.
- Backfill `courses.institution_id` from `courses.institution`.

### Phase 2: Add Server Helpers

Add backend functions/helpers:

- `ensure_user_profile`
- `ensure_independent_institution`
- `create_institution_for_signup`
- `create_institution_invite`
- `accept_institution_invite`
- `get_user_memberships`
- `resolve_active_institution`

Update the existing `ensure_user_profile` RPC so it no longer forces `institution = 'Independent'` as the primary model. It can still populate legacy fields during transition.

### Phase 3: Update Signup

Replace the role selector with the intent selector.

Frontend files likely affected:

- `src/app/signup/page.tsx`
- `src/app/login/page.tsx`
- `src/components/ui/auth-primitives.tsx` if new reusable controls are needed.

New signup should submit:

```text
first_name
last_name
email
password
signup_intent
institution_name when needed
institution_type when needed
invite_token when present
next path when present
```

### Phase 4: Update Login Routing

Update login to route from memberships, not only `users.role`.

If multiple memberships exist, redirect to a context selection page:

```text
/select-institution
```

If only one membership exists, set active institution and route by membership role.

### Phase 5: Update Course Creation

Course creation should use active institution context.

Expected behavior:

- Teacher creates course under current institution.
- Independent teacher creates under their independent institution.
- Institution admin can create or assign courses depending on policy.
- Course rows store both `institution_id` and legacy `institution` text during transition.

### Phase 6: Admin Institution Management

Admin area should become institution-scoped.

Priority screens:

- Institution profile and branding.
- Invite users.
- Manage members.
- Programs.
- Courses.
- Institution virtues/defaults.

Existing admin pages with placeholder data should be converted to real institution-scoped data.

## Frontend Implementation Plan

### Signup Page

Replace:

```text
I am a: Student | Teacher | Admin
```

With:

```text
What would you like to do?

Join a course
Create courses
Set up an institution
```

The selected intent controls which additional fields appear.

For `Join a course`:

- Show this as an invite/course-link continuation state, not as the default public signup CTA.
- No institution name field.
- Invite/course link should supply context when possible.

For `Learn independently`:

- No institution name field.
- Create a learner account with no institution membership.
- Route to the student dashboard with an empty state for entering a course code or opening an invitation link.

For `Create courses`:

- Ask for display/organization name.
- Default to independent institution.

For `Set up an institution`:

- Ask for institution name.
- Ask for institution type.

### Auth Success Screens

Success copy should avoid role language.

Use:

```text
Check your email to finish setting up your account.
```

Then after confirmation/sign-in, resolve membership or intent.

### Context Selection

Add a page for users with multiple active memberships.

```text
Choose where to work

Alex Independent Studio
Admin, Teacher

Example School
Teacher
```

### Dashboard Shells

Authenticated shells should show:

- Active institution.
- Current role.
- Switch institution action when multiple contexts exist.

This prevents the user from wondering whether they are acting as independent teacher, school teacher, student, or admin.

## Database Migration Notes

Use `npx supabase migration new <name>` before creating the migration file.

Do not edit already-applied migrations.

RLS requirements:

- Enable RLS on all new public tables.
- Membership tables must only expose rows the current user is allowed to see.
- Invitation token hashes should not be readable through public client queries.
- Use server route handlers or RPC for invite acceptance.

Avoid using user-editable metadata for authorization. Do not authorize from Supabase `raw_user_meta_data`.

## Transitional Compatibility

Some existing code checks:

```text
users.role in ('teacher', 'admin')
users.institution
```

During migration, keep compatibility by:

- Maintaining `users.role` as the user's highest/default role.
- Maintaining `users.institution` as the active/default institution name.
- Updating new code to use `institution_memberships`.
- Gradually replacing old checks with membership checks.

Recommended compatibility mapping:

| Memberships | Legacy `users.role` |
|---|---|
| any owner/admin | admin |
| teacher only | teacher |
| student only | student |

This is temporary and should be documented as deprecated.

## Testing Requirements

### Unit Tests

Add tests for:

- Signup intent to membership mapping.
- Invite acceptance for existing users.
- Invite acceptance for new users.
- Active institution resolution.
- Legacy role compatibility mapping.

### E2E Tests

Add Playwright coverage for:

1. Independent teacher signs up through `Create courses`.
2. Independent teacher receives an independent institution with admin and teacher memberships.
3. School admin signs up through `Set up an institution`.
4. School admin invites an existing independent teacher.
5. Existing teacher accepts invite and now has two institutions.
6. Teacher switches between independent institution and school institution.
7. Student joins a course through `/join/[courseId]` without selecting a global role.

## Product Language

Use "school or organization" in first-run UI where possible. Use "institution" in admin and settings contexts once the user understands the product structure.

Recommended labels:

| Backend term | Public/user-facing term |
|---|---|
| institution | school or organization |
| independent institution | independent teaching workspace |
| membership | access |
| role | responsibility or access level |
| invite | invitation |

## Open Decisions

- Should institution names be globally unique, or should only slugs be globally unique while names can collide with verification warnings?
- Should independent teachers always get `owner`, `admin`, and `teacher`, or only `owner` and `teacher` with owner implying admin?
- Should students have institution memberships immediately, or only course enrollments until an institution formally admits them?
- Should programs be implemented in the same migration as institutions, or follow immediately after?
- Should active institution be stored in a cookie, user preference table, or future URL path?

## Recommended First Build Slice

The first implementation should be narrow and high-impact:

1. Add `institutions`, `institution_memberships`, and `institution_invites`.
2. Add `courses.institution_id`.
3. Backfill existing users and courses.
4. Replace signup role picker with intent picker.
5. Create independent institution automatically for `Create courses`.
6. Route login through memberships.
7. Add a minimal institution switcher.

This creates the foundation for institutional Neptino without forcing the entire app to migrate at once.

# Known Gaps / Missing Data

Issues identified during E2E test authoring for the Course Creation Flow.

---

## [GAP-1] URL not updated after course creation

When a new course is created the page keeps the URL as `/teacher/coursebuilder` (no `?id=`) so a browser refresh loses the course ID entirely. The URL should call `window.history.replaceState` to add `?id=<courseId>` inside `handleCourseCreated`.

---

## [GAP-2] `students_overview` initial value is incomplete

`insertCourseReturningId` sends `{ total: 0, synced: 0 }` but `StudentsSection.onLoaded` expects `{ method, students }`. On first load the roster is empty even though the JSONB row exists.

**Fix:** seed `{ total: 0, synced: 0, method: "upload", students: [] }`.

---

## [GAP-3] `teacher_name` not a first-class column

The teacher's display name is stored only inside JSONB `generation_settings.teacher_name`. This makes server-side queries (e.g., listing all courses with teacher name) require a JSONB operator, breaking indexing.

**Fix:** Consider adding a generated column or storing it in a dedicated `text` column.

---

## [GAP-4] `visibility_settings` not set on course creation

A newly created course has `visibility_settings = {}`. The course is therefore not visible / not enrollable by default, and there is no UI indication of this during Essentials setup.

**Fix:** Inject a default `{ visible: false, enrollment: false, … }` on INSERT so the state is explicit rather than implicitly empty.

---

## [GAP-5] `course_subtitle` column added in a late migration

The column was introduced in `20260202000000_add_course_subtitle_column.sql`. Any Supabase project that skipped or rolled back that migration will reject the INSERT/UPDATE with an "unknown column" error. The column should be covered by the base schema migration.

---

## [GAP-6] `course_type` CHECK constraint not validated client-side

The DB enforces `CHECK (course_type IN ('In-person','Online','Hybrid'))`. The UI only offers those three values today but there is no client-side guard against future additions landing before a DB migration.

---

## [GAP-7] `visibility_settings.public_discovery` key name mismatch

`VisibilitySection` reads the DB key as `public_discovery` but writes state into `publicDiscovery`. The load uses `visibility.public_discovery` (correct) and the save uses `public_discovery` (correct). These are consistent, but the React state name differs from the DB key — minor confusion risk.

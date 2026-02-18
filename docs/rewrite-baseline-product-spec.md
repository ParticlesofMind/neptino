# Neptino Rewrite Baseline Product Spec (Current-App Contract)

Date: 2026-02-18  
Scope: what the current app already does, what must survive a rewrite, and what is optional/deferable.

## 1) Product Purpose

Neptino is a role-based learning platform with:
- Public marketing + auth entry points.
- Role dashboards (student, teacher, admin).
- A teacher course-creation system (Course Builder) with a PIXI.js v8 canvas engine.
- Integrated messaging via Rocket.Chat + Supabase auth.
- Discovery surfaces: Encyclopedia and Marketplace.

This document is the **functional contract** to preserve during teardown/rebuild.

---

## 2) Personas and Role Boundaries

### Student
- Access student dashboard + enrolled-course views.
- Use in-app messaging (Rocket.Chat embed).
- See progress surface.

### Teacher
- Access teacher dashboard + messaging.
- Manage teacher courses list.
- Create/edit course content in Course Builder.
- Access teacher encyclopedia and marketplace surfaces.

### Admin
- Access admin dashboard (broader navigation surface + analytics-oriented UI blocks).
- Access messaging.
- Access admin courses/marketplace/tutorials pages.

### Shared behavior
- Sign-in / sign-up with role-aware redirect.
- Sign-out from protected pages returns user to sign-in.

---

## 3) View Inventory (Current Routes)

## Public / Shared
- `/` (landing)
- `/src/pages/shared/signin.html`
- `/src/pages/shared/signup.html`
- `/src/pages/shared/about.html`
- `/src/pages/shared/features.html`
- `/src/pages/shared/pricing.html`
- `/src/pages/shared/students.html`
- `/src/pages/shared/teachers.html`
- `/src/pages/shared/institutions.html`
- `/src/pages/shared/oauth-callback.html`

## Student
- `/src/pages/student/home.html` (tabbed sections: home/classes/messages/settings)
- `/src/pages/student/courses.html`
- `/src/pages/student/marketplace.html`
- `/src/pages/student/tutorials.html`
- `/src/pages/student/progress.html`

## Teacher
- `/src/pages/teacher/home.html` (tabbed sections: home/classes/messages/settings)
- `/src/pages/teacher/courses.html`
- `/src/pages/teacher/coursebuilder.html`
- `/src/pages/teacher/encyclopedia.html`
- `/src/pages/teacher/marketplace.html`
- `/src/pages/teacher/tutorials.html`

## Admin
- `/src/pages/admin/home.html` (multi-section admin shell incl. messages/settings)
- `/src/pages/admin/courses.html`
- `/src/pages/admin/marketplace.html`
- `/src/pages/admin/tutorials.html`

## Technical/demo pages
- `/src/pages/ml-demo.html`
- `/src/pages/oauth-test.html`

---

## 4) Core Functional Areas

## A) Authentication & Session (Supabase)
Current behavior:
- Email/password sign-up and sign-in.
- User metadata includes role (`student|teacher|admin`), first/last/full name.
- Role-based redirect after successful login.
- Route guard behavior for protected pages.
- Sign-out clears session and redirects protected pages to sign-in.
- Email verification resend path exists for unconfirmed users.

Must preserve:
- Role redirect contract.
- Protected-route gate.
- Session persistence.

## B) Dashboard Navigation Model
Current behavior:
- Dashboard pages use section-based in-page navigation (`data-section`, `is-active`).
- Exactly one section visible at a time.
- Active link states update with section changes.

Must preserve:
- Single-active-section behavior on dashboards.
- Role-specific nav items.

## C) Messaging (Rocket.Chat Integration)
Current behavior:
- Messaging section mounts Rocket.Chat iframe.
- Search users by email from messaging UI.
- Start direct conversations from search results.
- Uses credentials from `user_integrations` or admin fallback.
- Displays setup/error state when Rocket.Chat is unavailable.

Must preserve:
- Embedded messaging UX inside role dashboards.
- Search + start-conversation flow.
- Resilient error/setup fallback.

## D) Teacher Courses Surface
Current behavior:
- Teacher courses page loads user courses from Supabase.
- Dynamic course cards with status + statistics.
- Card actions route into Course Builder sections (setup/create/preview/launch).

Must preserve:
- Teacher course list retrieval.
- Card-based entry into Course Builder with `courseId` context.

## E) Course Builder (High-Criticality)
Current behavior:
- Multi-section setup flow (essentials, classification, students, pedagogy, templates, schedule, curriculum, generation, publishing, engine/settings sections).
- Course creation + update to `courses` table.
- Course image upload/update.
- Context/fingerprint synchronization service.
- Curriculum managers + optional AI curriculum generation.
- PIXI.js v8 canvas engine with viewport, tools, zoom, keyboard shortcuts.
- Multi-canvas management and global APIs (e.g., `window.canvasAPI`, `window.multiCanvasManager`).

Must preserve:
- Existing course setup data model.
- Canvas engine capabilities used by tests (init, API availability, viewport/zoom controls).
- `courseId` continuity across URL/session and managers.

## F) Encyclopedia (Teacher)
Current behavior:
- Supabase-backed paginated list (`PAGE_SIZE=24`) + filters + full-text search.
- Manifest-driven UI options/counts loaded from static JSON.
- Detail panel route handling and on-demand item fetch.
- Optional media fetch and optional Wikidata enrichment paths.

Must preserve:
- Paginated/filterable browsing model.
- Manifest + server-query split (no full dataset download on init).

## G) Marketplace
Current behavior:
- Marketplace browser logic exists (`src/scripts/marketplace.ts`) with search/filter/view modes.
- Current teacher/student/admin marketplace pages are mostly shell-level and can be expanded.

Must preserve:
- Marketplace as a first-class route for each role.

## H) Public Marketing/Landing
Current behavior:
- Landing page with navigation + auth CTA + animated preview module.
- Shared static marketing pages.

Must preserve:
- Public marketing funnel and auth entry points.

## I) OAuth/OIDC Support
Current behavior:
- Local OAuth helper/server paths for Rocket.Chat-style OIDC bridging.
- Callback parsing + token exchange helpers.

Must preserve (minimum):
- Ability to authenticate external messaging/OAuth flow from logged-in Neptino users.

---

## 5) Data/Integration Contract (Observed)

Primary backend: Supabase.
- Auth: Supabase Auth session + metadata.
- Tables referenced by code:
  - `users`
  - `courses`
  - `user_integrations`
  - `encyclopedia_items`
  - `encyclopedia_media`
  - `templates` (via glossary/template test utility)
- Storage usage: course image upload flow.

Messaging backend: Rocket.Chat.
- User provisioning + token paths.
- Iframe embed URLs with auth token/userId semantics.

ML integration:
- On-device model manager + curriculum generation support paths.

---

## 6) UX/Behavior Requirements to Carry Forward

Critical interaction contracts:
- Login redirects by role.
- Sign-out from protected area returns to sign-in.
- Dashboard section toggles keep one visible section.
- Messages tab loads embedded chat and supports user search + DM start.
- Teacher can open a course and land in targeted Course Builder section.
- Course Builder canvas loads reliably and exposes expected runtime APIs.
- Encyclopedia supports search + filters + pagination without loading all rows.

---

## 7) Quality/Validation Contract (from existing tests)

Existing Playwright coverage indicates rewrite parity targets:
- Multi-role auth redirect behavior.
- Dashboard section nav behavior + active states.
- Messaging section + Rocket.Chat iframe/auth parameter expectations.
- Course Builder canvas initialization:
  - canvas container exists
  - `window.canvasAPI` exists
  - `window.multiCanvasManager` exists
  - PIXI app exists
  - zoom controls present

These should become non-regression acceptance checks in the rewritten app.

---

## 8) Suggested Rewrite Scope Buckets

## P0 (must ship for parity)
- Auth + role redirects + protected routes.
- Student/Teacher/Admin dashboard shells with section navigation.
- Messaging integration in dashboards.
- Teacher courses list + open-in-coursebuilder flow.
- Course Builder core setup + canvas runtime + persistence.
- Teacher encyclopedia search/filter/pagination.

## P1 (near-term after parity)
- Marketplace full data-backed experience across roles.
- Admin advanced dashboard modules beyond core home/classes/messages/settings parity.
- OAuth polish + expanded external integrations UX.

## P2 (optional / later)
- ML demo page parity.
- Additional static marketing refinements.

---

## 9) Decommission Checklist (Before tearing down old app)

Do not remove old stack until all are true:
1. Role auth + redirect behavior passes.
2. Dashboard section navigation behavior passes for all roles.
3. Messaging iframe + user search + conversation start passes.
4. Teacher course cards load and deep-link to builder by `courseId`.
5. Course Builder canvas/tests pass.
6. Encyclopedia list/search/filter/pagination parity validated.
7. Sign-out + protected route guards pass.

---

## 10) Notes on Current State

- Some pages are mature feature surfaces (Course Builder, Encyclopedia, auth, messaging).
- Some role pages are currently shell-like placeholders and may not require full parity depth immediately.
- This spec intentionally focuses on **observed behavior in code/tests** as rewrite-safe baseline.

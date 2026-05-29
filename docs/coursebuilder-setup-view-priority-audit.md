# Coursebuilder Setup Data And View Priority Audit

Date: 2026-05-25

## Purpose

Coursebuilder setup should equip an admin or teacher with enough structured information for Neptino AI to generate useful course counsel and draft most course content without erasing the teacher's intellectual role.

The setup system should therefore balance:

- high-quality human intent capture
- efficient Supabase persistence and retrieval
- source, attribution, and progression discipline
- AI readiness gates before generation
- later student progress review and correction loops

## Supabase Persistence Summary

The current setup architecture is mostly efficient and coherent. Setup data is stored on `public.courses` in column-scoped JSONB fields, while lesson canvas state is normalized into `public.lessons`.

Current persistence map:

| Setup view | Supabase target | Current status |
| --- | --- | --- |
| Essentials | `courses.course_name`, `course_subtitle`, `course_description`, `course_language`, `course_type`, `course_image`, `teacher_id`, `institution_id`, `institution`, `generation_settings` | Persisted |
| Students | `courses.students_overview` | Persisted as aggregate roster snapshot |
| Schedule | `courses.schedule_settings` | Persisted |
| Curriculum | `courses.curriculum_data`, `courses.generation_settings.ai_generation` | Persisted |
| Classification | `courses.classification_data` | Persisted |
| Pedagogy | `courses.course_layout.pedagogy` | Persisted |
| Templates | `courses.template_settings`, sometimes `courses.curriculum_data` | Persisted |
| Visibility | `courses.visibility_settings` | Persisted |
| Marketplace | `courses.marketplace_settings` | Persisted |
| Pricing And Monetization | `courses.pricing_settings` | Persisted |
| External Integrations | `courses.integration_settings` | Persisted |
| Communication | `courses.communication_settings` | Persisted |
| Page Setup | `courses.generation_settings` page fields | Persisted |
| Interface | `courses.course_layout.visualDensity`, `course_layout.bodyBlockGap` | Persisted |
| Resources | `courses.generation_settings.resources_preferences` | Persisted |
| AI Model | `courses.generation_settings.selected_llm_model` | Persisted |
| Context | Read-only aggregate from `courses` plus realtime course update subscription | Persisted elsewhere; view is diagnostic |
| Advanced Settings | Deletes `courses` row | Persisted destructive action |
| Themes | None | Unfinished placeholder |
| Accessibility | None | Unfinished placeholder |
| Notifications | None | Unfinished placeholder |
| Data Management | None | Important unfinished placeholder |

Efficiency notes:

- Section loaders generally use narrow `select` strings instead of loading the whole course row.
- Most setup writes are debounced, which avoids sending a Supabase update on every keystroke.
- The primary remaining structural risk is whole-JSONB-column overwrite when two controls edit the same JSONB column at the same time. This is acceptable for single-user course setup, but it should be revisited for collaborative editing.
- The setup system should avoid reintroducing the dropped `templates` table for per-course template settings; current migrations document `courses.template_settings` as the canonical location.
- Supabase changelog checked on 2026-05-25: the 2026 Data API exposure change matters for new tables, but this audit keeps the existing `public.courses` JSONB model and adds no new table.

## Recommended AI Readiness Gate

Neptino AI should treat a course as generation-ready only when the highest-signal setup sections are complete enough to show real teacher intent:

Required now:

1. Essentials
2. Classification
3. Students
4. Schedule
5. Curriculum
6. Resources
7. Pedagogy

Strongly recommended before full generation:

1. Templates
2. Page Setup
3. AI Model
4. Data Management, once implemented

The current generation lock mainly checks Essentials, Students, Schedule, and Curriculum. Classification, Resources, and Pedagogy are already loaded into generation context and should become part of the stricter readiness model when the product is ready for more opinionated gating.

## Priority Ranking

### 1. Essentials

Most important. This establishes the course identity, language, teacher, institution, title, type, and description. Without this, every downstream AI decision is underdetermined.

Completion standard: title, description, language, course type, teacher identity, and institution context should be present.

### 2. Classification

Critical for intellectual specificity. Domain, subject, topic, class year, prior knowledge, key terms, mandatory topics, and application context are the strongest course-level signals for expert-level generation.

Completion standard: class year, domain, subject, topic, prior knowledge, key terms, and mandatory topics should be considered.

Important follow-up: broad education context should not be modeled as a course-level framework dropdown. Use a future Education Context / Program Context model instead. See [Coursebuilder Master Todo](./coursebuilder-master-todo.md).

### 3. Curriculum

Critical for turning intent into an ordered course structure. This view controls modules, sessions, topic/objective/task density, sequencing, naming rules, and generated curriculum rows.

Completion standard: session count, module organization, content volume, topics/objectives/tasks, sequencing, naming rules, and session rows should be configured.

### 4. Schedule

Critical because course pacing is a cybernetic constraint. It determines available time, rhythm, breaks, repeat patterns, and session count.

Completion standard: generated entries should exist, with dates and times when known.

### 5. Students

Critical for adaptation. Class size, roster method, and eventually learner profiles determine level, pacing, remediation, testing, and feedback loops.

Completion standard: at least one student or a reliable class-size estimate should be present. Later versions should distinguish real roster records from aggregate planning assumptions.

### 6. Resources

High importance because source preferences influence attribution quality, copyright safety, and knowledge grounding. This directly supports error reduction and source discipline.

Completion standard: preferred open sources should be ranked or accepted explicitly.

### 7. Data Management - important, unfinished

High importance and currently unfinished. This should become the system's control surface for attribution policy, source retention, copyright constraints, student progress data retention, export rules, and auditability.

Recommended future scope:

- source and license policy
- citation and attribution strictness
- generated-content provenance
- student progress telemetry categories
- retention and deletion rules
- export/import controls
- AI training and reuse consent boundaries

### 8. Pedagogy

High importance. The pedagogical coordinate plane gives the AI a teaching stance: teacher role, student role, assessment style, environment, and activity pattern.

Completion standard: explicit position on the pedagogy plane, with derived approach available to generation.

### 9. Templates

High importance for content shape. Templates translate curriculum intentions into repeated lesson, quiz, assessment, certificate, and exam structures.

Completion standard: active template type and template configuration should match the intended delivery style.

### 10. Page Setup

Medium-high importance. This controls canvas dimensions, orientation, page count, margins, and print behavior. It matters for layout correctness and export quality, but less for intellectual substance.

Completion standard: page size, orientation, page count, margins, and print options should be selected.

### 11. AI Model

Medium-high importance. Model selection affects quality, latency, and local compute feasibility. It should not drive course design, but it strongly affects generation reliability.

Completion standard: selected model should be compatible with expected course size and hardware.

### 12. Context

Medium importance as a diagnostic view. It is not a setup input, but it is valuable because it shows what Neptino believes it knows.

Completion standard: should accurately report missing generation-critical fields.

### 13. Interface

Medium importance. Visual density and block spacing affect authoring ergonomics and rendered lesson pages.

Completion standard: density and block gap should match the teacher's delivery medium.

### 14. Visibility

Medium importance. Required for launch and enrollment, but not usually needed for AI curriculum generation.

Completion standard: visibility, enrollment, approval, notifications, and discovery settings should be explicit before launch.

### 15. Communication

Medium importance. Welcome messages, announcements, digest settings, and office hours matter for delivery but not initial content generation.

Completion standard: communication defaults should be present before enrollment opens.

### 16. Pricing And Monetization

Medium-low importance. Important for marketplace courses, irrelevant for private or institutional courses.

Completion standard: pricing model, currency, trial, and discount notes should be set for paid offerings.

### 17. Marketplace

Medium-low importance. Useful for public distribution, less relevant to course intelligence.

Completion standard: listing status, audience, revenue share, and channels should be set before publication.

### 18. External Integrations

Low-medium importance. Operationally useful when the course must connect to another LMS, API, or webhook.

Completion standard: provider, API access, webhook, and notes should be configured only when integration is required.

### 19. Accessibility

Low currently because it is unfinished, but strategically important. It should eventually affect generated media alternatives, reading level, keyboard support, assessment accommodations, and export constraints.

Completion standard: not available yet.

### 20. Notifications

Low currently because it is unfinished. It belongs closer to delivery operations than course intelligence.

Completion standard: not available yet.

### 21. Themes

Low currently because it is unfinished and mostly aesthetic. It can matter for branding and learner motivation, but should not outrank curriculum quality.

Completion standard: not available yet.

### 22. Advanced Settings

Lowest for setup intelligence. It is necessary for destructive administration, not course planning.

Completion standard: none. This view should remain guarded and minimal.

## Product Direction

The strongest version of coursebuilder setup is not total automation. It is a structured feedback system where the teacher supplies meaningful constraints, Neptino classifies and synthesizes those constraints, and AI generation operates only when the input state is coherent enough to reduce workload without flattening teacher expertise.

The next major product step should be implementing Data Management and tightening the AI readiness gate to include Classification, Resources, and Pedagogy.

Implement these next, in this order:

Data Management view
This is the most important missing piece. It should define source/licensing rules, citation strictness, attribution retention, generated-content provenance, student telemetry retention, export/delete controls, and AI reuse consent. This directly supports your goals around copyright safety, auditability, and long-term progress review.

Stricter AI readiness gate
Current generation readiness mainly checks Essentials, Students, Schedule, and Curriculum. Add Classification, Resources, and Pedagogy to the readiness model before full generation. The AI should not generate serious course content until those sections have meaningful values.

Setup quality scoring
Completion should not mean “field exists.” Add quality checks: non-placeholder descriptions, enough key terms, mandatory topics, meaningful prior knowledge, real schedule entries, explicit source preferences, and pedagogical position. This supports “filled out with intellectual consideration.”

Context view upgrade
Turn Context from a diagnostic JSON snapshot into a “Course Intelligence Readiness” panel: missing critical fields, weak fields, strongest AI signals, copyright/source coverage, and recommended next action.

Student profile model
Students currently persist mostly as an aggregate snapshot. For long-term progress review and adaptive generation, you eventually need richer structured learner data: level, accommodations, goals, diagnostic baseline, progress events, corrections, and assessment history.

Source and attribution pipeline
Resources should not just rank preferred sources. Generation should carry source policy into output: required source types, citation format, attribution metadata, license warnings, and generated-content provenance.

The best first implementation is Data Management + stricter readiness gate. That gives the setup system a real control layer and immediately improves the quality/safety threshold before Neptino AI generates content.

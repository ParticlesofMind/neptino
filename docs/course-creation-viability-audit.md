# Course Creation Viability Audit

Audit date: 2026-05-24
Candidate course: **Shakespeare in Love: Literature, Film, and Elizabethan Theatre**
Environment: local Next.js app at `http://localhost:3000` with local Supabase

## Status Legend

- [x] Verified with Playwright in this audit.
- [ ] Not working, incomplete, blocked, or not verified enough to trust.

## Playwright Evidence

- [x] Focused Playwright browser audit passed: teacher created a temporary Shakespeare-themed course through the UI, enabled visibility and enrollment, opened Launch, generated a join link, signed in as a temporary student, joined through `/join/[courseId]`, and verified the Launch roster updated to `1 active student`.
- [x] Focused Playwright browser audit passed: the Make panel can create a Text block and show it in the Make library when selected by accessible button name.
- [x] `npm run test:e2e -- e2e/course-curriculum-typing-regression.spec.ts` passed. Curriculum manual naming persists to Supabase and rehydrates.
- [x] Section settings smoke audit passed for Schedule, Resources, Marketplace, Pricing, External Integrations, Communication, and Page Setup persistence.
- [ ] `npm run test:e2e -- e2e/course-setup-backend.spec.ts` failed at Templates because `public.templates` is missing from the local schema.
- [ ] `npm run test:e2e -- e2e/make-resources-creation.spec.ts` timed out because the spec expects `data-testid="make-filter-library"`, but the current Library button does not expose that test id. The UI is usable by role/name, so this is at least a test drift problem.
- [ ] `npm run test:e2e -- e2e/canvas-zoom-resize-regression.spec.ts` had 1 passing test and 1 failing test. The failing assertion expected the files panel to grow beyond `360px`, but the current panel is already capped at `360px`, so the regression test is stale or the max-width behavior changed.
- [ ] Atlas search for `Shakespeare` returned `0 entity entries` in local data.

## Full Course Creation Checklist

### 1. Teacher Entry And Course Shell

- [x] Teacher can sign in through `/login`.
- [x] Teacher can open `/teacher/coursebuilder`.
- [x] Teacher can enter course title.
- [x] Teacher can enter course subtitle.
- [x] Teacher can enter course description.
- [x] Teacher can select course language.
- [x] Teacher can select course type.
- [x] Teacher is auto-populated from auth user metadata.
- [x] Institution is auto-populated or defaults to `Independent`.
- [x] `Create Course` inserts a `courses` row.
- [x] `course_name`, `course_subtitle`, `course_description`, `course_language`, `course_type`, `teacher_id`, `institution`, and `generation_settings.teacher_name` persist.
- [ ] The URL still does not reliably become `/teacher/coursebuilder?id=<courseId>` immediately after creation, so refresh can lose the active course.
- [ ] New-course defaults are incomplete: `students_overview` starts as `{ total: 0, synced: 0 }` instead of also including `method` and `students`, and `visibility_settings` starts as `{}` instead of explicit booleans.
- [ ] Course image upload/crop exists in UI, but was not verified in this audit.

### 2. Course Classification

- [x] Teacher can select Class Year.
- [x] Teacher can select Curricular Framework.
- [x] Teacher can select ISCED Domain.
- [x] Teacher can select ISCED Subject.
- [x] Teacher can select ISCED Topic.
- [x] Teacher can select ISCED Subtopic.
- [x] Teacher can enter Previous Course.
- [x] Teacher can enter Next Course.
- [x] Teacher can enter prior knowledge.
- [x] Teacher can add key terms.
- [x] Teacher can add mandatory topics.
- [x] Teacher can enter application context.
- [x] Classification persists into `courses.classification_data`.
- [ ] Shakespeare-specific classification was not end-to-end verified because local Atlas has no Shakespeare data. Recommended classification path is `02 - Arts and humanities` -> `023 - Languages` -> `0232 - Literature and linguistics`, with cross-links to `0215 - Music and performing arts` and `0222 - History and archaeology`.

### 3. Student Roster Setup

- [x] Teacher can switch to Manual Entry.
- [x] Teacher can add a single student with first name, last name, and email.
- [x] Learning style preference persists.
- [x] Learning differences and accommodations persist.
- [x] Bulk CSV-style entry persists.
- [x] Roster data persists into `courses.students_overview`.
- [ ] Upload Roster opens a file picker, but the component does not currently parse or persist uploaded files.

### 4. Pedagogy

- [x] Teacher can choose a pedagogy preset.
- [x] Pedagogy coordinates persist into `courses.course_layout.pedagogy`.
- [ ] Dragging the pedagogy coordinate manually was not verified in this audit.

### 5. Templates

- [x] The Templates UI renders and can create a local template definition in `courses.template_settings`.
- [ ] Template library persistence is broken: `upsertTemplateRecord()` still writes to `public.templates`, but migration `20260301110000_drop_unused_canvas_tables.sql` drops `public.templates`.
- [ ] Existing E2E helpers still query `public.templates`, so template tests are out of sync with the consolidated `courses.template_settings` model.
- [ ] Applying templates to generated curriculum needs a fresh Playwright test that does not depend on `public.templates`.

### 6. Schedule

- [x] Teacher can set start date and end date.
- [x] Teacher can select active weekdays.
- [x] Teacher can generate schedule entries.
- [x] Generated entries persist into `courses.schedule_settings.generated_entries`.
- [ ] Repeat unit, repeat interval, cycles, sessions per day, times, and breaks have intended coverage in `course-setup-backend.spec.ts`, but that path did not execute in this audit because the Templates step failed first.
- [ ] Calendar edge cases were not verified: holidays, timezone rollover, invalid date ranges, and deleted generated entries after reload.

### 7. Curriculum Structure

- [x] Teacher can choose custom modules.
- [x] Teacher can set module count.
- [x] Teacher can set topics per lesson.
- [x] Teacher can set objectives per topic.
- [x] Teacher can set tasks per objective.
- [x] Teacher can set sequencing mode.
- [x] Teacher can set course type.
- [x] Teacher can set certificate mode.
- [x] Teacher can manually name modules, topics, objectives, and tasks.
- [x] Manual names persist into `courses.curriculum_data.session_rows`.
- [x] Manual names rehydrate after reload.
- [ ] Full AI generation was not verified because it depends on local Ollama/model readiness.
- [ ] Curriculum readiness and Context completeness need a scenario using real Shakespeare classification, students, schedule, pedagogy, and Atlas data.

### 8. Atlas And Content Classification

- [x] Atlas sidebar loads from `/api/atlas/sidebar`.
- [x] Atlas sidebar can search.
- [x] Atlas sidebar can switch between Entities and Media.
- [x] Teacher Atlas page can browse and filter existing encyclopedia data.
- [ ] Local Atlas has no Shakespeare entries; search for `Shakespeare` returned `0 entity entries`.
- [ ] Course builder Atlas sidebar is read/browse oriented. No course-builder flow was found for creating, importing, or attaching new Atlas entries to the course.
- [ ] Text editor has inline Atlas entity tooling, but persistence from course content into Atlas was not verified.
- [ ] The Shakespeare course cannot yet be meaningfully tested for content classification until Atlas is seeded with course-relevant entities and media.

Recommended Atlas seed set before the real course test:

- [ ] Layer 1 Entities: William Shakespeare, Shakespeare in Love, Romeo and Juliet, Twelfth Night, Elizabeth I, Christopher Marlowe, The Rose Theatre, The Globe Theatre, Lord Chamberlain's Men, Elizabethan theatre, patronage, censorship, iambic pentameter, sonnet, romantic comedy, metatheatre.
- [ ] Layer 2 Media: short text excerpts, portraits, theatre images, film still placeholders or rights-safe links, audio clips, video clips, datasets for character/theme mapping.
- [ ] Layer 3 Products: timeline of Shakespeare/Elizabethan theatre, map of London theatres, diagram of play-within-film structure, profile cards, narrative explainer.
- [ ] Layer 4 Activities: quiz, close-reading exercise, writing prompt, debate/form response, character chat, whiteboard concept map, sorter/matcher for themes and characters.

### 9. Resources Preferences

- [x] Teacher can set source priority.
- [x] Resource priorities persist into `generation_settings.resources_preferences`.
- [ ] The preferences steer prompts/data selection only after generation is run; generation impact was not verified.

### 10. Create View: Curate, Make, Fix

- [x] Create view loads for a course with curriculum/session data.
- [x] Curate mode renders canvas pages.
- [x] Files browser shows built-in resource/activity/experience blocks.
- [x] Atlas panel loads on the right.
- [x] Persistent demo course now has Shakespeare-specific materials placed into `lessons.payload` as dropped cards.
- [x] Create view renders the seeded material cards, including `Viewing Brief: A Film About Making Theatre` and `Elizabethan Theatre District Map`.
- [x] Atlas sidebar now returns local Shakespeare/Marlowe/theatre entries seeded for this demo course.
- [x] Make mode renders the card-type gallery.
- [x] Make mode can create at least a Text block and save it into the Make library.
- [ ] The all-resource Make sweep is not green because the Playwright spec uses a stale Library selector.
- [ ] Drag-and-drop placement was not freshly verified in this audit, though existing create/canvas tests cover parts of it.
- [ ] Fix mode is explicitly a placeholder and says `Coming soon`.

### 11. Interface And Page Setup

- [x] Page Setup can change page size and orientation.
- [x] Page Setup persists into `generation_settings.page_size` and `generation_settings.page_orientation`.
- [ ] Interface section is implemented, but this audit did not verify persistence. Note: it requires an existing `course_layout`; if `course_layout` is null, save can fail.
- [ ] Themes is under construction.
- [ ] Accessibility is under construction.

### 12. Marketplace, Pricing, Integrations, Communication

- [x] Marketplace target audience persists into `marketplace_settings`.
- [x] Pricing model and base price persist into `pricing_settings`.
- [x] External LMS/API settings persist into `integration_settings`.
- [x] Communication welcome message persists into `communication_settings`.
- [ ] Actual marketplace publishing/review workflow was not verified; the UI stores settings only.
- [ ] Real external integration calls/webhooks were not verified.
- [ ] Email/SMS/in-app notification delivery was not verified.

### 13. Visibility, Launch, And Student Sharing

- [x] Teacher can enable `Course visible to students`.
- [x] Teacher can enable `Allow new enrollments`.
- [x] Visibility/enrollment settings persist into `visibility_settings`.
- [x] Launch view generates `/join/[courseId]?source=launch`.
- [x] Launch view shows QR/share link and an `Open join page` link.
- [x] Signed-in student can open join link and enroll.
- [x] Join route creates an active row in `enrollments`.
- [x] Launch roster updates to show the joined student.
- [ ] Launch no longer has the older `Launch Course` checklist/button expected by `course-setup-continued.spec.ts`; tests and docs need updating to the current share-link model.
- [ ] Sign-up-through-join flow was not verified; only existing signed-in student join was tested.
- [ ] Approval-required enrollment was not verified.

### 14. Preview And Student Course Access

- [x] Preview view renders when sessions exist.
- [ ] Preview was tested with the newly authored Shakespeare material pack, but did not show the placed `droppedCards`; it showed program/resources/task structure and Atlas, but not the authored cards visible in Create.
- [ ] Student `/student/courses` post-join course visibility was not verified in this audit.
- [ ] Student lesson delivery, progress, submissions, feedback, and payout workflows were not verified.

### 15. Admin And Cleanup

- [x] Temporary Playwright audit courses and temporary student users were cleaned up.
- [ ] Admin review of courses/marketplace was not verified.
- [ ] Teacher payout/post-session feedback workflow was not found in this audit path and needs separate discovery.

### 16. Shakespeare Material Pack

- [x] Seeded 6 local Atlas entities: William Shakespeare, Shakespeare in Love, Romeo and Juliet, Elizabethan Theatre, Christopher Marlowe, and London Playhouses.
- [x] Seeded 7 Atlas media/product/activity rows across Text, Narrative, Timeline, Map, Diagram, Assessment, and Exercise layers.
- [x] Added 17 placed lesson cards to each persistent demo course.
- [x] Added materials across all 8 lessons, including text briefings, maps, timelines, diagrams, chat, writing workspace, whiteboard, sorter, assessment, and final response form cards.
- [x] Verified in Playwright that the Create canvas shows seeded cards.
- [x] Captured Create screenshot at `output/playwright/shakespeare-materials-create.png`.
- [ ] Captured Preview attempt at `output/playwright/shakespeare-materials-preview.png` was not produced because Preview did not mount the authored cards.
- [ ] The `interactive` renderer currently displays a generic `Interactive Canvas` placeholder instead of the assessment title/content.
- [ ] The seeded Atlas/material data is local demo data, not a repeatable migration or production seed.

## Main Blockers Before A Real Shakespeare Course Test

- [x] Seed local Atlas with Shakespeare-specific entity/media/product/activity data for the persistent demo course.
- [ ] Turn the Shakespeare Atlas/material seed into a repeatable script or migration if it should become canonical test data.
- [ ] Decide the canonical template persistence model: either stop writing to `public.templates` or reintroduce the table. Current code and migrations disagree.
- [ ] Update stale Playwright specs for Launch, Make library selection, and canvas panel max-width behavior.
- [ ] Add URL update after course creation so the course ID survives refresh.
- [ ] Make new-course defaults explicit for `students_overview` and `visibility_settings`.
- [ ] Implement or remove roster file upload until it actually parses and persists files.
- [ ] Add tests for sign-up-through-join, student course list access, lesson delivery, submissions, feedback, and payout.

## Suggested Next Test Course Path

- [ ] Create the course as `Shakespeare in Love: Literature, Film, and Elizabethan Theatre`.
- [ ] Classify it as Arts and humanities / Literature and linguistics, with performing arts and history as secondary context.
- [ ] Seed Atlas with the recommended entity/media/product/activity set above.
- [ ] Create 4 modules: Shakespeare and Elizabethan London; Love, Genre, and Disguise; Theatre, Patronage, and Performance; Film Adaptation and Critical Response.
- [ ] Generate or manually author 6-8 sessions.
- [ ] Use Make to create at least one Text, Image, Timeline, Map, Diagram, Quiz, Writing Pad, Whiteboard, and Character Chat block.
- [ ] Curate those blocks onto lesson canvases.
- [ ] Preview as teacher.
- [ ] Enable visibility and enrollment.
- [ ] Join as a new student via signup.
- [ ] Verify student can see and start the course.

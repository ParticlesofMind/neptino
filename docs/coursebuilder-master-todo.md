# Coursebuilder Master Todo

Date: 2026-05-25

This document consolidates the scattered coursebuilder planning notes into one working backlog. It does not replace the detailed audits; it is the high-signal todo list that should be checked first before implementing coursebuilder setup, curriculum generation, create-canvas, launch, and program-level work.

Related source documents:

- [Coursebuilder Setup Data And View Priority Audit](./coursebuilder-setup-view-priority-audit.md)
- [Course Creation Viability Audit](./course-creation-viability-audit.md)
- [Coursebuilder Create Issues](./coursebuilder-create-issues.md)
- [Coursebuilder Canvas Framework Options](./coursebuilder-canvas-framework-options.md)
- [Resource Data Source Audit](./resource-data-source-audit.md)
- [Institution Membership And Signup Redesign](./institution-membership-signup-redesign.md)

## Current Product Decisions

- Course setup should capture enough structured intent for Neptino AI to generate useful course structure and content without pretending to know more than the teacher supplied.
- The setup order should be: Essentials, Classification, Schedule, Students, Pedagogy, Curriculum.
- Curriculum is where generation happens. The UI should make clear that generation depends on the preceding sections.
- Templates belong in setup because first-time independent teachers need viable defaults before they can create a proper course.
- Built-in general-purpose templates should exist for every template type, be available by default, and be non-deletable.
- Resources and Data Management belong in setup because most teachers will not research source quality, license safety, retention, provenance, and attribution rules deeply.
- Resource and Data Management defaults should be usable for most courses, with advanced controls available when needed.
- The old `Curricular Framework` dropdown should not return as a course-level primitive.
- Course-level classification should be guided and teacher-native. ISCED is useful as a machine taxonomy, not as the teacher's main cognitive task.
- Program-level context should eventually explain broader educational alignment across multiple courses.

## P0 - Course Setup Readiness

### Generation Readiness Gate

Status: Partially implemented.

Course generation should require meaningful completion of:

- Essentials
- Classification
- Schedule
- Students
- Pedagogy
- Templates

Recommended but not strict blockers:

- Curriculum structure controls
- Page setup
- AI model
- Resources
- Data Management

Why:

- Essentials gives identity, language, teacher, institution, and purpose.
- Classification gives level, subject, topic, prior knowledge, key terms, mandatory topics, and application context.
- Schedule gives pacing and time constraints.
- Students gives audience scale and adaptation context.
- Pedagogy gives teaching stance.
- Templates give viable output shape.

Todo:

- [x] Add shared setup readiness evaluator.
- [x] Use readiness evaluator in Curriculum setup.
- [x] Make Templates required for generation.
- [x] Treat Resources and Data Management as effective-by-default governance rather than hard blockers.
- [ ] Display generation prerequisites visually inside Curriculum before generation controls.
- [ ] Add a short explanation in Curriculum that metadata generation depends on prior setup sections.
- [ ] Add focused UI tests for the readiness gate once the protected coursebuilder route has a reliable auth fixture.

### Context View

Status: Partially implemented.

Context should not be a raw diagnostic dump. It should be a Course Intelligence Readiness view.

Todo:

- [x] Replace raw context framing with readiness framing.
- [ ] Show missing required setup fields by section.
- [ ] Show weak quality fields separately from missing fields.
- [ ] Show strongest AI signals already captured.
- [ ] Show source/license/data-governance coverage.
- [ ] Show a single recommended next action.

## P0 - Classification Redesign

### Teacher-Native Classification

Status: Partially implemented.

Classification should not start by forcing the teacher to reason through a technical taxonomy. It should start with what teachers know:

- class year or level
- subject area
- current course title and description
- prior knowledge
- mandatory topics
- key terms
- application context

Todo:

- [x] Add assisted ISCED path suggestion from course title, description, class year, and current selections.
- [x] Store machine ISCED values and human labels/codes.
- [x] Feed human labels into generation instead of slugs.
- [x] Allow suggested key terms and mandatory topics to be accepted into the form.
- [x] Replace previous/next free text with Program Placement.
- [x] Remove generic curricular framework dropdown.
- [ ] Improve suggestion quality with a richer local subject hint map.
- [ ] Add confidence explanation when the suggested ISCED path is weak.
- [ ] Allow teacher to explicitly mark the taxonomy suggestion as "good enough" or "not useful".
- [ ] Add analytics or debug logging for suggestion acceptance rate.

### Education Context

Status: Proposed.

This replaces the failed idea of a global course-level framework dropdown.

Problem:

- A class year is important, but not universal. `Year 11` means different things in the United States, Switzerland, the United Kingdom, Malta, Algeria, Saudi Arabia, and international schools.
- Course language is not enough. English could mean US, UK, IB, Swiss bilingual gymnasium, international school, private tutoring, or adult education.
- A generic framework name is too weak. `Swiss Matura` does not say enough about canton, subject lane, exam culture, school expectations, or the specific competencies needed for a topic like the rise of the British Empire.
- A complete framework enumeration is unrealistic. Tens of thousands of national, regional, cantonal, institutional, exam-board, private-school, and custom program variants could exist.

Decision:

- Do not model this as `Curricular Framework`.
- Model it as `Education Context`.
- At course level, capture only lightweight context needed to interpret class year and generation tone.
- At program level, later capture the durable alignment that applies across multiple courses.

Near-term course-level fields:

```json
{
  "education_country": "Switzerland",
  "education_region": "Geneva",
  "school_context": "international_school",
  "program_type": "upper_secondary",
  "pathway": "matura_oriented",
  "instruction_language": "English"
}
```

Recommended values:

- `education_country`: optional country selector, with `International / cross-border` as a first-class option.
- `education_region`: optional free text, useful for cantons, states, provinces, emirates, or school districts.
- `school_context`: national school, international school, private tutoring, homeschool, university, adult learning, corporate training, custom.
- `program_type`: primary, lower secondary, upper secondary, vocational, undergraduate, postgraduate, continuing education, exam preparation, custom.
- `pathway`: optional free text such as `matura oriented`, `IB style`, `AP adjacent`, `internal school program`, `national curriculum support`.
- `instruction_language`: can default from Essentials course language but should remain conceptually separate.

UI recommendation:

- Place a compact `Education Context` panel in Classification after class year.
- Default to unspecified rather than blocking setup.
- Label it as optional but recommended.
- Make country/jurisdiction searchable.
- Always support international/cross-border teaching.
- Avoid long framework browsing.
- Do not ask teachers to select a formal standard unless a program or institution has supplied one.

Generation behavior:

- Use Education Context to interpret class year, expected rigor, naming conventions, examples, and likely assessment culture.
- Do not treat it as source truth for mandatory curriculum content.
- Mandatory topics and competencies should still come from teacher input, institution requirements, resources, or future program definitions.

Program-level future:

- A program consists of two or more courses, usually three or more.
- Programs should own durable alignment context:
  - country or jurisdiction
  - regional authority
  - school/program type
  - credential or pathway
  - grading and exam culture
  - level naming convention
  - institution requirements
  - cross-course progression
- Courses inside a program should inherit the program context but allow explicit overrides.

Program context example:

```json
{
  "program_name": "Upper Secondary History Sequence",
  "education_country": "Switzerland",
  "education_region": "Geneva",
  "school_context": "public_school",
  "program_type": "upper_secondary",
  "pathway": "matura_oriented",
  "level_naming": "Swiss upper-secondary years",
  "assessment_culture": "source analysis and argumentative essays",
  "instruction_language": "French",
  "courses": ["Modern Europe", "Imperialism And Global Trade", "20th Century Conflicts"]
}
```

Todo:

- [ ] Add `Education Context` to the setup model.
- [ ] Decide whether it belongs in `classification_data` or a new inherited `program_context` object.
- [ ] Add course-level UI with country, region, school context, program type, pathway, and instruction language.
- [ ] Default instruction language from Essentials while storing education language separately when overridden.
- [ ] Add generation prompt support for education context.
- [ ] Add setup readiness quality checks for education context without making it a hard blocker.
- [ ] Add future `programs` and `program_courses` design work to the program backlog.
- [ ] Define inheritance rules: institution defaults -> program defaults -> course override.

## P0 - Templates

Status: Partially implemented.

Independent teachers starting their first course will not have custom templates. Without templates, a course cannot be shaped reliably.

Current decision:

- Built-in templates should exist for every template type.
- Built-in templates should be non-deletable.
- User-created templates can exist globally and appear across course setup.
- Course setup should select which template types apply to the course.

Todo:

- [x] Add built-in non-deletable template definitions.
- [x] Offer defaults for lesson, certificate, quiz, assessment, and exam.
- [x] Prevent deletion of built-in templates.
- [ ] Add clear visual distinction between built-in and custom templates.
- [ ] Add per-course template application summary.
- [ ] Add tests for built-in template availability in first-course setup.
- [ ] Decide how institution-provided templates should outrank or supplement built-ins.

## P0 - Data Management And Governance

Status: Partially implemented.

Most teachers will not research source quality, license safety, attribution retention, telemetry retention, and AI reuse policy. The system needs useful defaults.

Todo:

- [x] Add Data Management setup section.
- [x] Treat governance defaults as effective even when teacher does not customize them.
- [ ] Add source/license policy controls.
- [ ] Add citation strictness.
- [ ] Add attribution retention.
- [ ] Add generated-content provenance mode.
- [ ] Add student telemetry retention.
- [ ] Add export/delete controls.
- [ ] Add AI reuse consent boundary.
- [ ] Include Data Management summary in Context readiness.
- [ ] Carry governance policy into generation and source retrieval prompts.

## P1 - Resources And Source Discipline

Status: Partially implemented.

Resources should not only be a preference list. They should shape retrieval, attribution, and trust.

Todo:

- [x] Rank open source resource preferences.
- [x] Provide effective default source policy.
- [ ] Make resource priority visible in generation context.
- [ ] Carry citation requirements into generated content.
- [ ] Store generated-content provenance metadata.
- [ ] Add license warnings for non-open or unknown-source material.
- [ ] Prevent LLM-only historical/geographic facts from becoming source truth.
- [ ] Integrate Atlas repository source ranking into course generation.

## P1 - Curriculum Generation

Status: Partially implemented.

Curriculum is the generation surface. It should not look independent from setup readiness.

Todo:

- [ ] Make prerequisite setup status visible at the top of Curriculum.
- [ ] Disable or soften generation actions until required setup is complete.
- [ ] Add a generated metadata preview before writing curriculum rows.
- [ ] Show which setup fields influenced generation.
- [ ] Add regeneration modes: fill missing only, revise structure, regenerate all.
- [ ] Add diff preview before replacing existing curriculum.
- [ ] Add source/governance warnings before generation when policy is incomplete.

## P1 - Students

Status: Aggregate model exists; richer learner model is future work.

Todo:

- [ ] Distinguish planning estimate from real roster.
- [ ] Add learner profile fields for level, goals, accommodations, diagnostic baseline, and constraints.
- [ ] Add progress event model.
- [ ] Add correction/revision feedback loop after lessons.
- [ ] Feed anonymized aggregate profile into generation.
- [ ] Keep student PII boundaries explicit in Data Management.

## P1 - Program Model

Status: Partially implemented.

Program definition:

- A program consists of two or more courses.
- Most real programs will have three or more courses.
- Programs define shared context, progression, and institutional alignment.

Why programs matter:

- They give class year meaning across a sequence.
- They explain course ordering better than a single previous/next course field.
- They can own institution or credential expectations.
- They avoid forcing every course to duplicate broad education context.

Todo:

- [x] Define the basic `programs` / `program_courses` persistence model in the institution/signup migration.
- [x] Give programs a visible home in the teacher Programs & Courses catalog.
- [x] Replace course-level previous/next free text with setup Program Placement.
- [x] Allow a course to be placed into a program sequence from Classification setup.
- [x] Add a dedicated initial Program Setup screen.
- [ ] Let courses inherit Education Context from a program.
- [ ] Support course-level overrides.
- [x] Add initial program setup for jurisdiction, school context, pathway, progression policy, and cross-course outcomes.
- [ ] Add editable Program Setup for existing programs.
- [ ] Let institutions publish program templates.
- [ ] Decide how program-level templates interact with course-level templates.
- [ ] Add true program enrollment distinct from course enrollment.
- [ ] Add program-level syllabus and credential/outcome controls.

## P1 - Create Canvas Reliability

Status: Under active investigation.

Source: [Coursebuilder Create Issues](./coursebuilder-create-issues.md)

Todo:

- [ ] Re-run stress scenario after latest layout height changes.
- [ ] If overflow remains above zero, inspect page assignment math against real DOM.
- [ ] Patch card-range logic so filtered card subsets and global card offsets cannot diverge.
- [ ] Replace remote media with local stress assets.
- [ ] Keep direct DOM overflow backstop in stress reports.
- [ ] Decide whether the pure layout engine needs additional fixed slack for wrappers, task chrome, and preview rendering.

## P1 - Launch And Course Viability

Status: Partially verified.

Source: [Course Creation Viability Audit](./course-creation-viability-audit.md)

Todo:

- [x] Verify teacher course creation through UI.
- [x] Verify Launch join link flow with temporary student.
- [x] Verify Launch roster updates after join.
- [ ] Fix or replace local schema path where `public.templates` is missing for e2e setup.
- [ ] Update old launch tests that expect the previous `Launch Course` checklist/button model.
- [ ] Verify student `/student/courses` visibility after joining.
- [ ] Verify course image upload/crop.
- [ ] Verify teacher payout/post-session feedback workflow or document that it does not exist yet.

## P2 - Page Setup And Interface

Status: Implemented enough for setup, needs persistence confidence and generation integration.

Todo:

- [ ] Verify Page Setup persistence in backend/e2e path.
- [ ] Verify Interface persistence when `course_layout` is initially null.
- [ ] Make page setup defaults clear enough that most users can ignore them.
- [ ] Ensure generated templates respect page size, margins, and print options.
- [ ] Add visual density/body gap to Context summary.

## P2 - Visibility, Marketplace, Pricing, Integrations, Communication

Status: Operational setup exists.

Todo:

- [ ] Keep these sections out of the generation readiness gate unless directly relevant.
- [ ] Verify persistence for every operational section.
- [ ] Ensure launch warnings mention visibility/enrollment state.
- [ ] Add marketplace/pricing requirements only for public paid courses.
- [ ] Keep integrations optional and provider-specific.
- [ ] Keep communication defaults available before enrollment opens.

## P2 - Accessibility, Notifications, Themes

Status: Placeholder or low-priority setup intelligence.

Todo:

- [ ] Decide whether Accessibility should become generation-relevant for reading level, alt text, accommodations, and export constraints.
- [ ] Move Notifications closer to delivery operations if it does not affect course planning.
- [ ] Keep Themes below curriculum quality unless institution branding requires it.

## Documentation Cleanup

Todo:

- [x] Create this master todo.
- [ ] Keep `docs/README.md` linked to this file.
- [ ] Update older setup audit language when implementation decisions change.
- [ ] Move resolved audit findings into "implemented" sections instead of leaving stale requirements.
- [ ] Avoid creating many small overlapping planning docs unless a topic needs deep technical detail.

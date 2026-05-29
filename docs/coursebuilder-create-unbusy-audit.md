# Coursebuilder Create Unbusy Audit

Date: 2026-05-26

Scope: `/teacher/coursebuilder`, especially the Setup navigation shell and the Create canvas editor under `src/components/coursebuilder/create`.

This pass focuses on reducing visual load, removing nonfunctional UI, clarifying navigation, and making the coursebuilder feel like one direct authoring workflow instead of several overlapping tools.

## Executive Summary

The coursebuilder is busy because it exposes too many layers of navigation and unfinished controls at the same time. The largest source of friction is not any single button. It is the combination of:

- Four top-level views: Setup, Create, Preview, Launch.
- Twenty-two Setup sidebar sections, including sections that render only a placeholder.
- Three Create modes: Curate, Make, Fix, where Fix is a placeholder and Make duplicates parts of Curate.
- Two default-open side panels in Create: Files and Atlas.
- Canvas zoom controls, page navigation controls, keyboard shortcuts, optional layer navigation, panel resize handles, and debug UI.

The fastest way to "unbusy" the builder is to remove or hide incomplete paths, collapse secondary panels by default, and make the primary path obvious:

1. Setup only contains sections that are required or actually functional.
2. Create opens to the canvas, with the card library available contextually.
3. Preview and Launch remain separate top-level steps.
4. Advanced tools stay hidden until the user asks for them.

## Severity Legend

- `P0`: Creates confusion or exposes dead/nonfunctional UI.
- `P1`: Adds avoidable cognitive load or slows a common workflow.
- `P2`: Visual polish, naming, or interaction refinement.

## Findings

| Priority | Area | Observation | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| P0 | Setup navigation | The sidebar exposes sections that are not implemented. `accessibility`, `notifications`, and `themes` exist in the registry but fall through to `Placeholder`. | `src/app/(coursebuilder)/teacher/coursebuilder/page-section-registry.tsx`, `page-section-content.tsx` | Hide unimplemented sections or move them behind a disabled "Coming later" area outside the main flow. |
| P0 | Create modes | `Fix` is visible as a first-class Create mode but renders only "Coming soon." | `src/components/coursebuilder/create/ModeBar.tsx`, `CreateEditorLayout.tsx` | Remove `Fix` from the mode bar until it performs real repair work. |
| P0 | Layers | Layer visibility and lock controls are local component state only; they do not hide or lock canvas elements. | `src/components/coursebuilder/create/layers/LayersPanel.tsx` | Do not expose visibility/lock/drag controls until they mutate real canvas state. |
| P0 | Layout visibility | The editor has multiple systems that reserve space around the canvas: left overlay inset, right overlay inset, page padding, zoom fitting, side panels, and floating page nav. This can make valid layouts appear absent or squeezed. | `CreateEditorLayout.tsx`, `curate-overlay-panels.tsx`, `CanvasVirtualizer.tsx` | Default secondary panels closed and reserve no canvas inset for closed panels. Add a "fit page to visible canvas" invariant test. |
| P1 | Setup navigation | Twenty-two setup sections are visible at once. Many are not necessary for first course creation. | `page-section-registry.tsx`, `course-builder-sidebar-nav.tsx` | Split into Required, Optional, and Advanced. Show Required by default. |
| P1 | Mobile navigation | Mobile setup nav flattens every section into one horizontal strip. On small screens this becomes a long icon-only scroller with hidden labels. | `course-builder-mobile-nav.tsx` | Replace with a current-section button plus a sheet/menu, or only show top-level groups. |
| P1 | Create flow | `Curate` and `Make` are separate modes even though the user goal is usually "add a card to this canvas." | `CreateEditorLayout.tsx`, `FilesBrowser.tsx`, `MakePanel.tsx` | Convert Make into an "Add Card" drawer/modal launched from the canvas or card panel. |
| P1 | Create terminology | The UI uses Curate, Make, Fix, Files, Blocks, Library, Resources, Atlas, and Canvas. These terms overlap. | `ModeBar.tsx`, `FilesBrowser.tsx`, `MakePanel.tsx` | Use a smaller vocabulary: Canvas, Cards, Atlas, Preview, Launch. |
| P1 | Side panels | Files and Atlas reopen to fixed 360px widths on desktop. The default state can crowd the canvas if panel controls are noisy. | `CreateEditorLayout.tsx` | Keep Atlas visible by default on desktop, but remove redundant full-panel buttons and keep collapsed handles available. |
| P1 | Page navigation | Page nav duplicates concepts from layer navigation and keyboard navigation. First/last/prev/next plus current/total may be more than the user needs persistently. | `CanvasPageNavStrip.tsx`, `LayersPanel.tsx` | Keep current/total and prev/next visible; move first/last to keyboard shortcuts or a compact menu. |
| P1 | Keyboard shortcuts | Shortcut hints are distributed across top bar and controls. Useful, but can become another layer of visible text. | `course-builder-top-bar.tsx`, `CanvasControlsStrip.tsx` | Add one compact shortcuts popover and use tooltips for per-control hints. |
| P1 | Visual emphasis | Active states often use blue backgrounds, blue text, borders, and shadows together. That makes neutral navigation look important. | `course-builder-sidebar-nav.tsx`, `ModeBar.tsx`, `CanvasControlsStrip.tsx`, `LayersPanel.tsx` | Use neutral active states by default. Reserve blue for primary progress/actions or warnings that require attention. |
| P1 | Canvas chrome | Canvas controls use icons plus tiny labels for every action. The page nav also uses icons plus tiny labels. | `CanvasControlsStrip.tsx`, `CanvasPageNavStrip.tsx` | Use icon-only buttons with tooltips, except for the zoom percentage and page count. |
| P1 | Make sidebar | The Make sidebar has six filters, search, template select, grouped lists, saved library groups, nested card type groups, counts, colored accents, and collapsed vertical text. | `make-panel-sidebar.tsx` | Collapse filters into a single segmented group or menu. Make search primary; move template context to the editor body. |
| P1 | Files browser | Files browser mixes sample/static cards with user-created cards. It also duplicates Make's card taxonomy. | `FilesBrowser.tsx`, `files-browser-data.ts` | Make Files show only reusable/saved cards and a clear "Add Card" action. |
| P1 | Data persistence surprise | The page persists last view and last section in localStorage while also writing `view` to the URL. Users can reopen into an unexpected state. | `use-course-builder-state.ts` | Prefer URL as source of truth. If restoring state, show an explicit "Continue where you left off" affordance. |
| P1 | Debug surface | `CanvasDebugPanel` mounts in development as a floating overlay. It can make local evaluation noisier and can be mistaken for product UI during design review. | `CreateEditorLayout.tsx`, `CanvasDebugPanel.tsx` | Gate it behind a query param or explicit developer shortcut. |
| P2 | Empty states | Placeholder copy such as "This section is under construction" and "Coming soon" is exposed inside the normal workflow. | `page-section-registry.tsx`, `CreateEditorLayout.tsx` | Remove placeholders from user navigation. Track unfinished work in docs or internal feature flags. |
| P2 | Borders | Many controls have both a visible border and a background state. The result is a grid of boxes, especially in setup navigation and mobile nav. | `course-builder-sidebar-nav.tsx`, `course-builder-mobile-nav.tsx`, `ModeBar.tsx` | Use borderless list rows for navigation. Keep borders for panels, inputs, and modals. |
| P2 | Tiny text | Several labels use `text-[7px]`, `text-[8px]`, `text-[9px]`, or `text-[10px]`. This makes controls feel dense and can hurt legibility. | `CanvasControlsStrip.tsx`, `CanvasPageNavStrip.tsx`, `make-panel-sidebar.tsx` | Remove most tiny labels rather than shrinking them further. |
| P2 | Resize handles | Both side panels expose resize handles that snap only between closed and fixed width. The visual language suggests continuous resizing, but behavior is binary-ish. | `curate-overlay-panels.tsx`, `CreateEditorLayout.tsx` | Use explicit open/close buttons, or allow true persisted resizing. |
| P2 | Current canvas state | The system tracks active canvas and viewport canvas separately. That may be correct internally, but it produces multiple possible "current page" sources. | `CanvasPageNavStrip.tsx`, `CanvasVirtualizer.tsx`, `canvasStore.ts` | Define one user-facing "current canvas" rule and make all nav read from it. |

## Navigation Flaws

The builder currently asks users to understand at least five navigation models:

- Top app flow: Setup, Create, Preview, Launch.
- Setup sections: Essentials, Classification, Schedule, Students, Pedagogy, Curriculum, Templates, Resources, Data Management, Page Setup, AI Model, Context, Interface, Course Visibility, Marketplace, Pricing, External Integrations, Communication, Accessibility, Notifications, Themes, Advanced Settings.
- Create modes: Curate, Make, Fix.
- Canvas pages: current page, total pages, first, previous, next, last.
- Canvas tools: select, grab, zoom, reset, scroll, page jump, panel open/close.

This is the central reason the product feels busy. Each layer is individually understandable, but together they make every screen feel like a control surface.

Recommended navigation hierarchy:

1. Primary flow: Setup, Canvas, Preview, Launch.
2. Secondary setup sections: only Required sections shown by default.
3. Canvas tools: zoom, current page, add card, panels.
4. Advanced tools: hidden behind menus or shortcuts.

Avoid adding another persistent navigation strip. The fix is subtraction.

## Setup View Flaws

The setup sidebar is comprehensive but not task-focused. It includes sections for configuration, publishing, engine settings, and advanced settings all at the same level. This makes early course creation feel heavier than it should.

Specific issues:

- `ENGINE` contains Accessibility, Notifications, and Themes, but these currently route to the placeholder.
- `SETTINGS` contains only Advanced Settings, which is a low-frequency destination but gets permanent sidebar space.
- Completion checkmarks only apply to setup sections. Other sections do not communicate whether they matter for launch.
- The sidebar uses bordered buttons for every row, which makes the nav visually heavier than a simple list.
- Locked sections are still visible in full, which can be useful for progress but adds noise before Essentials is complete.

Recommended setup model:

- Required: Essentials, Classification, Schedule, Curriculum.
- Optional: Students, Pedagogy, Templates, Resources, Page Setup, AI Model, Context, Interface.
- Publish: Visibility, Marketplace, Pricing, Integrations, Communication.
- Advanced: Data Management, Advanced Settings.

Hide Accessibility, Notifications, and Themes until they have real UI.

## Mobile Setup Flaws

The mobile bottom nav currently flattens all sections into one scrollable row. On small screens the labels are hidden, so the user sees many small icons with no visible names.

Problems:

- Too many targets for a bottom control.
- Icon-only sections are ambiguous because several concepts use similar abstract icons.
- The current group context is lost.
- Horizontal scrolling hides available destinations.

Recommended replacement:

- Show the current section name.
- Add one button to open a section sheet.
- In the sheet, group sections and show labels.
- Keep only Setup, Canvas, Preview, Launch as persistent bottom/top navigation on mobile.

## Create Flow Flaws

The current Create area has three modes: Curate, Make, Fix.

Observed problems:

- `Fix` is not functional and should not be visible.
- `Curate` is not a natural teacher-facing word for editing a course canvas.
- `Make` is separate from the canvas, but the user probably wants to create a block and place it immediately.
- After adding a block in Make, the system switches back to Curate after a delay. That is a workflow bridge created by the product structure, not by the user goal.
- Files and Make both expose block concepts, which splits the mental model.

Recommended flow:

- Rename Curate to Canvas.
- Remove Fix until functional.
- Replace Make mode with an "Add Card" drawer from the canvas.
- Let card creation end with immediate insertion onto the selected canvas or saved to the card library.
- Keep "Saved cards" as a library inside the Add Card surface, not as a separate mode.

## Canvas Flaws

The canvas needs to feel like the main workspace, but it is frequently surrounded by controls:

- Files panel on the left.
- Atlas panel on the right.
- Page nav strip near the right panel.
- Canvas control strip.
- Resize handles.
- Top Create mode bar.
- Development debug overlay.

This explains why layouts can feel invisible or constrained: the document is not only competing for screen space, it is also being fit within dynamically reserved inset space.

Recommended changes:

- Open Create with the canvas, Cards, and Atlas visible on desktop.
- Collapse Cards and Atlas on mobile.
- Make page navigation compact: current/total plus prev/next.
- Keep zoom percentage visible, but use icon-only zoom/reset/grab/select controls.
- Add a "Fit visible page" action that calculates against the actual available canvas area after panels are opened or closed.
- Treat grab/pan as useful only when the zoomed document can actually move across the full overflow area.

## Panel Flaws

Files and Atlas are both useful, but they should not both be first-class default panels.

Files panel issues:

- It mixes static sample blocks and user-created blocks in one list.
- It uses category filters that overlap with Make filters.
- "My cards" appears only when user cards exist, which changes the panel structure.
- The item count inside search adds a small number that can be mistaken for navigation state.

Atlas panel issues:

- It is always restored open on desktop even when the user may not need it.
- It takes the same width as Files, implying equal importance.
- It pushes page nav and canvas fit calculations into a more complex state.

Recommended panel defaults:

- Left: compact block entry point, expandable when needed.
- Right: closed Atlas, opened by explicit action.
- Remember panel state only after user interaction, not as a hard desktop default.

## Make Panel Flaws

The Make panel is the densest part of the builder.

It currently includes:

- Six filter buttons in a tight grid.
- Search.
- Template context select.
- Library project groups.
- Nested card type groups.
- Creation groups.
- Group accent colors.
- Counts.
- Collapsed sidebar state.
- Selected card previews and editor surfaces.

This is too much for a tool whose core task is "make a block."

Recommended simplification:

- Start with a search-first block picker.
- Show 6-8 common card types first.
- Move taxonomy filters behind a menu.
- Move template context into the block editor only when it affects fields.
- Use one selected state style.
- Do not show saved library groups and creation groups in the same initial panel.

## Layers Panel Flaws

The Layers panel is risky because it borrows UI conventions from design tools but does not currently fulfill them.

Observed issues:

- Eye toggles only update local `visible` state in `LayerRow`.
- Lock toggles only update local `locked` state in `LayerRow`.
- Drag handles are visible but do not appear wired to reorder canvas layers.
- The Navigation tab duplicates page navigation.
- Active navigation uses blue emphasis, adding another "selected" visual state.

Recommended action:

- Hide Layers until visibility, locking, and ordering are real.
- If page navigation is still needed, keep it in the page nav strip only.
- If layers return later, they should be part of an Advanced inspector, not a default Create surface.

## Visual Chrome Flaws

The interface uses too many simultaneous emphasis tools:

- Borders.
- Background fills.
- Blue active states.
- Shadows.
- Tiny labels.
- Uppercase labels.
- Counts.
- Pills.
- Resize handles.
- Icons plus text in compact controls.

The result is that passive navigation often looks as important as primary work.

Recommended visual rules:

- Navigation rows should usually be borderless.
- Active navigation should use a neutral background and font weight, not blue.
- Blue should be reserved for primary action, progress, or active editing modes with real consequence.
- Counts should appear only where the number changes a decision.
- Avoid persistent labels below obvious icons; use tooltips.
- Remove shadows from static navigation and reserve them for floating overlays or drag state.

## Shortcut Flaws

Keyboard shortcuts are useful, but the current direction risks making shortcuts another visible layer of UI.

Recommended shortcut model:

- Keep `Cmd/Ctrl + 1..4` for top-level views.
- Keep `Cmd/Ctrl + +`, `Cmd/Ctrl + -`, and `Cmd/Ctrl + 0` for zoom.
- Keep `H` for grab/pan and `V` or `Esc` for select.
- Put all shortcuts in a single compact shortcut/help popover.
- In persistent controls, show shortcut hints in `title`/tooltip, not always-visible text.

## State And Persistence Flaws

The builder currently combines URL state and localStorage state:

- `view` can come from URL.
- Last view can come from localStorage.
- Last section can come from localStorage.
- The current view writes back into the URL with `history.replaceState`.

This can be convenient, but it can also surprise users. A coursebuilder link without an explicit `view` may reopen into whatever the user last used. That is efficient only if the user expects restoration.

Recommended rule:

- URLs should be deterministic.
- Use URL query state as the primary source of truth.
- If restoring from localStorage, make it an explicit "Continue where you left off" prompt or use it only for panel dimensions, not major navigation.

## Terminology Flaws

Current terms overlap:

- Coursebuilder.
- Setup.
- Create.
- Curate.
- Make.
- Fix.
- Files.
- Cards.
- Library.
- Materials.
- Compositions.
- Atlas.
- Canvas.
- Page.
- Session.

Recommended vocabulary:

- Setup: course metadata and configuration.
- Canvas: lesson/page authoring.
- Cards: shared units placed on the canvas or stored in Atlas.
- Materials: atomic media, references, data, and representations.
- Compositions: assembled cards, learner surfaces, simulations, games, and layouts.
- Saved: stored cards, shown as a filter/view rather than a card type.
- Atlas: knowledge/reference source.
- Preview: review as learner/teacher.
- Launch: publish/deliver.

Avoid Curate, Make, and Files as primary labels. They are less direct than Canvas, Add Card, and Cards.

### Taxonomy Update: Cards As The Shared Unit

Follow-up decision: use `Card` as the shared visible primitive across Canvas and Atlas.

- Canvas: the authored lesson workspace where cards are sequenced for learning.
- Atlas: the knowledge repository / encyclopedia where cards store concepts, sources, explanations, and reference material.
- Card: the common object that can appear in Canvas, Atlas, or both.
- Task: an actionable Canvas card, or the action frame around a Canvas card.
- Source: evidence or reference material inside Atlas, not a peer navigation surface beside Cards.

Canvas cards should normally answer "what should the learner do next?" Atlas cards should answer "what is this, what does it mean, and where does it come from?"

Do not expose `Block` as product vocabulary. Keep internal names like `blockKey` or `BlockRenderer` until a dedicated internal migration is justified, but user-facing UI should say `Card`, `Cards`, and `Add Card`.

## Recommended Cleanup Sequence

### Phase 1: Remove Dead And Redundant UI

- Remove `Fix` from the mode bar.
- Hide `accessibility`, `notifications`, and `themes` from Setup navigation until implemented.
- Hide or disable Layers until its controls mutate real canvas state.
- Gate `CanvasDebugPanel` behind a query param or developer shortcut.
- Remove always-visible shortcut text except for the top-level view hints the user specifically requested.

### Phase 2: Make Canvas The Center

- Default Atlas closed.
- Keep the left block panel available but not visually dominant.
- Simplify page nav to previous, current/total, next.
- Simplify canvas controls to zoom percentage, zoom in/out, fit/reset, select, grab.
- Verify every page layout remains visible at default zoom with panels closed and with one panel open.

### Phase 3: Collapse Make Into Add Card

- Rename Curate to Canvas or Build.
- Replace Make mode with an Add Card drawer.
- Merge the saved card library into the Add Card drawer.
- Insert newly created cards directly onto the current canvas.
- Keep advanced card taxonomy behind search/filter controls.

### Phase 4: Rework Setup Navigation

- Show Required sections by default.
- Move Optional and Publish groups below or behind collapsible groups.
- Move Data Management and Advanced Settings into Advanced.
- Remove borders from nav rows.
- Use neutral active state.

### Phase 5: Tighten Visual System

- Define one active navigation style.
- Define one selected object style.
- Define one floating panel style.
- Remove tiny persistent labels under obvious icons.
- Remove decorative shadows from static surfaces.

## Suggested First Implementation Slice

This is the smallest useful code change set that would immediately reduce busy-ness:

1. Remove `fix` from `CREATE_MODES`.
2. Remove `ENGINE` from `getSections()` or hide it behind a feature flag.
3. Keep Atlas visible by default on desktop, but make the panel easy to resize or collapse.
4. Change `Curate` label to `Canvas`.
5. Simplify `PageNavStrip` to prev, current/total, next.
6. Gate `CanvasDebugPanel` behind `?debugCanvas=1`.
7. Replace setup nav button borders with borderless list rows.

## Open Product Questions

- Atlas is essential during ordinary lesson authoring and should be visible by default on desktop.
- Should teachers think in sessions, pages, canvases, or lessons? Pick one visible term.
- Are Marketplace, Pricing, Integrations, and Communication needed before a course is structurally complete?
- Should Page Setup live in Setup, or should it be a Canvas setting?
- Do teachers need design-tool-style Layers, or do they only need block selection and page navigation?
- Is "Make" a standalone studio, or is it just the creation part of adding a card?

## Do Not Add

- Do not add another persistent nav bar.
- Do not add more badges/counts to explain existing controls.
- Do not keep placeholder sections visible to prove roadmap breadth.
- Do not solve visual clutter by shrinking labels further.
- Do not use blue active states for every selected navigation item.
- Do not make keyboard shortcut hints permanently visible everywhere.

## Bottom Line

The coursebuilder does not need more navigation. It needs fewer visible paths and stronger defaults.

The practical target should be:

- Setup answers "what course are we making?"
- Canvas answers "what is on the lesson page?"
- Add Card answers "what do I place here?"
- Atlas answers "what source material do I need?"
- Preview answers "what will learners see?"
- Launch answers "is this ready to publish?"

Everything else should be hidden, delayed, or removed until it earns permanent space.

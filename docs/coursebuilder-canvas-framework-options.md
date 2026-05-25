# Coursebuilder Canvas Framework Options

## Short Answer

There is no single framework that cleanly replaces the whole Coursebuilder canvas.

Neptino is not just a freeform board. It is currently a hybrid of:

- structured lesson document
- fixed/page-like preview
- drag/drop composition
- nested layout slots
- curriculum/task hierarchy
- eventual Atlas-aware context

That hybrid is powerful, but it also explains why the custom implementation is fragile. The more the canvas tries to be a document, a page builder, and an infinite board at the same time, the more bespoke coordination logic we need.

## Current Stack

Current implementation uses:

- **dnd-kit** for drag/drop
- **TanStack Virtual** for page virtualization
- **custom Neptino layout engine** for page assignment, pagination, block flow, task splitting, and card placement
- **custom CSS grid + dnd-kit droppable slots** for layout/composition cards

## Canvas Identity

Neptino Canvas should be understood first as a **responsive instructional content host**.

It is the place where a teacher assembles a sequence of learning moments, and where a student later reads, watches, listens, manipulates, answers, reflects, and receives feedback. It is not primarily a design canvas, a whiteboard, or a print document. Those modes can appear inside it, but they should not define the whole surface.

The core identity:

- **Instructional:** the canvas exists to carry pedagogy, not arbitrary visual design. Its natural units are sessions, tasks, fields, cards, and feedback moments.
- **Content-hosting:** the canvas hosts multimedia and interactive cards whose intrinsic size can vary. The layout system should respect real content dimensions instead of forcing everything into brittle estimates.
- **Responsive:** the same authored lesson should be usable on different device sizes. The student experience should reflow toward readable, tappable, age-appropriate presentation rather than preserve a desktop-only arrangement at all costs.
- **Sequential by default:** students as young as 9 should always understand where they are, what comes next, and what action is expected. Spatial freedom should be local and purposeful, not the main navigation model.
- **Interactive where needed:** the canvas should allow rich interaction inside cards and compounds, but the outer lesson structure should stay predictable.
- **Semantically stored:** the durable model should remain curriculum data, not pixel positions. Layout choices should decorate the educational structure rather than replace it.

This makes Canvas closest to a **responsive learning document** or **guided lesson surface**, with embedded interactive regions.

That framing matters because it rejects three tempting but risky definitions:

- It is **not a pure document**, because video, simulation, quiz, chat, 3D, map, and whiteboard cards need live interaction and device-responsive presentation.
- It is **not a general page builder**, because teachers are not primarily designing websites. They are composing teachable moments with curriculum semantics.
- It is **not an infinite board**, because young students need sequence, progress, and clear boundaries. Infinite spatial navigation is useful for specific activities, not for the whole lesson.

## Architectural Consequences

If the canvas is a responsive instructional content host, then the layout system should have a smaller, clearer job:

1. Preserve the semantic course structure: session -> task -> field -> card.
2. Render that structure into a responsive sequence of content regions.
3. Let each card or compound report, reserve, or measure its own size.
4. Split or continue content only at semantic boundaries that make sense to teachers and students.
5. Treat page-like previews and print/export pagination as derived views, not the primary authoring truth.

The lowest-risk path is therefore not to replace the whole canvas with a single framework. The safer move is to reduce custom surface area by giving each outside library a bounded role:

- Drag/drop library: moves curriculum-aware cards between semantic fields.
- Grid/layout library: manages resizable arrangements inside a compound or layout card.
- Whiteboard library: powers a specific freeform activity card.
- Graph library: powers a specific concept-map or Atlas-relation card.
- Paged-media library: produces print/export preview from the semantic lesson.

The main canvas remains the orchestrator of learning sequence and content hosting. Specialized libraries live inside it, where their assumptions are strongest.

## Best Candidates

## Pragmatic Drag And Drop

Atlassian's Pragmatic Drag and Drop is the most interesting alternative to our custom-heavy dnd-kit routing.

It is designed to be small, fast, framework-agnostic, and has official support for nested drop targets, hitboxes, auto-scroll, external drops, accessibility helpers, and virtualization patterns.

Sources:

- https://atlassian.design/components/pragmatic-drag-and-drop/core-package/
- https://atlassian.design/components/pragmatic-drag-and-drop/optional-packages

Best fit:

- simplifying nested drop target logic
- improving drag/drop performance
- cleaner hitbox and drop indicator behavior
- replacing some of our custom collision/drop routing code

Risk:

- It would not replace the canvas layout engine.
- It would require a careful migration from dnd-kit.

Recommendation:

This is the strongest candidate for a targeted improvement.

## Puck

Puck is a React visual editor/page-builder. It lets us define our own React components, drag them into a page, store the result as data, and render it later.

Sources:

- https://puckeditor.com/docs/api-reference/components/puck
- https://github.com/puckeditor/puck

Best fit:

- component-tree based lesson authoring
- teacher-friendly page composition
- reusable design-system-driven blocks
- reducing custom editor shell work

Risk:

- Major architectural shift.
- Puck wants the canvas to be a component/page builder.
- This may conflict with our curriculum/session/topic/objective/task model unless we decide the Canvas should become a page-builder over educational components.

Recommendation:

Only consider if we intentionally redefine Canvas as a React page-builder rather than a curriculum-aware lesson document.

## tldraw

tldraw is excellent for an infinite canvas. It provides shapes, bindings, frames, geometry, selection, culling, performance optimizations, and custom shape APIs.

Sources:

- https://tldraw.dev/sdk-features/shapes
- https://tldraw.dev/sdk-features/bindings
- https://tldraw.dev/sdk-features/performance

Best fit:

- whiteboard-like experiences
- freeform spatial activities
- interactive diagrams
- teacher/student sketching
- visual reasoning boards

Risk:

- Probably the wrong foundation for our current A4/page-like lesson preview.
- It is spatial, not document-flow/pagination-first.

Recommendation:

Use tldraw for true whiteboard/freeform experiences, not as the foundation for the whole lesson canvas.

## React Grid Layout

React Grid Layout is a mature draggable/resizable grid system for React. It supports responsive breakpoints, draggable widgets, resizable widgets, collision/packing, static widgets, and serializable layouts.

Source:

- https://github.com/react-grid-layout/react-grid-layout

Best fit:

- composition/layout cards
- grid-based arrangements
- resizable regions
- dashboard-like learning surfaces

Risk:

- Dashboard/grid-first.
- Does not solve curriculum pagination, task hierarchy, text flow, or print-like page layout.

Recommendation:

Useful inside composition cards, not as the whole canvas.

## Paged.js / Vivliostyle Direction

Paged.js paginates HTML/CSS in the browser for print/PDF output using paged media concepts.

Source:

- https://pagedjs.org/en/about/

Best fit:

- preview/export pagination
- print-like output
- rendering semantic lesson content into pages

Risk:

- Not an authoring canvas.
- Does not help drag/drop composition directly.

Recommendation:

Consider later for print/export preview, not for Make/Curate authoring.

## React Flow

React Flow is excellent for node/edge editors, concept maps, process diagrams, dependency graphs, and interactive flows.

Source:

- https://reactflow.dev/learn/concepts/core-concepts

Best fit:

- concept maps
- process diagrams
- Atlas relation views
- graph-based activities

Risk:

- Not suitable for page layout, worksheets, or A4 lesson canvas.

Recommendation:

Use for specific card types or Atlas relation views, not the main lesson canvas.

## Recommendation

Do not replace everything.

Lowest-risk path:

1. Keep the semantic curriculum model and define the main canvas as a responsive instructional content host.
2. Evaluate Pragmatic Drag and Drop against our hardest nested drop cases.
3. Use React Grid Layout only inside composition/layout cards if we want resizable grid arrangements.
4. Use tldraw only for true whiteboard/freeform experiences.
5. Consider Paged.js or Vivliostyle later for print/export preview.
6. Consider Puck only if we decide Canvas should become a true React page-builder.

## Core Architectural Question

The big question is whether Neptino Canvas should be:

- a **document**
- a **page builder**
- an **infinite board**

Right now it is trying to be all three. That is likely why the custom implementation keeps becoming fragile.

The proposed answer is: **Neptino Canvas is a responsive instructional content host**.

It borrows from documents, page builders, and boards, but it should not inherit any one of those models wholesale. The primary authoring truth is the curriculum sequence. Page-like previews, grid arrangements, whiteboards, graph editors, and print exports are secondary render modes or embedded card experiences.

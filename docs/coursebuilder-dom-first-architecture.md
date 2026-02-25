# Coursebuilder Architecture Decision: DOM-first + Pixi Widgets

Date: 2026-02-24  
Status: Accepted

## Decision

Neptino coursebuilder uses a **hybrid architecture**:

- **DOM-first** for page layout, templates, text/media/form content, and accessibility.
- **PixiJS** only for embedded, highly interactive learning widgets (simulations, draggable exercises, animated diagrams).

## Why

The coursebuilder’s core requirements are document-like and template-driven:

- rich text entry/editing,
- fixed page regions,
- media embeds,
- keyboard/screen-reader access,
- straightforward serialization.

These are browser-native strengths in HTML/CSS/React. Canvas/WebGL is retained where it is strongest: dense interactive rendering and custom visual behavior.

## Current repo alignment

- DOM template surface: [src/components/coursebuilder/template-blueprint.tsx](../src/components/coursebuilder/template-blueprint.tsx)
- Main editor shell: [src/components/canvas/CreateView.tsx](../src/components/canvas/CreateView.tsx)
- Pixi renderer: [src/components/canvas/PixiCanvas.tsx](../src/components/canvas/PixiCanvas.tsx)

As of this decision, `CreateView` explicitly defaults to DOM-first surface architecture.

## Implementation rules

1. **Default path is DOM-first** for new coursebuilder features.
2. Use PixiJS only when the feature is inherently interactive/animated and materially benefits from canvas rendering.
3. Do not build document semantics (headings, paragraph text editing, forms, iframe/video semantics) inside Pixi layers.
4. Persist content as serializable data structures independent of rendering technology.
5. Accessibility is required at the DOM layer; Pixi widgets must include targeted labels/instructions.

## Migration path (incremental, no rewrite)

1. Keep existing Pixi scene code as widget modules.
2. Continue moving non-interactive page regions into DOM components.
3. Introduce Pixi widget blocks that mount inside DOM layout zones.
4. Ensure all widget data contracts are JSON-serializable for Supabase persistence.
5. Add feature-level checks so new blocks must justify Pixi usage.

## Out of scope

- Removing PixiJS from the repository.
- Rewriting historical canvas experiments immediately.
- Full editor replacement in one release.

## Success criteria

- Most coursebuilder stories ship without touching `PixiCanvas`.
- Text/media/template work lands in DOM components.
- Pixi changes are concentrated in interactive widget modules.
- Accessibility and keyboard behavior are testable in the DOM surface by default.

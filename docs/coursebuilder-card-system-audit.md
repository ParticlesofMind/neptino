# Coursebuilder Card System Audit

## Scope

This audit covers the card model, canvas rendering, drag/drop behavior, layout containers, and persistence paths used by the Create view.

## Current System

Cards are represented by `DroppedCard` in `src/components/coursebuilder/create/types.ts`. The model already has the fields needed for a more systematic editing surface:

- `content.title` stores the user-facing card name.
- `cardType` stores the structural type and should remain stable after creation.
- `position` stores an x/y placement.
- `dimensions` stores width and height.
- `order` controls stacked rendering order.

The main gap is not the data model. The gap is that rendering and editing do not consistently consume those fields.

## Key Files

### Model and Store

- `src/components/coursebuilder/create/types.ts`
  - Defines `DroppedCard`, `CardType`, session/task/canvas types, and persisted lesson payload shape.
- `src/components/coursebuilder/create/store/course-store-types.ts`
  - Defines the Zustand course store API.
- `src/components/coursebuilder/create/store/course-store-card-actions.ts`
  - Adds/removes cards, moves cards into layout slots, updates layout card content, and now exposes `updateDroppedCard`.
- `src/components/coursebuilder/create/hooks/useCanvasPersistence.ts`
  - Persists sessions to lessons as JSON payloads. Card layout data is already persisted because it lives inside `topics`.

### Drag and Drop

- `src/components/coursebuilder/create/hooks/useCardDrop.ts`
  - Central drop handler for new cards, re-dragged cards, and layout-slot drops.
- `src/components/coursebuilder/create/cards/CardRenderer.tsx`
  - Wraps rendered cards in dnd-kit `useDraggable` and now carries existing position/dimensions in drag data.
- `src/components/coursebuilder/create/blocks/content-task-area-drop-zone.tsx`
  - Renders task-area drop targets and insertion slots.
- `src/components/coursebuilder/create/canvas/CanvasPage.tsx`
  - Renders template-free body drops and page-level insertion slots.

### Rendering and Card Design

- `src/components/coursebuilder/create/cards/CardRegistry.ts`
  - Maps `CardType` to renderer components.
- `src/components/coursebuilder/create/cards/card-types/ResourceCardFrame.tsx`
  - Shared frame for many material/product cards.
- `src/components/coursebuilder/create/cards/card-types/LayoutCard.tsx`
  - Layout/composition container, slot acceptance rules, nested cards, and the current resizable-grid experiment.
- `src/components/coursebuilder/create/cards/cardSizing.ts`
  - Lists card types that should fill available slot height.
- `src/components/coursebuilder/create/utils/cardDefaults.ts`
  - Default dimensions and sample content per card type.

### Layout and Pagination

- `src/components/coursebuilder/create/layout/blockHeightModel.ts`
  - Pure height estimator used by pagination.
- `src/components/coursebuilder/create/layout/layoutEngine.ts`
  - Computes page assignments.
- `src/components/coursebuilder/create/layout/layout-engine-helpers.ts`
  - Splits topics/tasks/cards/layout slots across pages.
- `src/components/coursebuilder/create/hooks/useLayoutEngine.ts`
  - Syncs layout assignments into the store.
- `src/components/coursebuilder/create/hooks/useCanvasOverflow.ts`
  - DOM-measured overflow backstop.

### Add Card and Composition Source

- `src/components/coursebuilder/create/sidebar/MakePanel.tsx`
  - Add Card selection, options menu, and preview surface.
- `src/components/coursebuilder/create/sidebar/composition-presets.ts`
  - Prebuilt composition templates with actual cards already placed.
- `src/components/coursebuilder/create/sidebar/composition-injections.ts`
  - Static example injection data for preset content.
- `src/components/coursebuilder/create/cards/card-type-registry.ts`
  - Card taxonomy metadata for materials and compositions.

## Findings

### 1. The model is ahead of the UI

`DroppedCard` already supports title, position, width, and height. But top-level canvas rendering is mostly stacked by `order`; `position` is only meaningful in specialized paths, and `dimensions` mostly informs default card internals and pagination estimates.

### 2. There are two layout paradigms

Most cards render in vertical task-area stacks with insertion-line reorder. `layout-resizable-grid` supports slot-level cursor drag and resize. That means the system already has a proven interaction model for manual positioning, but only inside one composition type.

### 3. Resize/reposition must not be implemented per card

Manual resize should be a canvas-level wrapper concern, not a separate feature inside every card renderer. Individual cards should only know how to fill their assigned rectangle.

### 4. Card title editing should patch content, not card type

The clean invariant is: update `content.title`, never mutate `cardType`. This is now reflected in the store API by allowing card updates for content/position/dimensions/order but not type.

### 5. Pagination and responsive behavior are coupled

Any manual height/width system must update the height estimator. Otherwise a card can visually resize while page splitting still uses stale assumptions.

## Implemented Foundation

The store now has `updateDroppedCard(sessionId, taskId, cardId, patch)`.

It supports:

- renaming via `content.title`
- manual `position` updates
- manual `dimensions` updates
- nested cards inside layout slots
- preserving `cardType`

Re-dragged cards now carry and preserve their existing `position` and `dimensions` through `CardRenderer` and `useCardDrop`.

## Recommended Next Steps

1. Add a selected-card inspector using `updateDroppedCard`.
   - Rename field: patches `content.title`.
   - Size controls: patches `dimensions`.
   - Position controls: patches `position` where the active layout mode supports absolute/grid placement.

2. Promote the resizable-grid behavior into a reusable placement layer.
   - Use it for custom compositions first.
   - Keep prebuilt compositions locked by default, with an explicit edit/customize mode later.

3. Standardize card frame behavior.
   - One shared chrome contract: title row, optional remove/move controls, body fill behavior.
   - Card renderers should fill their parent and avoid local fixed heights unless the content technology requires it.

4. Split placement modes explicitly.
   - `stacked`: order-based task-area cards.
   - `grid`: cursor-positioned and resizable composition slots.
   - `absolute`: future freeform canvas mode.

5. Update pagination after resize.
   - `blockHeightModel.ts` should treat manual dimensions as authoritative for card types that support resizing.
   - Layout-slot cards should report the slot/composition height, not duplicate internal guesses.

## Refactor Assessment

A refactor is appropriate, but it should be staged. The riskiest mistake would be adding resize handles directly to every card component. The better direction is a placement wrapper that owns selection, drag, resize, and patching, while `CardRenderer` remains responsible for resolving the visual card body.

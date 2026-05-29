# Coursebuilder Create Stress Findings

Date: May 23, 2026

Scope: This note ranks the create-view issues uncovered during the stress investigation from most to least pressing.

Primary evidence:
- `output/playwright/coursebuilder-create-stress-report.json`
- `e2e/coursebuilder-create-stress.spec.ts`
- `src/components/coursebuilder/create/layout/layoutEngine.ts`
- `src/components/coursebuilder/create/layout/layout-engine-helpers.ts`
- `src/components/coursebuilder/create/layout/blockHeightModel.ts`
- `src/components/coursebuilder/create/hooks/useCanvasOverflow.ts`
- `src/components/coursebuilder/create/store/course-store-canvas-actions.ts`
- `src/components/coursebuilder/create/blocks/Content.tsx`

Latest follow-up:
- Variable-height Program/Resources row budgeting, scoped card-range bounds, overflow rechecks after split/DOM settling, and local stress media assets have been patched.
- Fresh stress run result: `debugSummaryAfterHeavy.measurements.overflowWithoutSplitGuard = 0`.
- Direct DOM backstop in the stress report measured all 97 mounted pages and found `domOverflowAfterHeavy.overflowCount = 0`.
- The Canvas Debug measurement registry still reported a small number of missing entries (`missingCanvases = 7`) even though direct DOM measurement covered every mounted page.

## 1. P0 — Create pagination still leaves many pages overflowed under realistic heavy load

Why this is first:
The latest stress rerun still ended with `overflowWithoutSplitGuard: 26` after the canvas was fully measured, which means this is not just a debug-panel visibility artifact. This is a direct correctness problem in the create experience.

Evidence:
- `output/playwright/coursebuilder-create-stress-report.json`
- Latest run snapshot:
  - `debugSummaryAfterHeavy.measurements.measuredCanvases = 83`
  - `debugSummaryAfterHeavy.measurements.missingCanvases = 0`
  - `debugSummaryAfterHeavy.measurements.overflowWithoutSplitGuard = 26`

Impact:
- Teachers can end up with content visibly overflowing the printable page body.
- This undermines trust in the builder very early in the product.
- Export, launch, and preview correctness are all at risk if page boundaries are wrong here.

Current hypothesis:
The pure layout engine is still underestimating some rendered card heights or page costs, so it produces page assignments that look valid in data but still overflow in the real DOM.

Relevant code:
- `src/components/coursebuilder/create/layout/layoutEngine.ts`
- `src/components/coursebuilder/create/layout/layout-engine-helpers.ts`
- `src/components/coursebuilder/create/layout/blockHeightModel.ts`

Status:
- Partially investigated.
- Height estimates for several fixed-height cards were made more conservative in the current branch, but that change has not been revalidated yet.

## 2. P1 — The layout engine and DOM overflow fallback are still not converging cleanly

Why this matters:
The intended architecture is that `computePageAssignments(...)` should do most of the work and `useCanvasOverflow(...)` should be a safety net. The stress run suggests the safety net is still doing too much work.

Evidence:
- `output/playwright/coursebuilder-create-stress-report.json`
- Before heavy seeding in the latest rerun:
  - `totals.canvases = 73`
  - `missingCanvases = 43`
  - `overflowWithoutSplitGuard = 10`
- After heavy seeding:
  - `totals.canvases = 83`
  - `missingCanvases = 0`
  - `overflowWithoutSplitGuard = 26`

Impact:
- Page counts can churn after render instead of being stable up front.
- Runtime splitting adds complexity and makes performance worse on already dense courses.
- If fallback logic and pure layout logic disagree, persistent regressions are more likely.

What likely needs attention:
- Whether `computePageAssignments(...)` is generating too-optimistic page slices.
- Whether `useCanvasOverflow(...)` is splitting at the best available boundary once the DOM proves a page is too tall.
- Whether the layout engine should reserve more slack for block wrappers, task-area chrome, and generic preview rendering.

Relevant code:
- `src/components/coursebuilder/create/hooks/useLayoutEngine.ts`
- `src/components/coursebuilder/create/layout/layoutEngine.ts`
- `src/components/coursebuilder/create/hooks/useCanvasOverflow.ts`
- `src/components/coursebuilder/create/canvas/CanvasVirtualizer.tsx`

## 3. P1 — Card-range pagination looks logically fragile when block-scoped and area-scoped cards are mixed

Why this matters:
This is a likely correctness bug waiting to surface once teachers mix `content`, `assignment`, and multiple task-area cards more heavily.

Evidence from code:
- `topLevelCardsInTaskBudget(...)` filters cards by `blockKey` and visible task areas before estimating how many cards fit.
- `computeFlatCardOffset(...)` counts all dropped cards in the task tree, regardless of `blockKey` or area.
- `Content.tsx` builds visibility from a global flattened card index map and then filters actual rendering by page `cardRange`.

Why that is risky:
If card offsets are computed from the full card set but page budgeting is computed from a filtered subset, the page boundaries can drift. In practice that can mean:
- a continuation page starts at the wrong card
- a card appears on the wrong page
- `content` and `assignment` flows interfere with each other when cards are interleaved by order

Impact:
- Hard-to-reproduce pagination bugs in mixed real courses
- Cross-container page slicing errors that look random to teachers

Relevant code:
- `src/components/coursebuilder/create/layout/layout-engine-helpers.ts`
- `src/components/coursebuilder/create/layout/layoutEngine.ts`
- `src/components/coursebuilder/create/blocks/Content.tsx`

Status:
- Not patched yet.
- Worth treating as near-term work, not a backlog item.

## 4. P2 — Stress coverage for media-heavy lessons is still noisy because remote assets are failing in-browser

Why this matters:
This is lower priority than the pagination defects above, but it limits how trustworthy the stress harness is for real media courses.

Evidence:
- `output/playwright/coursebuilder-create-stress-report.json`
- `requestFailures` contains repeated:
  - `net::ERR_BLOCKED_BY_ORB` on remote video requests
  - aborted remote audio requests

Impact:
- Layout and pagination were stressed, but some media rendering/performance behavior was not fully realistic.
- The harness is still useful, but it is not yet a clean benchmark for heavy image/video/audio lessons.

Recommended fix:
Move the stress harness to local `/public` assets so media rendering, request timing, and failure noise are controlled.

Relevant code:
- `e2e/coursebuilder-create-stress.spec.ts`

## Recently addressed on this branch

These are important, but they no longer look like the primary active defects.

### Stable canvas IDs

What changed:
- Overflow continuation pages now use stable session-based IDs instead of random UUIDs.
- Continuation pages are inserted immediately after the overflowing page instead of being appended to the end of the session.

Evidence:
- Latest rerun shows `nonStandardCanvasIds = 0` in `output/playwright/coursebuilder-create-stress-report.json`.

Relevant code:
- `src/components/coursebuilder/create/store/course-store-canvas-actions.ts`
- `src/components/coursebuilder/create/hooks/useCanvasOverflow.ts`

### More conservative height estimation for fixed-height product cards

What changed:
- The height model was updated to respect the real footprint of cards such as `text-editor`, `code-editor`, `whiteboard`, `chat`, and `rich-sim`.

Relevant code:
- `src/components/coursebuilder/create/layout/blockHeightModel.ts`
- `src/__tests__/components/coursebuilder/create/layout/blockHeightModel.test.ts`

Status:
- Good direction, but still awaiting a fresh stress rerun to confirm how much overflow it removes.

## Recommended execution order

1. Re-run the stress scenario after the latest `blockHeightModel.ts` change.
2. If overflow remains materially above zero, inspect the page-assignment math in `layoutEngine.ts` against the real DOM for the worst remaining page types.
3. Patch the card-range logic so filtered card subsets and global card offsets cannot diverge.
4. Replace remote media with local assets to make the stress harness cleaner and repeatable.

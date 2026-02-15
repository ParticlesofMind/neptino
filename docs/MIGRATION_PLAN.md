# Vanilla TypeScript → React Migration Plan

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Complete File Inventory](#complete-file-inventory)
3. [Page-to-Script Mapping](#page-to-script-mapping)
4. [Initialization Pattern Analysis](#initialization-pattern-analysis)
5. [Recommended Migration Order](#recommended-migration-order)
6. [Migration Strategy](#migration-strategy)

---

## Executive Summary

The Neptino project has **139 vanilla TypeScript files** in `src/scripts/` totaling **47,578 lines of code**. The migration surface is concentrated:

- **Only 1 React page** (`coursebuilder-client.tsx`, 3,092 lines) directly imports vanilla TS via dynamic `import()`.
- **18 unique `src/scripts/` modules** are loaded into the coursebuilder client.
- The coursebuilder-client.tsx renders **166 HTML elements with `id` attributes** that vanilla TS binds to via `document.querySelector` / `getElementById`.
- All other pages (admin/*, student/*, shared/*, teacher/courses, teacher/marketplace, etc.) are **already pure React** with no vanilla TS dependencies.
- `src/scripts/encyclopedia.ts`, `src/scripts/marketplace.ts`, and `src/scripts/app.ts` are **legacy entry points** — not imported by any Next.js code.
- `app/teacher/encyclopedia/encyclopedia-client.tsx` (792 lines) is **already a full React component** with no vanilla TS imports.

**Bottom line:** The migration is essentially about refactoring one massive page (`coursebuilder-client.tsx`) and its 18 imported vanilla TS modules. Everything else is either pure React already or legacy dead code.

---

## Complete File Inventory

### Size Legend
- 🟢 **Small** (< 200 lines) — Easy migration
- 🟡 **Medium** (200–500 lines) — Moderate effort
- 🔴 **Large** (500+ lines) — Complex migration

### DOM Category Legend
- **DOM-heavy** = 10+ DOM manipulation lines (querySelector, getElementById, innerHTML, classList, etc.)
- **Mixed** = 1–9 DOM manipulation lines
- **Logic-only** = 0 DOM lines

---

### Backend — Courses

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `backend/courses/index.ts` | 547 | 🔴 | 34 | DOM-heavy |
| `backend/courses/shared/courseFormHandler.ts` | 1,716 | 🔴 | 109 | DOM-heavy |
| `backend/courses/shared/courseFormValidator.ts` | 226 | 🟡 | 0 | Logic-only |
| `backend/courses/shared/courseIdHandler.ts` | 169 | 🟢 | 23 | DOM-heavy |
| `backend/courses/shared/uploadCourseImage.ts` | 130 | 🟢 | 0 | Logic-only |
| `backend/courses/curriculum/aiCurriculumGenerator.ts` | 722 | 🔴 | 0 | Logic-only |
| `backend/courses/curriculum/canvasBuilder.ts` | 882 | 🔴 | 1 | Mixed |
| `backend/courses/curriculum/CanvasSummaryService.ts` | 57 | 🟢 | 0 | Logic-only |
| `backend/courses/curriculum/ContentLoadController.ts` | 339 | 🟡 | 14 | DOM-heavy |
| `backend/courses/curriculum/ContentLoadService.ts` | 182 | 🟢 | 0 | Logic-only |
| `backend/courses/curriculum/CourseContext.ts` | 119 | 🟢 | 0 | Logic-only |
| `backend/courses/curriculum/curriculumManager.ts` | 3,769 | 🔴 | 62 | DOM-heavy |
| `backend/courses/curriculum/curriculumRenderer.ts` | 1,421 | 🔴 | 9 | Mixed |
| `backend/courses/curriculum/TemplatePlacementService.ts` | 358 | 🟡 | 0 | Logic-only |
| `backend/courses/curriculum/utils/CanvasDimensions.ts` | 118 | 🟢 | 0 | Logic-only |
| `backend/courses/curriculum/utils/LessonStructure.ts` | 104 | 🟢 | 0 | Logic-only |
| `backend/courses/curriculum/utils/SectionDataBuilder.ts` | 280 | 🟡 | 0 | Logic-only |
| `backend/courses/curriculum/utils/TableDataBuilder.ts` | 610 | 🔴 | 0 | Logic-only |
| `backend/courses/curriculum/utils/TemplateDataBuilder.ts` | 186 | 🟢 | 0 | Logic-only |
| `backend/courses/classification/classificationFormHandler.ts` | 626 | 🔴 | 43 | DOM-heavy |
| `backend/courses/classification/classifyCourse.ts` | 581 | 🔴 | 0 | Logic-only |
| `backend/courses/context/ContentSuggestionEngine.ts` | 51 | 🟢 | 0 | Logic-only |
| `backend/courses/context/CourseContextService.ts` | 535 | 🔴 | 2 | Mixed |
| `backend/courses/context/CourseFingerprint.ts` | 367 | 🟡 | 0 | Logic-only |
| `backend/courses/context/index.ts` | 36 | 🟢 | 0 | Logic-only |
| `backend/courses/essentials/createCourse.ts` | 412 | 🟡 | 0 | Logic-only |
| `backend/courses/essentials/createCourseCard.ts` | 290 | 🟡 | 15 | DOM-heavy |
| `backend/courses/generation/generationSettingsHandler.ts` | 215 | 🟡 | 8 | Mixed |
| `backend/courses/pedagogy/pedagogyHandler.ts` | 600 | 🔴 | 23 | DOM-heavy |
| `backend/courses/schedule/scheduleCourse.ts` | 1,699 | 🔴 | 45 | DOM-heavy |
| `backend/courses/settings/courseFormConfig.ts` | 400 | 🟡 | 0 | Logic-only |
| `backend/courses/settings/deleteCourse.ts` | 330 | 🟡 | 19 | DOM-heavy |
| `backend/courses/settings/languageLoader.ts` | 153 | 🟢 | 11 | DOM-heavy |
| `backend/courses/settings/marginSettings.ts` | 375 | 🟡 | 14 | DOM-heavy |
| `backend/courses/settings/pageSetupHandler.ts` | 517 | 🔴 | 14 | DOM-heavy |
| `backend/courses/students/studentsManager.ts` | 408 | 🟡 | 15 | DOM-heavy |
| `backend/courses/students/studentsManualManager.ts` | 262 | 🟡 | 18 | DOM-heavy |
| `backend/courses/students/studentsModalController.ts` | 158 | 🟢 | 11 | DOM-heavy |
| `backend/courses/students/studentsParser.ts` | 223 | 🟡 | 4 | Mixed |
| `backend/courses/students/studentsPreview.ts` | 224 | 🟡 | 33 | DOM-heavy |
| `backend/courses/students/studentsProfileService.ts` | 72 | 🟢 | 1 | Mixed |
| `backend/courses/students/studentsRepository.ts` | 503 | 🔴 | 0 | Logic-only |
| `backend/courses/students/studentsTypes.ts` | 82 | 🟢 | 0 | Logic-only |
| `backend/courses/students/studentsUploadManager.ts` | 364 | 🟡 | 18 | DOM-heavy |
| `backend/courses/students/studentsUtils.ts` | 42 | 🟢 | 0 | Logic-only |
| `backend/courses/templates/createTemplate.ts` | 146 | 🟢 | 10 | DOM-heavy |
| `backend/courses/templates/modals/loadTemplates.ts` | 353 | 🟡 | 29 | DOM-heavy |
| `backend/courses/templates/modals/PageSettingsModal.ts` | 175 | 🟢 | 5 | Mixed |
| `backend/courses/templates/TemplateBlockRenderer.ts` | 561 | 🔴 | 3 | Mixed |
| `backend/courses/templates/templateBlocks.ts` | 607 | 🔴 | 0 | Logic-only |
| `backend/courses/templates/templateConfigHandler.ts` | 185 | 🟢 | 13 | DOM-heavy |
| `backend/courses/templates/TemplateConfigManager.ts` | 269 | 🟡 | 0 | Logic-only |
| `backend/courses/templates/templateCourseSync.ts` | 76 | 🟢 | 0 | Logic-only |
| `backend/courses/templates/TemplateDataHandler.ts` | 282 | 🟡 | 0 | Logic-only |
| `backend/courses/templates/TemplateManager.ts` | 389 | 🟡 | 13 | DOM-heavy |
| `backend/courses/templates/templateModals.ts` | 124 | 🟢 | 4 | Mixed |
| `backend/courses/templates/templateOptions.ts` | 88 | 🟢 | 0 | Logic-only |
| `backend/courses/templates/TemplateRenderer.ts` | 522 | 🔴 | 19 | DOM-heavy |
| `backend/courses/templates/types.ts` | 54 | 🟢 | 0 | Logic-only |

### Backend — Auth, OAuth, RocketChat, Supabase

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `backend/auth/auth.ts` | 555 | 🔴 | 22 | DOM-heavy |
| `backend/oauth/OAuthIntegration.ts` | 204 | 🟡 | 8 | Mixed |
| `backend/oauth/OAuthMessagingInterface.ts` | 364 | 🟡 | 23 | DOM-heavy |
| `backend/oauth/oidc-server.ts` | 321 | 🟡 | 0 | Logic-only |
| `backend/oauth/start-server.ts` | 20 | 🟢 | 0 | Logic-only |
| `backend/rocketchat/MessagingInterface.ts` | 675 | 🔴 | 28 | DOM-heavy |
| `backend/rocketchat/passwordMemory.ts` | 59 | 🟢 | 2 | Mixed |
| `backend/rocketchat/RocketChatService.ts` | 692 | 🔴 | 2 | Mixed |
| `backend/supabase.ts` | 43 | 🟢 | 1 | Mixed |

### Coursebuilder — Canvas & Engine

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `coursebuilder/canvas/CanvasEngine.ts` | 1,060 | 🔴 | 4 | Mixed |
| `coursebuilder/canvas/canvasInit.ts` | 15 | 🟢 | 1 | Mixed |
| `coursebuilder/canvas/EngineController.ts` | 1,155 | 🔴 | 138 | DOM-heavy |
| `coursebuilder/canvas/ViewportControls.ts` | 104 | 🟢 | 5 | Mixed |
| `coursebuilder/config/toolConfig.ts` | 349 | 🟡 | 0 | Logic-only |
| `coursebuilder/KeyboardShortcuts.ts` | 70 | 🟢 | 4 | Mixed |
| `coursebuilder/PanelToggle.ts` | 89 | 🟢 | 19 | DOM-heavy |

### Coursebuilder — Layout & Pages

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `coursebuilder/layout/CanvasConfigManager.ts` | 222 | 🟡 | 0 | Logic-only |
| `coursebuilder/layout/CanvasLayoutRenderer.ts` | 286 | 🟡 | 6 | Mixed |
| `coursebuilder/layout/pages/index.ts` | 19 | 🟢 | 0 | Logic-only |
| `coursebuilder/layout/pages/PageContainer.ts` | 584 | 🔴 | 7 | Mixed |
| `coursebuilder/layout/pages/PageManager.ts` | 482 | 🟡 | 0 | Logic-only |
| `coursebuilder/layout/pages/PageMetadata.ts` | 109 | 🟢 | 0 | Logic-only |
| `coursebuilder/layout/pages/renderers/PageBodyRenderer.ts` | 440 | 🟡 | 5 | Mixed |
| `coursebuilder/layout/pages/renderers/PageFooterRenderer.ts` | 110 | 🟢 | 0 | Logic-only |
| `coursebuilder/layout/pages/renderers/PageHeaderRenderer.ts` | 106 | 🟢 | 0 | Logic-only |
| `coursebuilder/layout/pages/renderers/PageRenderConstants.ts` | 35 | 🟢 | 0 | Logic-only |
| `coursebuilder/layout/pages/renderers/PageRenderTypes.ts` | 37 | 🟢 | 0 | Logic-only |
| `coursebuilder/layout/pages/renderers/PageTextUtils.ts` | 156 | 🟢 | 0 | Logic-only |
| `coursebuilder/layout/PageSizeConfig.ts` | 67 | 🟢 | 0 | Logic-only |
| `coursebuilder/layout/utils/TableRenderer.ts` | 33 | 🟢 | 0 | Logic-only |

### Coursebuilder — Tools

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `coursebuilder/tools/animate/ModifyTool.ts` | 113 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/animate/PathTool.ts` | 210 | 🟡 | 0 | Logic-only |
| `coursebuilder/tools/animate/registerAnimateTools.ts` | 12 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/animate/SceneTool.ts` | 109 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/animate/TimelineStore.ts` | 42 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/base/ToolManager.ts` | 348 | 🟡 | 13 | DOM-heavy |
| `coursebuilder/tools/base/ToolSettingsStore.ts` | 68 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/base/ToolTypes.ts` | 58 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/build/BrushTool.ts` | 380 | 🟡 | 0 | Logic-only |
| `coursebuilder/tools/build/EraserTool.ts` | 176 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/build/GenerateTool.ts` | 225 | 🟡 | 0 | Logic-only |
| `coursebuilder/tools/build/PenTool.ts` | 1,104 | 🔴 | 6 | Mixed |
| `coursebuilder/tools/build/registerBuildTools.ts` | 20 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/build/SelectTool.ts` | 409 | 🟡 | 0 | Logic-only |
| `coursebuilder/tools/build/ShapesTool.ts` | 211 | 🟡 | 0 | Logic-only |
| `coursebuilder/tools/build/TableTool.ts` | 140 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/build/TextTool.ts` | 253 | 🟡 | 29 | DOM-heavy |
| `coursebuilder/tools/common/color.ts` | 34 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/EngineResizer.ts` | 235 | 🟡 | 17 | DOM-heavy |
| `coursebuilder/tools/selection/SelectionManager.ts` | 142 | 🟢 | 0 | Logic-only |
| `coursebuilder/tools/selection/TransformHelper.ts` | 668 | 🔴 | 6 | Mixed |
| `coursebuilder/tools/ToolSystem.ts` | 14 | 🟢 | 0 | Logic-only |

### Encyclopedia

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `encyclopedia.ts` | 692 | 🔴 | 52 | DOM-heavy |
| `encyclopedia/encyclopediaFilter.ts` | 425 | 🟡 | 0 | Logic-only |
| `encyclopedia/index.ts` | 11 | 🟢 | 0 | Logic-only |
| `encyclopedia/wikidata.ts` | 399 | 🟡 | 0 | Logic-only |

### Integration

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `integration/CurriculumPageBridge.ts` | 567 | 🔴 | 6 | Mixed |
| `integration/index.ts` | 5 | 🟢 | 0 | Logic-only |
| `integration/utils/CanvasDataAccessor.ts` | 280 | 🟡 | 0 | Logic-only |
| `integration/utils/DataNormalizer.ts` | 169 | 🟢 | 0 | Logic-only |

### Landing

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `landing/landingPreview.ts` | 237 | 🟡 | 7 | Mixed |

### Marketplace

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `marketplace.ts` | 443 | 🟡 | 41 | DOM-heavy |
| `marketplace/index.ts` | 11 | 🟢 | 0 | Logic-only |
| `marketplace/marketplaceFilter.ts` | 644 | 🔴 | 0 | Logic-only |

### Media

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `media/cache/MediaCache.ts` | 33 | 🟢 | 0 | Logic-only |
| `media/config.ts` | 114 | 🟢 | 0 | Logic-only |
| `media/MediaManager.ts` | 151 | 🟢 | 0 | Logic-only |
| `media/providers/BaseProvider.ts` | 60 | 🟢 | 0 | Logic-only |
| `media/providers/DropboxProvider.ts` | 51 | 🟢 | 0 | Logic-only |
| `media/providers/FreesoundProvider.ts` | 126 | 🟢 | 0 | Logic-only |
| `media/providers/GoogleDriveProvider.ts` | 48 | 🟢 | 0 | Logic-only |
| `media/providers/LocalFilesProvider.ts` | 46 | 🟢 | 0 | Logic-only |
| `media/providers/PexelsVideoProvider.ts` | 58 | 🟢 | 0 | Logic-only |
| `media/providers/PixabayVideoProvider.ts` | 69 | 🟢 | 0 | Logic-only |
| `media/providers/StockMediaProvider.ts` | 77 | 🟢 | 0 | Logic-only |
| `media/providers/TextProvider.ts` | 31 | 🟢 | 0 | Logic-only |
| `media/providers/UnsplashProvider.ts` | 49 | 🟢 | 0 | Logic-only |
| `media/providers/VideoProvider.ts` | 17 | 🟢 | 0 | Logic-only |
| `media/RateLimitManager.ts` | 73 | 🟢 | 0 | Logic-only |
| `media/types.ts` | 51 | 🟢 | 0 | Logic-only |
| `media/ui/MediaInterface.ts` | 1,227 | 🔴 | 147 | DOM-heavy |

### Navigation

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `navigation/CanvasNavigator.ts` | 259 | 🟡 | 17 | DOM-heavy |
| `navigation/CanvasScrollNav.ts` | 177 | 🟢 | 10 | DOM-heavy |
| `navigation/CourseBuilderNavigation.ts` | 692 | 🔴 | 104 | DOM-heavy |
| `navigation/DashboardNavigation.ts` | 121 | 🟢 | 17 | DOM-heavy |
| `navigation/GlobalNavigation.ts` | 399 | 🟡 | 43 | DOM-heavy |
| `navigation/index.ts` | 19 | 🟢 | 0 | Logic-only |

### Utilities

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `utils/contentTypeSelect.ts` | 207 | 🟡 | 20 | DOM-heavy |
| `utils/courseId.ts` | 89 | 🟢 | 3 | Mixed |
| `utils/courseStatistics.ts` | 199 | 🟢 | 0 | Logic-only |
| `utils/logger.ts` | 62 | 🟢 | 0 | Logic-only |
| `utils/staticCourseCardManager.ts` | 157 | 🟢 | 12 | DOM-heavy |
| `utils/tailwindState.ts` | 89 | 🟢 | 16 | DOM-heavy |
| `utils/UnitConverter.ts` | 96 | 🟢 | 0 | Logic-only |

### Top-Level Entry Points (Legacy)

| File | Lines | Size | DOM Hits | Category |
|------|------:|------|----------|----------|
| `app.ts` | 125 | 🟢 | 7 | Mixed |

---

### Summary by Category

| Category | File Count | Total Lines |
|----------|----------:|------------:|
| **Logic-only** (0 DOM hits) | 81 files | 18,529 |
| **Mixed** (1–9 DOM hits) | 23 files | 8,651 |
| **DOM-heavy** (10+ DOM hits) | 35 files | 20,398 |

| Size | File Count |
|------|----------:|
| 🟢 Small (< 200 lines) | 73 files |
| 🟡 Medium (200–500 lines) | 37 files |
| 🔴 Large (500+ lines) | 29 files |

---

## Page-to-Script Mapping

### Pages with NO vanilla TS dependencies (already pure React)

These pages have zero imports from `src/scripts/`. They are complete React components:

| Page | Lines | Status |
|------|------:|--------|
| `app/admin/courses/page.tsx` | 48 | ✅ Pure React |
| `app/admin/home/page.tsx` | 57 | ✅ Pure React |
| `app/admin/marketplace/page.tsx` | 47 | ✅ Pure React |
| `app/admin/tutorials/page.tsx` | 42 | ✅ Pure React |
| `app/shared/about/page.tsx` | 39 | ✅ Pure React |
| `app/shared/features/page.tsx` | 39 | ✅ Pure React |
| `app/shared/institutions/page.tsx` | 39 | ✅ Pure React |
| `app/shared/pricing/page.tsx` | 46 | ✅ Pure React |
| `app/shared/signin/page.tsx` | 39 | ✅ Pure React |
| `app/shared/signup/page.tsx` | 48 | ✅ Pure React |
| `app/shared/students/page.tsx` | 39 | ✅ Pure React |
| `app/shared/teachers/page.tsx` | 39 | ✅ Pure React |
| `app/student/courses/page.tsx` | 42 | ✅ Pure React |
| `app/student/home/page.tsx` | 65 | ✅ Pure React |
| `app/student/marketplace/page.tsx` | 42 | ✅ Pure React |
| `app/student/progress/page.tsx` | 44 | ✅ Pure React |
| `app/student/tutorials/page.tsx` | 42 | ✅ Pure React |
| `app/teacher/courses/page.tsx` | 56 | ✅ Pure React |
| `app/teacher/home/page.tsx` | 178 | ✅ Pure React (uses "use client", but only for React state) |
| `app/teacher/marketplace/page.tsx` | 47 | ✅ Pure React |
| `app/teacher/tutorials/page.tsx` | 42 | ✅ Pure React |
| `app/teacher/encyclopedia/encyclopedia-client.tsx` | 792 | ✅ Pure React (self-contained, no script imports) |

### Pages WITH vanilla TS dependencies

#### `app/teacher/coursebuilder/coursebuilder-client.tsx` (3,092 lines)

This is the **only** file that bridges React ↔ vanilla TS. It imports **18 modules** via dynamic `import()`:

**Phase 1 — Setup handlers (loaded on mount):**
| Import | File | Lines | DOM Category |
|--------|------|------:|--------------|
| `backend/courses/settings/pageSetupHandler` | `pageSetupHandler.ts` | 517 | DOM-heavy (14) |
| `backend/courses` (index) | `index.ts` + all re-exports | 547 | DOM-heavy (34) |
| `navigation/CourseBuilderNavigation` | `CourseBuilderNavigation.ts` | 692 | DOM-heavy (104) |
| `utils/courseId` | `courseId.ts` | 89 | Mixed (3) |

**Phase 2 — Canvas engine (loaded when "Create" tab activated):**
| Import | File | Lines | DOM Category |
|--------|------|------:|--------------|
| `coursebuilder/canvas/canvasInit` | `canvasInit.ts` | 15 | Mixed (1) |
| `coursebuilder/canvas/ViewportControls` | `ViewportControls.ts` | 104 | Mixed (5) |
| `coursebuilder/canvas/EngineController` | `EngineController.ts` | 1,155 | DOM-heavy (138) |
| `coursebuilder/tools/ToolSystem` | `ToolSystem.ts` | 14 | Logic-only |
| `coursebuilder/tools/EngineResizer` | `EngineResizer.ts` | 235 | DOM-heavy (17) |
| `coursebuilder/KeyboardShortcuts` | `KeyboardShortcuts.ts` | 70 | Mixed (4) |
| `coursebuilder/PanelToggle` | `PanelToggle.ts` | 89 | DOM-heavy (19) |
| `navigation/CanvasScrollNav` | `CanvasScrollNav.ts` | 177 | DOM-heavy (10) |
| `media/ui/MediaInterface` | `MediaInterface.ts` | 1,227 | DOM-heavy (147) |

**Phase 3 — Setup sub-modules (loaded on demand per section):**
| Import | File | Lines | DOM Category |
|--------|------|------:|--------------|
| `backend/courses/classification/classificationFormHandler` | `classificationFormHandler.ts` | 626 | DOM-heavy (43) |
| `backend/courses/pedagogy/pedagogyHandler` | `pedagogyHandler.ts` | 600 | DOM-heavy (23) |
| `backend/courses/schedule/scheduleCourse` | `scheduleCourse.ts` | 1,699 | DOM-heavy (45) |
| `backend/courses/templates/createTemplate` | `createTemplate.ts` | 146 | DOM-heavy (10) |
| `backend/courses/templates/templateConfigHandler` | `templateConfigHandler.ts` | 185 | DOM-heavy (13) |

---

### Transitive Dependencies (indirectly loaded)

`backend/courses/index.ts` re-exports and instantiates:
- `courseFormHandler.ts` (1,716 lines, DOM-heavy)
- `scheduleCourse.ts` (1,699 lines, DOM-heavy)
- `curriculumManager.ts` (3,769 lines, DOM-heavy)
- `studentsManager.ts` (408 lines, DOM-heavy)
- `deleteCourse.ts` (330 lines, DOM-heavy)
- `CourseContextService.ts` (535 lines, Mixed)

### Legacy / Dead Code (not imported by any Next.js page)

| File | Lines | Notes |
|------|------:|-------|
| `app.ts` | 125 | Old entry point; duplicates setup from coursebuilder-client.tsx |
| `encyclopedia.ts` | 692 | Replaced by `encyclopedia-client.tsx` (pure React) |
| `marketplace.ts` | 443 | No Next.js page imports it |
| `landing/landingPreview.ts` | 237 | Only referenced from dead `app.ts` |
| `navigation/GlobalNavigation.ts` | 399 | Only referenced from dead `app.ts` |
| `navigation/DashboardNavigation.ts` | 121 | Only referenced from dead `app.ts` |
| `backend/auth/auth.ts` | 555 | Only referenced from dead `app.ts` |
| All `backend/oauth/*` | 909 | Server-side / not used by Next.js client |
| All `backend/rocketchat/*` | 1,426 | Not imported from any page |

---

## Initialization Pattern Analysis

### Current Pattern: "React Shell + Vanilla TS Side-Effects"

The `coursebuilder-client.tsx` uses a specific pattern to bridge React and vanilla TS:

```tsx
// Pattern: Dynamic import() inside useEffect()
React.useEffect(() => {
  const init = async () => {
    const [{ pageSetupHandler }, { CourseBuilder }, ...] = await Promise.all([
      import("@/src/scripts/backend/courses/settings/pageSetupHandler"),
      import("@/src/scripts/backend/courses"),
      ...
    ]);
    
    // Instantiate vanilla classes that self-attach to the DOM
    new CourseBuilder();
    new ViewToggleHandler();
  };
  void init();
}, []);
```

**How it works:**
1. **React renders HTML** with specific `id` attributes (166 total) — forms, inputs, containers
2. **Vanilla TS imports run side-effects** on module load — many files have top-level `document.querySelector()` calls
3. **Vanilla TS classes self-initialize** — constructors call `querySelector` to find DOM nodes rendered by React
4. **Communication:** React → TS via `CustomEvent` dispatching (`window.dispatchEvent`), TS → DOM via direct manipulation

**Key problems with this pattern:**
- React has no visibility into DOM changes made by vanilla TS
- State is duplicated (React state vs. DOM state vs. sessionStorage)
- 166 `id` attributes create a brittle coupling surface
- No type safety between the React template and vanilla TS selectors
- Testing requires full browser environment (can't unit test)

---

## Recommended Migration Order

### Guiding Principles
1. **Logic-only files need no migration** — they can be imported directly as utilities
2. **Migrate DOM-heavy files that touch forms first** — highest impact, most React-native replacement
3. **PIXI.js canvas code stays vanilla** — the canvas engine is PIXI-specific, not DOM manipulation
4. **Delete dead code early** — reduces surface area

---

### Phase 0: Cleanup (Immediate, low risk)

**Delete or archive legacy dead code:**

| File | Lines | Action |
|------|------:|--------|
| `app.ts` | 125 | Delete (legacy entry point) |
| `encyclopedia.ts` | 692 | Delete (replaced by React) |
| `marketplace.ts` | 443 | Delete (unused) |
| `landing/landingPreview.ts` | 237 | Delete (only used by dead app.ts) |
| `navigation/GlobalNavigation.ts` | 399 | Delete (only used by dead app.ts) |
| `navigation/DashboardNavigation.ts` | 121 | Delete (only used by dead app.ts) |
| `backend/auth/auth.ts` | 555 | Delete (only used by dead app.ts) |

**Total: ~2,572 lines removed, 0 risk**

---

### Phase 1: Extract small utility forms into React (Easy wins)

Convert small, self-contained DOM-heavy files into React hooks/components. These files map cleanly to individual form sections in `coursebuilder-client.tsx`.

| Priority | File | Lines | Why First |
|----------|------|------:|-----------|
| 1.1 | `utils/courseId.ts` | 89 | Tiny, used everywhere, trivial React hook |
| 1.2 | `utils/tailwindState.ts` | 89 | Self-contained utility, make a hook |
| 1.3 | `coursebuilder/PanelToggle.ts` | 89 | 19 DOM hits, trivial `useState` toggle |
| 1.4 | `coursebuilder/KeyboardShortcuts.ts` | 70 | Simple `useEffect` with `addEventListener` |
| 1.5 | `navigation/CanvasScrollNav.ts` | 177 | 10 DOM hits, clean `useEffect` conversion |
| 1.6 | `backend/courses/templates/createTemplate.ts` | 146 | 10 DOM hits, single form handler |
| 1.7 | `backend/courses/templates/templateConfigHandler.ts` | 185 | 13 DOM hits, form config |
| 1.8 | `backend/courses/settings/languageLoader.ts` | 153 | 11 DOM hits, populates select dropdowns |
| 1.9 | `backend/courses/students/studentsModalController.ts` | 158 | 11 DOM hits, modal open/close → React state |
| 1.10 | `utils/staticCourseCardManager.ts` | 157 | 12 DOM hits, renders cards → React component |

**Total: ~1,313 lines, all 🟢 small files**

---

### Phase 2: Medium form handlers (Moderate effort)

These are the form sections in the coursebuilder setup panel. Each corresponds to a named section in `coursebuilder-client.tsx`.

| Priority | File | Lines | React Target |
|----------|------|------:|--------------|
| 2.1 | `backend/courses/generation/generationSettingsHandler.ts` | 215 | `<GenerationSettingsForm />` |
| 2.2 | `backend/courses/students/studentsPreview.ts` | 224 | `<StudentsPreviewList />` |
| 2.3 | `backend/courses/students/studentsManualManager.ts` | 262 | `<StudentsManualEntryModal />` |
| 2.4 | `backend/courses/students/studentsUploadManager.ts` | 364 | `<StudentsUploadModal />` |
| 2.5 | `backend/courses/essentials/createCourseCard.ts` | 290 | `<CourseEssentialsForm />` (card creation) |
| 2.6 | `backend/courses/settings/deleteCourse.ts` | 330 | `<DeleteCourseDialog />` |
| 2.7 | `backend/courses/settings/marginSettings.ts` | 375 | `<MarginSettingsForm />` |
| 2.8 | `coursebuilder/tools/EngineResizer.ts` | 235 | `useCanvasResize()` hook |
| 2.9 | `coursebuilder/tools/base/ToolManager.ts` | 348 | React context/provider for tool state |
| 2.10 | `backend/courses/templates/modals/loadTemplates.ts` | 353 | `<TemplateLibraryModal />` |

**Total: ~2,996 lines**

---

### Phase 3: Large form handlers (High effort, high impact)

| Priority | File | Lines | React Target |
|----------|------|------:|--------------|
| 3.1 | `backend/courses/settings/pageSetupHandler.ts` | 517 | `<PageSetupPanel />` with React Hook Form |
| 3.2 | `backend/courses/classification/classificationFormHandler.ts` | 626 | `<ClassificationForm />` with cascading selects |
| 3.3 | `backend/courses/pedagogy/pedagogyHandler.ts` | 600 | `<PedagogyForm />` |
| 3.4 | `navigation/CourseBuilderNavigation.ts` | 692 | Already handled by React section tabs in client |
| 3.5 | `navigation/CanvasNavigator.ts` | 259 | `<CanvasNavigator />` component |

**Total: ~2,694 lines**

---

### Phase 4: Monster files — CourseFormHandler & Schedule (Requires decomposition first)

| Priority | File | Lines | Strategy |
|----------|------|------:|----------|
| 4.1 | `backend/courses/shared/courseFormHandler.ts` | 1,716 | Split into per-form React hooks (essentials, classification, etc.) |
| 4.2 | `backend/courses/schedule/scheduleCourse.ts` | 1,699 | `<ScheduleBuilder />` component tree |
| 4.3 | `backend/courses/index.ts` | 547 | Eliminate barrel; direct imports |
| 4.4 | `media/ui/MediaInterface.ts` | 1,227 | `<MediaPanel />` component with provider pattern |

**Total: ~5,189 lines — decompose before migrating**

---

### Phase 5: Canvas engine (Selective migration only)

The PIXI.js canvas system should mostly remain as-is since PIXI works with its own canvas element, not the DOM. Migrate only the DOM-touching parts:

| Priority | File | Lines | Strategy |
|----------|------|------:|----------|
| 5.1 | `coursebuilder/canvas/EngineController.ts` | 1,155 | Extract DOM bindings into React; keep PIXI logic |
| 5.2 | `coursebuilder/canvas/CanvasEngine.ts` | 1,060 | Keep as-is; wrap in `useRef` |
| 5.3 | `coursebuilder/tools/build/TextTool.ts` | 253 | Extract DOM overlay into React component |
| 5.4 | `coursebuilder/utils/contentTypeSelect.ts` | 207 | Convert dropdown to React select |
| 5.5 | `coursebuilder/layout/pages/PageContainer.ts` | 584 | Keep PIXI rendering, extract config UI |

**Total: ~3,259 lines — hybrid approach (React wrapper + PIXI core)**

---

### Phase 6: Infrastructure files (Keep as utility modules)

These **81 Logic-only files (18,529 lines)** require **no migration**. They have zero DOM access and can be imported directly by React components:

- All `media/providers/*` — API clients
- All `coursebuilder/tools/build/*` (except TextTool) — PIXI tool implementations
- All `coursebuilder/tools/animate/*` — PIXI animation tools
- All `coursebuilder/layout/pages/renderers/*` — PIXI page renderers
- All `backend/courses/curriculum/utils/*` — data builders
- All `backend/courses/templates/` types and pure logic files
- All `backend/courses/students/` data types and repository files
- All `integration/utils/*` — data normalization
- `utils/logger.ts`, `utils/courseStatistics.ts`, `utils/UnitConverter.ts`
- `coursebuilder/config/toolConfig.ts`
- All type definition files

---

## Migration Strategy

### For each file migration:

1. **Extract logic** — Separate pure business logic (API calls, validation, data transforms) from DOM manipulation
2. **Create React hook or component** — Replace DOM manipulation with React state, refs, and event handlers
3. **Remove `id` attributes** — Replace `getElementById`/`querySelector` bindings with React refs or controlled components
4. **Update coursebuilder-client.tsx** — Replace the `import()` call with the new React component/hook
5. **Test** — Verify form submission, data flow, and visual parity

### Key architectural decisions:

| Decision | Recommendation |
|----------|---------------|
| Form state management | React Hook Form + Zod (already in project) |
| Data fetching | TanStack Query (already in project) |
| Canvas integration | Keep PIXI.js classes, wrap with `useRef` + `useEffect` |
| Cross-component state | React Context or Zustand for tool/canvas state |
| Modal management | Radix UI Dialog (already via shadcn/ui) |
| ID-based bindings | Replace all 166 `id` attributes with controlled components |

### Estimated total effort:

| Phase | Files | Lines | Effort |
|-------|------:|------:|--------|
| 0 — Cleanup | 7 | 2,572 | 1 day |
| 1 — Small utils | 10 | 1,313 | 3–4 days |
| 2 — Medium forms | 10 | 2,996 | 5–7 days |
| 3 — Large forms | 5 | 2,694 | 5–7 days |
| 4 — Monster files | 4 | 5,189 | 10–14 days |
| 5 — Canvas hybrid | 5 | 3,259 | 5–7 days |
| 6 — Keep as-is | 81 | 18,529 | 0 days |
| **Total** | **122** | **36,552** | **~29–40 days** |

*81 logic-only files (18,529 lines) need no migration. ~11,026 lines of dead code can be deleted.*

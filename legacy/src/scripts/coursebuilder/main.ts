/**
 * Coursebuilder — Single Entry Point
 *
 * This file replaces the 14 independent <script> tags that previously
 * loaded in coursebuilder.html. It provides:
 *
 *   1. A deterministic boot sequence — modules initialize in order
 *   2. DOM validation — all required elements are verified before
 *      any module tries to use them
 *   3. A clear dependency graph — you can see every import here
 *   4. Error containment — if any module fails, the boot sequence
 *      reports exactly which step failed
 *
 * Boot order:
 *   Phase 0: Error handlers (catch everything from the start)
 *   Phase 1: DOM registry (validate all elements exist)
 *   Phase 2: Auth + global navigation
 *   Phase 3: Coursebuilder navigation + view toggling
 *   Phase 4: Canvas system (PIXI.js engine, viewport, tools)
 *   Phase 5: Form handlers (classification, schedule, etc.)
 *   Phase 6: Media interface
 */

import { bootDOM } from '../core/dom';
import { state } from '../core/state';

// ─── Phase 0: Global error handlers ──────────────────────────────
// Install these FIRST so we catch any errors from subsequent imports.

function installErrorHandlers(): void {
  const PIXI_ERROR_PATTERNS = [
    'cannot read properties of null',
    'destroy',
    'batcher',
    'pool',
    'graphics',
    'batchablegraphics',
    'poolgroup',
    'globalresourceregistry',
    'cannot convert undefined or null to object',
    'glshadersystem',
    'object.keys',
  ];

  function isPixiError(message: string): boolean {
    const lower = message.toLowerCase();
    return PIXI_ERROR_PATTERNS.some((p) => lower.includes(p));
  }

  window.addEventListener('error', (event) => {
    if (event.error?.message && isPixiError(event.error.message)) {
      console.warn('⚠️ PIXI.js error (suppressed):', event.error.message);
      event.preventDefault();
      return;
    }
    console.error('Global error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message && isPixiError(event.reason.message)) {
      console.warn('⚠️ PIXI.js rejection (suppressed):', event.reason.message);
      event.preventDefault();
      return;
    }
    console.error('Unhandled promise rejection:', event.reason);
  });
}

installErrorHandlers();

// ─── Boot sequence ────────────────────────────────────────────────

async function boot(): Promise<void> {
  const t0 = performance.now();
  console.info('[Boot] Coursebuilder starting…');

  // ── Phase 1: DOM registry ─────────────────────────────
  try {
    bootDOM();
  } catch (err) {
    console.error('[Boot] FATAL: DOM validation failed. Aborting.', err);
    return; // Don't continue — the page is broken
  }

  // ── Phase 2: Auth + global navigation ─────────────────
  try {
    const [{ initAuth }, { initializeGlobalNavigation, initializeDashboardNavigation }] =
      await Promise.all([
        import('../backend/auth/auth'),
        import('../navigation/index'),
      ]);

    initAuth();
    initializeGlobalNavigation();
    initializeDashboardNavigation();
  } catch (err) {
    console.error('[Boot] Phase 2 (auth/nav) failed:', err);
    // Non-fatal — continue to load the builder
  }

  // ── Phase 3: Coursebuilder navigation ─────────────────
  try {
    // Initialize state from URL/session
    const urlParams = new URLSearchParams(window.location.search);
    const courseId =
      urlParams.get('courseId') ||
      urlParams.get('id') ||
      sessionStorage.getItem('currentCourseId');

    if (courseId) {
      state.set('courseId', courseId);
      state.set('isNewCourse', false);
    }

    // CourseBuilderNavigation, ViewToggleHandler, ModalHandler — self-init on import
    await import('../navigation/CourseBuilderNavigation');
  } catch (err) {
    console.error('[Boot] Phase 3 (navigation) failed:', err);
  }

  // ── Phase 4: Canvas system ────────────────────────────
  try {
    await Promise.all([
      import('../coursebuilder/canvas/canvasInit'),
      import('../coursebuilder/PanelToggle'),
      import('../coursebuilder/canvas/ViewportControls'),
      import('../coursebuilder/canvas/EngineController'),
      import('../coursebuilder/tools/ToolSystem'),
      import('../coursebuilder/KeyboardShortcuts'),
      import('../integration/CurriculumPageBridge'),
    ]);
  } catch (err) {
    console.error('[Boot] Phase 4 (canvas system) failed:', err);
  }

  // ── Phase 5: Engine resizer + form handlers ───────────
  try {
    await Promise.all([
      import('../coursebuilder/tools/EngineResizer'),
      import('../navigation/CanvasScrollNav'),
      import('../backend/courses/settings/languageLoader'),
      import('../backend/courses/index'),
      import('../backend/courses/classification/classificationFormHandler'),
      import('../backend/courses/templates/createTemplate'),
      import('../backend/courses/templates/templateConfigHandler'),
      import('../backend/courses/schedule/scheduleCourse'),
      import('../backend/courses/settings/pageSetupHandler'),
      import('../backend/courses/generation/generationSettingsHandler'),
      import('../backend/courses/pedagogy/pedagogyHandler'),
    ]);

    // Wire up page setup handler with course ID if available
    const courseId = state.get('courseId');
    if (courseId) {
      const { pageSetupHandler } = await import(
        '../backend/courses/settings/pageSetupHandler'
      );
      pageSetupHandler.setCourseId(courseId);
    }
  } catch (err) {
    console.error('[Boot] Phase 5 (form handlers) failed:', err);
  }

  // ── Phase 6: Media interface ──────────────────────────
  try {
    await import('../media/ui/MediaInterface');
  } catch (err) {
    console.error('[Boot] Phase 6 (media) failed:', err);
  }

  // ── Boot complete ─────────────────────────────────────
  const elapsed = (performance.now() - t0).toFixed(0);
  console.info(`[Boot] ✓ Coursebuilder ready in ${elapsed}ms`);
}

// ─── Trigger boot ─────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
} else {
  boot();
}

export {};

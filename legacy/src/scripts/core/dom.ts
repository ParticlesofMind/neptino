/**
 * DOM Registry for Coursebuilder
 *
 * Every DOM element the coursebuilder needs is declared here.
 * At boot, all elements are resolved in one pass. If any required
 * element is missing, boot fails LOUDLY with an actionable error
 * listing exactly which selectors didn't match.
 *
 * This eliminates the #1 source of silent failures: 48+ files
 * doing independent querySelector calls that return null and
 * silently skip their initialization.
 *
 * Usage:
 *   import { resolveCourseBuilderDOM } from '../core/dom';
 *   const dom = resolveCourseBuilderDOM(); // throws if anything critical is missing
 */

// ─── Type-safe element resolution helpers ─────────────────────────

function required<T extends Element>(
  selector: string,
  context: ParentNode = document,
): T {
  const el = context.querySelector<T>(selector);
  if (!el) throw new MissingElementError(selector);
  return el;
}

function requiredById<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id) as T | null;
  if (!el) throw new MissingElementError(`#${id}`);
  return el;
}

function optional<T extends Element>(
  selector: string,
  context: ParentNode = document,
): T | null {
  return context.querySelector<T>(selector);
}

function all<T extends Element>(
  selector: string,
  context: ParentNode = document,
): NodeListOf<T> {
  return context.querySelectorAll<T>(selector);
}

// ─── Error class ──────────────────────────────────────────────────

export class MissingElementError extends Error {
  constructor(selector: string) {
    super(
      `[DOM Registry] Required element not found: "${selector}"\n` +
      `Check that the HTML contains an element matching this selector.`,
    );
    this.name = 'MissingElementError';
  }
}

export class DOMRegistryError extends Error {
  constructor(missing: string[]) {
    super(
      `[DOM Registry] ${missing.length} required element(s) not found:\n` +
      missing.map((s) => `  ✗ ${s}`).join('\n') +
      `\n\nThe coursebuilder cannot start until these elements exist in the HTML.`,
    );
    this.name = 'DOMRegistryError';
  }
}

// ─── Registry interface ───────────────────────────────────────────

export interface CourseBuilderDOM {
  // ── Navigation ──────────────────────────────────────
  nextBtn: HTMLButtonElement;
  previousBtn: HTMLButtonElement;
  sections: NodeListOf<HTMLElement>;
  asideLinks: NodeListOf<HTMLAnchorElement>;

  // ── Canvas Scroll Nav ───────────────────────────────
  scrollInput: HTMLInputElement;
  scrollTotal: HTMLElement;
  scrollFirstBtn: HTMLButtonElement;
  scrollPrevBtn: HTMLButtonElement;
  scrollNextBtn: HTMLButtonElement;
  scrollLastBtn: HTMLButtonElement;

  // ── Engine Layout ───────────────────────────────────
  engines: NodeListOf<HTMLElement>;

  // ── Classification Form ─────────────────────────────
  classificationForm: HTMLFormElement | null;
  domainSelect: HTMLSelectElement | null;
  subjectSelect: HTMLSelectElement | null;
  topicSelect: HTMLSelectElement | null;
  subtopicSelect: HTMLSelectElement | null;
  classYearSelect: HTMLSelectElement | null;
  curricularFrameworkSelect: HTMLSelectElement | null;
  previousCourseSelect: HTMLSelectElement | null;
  currentCourseSelect: HTMLSelectElement | null;
  nextCourseSelect: HTMLSelectElement | null;

  // ── Language ────────────────────────────────────────
  courseLanguageSelect: HTMLSelectElement | null;

  // ── Templates ───────────────────────────────────────
  createTemplateBtn: HTMLButtonElement | null;
  loadTemplateBtn: HTMLButtonElement | null;
  templateStatus: HTMLElement | null;
  templatesSection: HTMLElement | null;
  generationSection: HTMLElement | null;

  // ── Schedule ────────────────────────────────────────
  scheduleConfig: HTMLElement | null;
  schedulePreview: HTMLElement | null;
  scheduleCourseBtn: HTMLButtonElement | null;
  deleteScheduleBtn: HTMLButtonElement | null;
  breakTimesList: HTMLElement | null;
  addBreakTimeBtn: HTMLButtonElement | null;
  scheduleSaveStatus: HTMLElement | null;

  // ── Page Setup ──────────────────────────────────────
  orientationRadios: NodeListOf<HTMLInputElement>;
  canvasSizeRadios: NodeListOf<HTMLInputElement>;
  unitsRadios: NodeListOf<HTMLInputElement>;

  // ── Generation Settings ─────────────────────────────
  generationSettingsForm: HTMLFormElement | null;
  generationSaveStatus: HTMLElement | null;

  // ── Pedagogy ────────────────────────────────────────
  pedagogyInput: HTMLInputElement | null;
  learningPlaneGrid: HTMLElement | null;
  pedagogyMarker: HTMLElement | null;
  pedagogyForm: HTMLFormElement | null;
  pedagogySaveStatus: HTMLElement | null;

  // ── Media ───────────────────────────────────────────
  mediaSearchInput: HTMLInputElement | null;
  engineSearchContainer: HTMLElement | null;
  mediaTabs: NodeListOf<HTMLElement>;
  canvasContainer: HTMLElement | null;
}

// ─── Resolver ─────────────────────────────────────────────────────

/**
 * Resolve all DOM elements the coursebuilder needs in a single pass.
 *
 * CRITICAL elements (navigation buttons, sections) throw if missing.
 * OPTIONAL elements (forms that only exist after section navigation)
 * are nullable and should be checked before use.
 *
 * Call this ONCE at boot, after DOMContentLoaded.
 */
export function resolveCourseBuilderDOM(): CourseBuilderDOM {
  const errors: string[] = [];

  // Helper that collects errors instead of throwing immediately
  function req<T extends Element>(selector: string): T {
    try {
      return required<T>(selector);
    } catch {
      errors.push(selector);
      return null as unknown as T;
    }
  }

  function reqId<T extends HTMLElement>(id: string): T {
    try {
      return requiredById<T>(id);
    } catch {
      errors.push(`#${id}`);
      return null as unknown as T;
    }
  }

  const dom: CourseBuilderDOM = {
    // ── Navigation (REQUIRED) ───────────────────────────
    nextBtn:      reqId<HTMLButtonElement>('next-btn'),
    previousBtn:  reqId<HTMLButtonElement>('previous-btn'),
    sections:     all<HTMLElement>('[data-coursebuilder-section]'),
    asideLinks:   all<HTMLAnchorElement>('.aside__link[data-section]'),

    // ── Canvas Scroll Nav (REQUIRED) ────────────────────
    scrollInput:    req<HTMLInputElement>('[data-engine-scroll-input]'),
    scrollTotal:    req<HTMLElement>('[data-engine-scroll-total]'),
    scrollFirstBtn: req<HTMLButtonElement>('[data-scroll="first"]'),
    scrollPrevBtn:  req<HTMLButtonElement>('[data-scroll="prev"]'),
    scrollNextBtn:  req<HTMLButtonElement>('[data-scroll="next"]'),
    scrollLastBtn:  req<HTMLButtonElement>('[data-scroll="last"]'),

    // ── Engine Layout (REQUIRED) ────────────────────────
    engines: all<HTMLElement>('.engine'),

    // ── Classification (OPTIONAL — section may not be visible) ──
    classificationForm:       optional<HTMLFormElement>('#course-classification-form'),
    domainSelect:             optional<HTMLSelectElement>('#domain-select'),
    subjectSelect:            optional<HTMLSelectElement>('#subject-select'),
    topicSelect:              optional<HTMLSelectElement>('#topic-select'),
    subtopicSelect:           optional<HTMLSelectElement>('#subtopic-select'),
    classYearSelect:          optional<HTMLSelectElement>('#class-year-select'),
    curricularFrameworkSelect:optional<HTMLSelectElement>('#curricular-framework-select'),
    previousCourseSelect:     optional<HTMLSelectElement>('#previous-course-select'),
    currentCourseSelect:      optional<HTMLSelectElement>('#current-course-select'),
    nextCourseSelect:         optional<HTMLSelectElement>('#next-course-select'),

    // ── Language (OPTIONAL) ─────────────────────────────
    courseLanguageSelect: optional<HTMLSelectElement>('#course-language'),

    // ── Templates (OPTIONAL) ────────────────────────────
    createTemplateBtn: optional<HTMLButtonElement>('#create-template-btn'),
    loadTemplateBtn:   optional<HTMLButtonElement>('#load-template-btn'),
    templateStatus:    optional<HTMLElement>('#template-status'),
    templatesSection:  optional<HTMLElement>('#templates'),
    generationSection: optional<HTMLElement>('#generation'),

    // ── Schedule (OPTIONAL) ─────────────────────────────
    scheduleConfig:    optional<HTMLElement>('#schedule-config'),
    schedulePreview:   optional<HTMLElement>('#schedule-preview'),
    scheduleCourseBtn: optional<HTMLButtonElement>('#schedule-course-btn'),
    deleteScheduleBtn: optional<HTMLButtonElement>('#delete-schedule-btn'),
    breakTimesList:    optional<HTMLElement>('#break-times-list'),
    addBreakTimeBtn:   optional<HTMLButtonElement>('#add-break-time-btn'),
    scheduleSaveStatus:optional<HTMLElement>('#schedule-save-status'),

    // ── Page Setup (collected, may be empty) ────────────
    orientationRadios: all<HTMLInputElement>('input[name="orientation"]'),
    canvasSizeRadios:  all<HTMLInputElement>('input[name="canvas-size"]'),
    unitsRadios:       all<HTMLInputElement>('input[name="units"]'),

    // ── Generation Settings (OPTIONAL) ──────────────────
    generationSettingsForm: optional<HTMLFormElement>('#generation-settings-form'),
    generationSaveStatus:   optional<HTMLElement>('#generation-save-status'),

    // ── Pedagogy (OPTIONAL) ─────────────────────────────
    pedagogyInput:      optional<HTMLInputElement>('#course-pedagogy-input'),
    learningPlaneGrid:  optional<HTMLElement>('[data-learning-plane-grid]'),
    pedagogyMarker:     optional<HTMLElement>('#pedagogy-marker'),
    pedagogyForm:       optional<HTMLFormElement>('#course-pedagogy-form'),
    pedagogySaveStatus: optional<HTMLElement>('#pedagogy-save-status'),

    // ── Media (OPTIONAL) ────────────────────────────────
    mediaSearchInput:       optional<HTMLInputElement>('#media-search-input'),
    engineSearchContainer:  optional<HTMLElement>('[data-engine-search]'),
    mediaTabs:              all<HTMLElement>('[data-media]'),
    canvasContainer:        optional<HTMLElement>('#canvas-container'),
  };

  // ── Fail loudly if required elements are missing ────────
  if (errors.length > 0) {
    const err = new DOMRegistryError(errors);
    console.error(err.message);
    // Show visual error in the page
    const banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:99999;' +
      'padding:16px 24px;background:#dc2626;color:white;font:14px/1.5 monospace;' +
      'white-space:pre-wrap;';
    banner.textContent = err.message;
    document.body.prepend(banner);
    throw err;
  }

  return dom;
}

// ─── Singleton access ─────────────────────────────────────────────

let _dom: CourseBuilderDOM | null = null;

/**
 * Get the resolved DOM registry. Must call `resolveCourseBuilderDOM()`
 * first during boot. After that, this returns the cached result.
 */
export function dom(): CourseBuilderDOM {
  if (!_dom) {
    throw new Error(
      '[DOM Registry] Not initialized. Call resolveCourseBuilderDOM() during boot.',
    );
  }
  return _dom;
}

/**
 * Boot the DOM registry. Call once after DOMContentLoaded.
 */
export function bootDOM(): CourseBuilderDOM {
  _dom = resolveCourseBuilderDOM();
  console.info(
    '[DOM Registry] ✓ All required elements resolved successfully.',
  );
  return _dom;
}

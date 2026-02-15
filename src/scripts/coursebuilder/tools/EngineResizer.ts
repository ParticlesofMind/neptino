const ENGINE_SELECTOR = '.engine';
const RESIZER_ATTRIBUTE = 'engine-resizer';
const RESIZER_DATA_KEY = 'engineResizer';
const STORAGE_KEY = 'neptino-engine-resizer-widths';

type ResizerConfig = {
  property: string;
  defaultWidth: number;
  min: number;
  max: number;
  visibleMin: number;
  collapseThreshold: number;
  invertDelta?: boolean;
};

const RESIZER_CONFIG = {
  search: {
    property: '--engine-search-width',
    defaultWidth: 320,
    min: 0,
    max: 420,
    visibleMin: 240,
    collapseThreshold: 200,
    invertDelta: false,
  },
  panel: {
    property: '--engine-panel-width',
    defaultWidth: 260,
    min: 0,
    max: 420,
    visibleMin: 220,
    collapseThreshold: 180,
    invertDelta: true,
  },
} as const satisfies Record<string, ResizerConfig>;

type ResizableRegion = keyof typeof RESIZER_CONFIG;

const KEYBOARD_STEP = 24;
const REGION_TARGETS = {
  search: '[data-engine-search]',
  panel: '[data-engine-panel]',
} as const;

const REGION_COLLAPSED_CLASSES = {
  search: 'hidden',
  panel: 'hidden',
} as const;

const loadSavedWidths = (): Partial<Record<ResizableRegion, number>> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const saveWidth = (region: ResizableRegion, width: number) => {
  try {
    const current = loadSavedWidths();
    current[region] = width;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Silently fail if localStorage is not available
  }
};

const toggleRegionCollapsed = (engine: HTMLElement, region: ResizableRegion, collapsed: boolean) => {
  const selector = REGION_TARGETS[region];
  const target = selector ? engine.querySelector<HTMLElement>(selector) : null;
  if (!target) {
    return;
  }

  target.classList.toggle(REGION_COLLAPSED_CLASSES[region], collapsed);
  target.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
};

const getNumericProperty = (element: HTMLElement, property: string, fallback: number): number => {
  const raw = getComputedStyle(element).getPropertyValue(property);
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const setRegionWidth = (engine: HTMLElement, region: ResizableRegion, rawValue: number) => {
  const config = RESIZER_CONFIG[region];
  const clamped = Math.min(config.max, Math.max(config.min, rawValue));
  const collapsed = clamped <= config.collapseThreshold;
  const width = collapsed ? config.min : Math.max(config.visibleMin, clamped);
  const finalWidth = collapsed ? config.min : Math.round(width);
  engine.style.setProperty(config.property, `${finalWidth}px`);
  toggleRegionCollapsed(engine, region, collapsed);
  
  // Save the width to localStorage
  saveWidth(region, finalWidth);
};

const handlePointerResize = (
  engine: HTMLElement,
  handle: HTMLButtonElement,
  region: ResizableRegion,
  downEvent: PointerEvent,
) => {
  const config = RESIZER_CONFIG[region];
  const startWidth = getNumericProperty(engine, config.property, config.defaultWidth);
  const startX = downEvent.clientX;
  const pointerId = downEvent.pointerId;

  handle.focus();
  handle.setPointerCapture(pointerId);
  // Subtle visual feedback during drag (no ring)

  const previousCursor = document.body.style.cursor;
  const previousUserSelect = document.body.style.userSelect;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  const onPointerMove = (event: PointerEvent) => {
    const delta = event.clientX - startX;
    const width = config.invertDelta ? startWidth - delta : startWidth + delta;
    setRegionWidth(engine, region, width);
  };

  const teardown = () => {
    if (handle.hasPointerCapture(pointerId)) {
      handle.releasePointerCapture(pointerId);
    }

    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousUserSelect;

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerId === pointerId) {
      teardown();
    }
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
};

const handleKeyboardResize = (engine: HTMLElement, _handle: HTMLButtonElement, region: ResizableRegion, event: KeyboardEvent) => {
  const config = RESIZER_CONFIG[region];
  const currentWidth = getNumericProperty(engine, config.property, config.defaultWidth);
  const step = event.shiftKey ? KEYBOARD_STEP * 2 : KEYBOARD_STEP;

  let nextWidth = currentWidth;

  switch (event.key) {
    case 'ArrowLeft':
      nextWidth = config.invertDelta ? currentWidth + step : currentWidth - step;
      break;
    case 'ArrowRight':
      nextWidth = config.invertDelta ? currentWidth - step : currentWidth + step;
      break;
    case 'Home':
      nextWidth = config.min;
      break;
    case 'End':
      nextWidth = config.max;
      break;
    default:
      return;
  }

  event.preventDefault();
  setRegionWidth(engine, region, nextWidth);
};

const initEngineResizer = (engine: HTMLElement) => {
  const savedWidths = loadSavedWidths();
  
  (Object.keys(RESIZER_CONFIG) as ResizableRegion[]).forEach((region) => {
    const config = RESIZER_CONFIG[region];
    // Use saved width if available, otherwise use current or default
    const savedWidth = savedWidths[region];
    const currentWidth = getNumericProperty(engine, config.property, config.defaultWidth);
    const initialWidth = savedWidth ?? currentWidth;
    setRegionWidth(engine, region, initialWidth);
  });

  const handles = engine.querySelectorAll<HTMLButtonElement>(`[data-${RESIZER_ATTRIBUTE}]`);

  handles.forEach((handle) => {
    const region = handle.dataset[RESIZER_DATA_KEY] as ResizableRegion | undefined;

    if (!region || !(region in RESIZER_CONFIG)) {
      return;
    }

    handle.addEventListener('pointerdown', (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      handlePointerResize(engine, handle, region, event);
    });

    handle.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
        handleKeyboardResize(engine, handle, region, event);
      }
    });
  });
};

const bootstrapResizers = () => {
  const engines = document.querySelectorAll<HTMLElement>(ENGINE_SELECTOR);

  if (!engines.length) {
    return;
  }

  engines.forEach(initEngineResizer);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapResizers, { once: true });
} else {
  bootstrapResizers();
}

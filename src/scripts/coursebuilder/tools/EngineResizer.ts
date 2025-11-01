const ENGINE_SELECTOR = '.engine';
const RESIZER_ATTRIBUTE = 'engine-resizer';
const RESIZER_DATA_KEY = 'engineResizer';
const WIDTH_PROPERTIES = {
  content: '--engine-content-width',
  panel: '--engine-panel-width',
} as const;

type ResizableRegion = keyof typeof WIDTH_PROPERTIES;

const KEYBOARD_STEP = 24;
const SNAP_THRESHOLD = 24;

const getNumericProperty = (element: HTMLElement, property: string, fallback: number): number => {
  const raw = getComputedStyle(element).getPropertyValue(property);
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const setRegionWidth = (engine: HTMLElement, property: string, value: number): void => {
  const width = Math.max(0, value);
  const snapped = width < SNAP_THRESHOLD ? 0 : width;
  engine.style.setProperty(property, `${Math.round(snapped)}px`);
};

const handlePointerResize = (
  engine: HTMLElement,
  handle: HTMLButtonElement,
  region: ResizableRegion,
  downEvent: PointerEvent,
): void => {
  const property = WIDTH_PROPERTIES[region];
  const startWidth = getNumericProperty(engine, property, region === 'content' ? 320 : 260);
  const startX = downEvent.clientX;
  const pointerId = downEvent.pointerId;

  handle.focus();
  handle.setPointerCapture(pointerId);
  handle.classList.add('engine__resizer--active');

  const previousCursor = document.body.style.cursor;
  const previousUserSelect = document.body.style.userSelect;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  const onPointerMove = (event: PointerEvent): void => {
    const delta = event.clientX - startX;
    const width = region === 'content' ? startWidth + delta : startWidth - delta;
    setRegionWidth(engine, property, width);
  };

  const teardown = (): void => {
    if (handle.hasPointerCapture(pointerId)) {
      handle.releasePointerCapture(pointerId);
    }

    handle.classList.remove('engine__resizer--active');
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousUserSelect;

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId === pointerId) {
      teardown();
    }
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
};

const handleKeyboardResize = (engine: HTMLElement, handle: HTMLButtonElement, region: ResizableRegion, event: KeyboardEvent): void => {
  const property = WIDTH_PROPERTIES[region];
  const currentWidth = getNumericProperty(engine, property, region === 'content' ? 320 : 260);
  const step = event.shiftKey ? KEYBOARD_STEP * 2 : KEYBOARD_STEP;

  let nextWidth = currentWidth;

  switch (event.key) {
    case 'ArrowLeft':
      nextWidth = region === 'content' ? currentWidth - step : currentWidth + step;
      break;
    case 'ArrowRight':
      nextWidth = region === 'content' ? currentWidth + step : currentWidth - step;
      break;
    case 'Home':
      nextWidth = 0;
      break;
    default:
      return;
  }

  event.preventDefault();
  setRegionWidth(engine, property, nextWidth);
};

const initEngineResizer = (engine: HTMLElement): void => {
  const handles = engine.querySelectorAll<HTMLButtonElement>(`[data-${RESIZER_ATTRIBUTE}]`);

  handles.forEach((handle) => {
    const region = handle.dataset[RESIZER_DATA_KEY] as ResizableRegion | undefined;

    if (!region || !(region in WIDTH_PROPERTIES)) {
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
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home') {
        handleKeyboardResize(engine, handle, region, event);
      }
    });
  });
};

const bootstrapResizers = (): void => {
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

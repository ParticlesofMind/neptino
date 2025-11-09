// Pedagogy coordinate UI handler
// - Draggable/clickable 2D grid maps to X/Y (-100..100)
// - Updates hidden input `course_pedagogy` with JSON string {x,y}
// - Triggers CourseFormHandler autosave via input/change events
// - Verifies DB column existence and warns/block-saves if missing

import { supabase } from "../../supabase";

type XY = { x: number; y: number };

function getEl<T extends Element = Element>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round(n: number) {
  return Math.round(n);
}

function getInput(): HTMLInputElement | null {
  return getEl<HTMLInputElement>('#course-pedagogy-input');
}

function parseStored(value: string | XY | null): XY | null {
  if (value === null || value === undefined) return null;

  const coerce = (candidate: unknown): XY | null => {
    if (candidate === null || candidate === undefined) return null;

    if (typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      const x = Number(record.x);
      const y = Number(record.y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x: clamp(x, -100, 100), y: clamp(y, -100, 100) };
      }
      return null;
    }

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (!trimmed) {
        return null;
      }

      try {
        const parsed = JSON.parse(trimmed);
        const coerced = coerce(parsed);
        if (coerced) {
          return coerced;
        }
      } catch (error) {
        console.warn('Failed to parse pedagogy value:', error);
      }

      const presets: Record<string, XY> = {
        traditional: { x: -75, y: -75 },
        progressive: { x: 75, y: 75 },
        'guided discovery': { x: -25, y: 75 },
        balanced: { x: 0, y: 0 },
        behaviorism: { x: -75, y: -75 },
        cognitivism: { x: 0, y: 50 },
        constructivism: { x: 25, y: 75 },
        connectivism: { x: 75, y: 50 },
      };
      const lower = trimmed.toLowerCase();
      if (lower in presets) {
        return presets[lower];
      }
    }
    return null;
  };

  const result = coerce(value);
  if (result) {
    return result;
  }

  return null;
}

function resolveCurrentCourseId(): string | null {
  if (typeof window === 'undefined') return null;

  const globalId = (window as any).currentCourseId;
  if (typeof globalId === 'string' && globalId && globalId !== 'undefined') {
    return globalId;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get('courseId') || urlParams.get('id');
  if (typeof urlId === 'string' && urlId && urlId !== 'undefined') {
    return urlId;
  }

  try {
    const sessionId = sessionStorage.getItem('currentCourseId');
    if (typeof sessionId === 'string' && sessionId && sessionId !== 'undefined') {
      return sessionId;
    }
  } catch (error) {
    console.warn('Unable to read course ID from sessionStorage:', error);
  }

  return null;
}

function getPedagogyStatusElements(): {
  container: HTMLElement | null;
  text: HTMLElement | null;
} {
  const container = document.getElementById(
    'pedagogy-save-status',
  ) as HTMLElement | null;
  const text = container?.querySelector(
    '.card__text',
  ) as HTMLElement | null;
  return { container, text };
}

function setPedagogyStatus(
  state: "empty" | "saving" | "saved" | "error",
  message: string,
): void {
  const { container, text } = getPedagogyStatusElements();
  if (!container || !text) return;
  container.dataset.status = state;
  text.textContent = message;
}

function resetPedagogyStatusIfError(): void {
  const { container } = getPedagogyStatusElements();
  if (!container) return;
  if (container.dataset.status === "error") {
    setPedagogyStatus("empty", "No data submitted yet");
  }
}

function formatSubtitle(x: number, y: number) {
  const xLabel = x <= -50 ? 'Essentialist' : x >= 50 ? 'Progressive' : 'Balanced';
  const yLabel = y <= -50 ? 'Behaviorist' : y >= 50 ? 'Constructivist' : 'Balanced';
  return `Learning Control: ${xLabel} • Knowledge: ${yLabel}`;
}

function approachName(x: number, y: number) {
  if (Math.abs(x) <= 10 && Math.abs(y) <= 10) return 'Balanced';
  if (x >= 50 && y >= 50) return 'Progressive';
  if (x <= -50 && y >= 50) return 'Guided Discovery';
  if (x <= -50 && y <= -50) return 'Traditional';
  if (x >= 50 && y <= -50) return 'Structured Practice';
  const xLabel = x < 0 ? 'Essentialist' : 'Progressive';
  const yLabel = y < 0 ? 'Behaviorist' : 'Constructivist';
  return `${yLabel} × ${xLabel}`;
}

function approachDescription(x: number, y: number) {
  if (Math.abs(x) <= 10 && Math.abs(y) <= 10)
    return 'A balanced blend of teacher guidance, student agency, and mixed knowledge construction.';
  if (x >= 50 && y >= 50)
    return 'Inquiry-driven, collaborative learning emphasizing active construction of knowledge.';
  if (x <= -50 && y >= 50)
    return 'Teacher-curated challenges and scaffolds that promote discovery and meaning-making.';
  if (x <= -50 && y <= -50)
    return 'Direct, teacher-led instruction with structured, individual practice and clear standards.';
  if (x >= 50 && y <= -50)
    return 'Goal-oriented application with coaching, feedback, and incremental skill building.';
  const xPart = x < 0 ? 'teacher guidance' : 'student agency';
  const yPart = y < 0 ? 'practice and reinforcement' : 'active inquiry and construction';
  return `Blended approach combining ${xPart} with ${yPart}.`;
}

function effectsBullets(x: number, y: number): string[] {
  const bullets: string[] = [];
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const left = x < 0;
  const bottom = y < 0;

  // Instructional approach (X axis - Control)
  if (left) {
    bullets.push('Teacher provides direct instruction with clear modeling and examples');
    bullets.push(ax > 50 ? 'Students complete individual practice to master skills' : 'Structured group work with defined roles and tasks');
  } else {
    bullets.push('Students lead collaboration and engage in peer teaching');
    bullets.push(ax > 50 ? 'Open-ended tasks allow student choice and autonomy' : 'Guided collaboration with teacher checkpoints');
  }

  // Knowledge construction (Y axis - Epistemology)
  if (bottom) {
    bullets.push(ay > 50 ? 'Emphasis on retrieval practice and spaced rehearsal' : 'Students practice skills with immediate feedback');
    bullets.push('Learning progresses through worked examples and step-by-step skill building');
  } else {
    bullets.push(ay > 50 ? 'Students learn through inquiry, experimentation, and projects' : 'Applied exploration supported by teacher scaffolds');
    bullets.push('Regular reflection and metacognitive prompts deepen understanding');
  }

  // Assessment approach
  if (bottom && left) {
    bullets.push('Assessment uses criterion-referenced rubrics and mastery checks');
  } else if (!bottom && !left) {
    bullets.push('Rubrics emphasize process, creativity, and collaborative skills');
  } else if (bottom && !left) {
    bullets.push('Performance-based tasks with coaching and opportunities for iteration');
  } else {
    bullets.push('Assessment targets conceptual understanding with scaffolded support');
  }

  // Lesson structure
  if (left && bottom) {
    bullets.push('Lessons follow: mini-lecture, demonstration, independent practice pattern');
  } else if (!left && !bottom) {
    bullets.push('Lessons follow: launch problem, group inquiry, synthesize and share pattern');
  } else if (left && !bottom) {
    bullets.push('Lessons follow: mini-lesson, guided discovery, group debrief pattern');
  } else {
    bullets.push('Lessons follow workshop model with individual conferencing');
  }

  return bullets.slice(0, 6);
}

function attachPedagogyGrid() {
  const input = getInput();
  const grid = getEl<HTMLElement>('.learning-plane__grid');
  const marker = getEl<HTMLElement>('#pedagogy-marker');
  const xOut = getEl<HTMLElement>('#pedagogy-x');
  const yOut = getEl<HTMLElement>('#pedagogy-y');
  const titleEl = getEl<HTMLElement>('#pedagogy-approach-title');
  const subtitleEl = getEl<HTMLElement>('#pedagogy-approach-subtitle');
  const descEl = getEl<HTMLElement>('#pedagogy-approach-desc');
  const listEl = getEl<HTMLUListElement>('#pedagogy-effects-list');
  const presetButtons = document.querySelectorAll<HTMLButtonElement>('.button--preset');
  const form = input?.closest('form') as HTMLFormElement | null;

  if (!input || !grid || !marker || !xOut || !yOut || !titleEl || !subtitleEl || !descEl || !listEl) {
    console.warn('Pedagogy UI: Missing required elements', {
      input: !!input,
      grid: !!grid,
      marker: !!marker,
      xOut: !!xOut,
      yOut: !!yOut,
      titleEl: !!titleEl,
      subtitleEl: !!subtitleEl,
      descEl: !!descEl,
      listEl: !!listEl,
    });
    return;
  }

  console.log('✅ Pedagogy UI initialized successfully');

  grid.style.touchAction = 'none';
  grid.style.cursor = 'pointer';

  const SAVE_DEBOUNCE_MS = 600;

  let state: XY = { x: 0, y: 0 };
  let latestSerialized = input.value || '';
  let lastSavedSerialized = input.value || '';
  let pendingPayload: XY | null = null;
  let pendingSerialized: string | null = null;
  let saveTimer: number | null = null;
  let inflightSave: Promise<void> | null = null;
  let attemptedRemoteSync = false;
  let missingCourseWarned = false;
  let suppressPersistedTracking = false;

  function formatSavedTimestamp(now: Date): string {
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `Saved at ${hours}:${minutes}`;
  }

  function renderMarker() {
    if (!marker) return;
    const leftPct = ((state.x + 100) / 200) * 100;
    const topPct = (1 - (state.y + 100) / 200) * 100;
    marker.style.left = `${leftPct}%`;
    marker.style.top = `${topPct}%`;
  }

  function renderOutputs() {
    if (!xOut || !yOut || !titleEl || !subtitleEl || !descEl || !listEl) return;
    
    xOut.textContent = String(round(state.x));
    yOut.textContent = String(round(state.y));

    const name = approachName(state.x, state.y);
    titleEl.textContent = name;
    subtitleEl.textContent = formatSubtitle(state.x, state.y);
    descEl.textContent = approachDescription(state.x, state.y);

    listEl.innerHTML = '';
    for (const item of effectsBullets(state.x, state.y)) {
      const li = document.createElement('li');
      li.textContent = item;
      listEl.appendChild(li);
    }
  }

  async function syncFromDatabase(): Promise<void> {
    const courseId = resolveCurrentCourseId();
    if (!courseId || !input) return;

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('course_pedagogy')
        .eq('id', courseId)
        .single();

      if (error || !data) {
        if (error) {
          console.warn('Unable to load saved pedagogy coordinates:', error);
        }
        return;
      }

      const pedagogy = (data as { course_pedagogy?: unknown }).course_pedagogy;
      const parsed = parseStored(
        pedagogy === null || pedagogy === undefined
          ? null
          : typeof pedagogy === 'string' || (typeof pedagogy === 'object' && pedagogy !== null && 'x' in pedagogy && 'y' in pedagogy)
          ? (pedagogy as string | XY)
          : null
      );
      if (!parsed) return;

      state = parsed;
      renderMarker();
      renderOutputs();

      const payload = { x: round(state.x), y: round(state.y) };
      const serialized = JSON.stringify(payload);
      input.value = serialized;
      latestSerialized = serialized;
      lastSavedSerialized = serialized;
      resetPedagogyStatusIfError();
    } catch (err) {
      console.warn('Unexpected error while loading saved pedagogy coordinates:', err);
    }
  }

  function persistPedagogy(courseId: string, payload: XY, serialized: string): void {
    inflightSave = (async () => {
      try {
        const { error } = await supabase
          .from('courses')
          .update({ course_pedagogy: payload })
          .eq('id', courseId);

        if (error) {
          throw error;
        }

        lastSavedSerialized = serialized;
        missingCourseWarned = false;
        setPedagogyStatus('saved', formatSavedTimestamp(new Date()));
      } catch (error) {
        console.error('Failed to save pedagogy coordinates:', error);
        setPedagogyStatus('error', 'Failed to save pedagogy. Try again.');
      } finally {
        inflightSave = null;
      }
    })();
  }

  function queuePersist(payload: XY, serialized: string): void {
    latestSerialized = serialized;

    if (serialized === lastSavedSerialized && !inflightSave) {
      return;
    }

    if (form?.dataset.blockSave === 'true') {
      return;
    }

    const courseIdHint = resolveCurrentCourseId();
    if (!courseIdHint) {
      if (!missingCourseWarned) {
        setPedagogyStatus('error', 'Create the course before saving pedagogy.');
        missingCourseWarned = true;
      }
      return;
    }

    pendingPayload = { ...payload };
    pendingSerialized = serialized;

    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }

    setPedagogyStatus('saving', 'Saving pedagogy…');
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      const courseId = resolveCurrentCourseId();
      if (!courseId) {
        if (!missingCourseWarned) {
          setPedagogyStatus('error', 'Create the course before saving pedagogy.');
          missingCourseWarned = true;
        }
        return;
      }

      if (form?.dataset.blockSave === 'true') {
        return;
      }

      const payloadToSave = pendingPayload;
      const serializedToSave = pendingSerialized;
      pendingPayload = null;
      pendingSerialized = null;

      if (!payloadToSave || !serializedToSave) {
        return;
      }

      persistPedagogy(courseId, payloadToSave, serializedToSave);
    }, SAVE_DEBOUNCE_MS);
  }

  function saveHidden() {
    if (!input) return;
    
    const payload = { x: round(state.x), y: round(state.y) };
    const serialized = JSON.stringify(payload);
    suppressPersistedTracking = true;
    try {
      input.value = serialized;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } finally {
      suppressPersistedTracking = false;
    }
    queuePersist(payload, serialized);
  }

  function setFromXY(x: number, y: number) {
    state.x = clamp(x, -100, 100);
    state.y = clamp(y, -100, 100);
    renderMarker();
    renderOutputs();
    saveHidden();
  }

  function setFromEvent(clientX: number, clientY: number) {
    if (!grid) return;
    
    const rect = grid.getBoundingClientRect();
    const relX = clamp(clientX - rect.left, 0, rect.width);
    const relY = clamp(clientY - rect.top, 0, rect.height);
    const x = (relX / rect.width) * 200 - 100;
    const y = (1 - relY / rect.height) * 200 - 100;
    setFromXY(x, y);
  }

  // Pointer interactions
  let dragging = false;
  grid.addEventListener('pointerdown', (e) => {
    const event = e as PointerEvent;
    event.preventDefault();
    dragging = true;
    grid.setPointerCapture?.(event.pointerId);
    setFromEvent(event.clientX, event.clientY);
  });
  grid.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const event = e as PointerEvent;
    event.preventDefault();
    setFromEvent(event.clientX, event.clientY);
  });
  const endDrag = (e?: PointerEvent) => {
    dragging = false;
    if (e?.pointerId !== undefined) {
      grid.releasePointerCapture?.(e.pointerId);
    }
  };
  grid.addEventListener('pointerup', (e) => endDrag(e as PointerEvent));
  grid.addEventListener('pointerleave', (e) => endDrag(e as PointerEvent));

  // Presets
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const x = Number(btn.getAttribute('data-x'));
      const y = Number(btn.getAttribute('data-y'));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      setFromXY(x, y);
    });
  });

  const applyInitial = (val: string | XY | null) => {
    const parsed = parseStored(val);
    if (parsed) {
      state = parsed;
      renderMarker();
      renderOutputs();

      if (input.value) {
        latestSerialized = input.value;
      } else {
        const canonical = JSON.stringify({ x: round(state.x), y: round(state.y) });
        input.value = canonical;
        latestSerialized = canonical;
      }
      if (!suppressPersistedTracking) {
        lastSavedSerialized = latestSerialized;
      }
      resetPedagogyStatusIfError();
      return;
    }

    state = { x: 0, y: 0 };
    renderMarker();
    renderOutputs();

    if (!attemptedRemoteSync) {
      attemptedRemoteSync = true;
      void syncFromDatabase();
    }
  };

  applyInitial(input.value || null);

  // Retry briefly in case CourseFormHandler populates asynchronously
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (input.value) {
      clearInterval(timer);
      applyInitial(input.value);
    } else if (tries > 15) {
      clearInterval(timer);
    }
  }, 200);

  // Keep UI in sync if value is set programmatically later
  input.addEventListener('input', () => applyInitial(input.value || null));
  input.addEventListener('change', () => applyInitial(input.value || null));

  // Verify DB column exists; if not, block autosave and show warning
  verifyPedagogyColumn();
}

async function verifyPedagogyColumn() {
  const form = document.querySelector('#course-pedagogy-form') as HTMLFormElement | null;
  if (!form) return;

  try {
    const courseId = resolveCurrentCourseId();
    let query = supabase.from('courses').select('course_pedagogy').limit(1);
    if (courseId) {
      query = query.eq('id', courseId);
    }

    const { error } = await query;
    if (error) {
      const message = String(error.message || '').toLowerCase();
      const code = (error as { code?: string }).code;
      const missingColumn = code === '42703' || message.includes('column') && message.includes('course_pedagogy');

      if (missingColumn) {
        // Only show pedagogy column warning if we're actually on the pedagogy section
        if (window.location.hash === '#pedagogy' || document.querySelector('#pedagogy:not([style*="display: none"])')) {
          form.dataset.blockSave = 'true';
          setPedagogyStatus(
            "error",
            'Pedagogy cannot be saved: missing column course_pedagogy. Ask an admin to run the migration.',
          );
          console.warn('⚠️ Course pedagogy column missing - saving blocked for pedagogy section');
        } else {
          form.dataset.blockSave = 'true';
        }
        return;
      }

      console.warn('Pedagogy column verification failed but will not block saving:', error);
    }

    form.dataset.blockSave = 'false';
    resetPedagogyStatusIfError();
  } catch (err) {
    console.warn('Pedagogy column verification encountered an unexpected issue but saving remains enabled:', err);
    form.dataset.blockSave = 'false';
    resetPedagogyStatusIfError();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachPedagogyGrid);
} else {
  attachPedagogyGrid();
}

export {};

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

function parseStored(value: string | null): XY | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: clamp(parsed.x, -100, 100), y: clamp(parsed.y, -100, 100) };
    }
  } catch {}

  const presets: Record<string, XY> = {
    Traditional: { x: -75, y: -75 },
    Progressive: { x: 75, y: 75 },
    'Guided Discovery': { x: -25, y: 75 },
    Balanced: { x: 0, y: 0 },
    Behaviorism: { x: -75, y: -75 },
    Cognitivism: { x: 0, y: 50 },
    Constructivism: { x: 25, y: 75 },
    Connectivism: { x: 75, y: 50 },
  };
  if (value in presets) return presets[value];
  return null;
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

function impactBullets(x: number, y: number): string[] {
  const bullets: string[] = [];
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const left = x < 0;
  const bottom = y < 0;

  // Control dimension (X)
  if (left) {
    bullets.push('Direct instruction with clear modeling');
    bullets.push(ax > 50 ? 'Individual practice emphasized' : 'Structured group work with roles');
  } else {
    bullets.push('Student-led collaboration and peer teaching');
    bullets.push(ax > 50 ? 'Open-ended tasks and choice' : 'Guided collaboration with checkpoints');
  }

  // Knowledge dimension (Y)
  if (bottom) {
    bullets.push(ay > 50 ? 'Retrieval practice and spaced rehearsal' : 'Guided practice with feedback');
    bullets.push('Worked examples and stepwise skill-building');
  } else {
    bullets.push(ay > 50 ? 'Inquiry, experimentation, and project work' : 'Applied exploration with scaffolds');
    bullets.push('Reflection and metacognitive prompts');
  }

  // Assessment focus
  if (bottom && left) {
    bullets.push('Criterion-referenced rubrics, mastery checks');
  } else if (!bottom && !left) {
    bullets.push('Rubrics valuing process, creativity, and collaboration');
  } else if (bottom && !left) {
    bullets.push('Performance tasks with coaching and iteration');
  } else {
    bullets.push('Conceptual understanding with targeted scaffolds');
  }

  // Delivery pattern
  if (left && bottom) {
    bullets.push('Short teacher-led segments → independent practice');
  } else if (!left && !bottom) {
    bullets.push('Launch → group inquiry → synthesize and share');
  } else if (left && !bottom) {
    bullets.push('Mini-lesson → guided discovery → debrief');
  } else {
    bullets.push('Workshop model with conferencing');
  }

  return bullets.slice(0, 6);
}

function attachPedagogyGrid() {
  const input = getInput();
  const grid = getEl<HTMLElement>('#pedagogy-grid');
  const marker = getEl<HTMLElement>('#pedagogy-marker');
  const xOut = getEl<HTMLElement>('#pedagogy-x');
  const yOut = getEl<HTMLElement>('#pedagogy-y');
  const titleEl = getEl<HTMLElement>('#pedagogy-approach-title');
  const subtitleEl = getEl<HTMLElement>('#pedagogy-approach-subtitle');
  const descEl = getEl<HTMLElement>('#pedagogy-approach-desc');
  const listEl = getEl<HTMLUListElement>('#pedagogy-impact-list');
  const presetButtons = document.querySelectorAll<HTMLButtonElement>('.button--preset');

  if (!input || !grid || !marker || !xOut || !yOut || !titleEl || !subtitleEl || !descEl || !listEl) return;

  let state: XY = { x: 0, y: 0 };

  function renderMarker() {
    const leftPct = ((state.x + 100) / 200) * 100;
    const topPct = (1 - (state.y + 100) / 200) * 100;
    marker!.style.left = `${leftPct}%`;
    marker!.style.top = `${topPct}%`;
  }

  function renderOutputs() {
    xOut!.textContent = String(round(state.x));
    yOut!.textContent = String(round(state.y));

    const name = approachName(state.x, state.y);
    titleEl!.textContent = name;
    subtitleEl!.textContent = formatSubtitle(state.x, state.y);
    descEl!.textContent = approachDescription(state.x, state.y);

    listEl!.innerHTML = '';
    for (const item of impactBullets(state.x, state.y)) {
      const li = document.createElement('li');
      li.textContent = item;
      listEl!.appendChild(li);
    }
  }

  function saveHidden() {
    input!.value = JSON.stringify({ x: round(state.x), y: round(state.y) });
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    input!.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setFromXY(x: number, y: number) {
    state.x = clamp(x, -100, 100);
    state.y = clamp(y, -100, 100);
    renderMarker();
    renderOutputs();
    saveHidden();
  }

  function setFromEvent(clientX: number, clientY: number) {
    const rect = grid!.getBoundingClientRect();
    const relX = clamp(clientX - rect.left, 0, rect.width);
    const relY = clamp(clientY - rect.top, 0, rect.height);
    const x = (relX / rect.width) * 200 - 100; // -100 .. 100
    const y = (1 - relY / rect.height) * 200 - 100; // -100 .. 100 (top positive)
    setFromXY(x, y);
  }

  // Pointer interactions
  let dragging = false;
  grid.addEventListener('pointerdown', (e) => {
    dragging = true;
    (e.target as Element)?.setPointerCapture?.((e as PointerEvent).pointerId);
    setFromEvent((e as PointerEvent).clientX, (e as PointerEvent).clientY);
  });
  grid.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    setFromEvent((e as PointerEvent).clientX, (e as PointerEvent).clientY);
  });
  const endDrag = () => { dragging = false; };
  grid.addEventListener('pointerup', endDrag);
  grid.addEventListener('pointerleave', endDrag);

  // Presets
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const x = Number(btn.getAttribute('data-x'));
      const y = Number(btn.getAttribute('data-y'));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      setFromXY(x, y);
    });
  });

  // Initialize from stored or default
  const applyInitial = (val: string | null) => {
    const parsed = parseStored(val);
    if (parsed) {
      state = parsed;
    } else {
      state = { x: 0, y: 0 };
    }
    renderMarker();
    renderOutputs();
    // Do not save back immediately if value came from DB (avoid redundant autosave)
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
  const statusDiv = document.querySelector('#pedagogy-save-status .save-status__text') as HTMLElement | null;
  if (!form) return;

  try {
    const { error } = await supabase.from('courses').select('course_pedagogy').limit(1);
    if (error) throw error;
    form.dataset.blockSave = 'false';
    if (statusDiv) {
      statusDiv.textContent = 'Changes will be saved automatically';
      statusDiv.className = 'save-status__text';
    }
  } catch (err: any) {
    form.dataset.blockSave = 'true';
    if (statusDiv) {
      statusDiv.textContent = 'Pedagogy cannot be saved: missing column course_pedagogy. Ask an admin to run the migration.';
      statusDiv.className = 'save-status__text save-status__text--error';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachPedagogyGrid);
} else {
  attachPedagogyGrid();
}

export {};

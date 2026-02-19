/**
 * App State Store
 *
 * Single source of truth for coursebuilder application state.
 * Replaces the pattern where state is scattered across DOM mutations
 * (classList, hidden attributes, sessionStorage) that 48+ files
 * read and write independently.
 *
 * Modules subscribe to state changes instead of querying the DOM
 * to figure out what's happening.
 *
 * Usage:
 *   import { state } from '../core/state';
 *
 *   // Read
 *   const id = state.get('courseId');
 *
 *   // Write (notifies all subscribers)
 *   state.set('courseId', 'abc-123');
 *
 *   // Subscribe to changes
 *   const unsub = state.subscribe('courseId', (newValue, oldValue) => {
 *     console.log(`Course changed from ${oldValue} to ${newValue}`);
 *   });
 */

// ─── State shape ──────────────────────────────────────────────────

export interface AppState {
  // Navigation
  activeSection: string;          // 'setup' | 'create' | 'generate'
  activeSubSection: string;       // 'essentials' | 'classification' | etc.

  // Course identity
  courseId: string | null;
  isNewCourse: boolean;

  // Canvas
  currentPage: number;
  totalPages: number;
  zoomLevel: number;

  // Engine panels
  activeTool: string;             // 'select' | 'draw' | 'text' | etc.
  panelVisible: boolean;
  searchVisible: boolean;

  // UI state
  isLoading: boolean;
  lastError: string | null;
}

// ─── Default state ────────────────────────────────────────────────

const DEFAULT_STATE: AppState = {
  activeSection: 'setup',
  activeSubSection: 'essentials',
  courseId: null,
  isNewCourse: true,
  currentPage: 1,
  totalPages: 1,
  zoomLevel: 100,
  activeTool: 'select',
  panelVisible: true,
  searchVisible: false,
  isLoading: false,
  lastError: null,
};

// ─── Subscriber type ──────────────────────────────────────────────

type Subscriber<T> = (newValue: T, oldValue: T) => void;

// ─── StateStore implementation ────────────────────────────────────

class StateStore {
  private data: AppState;
  private subscribers = new Map<string, Set<Subscriber<unknown>>>();

  constructor(initial?: Partial<AppState>) {
    this.data = { ...DEFAULT_STATE, ...initial };
  }

  /**
   * Get a state value.
   */
  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.data[key];
  }

  /**
   * Get a snapshot of the full state (readonly copy).
   */
  snapshot(): Readonly<AppState> {
    return { ...this.data };
  }

  /**
   * Set a state value. Notifies subscribers only if the value changed.
   */
  set<K extends keyof AppState>(key: K, value: AppState[K]): void {
    const oldValue = this.data[key];
    if (Object.is(oldValue, value)) return; // No change, no notification

    this.data[key] = value;

    const subs = this.subscribers.get(key as string);
    if (!subs || subs.size === 0) return;

    for (const handler of subs) {
      try {
        (handler as Subscriber<AppState[K]>)(value, oldValue);
      } catch (err) {
        console.error(`[State] Error in subscriber for "${String(key)}":`, err);
      }
    }
  }

  /**
   * Update multiple state values at once. Subscribers are notified
   * for each changed key.
   */
  update(partial: Partial<AppState>): void {
    for (const [key, value] of Object.entries(partial)) {
      this.set(key as keyof AppState, value as AppState[keyof AppState]);
    }
  }

  /**
   * Subscribe to changes on a specific key. Returns an unsubscribe function.
   */
  subscribe<K extends keyof AppState>(
    key: K,
    handler: Subscriber<AppState[K]>,
  ): () => void {
    const k = key as string;
    if (!this.subscribers.has(k)) {
      this.subscribers.set(k, new Set());
    }
    this.subscribers.get(k)!.add(handler as Subscriber<unknown>);

    return () => {
      this.subscribers.get(k)?.delete(handler as Subscriber<unknown>);
    };
  }

  /**
   * Reset state to defaults (useful for testing).
   */
  reset(): void {
    const keys = Object.keys(this.data) as (keyof AppState)[];
    for (const key of keys) {
      this.set(key, DEFAULT_STATE[key]);
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────

export const state = new StateStore();

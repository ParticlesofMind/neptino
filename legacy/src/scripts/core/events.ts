/**
 * Typed Event Bus
 *
 * Replaces scattered `window.dispatchEvent(new CustomEvent(...))` and
 * `window.addEventListener(...)` calls with a centralized, type-safe
 * event system.
 *
 * Every event the coursebuilder can emit is declared in EventMap.
 * This makes the communication graph discoverable — you can see
 * every possible event by reading this file.
 *
 * Usage:
 *   import { events } from '../core/events';
 *   events.on('section:activated', ({ sectionId }) => { ... });
 *   events.emit('section:activated', { sectionId: 'essentials' });
 */

// ─── Event type declarations ──────────────────────────────────────

export interface EventMap {
  // Navigation
  'section:activated': { sectionId: string };
  'section:changed': { from: string; to: string };

  // Course lifecycle
  'course:idResolved': { courseId: string };
  'course:idUpdated': { courseId: string };
  'course:saved': { courseId: string };
  'course:created': { courseId: string };

  // Canvas navigation
  'canvas:navigate': { page: number };
  'canvas:scrollNavReady': { nav: unknown };
  'canvas:pageChanged': { current: number; total: number };

  // Template system
  'template:configChanged': { config: unknown };
  'template:created': { templateId: string };
  'template:loaded': { templateId: string };

  // Page layout
  'pageLayout:changed': { settings: unknown };

  // Media
  'media:selected': { item: unknown };
  'media:dropped': { type: string; data: unknown };
  'encyclopedia:itemDropped': { item: unknown };
  'marketplace:assetDropped': { asset: unknown };

  // Classification
  'classification:domainChanged': { domainId: string };
  'classification:saved': Record<string, unknown>;

  // Schedule
  'schedule:generated': { lessonCount: number };
  'schedule:deleted': Record<string, never>;

  // Generation / AI
  'generation:settingsSaved': Record<string, unknown>;
  'generation:started': { action: string };

  // Pedagogy
  'pedagogy:updated': { x: number; y: number };
  'pedagogy:saved': Record<string, unknown>;

  // Engine
  'engine:resized': { widths: Record<string, number> };
  'engine:toolChanged': { tool: string };
}

// ─── Event handler type ───────────────────────────────────────────

type Handler<T> = (data: T) => void;

// ─── EventBus implementation ──────────────────────────────────────

class EventBus {
  private listeners = new Map<string, Set<Handler<unknown>>>();

  /**
   * Subscribe to a typed event. Returns an unsubscribe function.
   */
  on<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler as Handler<unknown>);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(handler as Handler<unknown>);
    };
  }

  /**
   * Subscribe to an event for a single emission only.
   */
  once<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): () => void {
    const unsub = this.on(event, (data) => {
      unsub();
      handler(data);
    });
    return unsub;
  }

  /**
   * Emit a typed event. All registered handlers are called synchronously.
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const key = event as string;
    const handlers = this.listeners.get(key);
    if (!handlers || handlers.size === 0) return;

    for (const handler of handlers) {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${key}":`, err);
      }
    }
  }

  /**
   * Remove all listeners for a specific event, or all events.
   */
  clear(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event as string);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the count of listeners for a specific event (useful for debugging).
   */
  listenerCount(event: keyof EventMap): number {
    return this.listeners.get(event as string)?.size ?? 0;
  }
}

// ─── Singleton ────────────────────────────────────────────────────

export const events = new EventBus();

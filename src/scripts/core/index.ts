/**
 * Core module barrel export.
 *
 * The three pillars of the Neptino architecture:
 *   - dom:    Type-safe DOM element registry (resolve once, use everywhere)
 *   - events: Typed event bus (all inter-module communication)
 *   - state:  Centralized app state with change subscriptions
 */
export { bootDOM, dom, resolveCourseBuilderDOM } from './dom';
export type { CourseBuilderDOM } from './dom';
export { DOMRegistryError, MissingElementError } from './dom';

export { events } from './events';
export type { EventMap } from './events';

export { state } from './state';
export type { AppState } from './state';

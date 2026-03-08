/**
 * Global type augmentation for the Knight Lab TimelineJS3 library,
 * loaded as a static script from /vendor/timeline/js/timeline.js.
 * The bundle writes itself into window.TL.
 */

declare global {
  interface TLDate {
    year: string
    month?: string
    day?: string
    hour?: string
    minute?: string
    second?: string
  }

  interface TLText {
    headline?: string
    text?: string
  }

  interface TLBackground {
    color?: string
    url?: string
  }

  interface TLSlide {
    start_date: TLDate
    end_date?: TLDate
    text?: TLText
    background?: TLBackground
    unique_id?: string
    group?: string
    display_date?: string
  }

  interface TLData {
    title?: TLSlide
    events: TLSlide[]
  }

  interface TLOptions {
    timenav_position?: "top" | "bottom"
    timenav_height?: number
    timenav_height_percentage?: number
    start_at_end?: boolean
    start_at_slide?: number
    is_embed?: boolean
    hash_bookmark?: boolean
    initial_zoom?: number
    scale_factor?: number
    zoom_sequence?: number[]
    optimal_tick_width?: number
    duration?: number
    default_bg_color?: { r: number; g: number; b: number }
    language?: string
    debug?: boolean
  }

  interface TLTimeline {
    goTo(n: number, animate?: boolean): void
    destroy(): void
  }

  interface TLNamespace {
    Timeline: new (container: string | HTMLElement, data: TLData, options?: TLOptions) => TLTimeline
  }

  interface Window {
    TL?: TLNamespace
    __timelineJsPromise?: Promise<void>
    __timelineJsCssLoaded?: boolean
  }
}

export {}

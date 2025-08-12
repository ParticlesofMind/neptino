/**
 * Type definitions for spectorjs
 * WebGL debugger and profiler
 */

declare module "spectorjs" {
  export class Spector {
    constructor();

    /**
     * Start capturing WebGL commands
     */
    startCapture(): void;

    /**
     * Stop capturing WebGL commands
     */
    stopCapture(): void;

    /**
     * Clear capture data
     */
    clearCapture(): void;

    /**
     * Get capture data
     */
    getCaptureData(): any;

    /**
     * Display capture in UI
     */
    displayUI(): void;

    /**
     * Set capture options
     */
    setCaptureOptions(options: any): void;
  }

  export default Spector;
}

// Global Spector declaration
declare global {
  interface Window {
    spector?: any;
  }

  const Spector: any;
}

export {};

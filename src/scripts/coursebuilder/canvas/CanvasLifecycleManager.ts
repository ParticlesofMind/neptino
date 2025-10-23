/**
 * CanvasLifecycleManager
 * Controls how many PIXI canvases are instantiated at a time and serialises
 * expensive load operations so we never exhaust WebGL / WASM resources.
 */

export class CanvasLifecycleManager {
  private static instance: CanvasLifecycleManager | null = null;

  private readonly maxActive: number;
  private readonly activeCanvases = new Set<string>();
  private queue: Promise<unknown> = Promise.resolve();

  private waiters: Array<() => void> = [];

  private constructor(maxActive: number) {
    this.maxActive = Math.max(1, maxActive);
  }

  /**
   * Singleton accessor. The first caller defines the maximum parallel canvases.
   */
  public static getInstance(maxActive = 2): CanvasLifecycleManager {
    if (!this.instance) {
      this.instance = new CanvasLifecycleManager(maxActive);
    }
    return this.instance;
  }

  public getActiveCount(): number {
    return this.activeCanvases.size;
  }

  public getMaxActive(): number {
    return this.maxActive;
  }

  public isActive(canvasId: string): boolean {
    return this.activeCanvases.has(canvasId);
  }

  /**
   * Serialises a load operation. Before invoking loadFn it ensures the number of
   * active canvases stays under the configured limit by repeatedly awaiting the
   * provided eviction callback.
   */
  public async withLoad<T>(
    canvasId: string,
    loadFn: () => Promise<T>,
    evictFn: () => Promise<boolean>,
  ): Promise<T> {
    return this.enqueue(async () => {
      if (this.activeCanvases.has(canvasId)) {
        return loadFn();
      }

      while (this.activeCanvases.size >= this.maxActive) {
        const evicted = await evictFn();
        if (!evicted) {
          await new Promise<void>((resolve) => this.waiters.push(resolve));
        }
      }

      try {
        const result = await loadFn();
        if (result !== false) {
          this.activeCanvases.add(canvasId);
        } else {
          this.resolveNextWaiter();
        }
        return result;
      } catch (error) {
        this.resolveNextWaiter();
        throw error;
      }
    });
  }

  /**
   * Marks a canvas as no longer active (usually after unload completes).
   */
  public release(canvasId: string): void {
    this.activeCanvases.delete(canvasId);
    this.resolveNextWaiter();
  }

  private resolveNextWaiter(): void {
    const waiter = this.waiters.shift();
    waiter?.();
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

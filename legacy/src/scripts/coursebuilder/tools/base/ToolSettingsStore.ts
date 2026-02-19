import type { ToolSettingsSnapshot } from "./ToolTypes";

type Listener = (value: unknown) => void;

export class ToolSettingsStore {
  private readonly values = new Map<string, unknown>();
  private readonly listeners = new Map<string, Set<Listener>>();

  public set(key: string, value: unknown): void {
    this.values.set(key, value);
    this.emit(key, value);
  }

  public get<T>(key: string, fallback: T): T {
    if (!this.values.has(key)) {
      return fallback;
    }
    return this.values.get(key) as T;
  }

  public getSnapshot(): ToolSettingsSnapshot {
    const snapshot: ToolSettingsSnapshot = {};
    this.values.forEach((value, key) => {
      snapshot[key] = value;
    });
    return snapshot;
  }

  public reset(nextValues?: ToolSettingsSnapshot): void {
    this.values.clear();
    if (nextValues) {
      Object.entries(nextValues).forEach(([key, value]) => {
        this.values.set(key, value);
      });
    }
  }

  public subscribe(key: string, listener: Listener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    const bag = this.listeners.get(key)!;
    bag.add(listener);
    if (this.values.has(key)) {
      listener(this.values.get(key));
    }
    return () => {
      bag.delete(listener);
      if (bag.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  private emit(key: string, value: unknown): void {
    const bag = this.listeners.get(key);
    if (!bag) {
      return;
    }
    bag.forEach((listener) => {
      try {
        listener(value);
      } catch (error) {
        console.warn("ToolSettingsStore listener error:", error);
      }
    });
  }
}

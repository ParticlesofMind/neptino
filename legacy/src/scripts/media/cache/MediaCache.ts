export class MediaCache<T = any> {
  private store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private defaultTtlMs: number = 1000 * 60 * 5) {} // 5 minutes

  private key(k: string): string {
    return k;
  }

  set(key: string, value: T, ttlMs?: number) {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(this.key(key), { value, expiresAt });
  }

  get(key: string): T | undefined {
    const entry = this.store.get(this.key(key));
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(this.key(key));
      return undefined;
    }
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear() {
    this.store.clear();
  }
}


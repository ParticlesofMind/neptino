type QueueItem = {
  run: () => Promise<any>;
  resolve: (v: any) => void;
  reject: (e: any) => void;
};

/**
 * Very lightweight per-provider rate limit manager.
 * Interprets rateLimitPerMinute as max requests per minute.
 * Queues requests and spaces them with a minimum interval.
 */
export class RateLimitManager {
  private minIntervalMs = new Map<string, number>();
  private lastRunAt = new Map<string, number>();
  private queues = new Map<string, QueueItem[]>();
  private timers = new Map<string, any>();

  configure(providerKey: string, rateLimitPerMinute?: number) {
    if (!rateLimitPerMinute || rateLimitPerMinute <= 0) {
      // default conservative: 30/min
      this.minIntervalMs.set(providerKey, Math.floor(60000 / 30));
      return;
    }
    const interval = Math.max(1, Math.floor(60000 / rateLimitPerMinute));
    this.minIntervalMs.set(providerKey, interval);
  }

  async request<T>(providerKey: string, exec: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const item: QueueItem = { run: exec, resolve, reject };
      const q = this.queues.get(providerKey) || [];
      q.push(item);
      this.queues.set(providerKey, q);
      this.pump(providerKey);
    });
  }

  private pump(providerKey: string) {
    if (this.timers.get(providerKey)) return; // already scheduled

    const scheduleNext = () => {
      const q = this.queues.get(providerKey) || [];
      if (q.length === 0) return;

      const interval = this.minIntervalMs.get(providerKey) ?? 2000;
      const last = this.lastRunAt.get(providerKey) ?? 0;
      const now = Date.now();
      const wait = Math.max(0, last + interval - now);

      this.timers.set(
        providerKey,
        setTimeout(async () => {
          this.timers.delete(providerKey);
          const next = (this.queues.get(providerKey) || []).shift();
          if (!next) return;
          try {
            this.lastRunAt.set(providerKey, Date.now());
            const res = await next.run();
            next.resolve(res);
          } catch (e) {
            next.reject(e);
          } finally {
            // Schedule subsequent
            scheduleNext();
          }
        }, wait)
      );
    };

    scheduleNext();
  }
}


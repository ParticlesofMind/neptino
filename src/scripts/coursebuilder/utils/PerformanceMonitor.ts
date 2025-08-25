/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
 private markers: Map<string, number> = new Map();
 
 start(name: string): void {
 this.markers.set(name, performance.now());
 }
 
 end(name: string): number {
 const start = this.markers.get(name);
 if (!start) return 0;
 
 const duration = performance.now() - start;
 console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
 this.markers.delete(name);
 return duration;
 }
}

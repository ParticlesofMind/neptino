/**
 * CanvasPerformanceMonitor - Track Multi-Canvas Performance Metrics
 * 
 * Monitors performance of the multi-canvas system with separate canvases
 * 
 * Target: ~200 lines
 */

export interface MultiCanvasMetrics {
  frameRate: number;
  memoryUsage: number;
  scrollPerformance: number;
  canvasLoadTime: number;
  totalCanvases: number;
  loadedCanvases: number;
  activeCanvasId: string | null;
  totalMemoryMB: number;
  lazyLoadPerformance: number;
  intersectionObserverPerformance: number;
}

export class MultiCanvasPerformanceMonitor {
  private metrics: MultiCanvasMetrics = {
    frameRate: 0,
    memoryUsage: 0,
    scrollPerformance: 0,
    canvasLoadTime: 0,
    totalCanvases: 0,
    loadedCanvases: 0,
    activeCanvasId: null,
    totalMemoryMB: 0,
    lazyLoadPerformance: 0,
    intersectionObserverPerformance: 0
  };
  
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimes: number[] = [];
  private scrollTimes: number[] = [];
  private loadTimes: number[] = [];
  private intersectionTimes: number[] = [];
  
  private isMonitoring = false;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  
  // Performance thresholds for multi-canvas system
  private readonly TARGET_FPS = 60;
  private readonly MAX_FRAME_TIME = 16.67; // 60fps
  private readonly MAX_SCROLL_TIME = 12; // ms (higher for multi-canvas)
  private readonly MAX_LOAD_TIME = 500; // ms for canvas loading
  private readonly MAX_INTERSECTION_TIME = 5; // ms for intersection observer
  
  /**
   * Start monitoring multi-canvas performance
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    
    // Monitor every 200ms (less frequent for multi-canvas)
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, 200);
    
    console.log('📊 Multi-canvas performance monitoring started');
  }
  
  /**
   * Stop monitoring performance
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('📊 Multi-canvas performance monitoring stopped');
  }
  
  /**
   * Record frame render time
   */
  public recordFrame(): void {
    if (!this.isMonitoring) return;
    
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    
    this.frameTimes.push(frameTime);
    this.frameCount++;
    
    // Keep only last 30 frames (less for multi-canvas)
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }
    
    this.lastFrameTime = now;
  }
  
  /**
   * Record scroll performance
   */
  public recordScroll(duration: number): void {
    this.scrollTimes.push(duration);
    
    // Keep only last 5 scroll events
    if (this.scrollTimes.length > 5) {
      this.scrollTimes.shift();
    }
  }
  
  /**
   * Record canvas loading performance
   */
  public recordCanvasLoad(duration: number): void {
    this.loadTimes.push(duration);
    
    // Keep only last 10 load events
    if (this.loadTimes.length > 10) {
      this.loadTimes.shift();
    }
  }
  
  /**
   * Record intersection observer performance
   */
  public recordIntersectionObserver(duration: number): void {
    this.intersectionTimes.push(duration);
    
    // Keep only last 10 intersection events
    if (this.intersectionTimes.length > 10) {
      this.intersectionTimes.shift();
    }
  }
  
  /**
   * Update canvas metrics
   */
  public updateCanvasMetrics(totalCanvases: number, loadedCanvases: number, activeCanvasId: string | null): void {
    this.metrics.totalCanvases = totalCanvases;
    this.metrics.loadedCanvases = loadedCanvases;
    this.metrics.activeCanvasId = activeCanvasId;
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    // Calculate frame rate
    if (this.frameTimes.length > 0) {
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.metrics.frameRate = 1000 / avgFrameTime;
    }
    
    // Calculate scroll performance
    if (this.scrollTimes.length > 0) {
      this.metrics.scrollPerformance = this.scrollTimes.reduce((a, b) => a + b, 0) / this.scrollTimes.length;
    }
    
    // Calculate canvas load performance
    if (this.loadTimes.length > 0) {
      this.metrics.canvasLoadTime = this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length;
    }
    
    // Calculate intersection observer performance
    if (this.intersectionTimes.length > 0) {
      this.metrics.intersectionObserverPerformance = this.intersectionTimes.reduce((a, b) => a + b, 0) / this.intersectionTimes.length;
    }
    
    // Get memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      this.metrics.totalMemoryMB = memory.totalJSHeapSize / 1024 / 1024; // MB
    }
  }
  
  /**
   * Get current performance metrics
   */
  public getMetrics(): MultiCanvasMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get performance report with multi-canvas specific recommendations
   */
  public getPerformanceReport(): {
    metrics: MultiCanvasMetrics;
    issues: string[];
    recommendations: string[];
    score: number;
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;
    
    // Check frame rate
    if (this.metrics.frameRate < this.TARGET_FPS) {
      issues.push(`Low frame rate: ${this.metrics.frameRate.toFixed(1)}fps (target: ${this.TARGET_FPS}fps)`);
      recommendations.push('Reduce number of loaded canvases or optimize canvas rendering');
      score -= 20;
    }
    
    // Check scroll performance
    if (this.metrics.scrollPerformance > this.MAX_SCROLL_TIME) {
      issues.push(`Slow scrolling: ${this.metrics.scrollPerformance.toFixed(1)}ms (max: ${this.MAX_SCROLL_TIME}ms)`);
      recommendations.push('Optimize intersection observer or reduce canvas complexity');
      score -= 15;
    }
    
    // Check canvas loading performance
    if (this.metrics.canvasLoadTime > this.MAX_LOAD_TIME) {
      issues.push(`Slow canvas loading: ${this.metrics.canvasLoadTime.toFixed(1)}ms (max: ${this.MAX_LOAD_TIME}ms)`);
      recommendations.push('Optimize PixiJS app initialization or reduce canvas size');
      score -= 10;
    }
    
    // Check intersection observer performance
    if (this.metrics.intersectionObserverPerformance > this.MAX_INTERSECTION_TIME) {
      issues.push(`Slow intersection observer: ${this.metrics.intersectionObserverPerformance.toFixed(1)}ms (max: ${this.MAX_INTERSECTION_TIME}ms)`);
      recommendations.push('Optimize intersection observer thresholds or reduce DOM complexity');
      score -= 10;
    }
    
    // Check memory usage
    if (this.metrics.memoryUsage > 150) { // Higher threshold for multi-canvas
      issues.push(`High memory usage: ${this.metrics.memoryUsage.toFixed(1)}MB`);
      recommendations.push('Implement more aggressive canvas unloading or reduce loaded canvas count');
      score -= 15;
    }
    
    // Check canvas efficiency
    if (this.metrics.totalCanvases > 0) {
      const efficiency = this.metrics.loadedCanvases / this.metrics.totalCanvases;
      if (efficiency > 0.3) { // Allow more loaded canvases for multi-canvas
        issues.push(`Too many canvases loaded: ${this.metrics.loadedCanvases}/${this.metrics.totalCanvases}`);
        recommendations.push('Reduce MAX_LOADED_CANVASES or improve lazy loading strategy');
        score -= 10;
      }
    }
    
    return {
      metrics: this.metrics,
      issues,
      recommendations,
      score: Math.max(0, score)
    };
  }
  
  /**
   * Log performance report to console
   */
  public logPerformanceReport(): void {
    const report = this.getPerformanceReport();
    
    console.group('📊 Multi-Canvas Performance Report');
    console.log('Score:', report.score + '/100');
    
    if (report.issues.length > 0) {
      console.group('⚠️ Issues:');
      report.issues.forEach(issue => console.warn(issue));
      console.groupEnd();
    }
    
    if (report.recommendations.length > 0) {
      console.group('💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(rec));
      console.groupEnd();
    }
    
    console.group('📈 Metrics:');
    console.log('Frame Rate:', report.metrics.frameRate.toFixed(1) + 'fps');
    console.log('Scroll Performance:', report.metrics.scrollPerformance.toFixed(1) + 'ms');
    console.log('Canvas Load Time:', report.metrics.canvasLoadTime.toFixed(1) + 'ms');
    console.log('Intersection Observer:', report.metrics.intersectionObserverPerformance.toFixed(1) + 'ms');
    console.log('Memory Usage:', report.metrics.memoryUsage.toFixed(1) + 'MB');
    console.log('Total Canvases:', report.metrics.totalCanvases);
    console.log('Loaded Canvases:', report.metrics.loadedCanvases);
    console.log('Active Canvas:', report.metrics.activeCanvasId);
    console.groupEnd();
    
    console.groupEnd();
  }
  
  /**
   * Reset all metrics
   */
  public reset(): void {
    this.frameTimes = [];
    this.scrollTimes = [];
    this.loadTimes = [];
    this.intersectionTimes = [];
    this.frameCount = 0;
    this.lastFrameTime = 0;
    
    this.metrics = {
      frameRate: 0,
      memoryUsage: 0,
      scrollPerformance: 0,
      canvasLoadTime: 0,
      totalCanvases: 0,
      loadedCanvases: 0,
      activeCanvasId: null,
      totalMemoryMB: 0,
      lazyLoadPerformance: 0,
      intersectionObserverPerformance: 0
    };
  }
  
  /**
   * Check if monitoring is active
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }
}

// Global instance for easy access
export const multiCanvasPerformanceMonitor = new MultiCanvasPerformanceMonitor();

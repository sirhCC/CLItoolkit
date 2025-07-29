/**
 * High-impact performance monitoring and optimization utilities
 */

// Performance metrics collector
export class PerformanceMonitor {
  private static readonly metrics = new Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    avgTime: number;
  }>();

  private static readonly slowOperationThreshold = 10; // ms

  /**
   * Monitor execution time of a function
   */
  static monitor<T extends any[], R>(
    name: string,
    fn: (...args: T) => R
  ): (...args: T) => R {
    return (...args: T): R => {
      const start = performance.now();
      
      try {
        const result = fn(...args);
        
        // Handle both sync and async results
        if (result instanceof Promise) {
          return result.then(value => {
            this.recordMetric(name, performance.now() - start);
            return value;
          }).catch(error => {
            this.recordMetric(name, performance.now() - start, true);
            throw error;
          }) as R;
        } else {
          this.recordMetric(name, performance.now() - start);
          return result;
        }
      } catch (error) {
        this.recordMetric(name, performance.now() - start, true);
        throw error;
      }
    };
  }

  /**
   * Monitor async functions
   */
  static monitorAsync<T extends any[], R>(
    name: string,
    fn: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const start = performance.now();
      
      try {
        const result = await fn(...args);
        this.recordMetric(name, performance.now() - start);
        return result;
      } catch (error) {
        this.recordMetric(name, performance.now() - start, true);
        throw error;
      }
    };
  }

  private static recordMetric(name: string, duration: number, isError = false): void {
    const existing = this.metrics.get(name);
    
    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.minTime = Math.min(existing.minTime, duration);
      existing.maxTime = Math.max(existing.maxTime, duration);
      existing.avgTime = existing.totalTime / existing.count;
    } else {
      this.metrics.set(name, {
        count: 1,
        totalTime: duration,
        minTime: duration,
        maxTime: duration,
        avgTime: duration
      });
    }

    // Log slow operations
    if (duration > this.slowOperationThreshold) {
      console.debug(`[PERF] Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }

    // Log errors with timing
    if (isError) {
      console.debug(`[PERF] Operation failed: ${name} after ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get performance report
   */
  static getReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    for (const [name, metrics] of this.metrics.entries()) {
      report[name] = {
        ...metrics,
        avgTime: Number(metrics.avgTime.toFixed(2)),
        minTime: Number(metrics.minTime.toFixed(2)),
        maxTime: Number(metrics.maxTime.toFixed(2)),
        totalTime: Number(metrics.totalTime.toFixed(2))
      };
    }
    
    return report;
  }

  /**
   * Clear all metrics
   */
  static clear(): void {
    this.metrics.clear();
  }

  /**
   * Get top slow operations
   */
  static getSlowOperations(limit = 5): Array<{ name: string; avgTime: number; count: number }> {
    return Array.from(this.metrics.entries())
      .map(([name, metrics]) => ({ name, avgTime: metrics.avgTime, count: metrics.count }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }
}

// Memory usage tracker
export class MemoryTracker {
  private static readonly snapshots: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  }> = [];

  private static readonly maxSnapshots = 100;

  /**
   * Take memory snapshot
   */
  static snapshot(): void {
    const memUsage = process.memoryUsage();
    
    this.snapshots.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    });

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * Get memory trend analysis
   */
  static getAnalysis(): {
    current: NodeJS.MemoryUsage;
    trend: 'increasing' | 'decreasing' | 'stable';
    peakHeap: number;
    growthRate: number; // bytes per second
  } {
    const current = process.memoryUsage();
    
    if (this.snapshots.length < 2) {
      return {
        current,
        trend: 'stable',
        peakHeap: current.heapUsed,
        growthRate: 0
      };
    }

    const recent = this.snapshots.slice(-10);
    if (recent.length < 2) {
      return {
        current,
        trend: 'stable',
        peakHeap: current.heapUsed,
        growthRate: 0
      };
    }

    const oldest = recent[0]!;
    const newest = recent[recent.length - 1]!;
    
    const timeDiff = newest.timestamp - oldest.timestamp;
    const heapDiff = newest.heapUsed - oldest.heapUsed;
    const growthRate = timeDiff > 0 ? (heapDiff / timeDiff) * 1000 : 0; // bytes per second

    const peakHeap = Math.max(...this.snapshots.map(s => s.heapUsed));
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(growthRate) > 1024) { // 1KB/s threshold
      trend = growthRate > 0 ? 'increasing' : 'decreasing';
    }

    return {
      current,
      trend,
      peakHeap,
      growthRate
    };
  }

  /**
   * Start automatic memory monitoring
   */
  static startMonitoring(intervalMs = 5000): NodeJS.Timeout {
    return setInterval(() => {
      this.snapshot();
      
      const analysis = this.getAnalysis();
      if (analysis.trend === 'increasing' && analysis.growthRate > 10240) { // 10KB/s
        console.warn(`[MEMORY] Memory usage growing rapidly: ${(analysis.growthRate / 1024).toFixed(2)} KB/s`);
      }
    }, intervalMs);
  }
}

// Export monitoring decorators for easy use
export const monitor = PerformanceMonitor.monitor;
export const monitorAsync = PerformanceMonitor.monitorAsync;

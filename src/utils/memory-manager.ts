/**
 * Advanced Memory Management System for CLI Toolkit Framework
 * 
 * Provides comprehensive memory optimization including:
 * - Weak References System for preventing memory leaks
 * - Smart Garbage Collection with memory pressure monitoring
 * - Buffer Pooling for string reuse
 * - Memory analytics and optimization insights
 * 
 * @version 1.0.0
 * @author CLI Toolkit Framework Team
 */

import { EventEmitter } from 'events';

// ====================
// INTERFACES & TYPES
// ====================

export interface IMemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  timestamp: number;
}

export interface IMemoryPressureInfo {
  level: 'low' | 'medium' | 'high' | 'critical';
  percentage: number;
  recommendation: string;
}

export interface IBufferPoolOptions {
  maxBuffers: number;
  maxBufferSize: number;
  cleanupInterval: number;
}

export interface IMemoryManagerOptions {
  enableWeakReferences: boolean;
  enableGcHints: boolean;
  enableBufferPooling: boolean;
  memoryThresholds: {
    warning: number;    // MB
    critical: number;   // MB
  };
  gcInterval: number;   // ms
  metricsInterval: number; // ms
}

export interface IWeakCacheEntry<T extends WeakKey> {
  value: WeakRef<T>;
  lastAccess: number;
  accessCount: number;
}

// ====================
// WEAK REFERENCE CACHE
// ====================

/**
 * Advanced cache using WeakRef to prevent memory leaks
 * Automatically cleans up unreferenced objects
 */
class WeakReferenceCache<K, V extends WeakKey> extends EventEmitter {
  private cache = new Map<K, IWeakCacheEntry<V>>();
  private cleanupRegistry = new FinalizationRegistry<K>((key) => {
    this.cache.delete(key);
    this.emit('cleanup', key);
  });
  
  private cleanupTimer?: NodeJS.Timeout;
  private readonly maxAge: number;
  private readonly cleanupInterval: number;

  constructor(options: { maxAge?: number; cleanupInterval?: number } = {}) {
    super();
    this.maxAge = options.maxAge ?? 300000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval ?? 60000; // 1 minute
    this.startCleanupTimer();
  }

  /**
   * Set a value in the cache with weak reference
   */
  set(key: K, value: V): void {
    // Clean up previous entry if exists
    const existing = this.cache.get(key);
    if (existing) {
      this.cleanupRegistry.unregister(existing.value);
    }

    const weakRef = new WeakRef(value);
    this.cleanupRegistry.register(value, key, weakRef);
    
    this.cache.set(key, {
      value: weakRef,
      lastAccess: Date.now(),
      accessCount: 0
    });

    this.emit('set', key, value);
  }

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const value = entry.value.deref();
    if (!value) {
      // Object was garbage collected
      this.cache.delete(key);
      this.emit('miss', key);
      return undefined;
    }

    // Update access metrics
    entry.lastAccess = Date.now();
    entry.accessCount++;
    this.emit('hit', key, value);

    return value;
  }

  /**
   * Check if a key exists and is still referenced
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const value = entry.value.deref();
    if (!value) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cleanupRegistry.unregister(entry.value);
    }
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    for (const entry of this.cache.values()) {
      this.cleanupRegistry.unregister(entry.value);
    }
    this.cache.clear();
    this.emit('clear');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    activeReferences: number;
    deadReferences: number;
    hitRate: number;
    averageAge: number;
  } {
    const now = Date.now();
    let activeReferences = 0;
    let deadReferences = 0;
    let totalHits = 0;
    let totalAge = 0;

    for (const entry of this.cache.values()) {
      if (entry.value.deref()) {
        activeReferences++;
        totalAge += now - entry.lastAccess;
      } else {
        deadReferences++;
      }
      totalHits += entry.accessCount;
    }

    return {
      size: this.cache.size,
      activeReferences,
      deadReferences,
      hitRate: totalHits / Math.max(this.cache.size, 1),
      averageAge: totalAge / Math.max(activeReferences, 1)
    };
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  /**
   * Perform cleanup of expired and dead references
   */
  private performCleanup(): void {
    const now = Date.now();
    const toDelete: K[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const value = entry.value.deref();
      
      if (!value || (now - entry.lastAccess > this.maxAge)) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.delete(key);
    }

    this.emit('cleanup-cycle', toDelete.length);
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
    this.removeAllListeners();
  }
}

// ====================
// BUFFER POOL MANAGER
// ====================

/**
 * Buffer pooling system for string reuse and memory efficiency
 */
class BufferPoolManager extends EventEmitter {
  private stringBuffers: string[] = [];
  private arrayBuffers: ArrayBuffer[] = [];
  private uint8Arrays: Uint8Array[] = [];
  
  private readonly options: IBufferPoolOptions;
  private cleanupTimer?: NodeJS.Timeout;
  private stats = {
    allocations: 0,
    poolHits: 0,
    poolMisses: 0,
    cleanups: 0
  };

  constructor(options: Partial<IBufferPoolOptions> = {}) {
    super();
    this.options = {
      maxBuffers: options.maxBuffers ?? 1000,
      maxBufferSize: options.maxBufferSize ?? 1024 * 1024, // 1MB
      cleanupInterval: options.cleanupInterval ?? 30000 // 30 seconds
    };

    this.startCleanupTimer();
  }

  /**
   * Get a string buffer from the pool or create new one
   */
  getStringBuffer(minLength: number = 0): string {
    this.stats.allocations++;

    // Try to find a suitable buffer from the pool
    for (let i = this.stringBuffers.length - 1; i >= 0; i--) {
      const buffer = this.stringBuffers[i];
      if (buffer && buffer.length >= minLength) {
        this.stringBuffers.splice(i, 1);
        this.stats.poolHits++;
        this.emit('buffer-reused', 'string', buffer.length);
        return buffer;
      }
    }

    // Create new buffer if none suitable found
    this.stats.poolMisses++;
    const newBuffer = ' '.repeat(Math.max(minLength, 256));
    this.emit('buffer-created', 'string', newBuffer.length);
    return newBuffer;
  }

  /**
   * Return a string buffer to the pool
   */
  returnStringBuffer(buffer: string): void {
    if (buffer.length <= this.options.maxBufferSize && 
        this.stringBuffers.length < this.options.maxBuffers) {
      this.stringBuffers.push(buffer);
      this.emit('buffer-returned', 'string', buffer.length);
    }
  }

  /**
   * Get an ArrayBuffer from the pool
   */
  getArrayBuffer(minSize: number): ArrayBuffer {
    this.stats.allocations++;

    for (let i = this.arrayBuffers.length - 1; i >= 0; i--) {
      const buffer = this.arrayBuffers[i];
      if (buffer && buffer.byteLength >= minSize) {
        this.arrayBuffers.splice(i, 1);
        this.stats.poolHits++;
        this.emit('buffer-reused', 'array', buffer.byteLength);
        return buffer;
      }
    }

    this.stats.poolMisses++;
    const newBuffer = new ArrayBuffer(Math.max(minSize, 1024));
    this.emit('buffer-created', 'array', newBuffer.byteLength);
    return newBuffer;
  }

  /**
   * Return an ArrayBuffer to the pool
   */
  returnArrayBuffer(buffer: ArrayBuffer): void {
    if (buffer.byteLength <= this.options.maxBufferSize && 
        this.arrayBuffers.length < this.options.maxBuffers) {
      this.arrayBuffers.push(buffer);
      this.emit('buffer-returned', 'array', buffer.byteLength);
    }
  }

  /**
   * Get a Uint8Array from the pool
   */
  getUint8Array(minLength: number): Uint8Array {
    this.stats.allocations++;

    for (let i = this.uint8Arrays.length - 1; i >= 0; i--) {
      const array = this.uint8Arrays[i];
      if (array && array.length >= minLength) {
        this.uint8Arrays.splice(i, 1);
        this.stats.poolHits++;
        this.emit('buffer-reused', 'uint8', array.length);
        return array;
      }
    }

    this.stats.poolMisses++;
    const newArray = new Uint8Array(Math.max(minLength, 1024));
    this.emit('buffer-created', 'uint8', newArray.length);
    return newArray;
  }

  /**
   * Return a Uint8Array to the pool
   */
  returnUint8Array(array: Uint8Array): void {
    if (array.length <= this.options.maxBufferSize && 
        this.uint8Arrays.length < this.options.maxBuffers) {
      this.uint8Arrays.push(array);
      this.emit('buffer-returned', 'uint8', array.length);
    }
  }

  /**
   * Get buffer pool statistics
   */
  getStats(): typeof this.stats & {
    hitRate: number;
    poolSizes: {
      strings: number;
      arrayBuffers: number;
      uint8Arrays: number;
    };
  } {
    return {
      ...this.stats,
      hitRate: this.stats.poolHits / Math.max(this.stats.allocations, 1),
      poolSizes: {
        strings: this.stringBuffers.length,
        arrayBuffers: this.arrayBuffers.length,
        uint8Arrays: this.uint8Arrays.length
      }
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Cleanup excess buffers
   */
  private performCleanup(): void {
    const maxKeep = Math.floor(this.options.maxBuffers * 0.7);
    
    if (this.stringBuffers.length > maxKeep) {
      const removed = this.stringBuffers.splice(maxKeep);
      this.stats.cleanups += removed.length;
    }
    
    if (this.arrayBuffers.length > maxKeep) {
      const removed = this.arrayBuffers.splice(maxKeep);
      this.stats.cleanups += removed.length;
    }
    
    if (this.uint8Arrays.length > maxKeep) {
      const removed = this.uint8Arrays.splice(maxKeep);
      this.stats.cleanups += removed.length;
    }

    this.emit('cleanup-performed', this.stats.cleanups);
  }

  /**
   * Clear all buffers and cleanup
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.stringBuffers.length = 0;
    this.arrayBuffers.length = 0;
    this.uint8Arrays.length = 0;
    
    this.removeAllListeners();
  }
}

// ====================
// SMART GARBAGE COLLECTION
// ====================

/**
 * Smart garbage collection with memory pressure monitoring
 */
class SmartGarbageCollector extends EventEmitter {
  private gcTimer?: NodeJS.Timeout;
  private metricsHistory: IMemoryMetrics[] = [];
  private readonly maxHistorySize = 100;
  private isGcInProgress = false;

  constructor(
    private readonly options: {
      gcInterval: number;
      memoryThresholds: { warning: number; critical: number };
    }
  ) {
    super();
    this.startMonitoring();
  }

  /**
   * Get current memory metrics
   */
  getCurrentMetrics(): IMemoryMetrics {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers,
      timestamp: Date.now()
    };
  }

  /**
   * Analyze memory pressure
   */
  analyzeMemoryPressure(): IMemoryPressureInfo {
    const metrics = this.getCurrentMetrics();
    const heapUsedMB = metrics.heapUsed / (1024 * 1024);
    const heapTotalMB = metrics.heapTotal / (1024 * 1024);
    const percentage = (heapUsedMB / heapTotalMB) * 100;

    let level: IMemoryPressureInfo['level'];
    let recommendation: string;

    if (heapUsedMB > this.options.memoryThresholds.critical) {
      level = 'critical';
      recommendation = 'Immediate garbage collection recommended. Consider reducing memory usage.';
    } else if (heapUsedMB > this.options.memoryThresholds.warning) {
      level = 'high';
      recommendation = 'High memory usage detected. Garbage collection scheduled.';
    } else if (percentage > 75) {
      level = 'medium';
      recommendation = 'Moderate memory usage. Monitor closely.';
    } else {
      level = 'low';
      recommendation = 'Memory usage is optimal.';
    }

    return { level, percentage, recommendation };
  }

  /**
   * Force garbage collection with smart timing
   */
  async forceGarbageCollection(): Promise<boolean> {
    if (this.isGcInProgress) {
      return false;
    }

    this.isGcInProgress = true;
    const startTime = Date.now();
    const beforeMetrics = this.getCurrentMetrics();

    try {
      // Check if global.gc is available
      if (global.gc) {
        global.gc();
        
        const afterMetrics = this.getCurrentMetrics();
        const duration = Date.now() - startTime;
        const memoryFreed = beforeMetrics.heapUsed - afterMetrics.heapUsed;

        this.emit('gc-completed', {
          duration,
          memoryFreed,
          beforeMetrics,
          afterMetrics
        });

        return true;
      } else {
        this.emit('gc-unavailable', 'Global GC not available. Start Node.js with --expose-gc flag.');
        return false;
      }
    } finally {
      this.isGcInProgress = false;
    }
  }

  /**
   * Get memory usage trends
   */
  getMemoryTrends(): {
    averageHeapUsed: number;
    peakHeapUsed: number;
    memoryGrowthRate: number;
    gcRecommended: boolean;
  } {
    if (this.metricsHistory.length < 2) {
      const current = this.getCurrentMetrics();
      return {
        averageHeapUsed: current.heapUsed,
        peakHeapUsed: current.heapUsed,
        memoryGrowthRate: 0,
        gcRecommended: false
      };
    }

    const recentMetrics = this.metricsHistory.slice(-10);
    const averageHeapUsed = recentMetrics.reduce((sum, m) => sum + m.heapUsed, 0) / recentMetrics.length;
    const peakHeapUsed = Math.max(...recentMetrics.map(m => m.heapUsed));
    
    // Calculate growth rate (bytes per second)
    const firstMetric = recentMetrics[0];
    const lastMetric = recentMetrics[recentMetrics.length - 1];
    if (!firstMetric || !lastMetric) {
      return {
        averageHeapUsed,
        peakHeapUsed,
        memoryGrowthRate: 0,
        gcRecommended: false
      };
    }
    
    const timeDiff = (lastMetric.timestamp - firstMetric.timestamp) / 1000;
    const memoryGrowthRate = timeDiff > 0 ? (lastMetric.heapUsed - firstMetric.heapUsed) / timeDiff : 0;

    const pressure = this.analyzeMemoryPressure();
    const gcRecommended = pressure.level === 'high' || pressure.level === 'critical' || memoryGrowthRate > 1024 * 1024; // 1MB/s

    return {
      averageHeapUsed,
      peakHeapUsed,
      memoryGrowthRate,
      gcRecommended
    };
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    this.gcTimer = setInterval(async () => {
      const metrics = this.getCurrentMetrics();
      this.metricsHistory.push(metrics);

      // Keep history size limited
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      // Check if GC is needed
      const trends = this.getMemoryTrends();
      if (trends.gcRecommended && !this.isGcInProgress) {
        await this.forceGarbageCollection();
      }

      this.emit('metrics-updated', metrics);
    }, this.options.gcInterval);
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
    this.metricsHistory.length = 0;
    this.removeAllListeners();
  }
}

// ====================
// MAIN MEMORY MANAGER
// ====================

/**
 * Central memory management system
 */
class AdvancedMemoryManager extends EventEmitter {
  private weakCache?: WeakReferenceCache<string, WeakKey>;
  private bufferPool?: BufferPoolManager;
  private gcManager?: SmartGarbageCollector;
  private metricsTimer?: NodeJS.Timeout;

  constructor(private readonly options: IMemoryManagerOptions) {
    super();

    // Initialize components based on options
    if (this.options.enableWeakReferences) {
      this.weakCache = new WeakReferenceCache({
        maxAge: 300000, // 5 minutes
        cleanupInterval: 60000 // 1 minute
      });
      this.setupWeakCacheEvents();
    }

    if (this.options.enableBufferPooling) {
      this.bufferPool = new BufferPoolManager({
        maxBuffers: 1000,
        maxBufferSize: 1024 * 1024,
        cleanupInterval: 30000
      });
      this.setupBufferPoolEvents();
    }

    if (this.options.enableGcHints) {
      this.gcManager = new SmartGarbageCollector({
        gcInterval: this.options.gcInterval,
        memoryThresholds: this.options.memoryThresholds
      });
      this.setupGcEvents();
    }

    this.startMetricsCollection();
  }

  /**
   * Get or create cached object using weak references
   */
  getWeakCached<T extends object>(key: string): T | undefined {
    if (!this.weakCache) return undefined;
    return this.weakCache.get(key) as T;
  }

  /**
   * Set object in weak cache
   */
  setWeakCached<T extends object>(key: string, value: T): void {
    if (this.weakCache) {
      this.weakCache.set(key, value);
    }
  }

  /**
   * Get string buffer from pool
   */
  getStringBuffer(minLength?: number): string | undefined {
    if (!this.bufferPool) return undefined;
    return this.bufferPool.getStringBuffer(minLength);
  }

  /**
   * Return string buffer to pool
   */
  returnStringBuffer(buffer: string): void {
    if (this.bufferPool) {
      this.bufferPool.returnStringBuffer(buffer);
    }
  }

  /**
   * Get ArrayBuffer from pool
   */
  getArrayBuffer(minSize: number): ArrayBuffer | undefined {
    if (!this.bufferPool) return undefined;
    return this.bufferPool.getArrayBuffer(minSize);
  }

  /**
   * Return ArrayBuffer to pool
   */
  returnArrayBuffer(buffer: ArrayBuffer): void {
    if (this.bufferPool) {
      this.bufferPool.returnArrayBuffer(buffer);
    }
  }

  /**
   * Force garbage collection
   */
  async forceGarbageCollection(): Promise<boolean> {
    if (!this.gcManager) return false;
    return await this.gcManager.forceGarbageCollection();
  }

  /**
   * Get comprehensive memory report
   */
  getMemoryReport(): {
    currentMetrics: IMemoryMetrics;
    memoryPressure: IMemoryPressureInfo;
    memoryTrends: ReturnType<SmartGarbageCollector['getMemoryTrends']>;
    weakCacheStats?: ReturnType<WeakReferenceCache<string, object>['getStats']>;
    bufferPoolStats?: ReturnType<BufferPoolManager['getStats']>;
    recommendations: string[];
  } {
    const currentMetrics = this.gcManager?.getCurrentMetrics() ?? {
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external,
      rss: process.memoryUsage().rss,
      arrayBuffers: process.memoryUsage().arrayBuffers,
      timestamp: Date.now()
    };

    const memoryPressure = this.gcManager?.analyzeMemoryPressure() ?? {
      level: 'low' as const,
      percentage: 50,
      recommendation: 'Memory manager not fully initialized'
    };

    const memoryTrends = this.gcManager?.getMemoryTrends() ?? {
      averageHeapUsed: currentMetrics.heapUsed,
      peakHeapUsed: currentMetrics.heapUsed,
      memoryGrowthRate: 0,
      gcRecommended: false
    };

    const recommendations: string[] = [];

    // Generate recommendations
    if (memoryPressure.level === 'critical') {
      recommendations.push('🚨 Critical memory usage - immediate action required');
      recommendations.push('Consider reducing active objects and running garbage collection');
    } else if (memoryPressure.level === 'high') {
      recommendations.push('⚠️ High memory usage detected - monitor closely');
    }

    if (memoryTrends.memoryGrowthRate > 1024 * 1024) {
      recommendations.push('📈 Rapid memory growth detected - check for memory leaks');
    }

    if (this.weakCache) {
      const cacheStats = this.weakCache.getStats();
      if (cacheStats.deadReferences > cacheStats.activeReferences * 0.3) {
        recommendations.push('🧹 High number of dead cache references - cleanup recommended');
      }
    }

    if (this.bufferPool) {
      const poolStats = this.bufferPool.getStats();
      if (poolStats.hitRate < 0.5) {
        recommendations.push('🎯 Buffer pool hit rate low - consider adjusting pool size');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Memory usage is optimal');
    }

    return {
      currentMetrics,
      memoryPressure,
      memoryTrends,
      weakCacheStats: this.weakCache?.getStats(),
      bufferPoolStats: this.bufferPool?.getStats(),
      recommendations
    };
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemory(): Promise<{
    actionsPerformed: string[];
    memoryFreed: number;
    success: boolean;
  }> {
    const actionsPerformed: string[] = [];
    const beforeMetrics = this.gcManager?.getCurrentMetrics() ?? { heapUsed: process.memoryUsage().heapUsed } as IMemoryMetrics;

    try {
      // Clean weak cache
      if (this.weakCache) {
        const beforeCacheStats = this.weakCache.getStats();
        this.weakCache.clear();
        actionsPerformed.push(`Cleared weak cache (${beforeCacheStats.size} entries)`);
      }

      // Force garbage collection
      if (this.gcManager) {
        const gcSuccess = await this.gcManager.forceGarbageCollection();
        if (gcSuccess) {
          actionsPerformed.push('Performed garbage collection');
        }
      }

      // Clean buffer pools
      if (this.bufferPool) {
        this.bufferPool.destroy();
        this.bufferPool = new BufferPoolManager();
        this.setupBufferPoolEvents();
        actionsPerformed.push('Reset buffer pools');
      }

      const afterMetrics = this.gcManager?.getCurrentMetrics() ?? { heapUsed: process.memoryUsage().heapUsed } as IMemoryMetrics;
      const memoryFreed = beforeMetrics.heapUsed - afterMetrics.heapUsed;

      this.emit('memory-optimized', {
        actionsPerformed,
        memoryFreed,
        beforeMetrics,
        afterMetrics
      });

      return {
        actionsPerformed,
        memoryFreed,
        success: true
      };
    } catch (error) {
      this.emit('optimization-error', error);
      return {
        actionsPerformed,
        memoryFreed: 0,
        success: false
      };
    }
  }

  /**
   * Setup weak cache event forwarding
   */
  private setupWeakCacheEvents(): void {
    if (!this.weakCache) return;

    this.weakCache.on('cleanup', (key) => {
      this.emit('weak-cache-cleanup', key);
    });

    this.weakCache.on('cleanup-cycle', (count) => {
      this.emit('weak-cache-cleanup-cycle', count);
    });
  }

  /**
   * Setup buffer pool event forwarding
   */
  private setupBufferPoolEvents(): void {
    if (!this.bufferPool) return;

    this.bufferPool.on('buffer-reused', (type, size) => {
      this.emit('buffer-reused', type, size);
    });

    this.bufferPool.on('cleanup-performed', (count) => {
      this.emit('buffer-cleanup', count);
    });
  }

  /**
   * Setup GC event forwarding
   */
  private setupGcEvents(): void {
    if (!this.gcManager) return;

    this.gcManager.on('gc-completed', (data) => {
      this.emit('gc-completed', data);
    });

    this.gcManager.on('metrics-updated', (metrics) => {
      this.emit('metrics-updated', metrics);
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      const report = this.getMemoryReport();
      this.emit('memory-report', report);
    }, this.options.metricsInterval);
  }

  /**
   * Destroy the memory manager and cleanup all resources
   */
  destroy(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    if (this.weakCache) {
      this.weakCache.destroy();
    }

    if (this.bufferPool) {
      this.bufferPool.destroy();
    }

    if (this.gcManager) {
      this.gcManager.destroy();
    }

    this.removeAllListeners();
  }
}

// ====================
// GLOBAL INSTANCE
// ====================

/**
 * Global memory manager instance with default configuration
 */
export const globalMemoryManager = new AdvancedMemoryManager({
  enableWeakReferences: true,
  enableGcHints: true,
  enableBufferPooling: true,
  memoryThresholds: {
    warning: 512,   // 512MB
    critical: 1024  // 1GB
  },
  gcInterval: 30000,      // 30 seconds
  metricsInterval: 60000  // 1 minute
});

// ====================
// UTILITY FUNCTIONS
// ====================

/**
 * Decorator for automatic buffer pooling on string operations
 */
export function withBufferPooling(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): void {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]): string {
    const result = originalMethod.apply(this, args);
    
    // Return buffer to pool if it's large enough
    if (result.length > 256) {
      globalMemoryManager.returnStringBuffer(result);
    }
    
    return result;
  };
}

/**
 * Get optimized string for operations
 */
export function getOptimizedString(minLength: number = 0): string {
  return globalMemoryManager.getStringBuffer(minLength) ?? ' '.repeat(Math.max(minLength, 256));
}

/**
 * Return string to memory pool
 */
export function returnOptimizedString(str: string): void {
  globalMemoryManager.returnStringBuffer(str);
}

// Export the classes
export { WeakReferenceCache, BufferPoolManager, SmartGarbageCollector, AdvancedMemoryManager };

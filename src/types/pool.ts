/**
 * Pool interfaces for type-safe pool management
 */

export interface IObjectPool<T> {
  /**
   * Acquire an object from the pool
   */
  acquire(): T;

  /**
   * Release an object back to the pool
   */
  release(obj: T): void;

  /**
   * Get current pool size
   */
  getSize(): number;

  /**
   * Resize the pool
   */
  resize(newSize: number): void;

  /**
   * Get pool metrics
   */
  getMetrics(): PoolMetrics;

  /**
   * Clear the pool
   */
  clear(): void;

  /**
   * Dispose of the pool and cleanup resources
   */
  dispose(): void;
}

export interface PoolMetrics {
  size: number;
  maxSize: number;
  minSize: number;
  activeObjects: number;
  hitRate: number;
  missRate: number;
  acquisitions: number;
  releases: number;
  averageLifetime: number;
  peakUsage: number;
  growthEvents: number;
  shrinkEvents: number;
  averageAcquisitionTime: number;
  averageReleaseTime: number;
  lastOptimization: number;
}

export interface PoolConfiguration {
  initialSize: number;
  minSize: number;
  maxSize: number;
  growthFactor: number;
  shrinkFactor: number;
  optimizationInterval: number;
  warmupEnabled: boolean;
  metricsEnabled: boolean;
  autoOptimize: boolean;
}

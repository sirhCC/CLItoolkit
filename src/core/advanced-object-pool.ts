/**
 * Advanced Object Pooling System with Adaptive Sizing and Analytics
 * Enhanced version of the basic object pool with intelligent management
 */

import { IObjectPool, PoolMetrics, PoolConfiguration } from '../types/pool';
import { PoolExhaustedError } from '../types/enhanced-errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('AdvancedObjectPool');

/**
 * Advanced Object Pool with adaptive sizing and comprehensive analytics
 */
export class AdvancedObjectPool<T> implements IObjectPool<T> {
    private readonly pool: T[] = [];
    private readonly activeObjects = new Set<T>();
    private readonly objectLifetimes = new Map<T, number>();
    private readonly config: PoolConfiguration;
    private readonly factory: () => T;
    private readonly reset: (obj: T) => void;
    private readonly validator?: (obj: T) => boolean;

    // Analytics data
    private metrics: PoolMetrics;
    private acquisitionTimes: number[] = [];
    private releaseTimes: number[] = [];
    private optimizationTimer?: NodeJS.Timeout;

    constructor(
        factory: () => T,
        reset: (obj: T) => void,
        config: Partial<PoolConfiguration> = {},
        validator?: (obj: T) => boolean
    ) {
        this.factory = factory;
        this.reset = reset;
        this.validator = validator;

        // Default configuration
        this.config = {
            initialSize: 10,
            minSize: 5,
            maxSize: 100,
            growthFactor: 1.5,
            shrinkFactor: 0.75,
            optimizationInterval: 30000, // 30 seconds
            warmupEnabled: true,
            metricsEnabled: true,
            autoOptimize: true,
            ...config
        };

        // Initialize metrics
        this.metrics = {
            size: 0,
            maxSize: this.config.maxSize,
            minSize: this.config.minSize,
            activeObjects: 0,
            hitRate: 0,
            missRate: 0,
            acquisitions: 0,
            releases: 0,
            averageLifetime: 0,
            peakUsage: 0,
            growthEvents: 0,
            shrinkEvents: 0,
            averageAcquisitionTime: 0,
            averageReleaseTime: 0,
            lastOptimization: Date.now()
        };

        // Initialize pool
        this.initialize();
    }

    /**
     * Initialize pool with warm-up if enabled
     */
    private initialize(): void {
        if (this.config.warmupEnabled) {
            this.warmUp();
        }

        if (this.config.autoOptimize) {
            this.startOptimizationTimer();
        }
    }

    /**
     * Warm up the pool by pre-populating with objects
     */
    private warmUp(): void {
        const startTime = performance.now();

        for (let i = 0; i < this.config.initialSize; i++) {
            const obj = this.factory();
            if (!this.validator || this.validator(obj)) {
                this.pool.push(obj);
            }
        }

        this.metrics.size = this.pool.length;

        if (this.config.metricsEnabled) {
            const warmupTime = performance.now() - startTime;
            logger.debug(`Warmed up with ${this.pool.length} objects in ${warmupTime.toFixed(2)}ms`, {
                operation: 'warmUp',
                count: this.pool.length,
                duration: warmupTime
            });
        }
    }

    /**
     * Acquire an object from the pool
     */
    acquire(): T {
        const startTime = this.config.metricsEnabled ? performance.now() : 0;

        let obj: T;

        if (this.pool.length > 0) {
            // Pool hit - reuse existing object
            obj = this.pool.pop()!;
            this.metrics.acquisitions++;

            // Reset the object to clean state
            this.reset(obj);

            // Validate if validator is provided
            if (this.validator && !this.validator(obj)) {
                // Object failed validation, create new one
                obj = this.factory();
                this.metrics.missRate++;
            }
        } else {
            // Pool miss - create new object
            obj = this.factory();
            this.metrics.acquisitions++;
            this.metrics.missRate++;

            // Consider growing the pool
            this.considerGrowth();
        }

        // Track active objects and lifetime
        this.activeObjects.add(obj);
        this.objectLifetimes.set(obj, Date.now());

        // Update metrics
        this.metrics.activeObjects = this.activeObjects.size;
        this.metrics.peakUsage = Math.max(this.metrics.peakUsage, this.metrics.activeObjects);
        this.updateHitRate();

        // Track acquisition time
        if (this.config.metricsEnabled) {
            const acquisitionTime = performance.now() - startTime;
            this.acquisitionTimes.push(acquisitionTime);
            this.updateAverageAcquisitionTime();
        }

        return obj;
    }

    /**
     * Release an object back to the pool
     */
    release(obj: T): void {
        const startTime = this.config.metricsEnabled ? performance.now() : 0;

        if (!this.activeObjects.has(obj)) {
            console.warn('[POOL] Attempting to release object not acquired from this pool');
            return;
        }

        // Remove from active tracking
        this.activeObjects.delete(obj);

        // Update lifetime metrics
        const acquisitionTime = this.objectLifetimes.get(obj);
        if (acquisitionTime) {
            const lifetime = Date.now() - acquisitionTime;
            this.updateAverageLifetime(lifetime);
            this.objectLifetimes.delete(obj);
        }

        // Return to pool if under max size
        if (this.pool.length < this.config.maxSize) {
            this.pool.push(obj);
            this.metrics.releases++;
        } else {
            // Pool is full, just track the release
            this.metrics.releases++;
        }

        // Update metrics
        this.metrics.size = this.pool.length;
        this.metrics.activeObjects = this.activeObjects.size;

        // Consider shrinking the pool
        this.considerShrink();

        // Track release time
        if (this.config.metricsEnabled) {
            const releaseTime = performance.now() - startTime;
            this.releaseTimes.push(releaseTime);
            this.updateAverageReleaseTime();
        }
    }

    /**
     * Consider growing the pool based on usage patterns
     */
    private considerGrowth(): void {
        // Safe utilization calculation - avoid division by zero
        const totalObjects = this.pool.length + this.metrics.activeObjects;
        const utilizationRate = totalObjects > 0 ? this.metrics.activeObjects / totalObjects : 0;

        // Grow if utilization is high and we haven't reached max size
        // Special case: if pool is empty but we have active objects, start growing
        const shouldGrow = (utilizationRate > 0.8 || (this.pool.length === 0 && this.metrics.activeObjects > 0))
            && this.pool.length < this.config.maxSize;

        if (shouldGrow) {
            // Ensure minimum growth when pool is empty
            const baseGrowthSize = this.pool.length === 0 ?
                Math.max(this.config.minSize, Math.ceil(this.metrics.activeObjects * 0.5)) :
                Math.ceil(this.pool.length * (this.config.growthFactor - 1));

            const growthSize = Math.max(1, baseGrowthSize); // Ensure at least 1 object is added
            const targetSize = Math.min(this.pool.length + growthSize, this.config.maxSize);

            for (let i = this.pool.length; i < targetSize; i++) {
                const obj = this.factory();
                if (!this.validator || this.validator(obj)) {
                    this.pool.push(obj);
                }
            }

            this.metrics.size = this.pool.length;
            this.metrics.growthEvents++;

            if (this.config.metricsEnabled) {
                console.debug(`[POOL] Grew to ${this.pool.length} objects (utilization: ${(utilizationRate * 100).toFixed(1)}%)`);
            }
        }
    }

    /**
     * Consider shrinking the pool to free unused memory
     */
    private considerShrink(): void {
        // Safe utilization calculation - avoid division by zero
        const totalObjects = this.pool.length + this.metrics.activeObjects;
        const utilizationRate = totalObjects > 0 ? this.metrics.activeObjects / totalObjects : 0;

        // Shrink if utilization is low and we're above min size
        // Don't shrink if we have no objects in pool (prevents endless shrinking)
        if (utilizationRate < 0.3 && this.pool.length > this.config.minSize && this.pool.length > 0) {
            const shrinkSize = Math.floor(this.pool.length * (1 - this.config.shrinkFactor));
            const targetSize = Math.max(this.pool.length - shrinkSize, this.config.minSize);

            // Remove objects from pool
            this.pool.splice(targetSize);

            this.metrics.size = this.pool.length;
            this.metrics.shrinkEvents++;

            if (this.config.metricsEnabled) {
                console.debug(`[POOL] Shrunk to ${this.pool.length} objects (utilization: ${(utilizationRate * 100).toFixed(1)}%)`);
            }
        }
    }

    /**
     * Update hit rate metrics
     */
    private updateHitRate(): void {
        const totalRequests = this.metrics.acquisitions;
        if (totalRequests > 0) {
            const hits = totalRequests - this.metrics.missRate;
            this.metrics.hitRate = hits / totalRequests;
        }
    }

    /**
     * Update average lifetime metrics
     */
    private updateAverageLifetime(lifetime: number): void {
        const currentAvg = this.metrics.averageLifetime;
        const releases = this.metrics.releases;

        if (releases === 0) {
            this.metrics.averageLifetime = lifetime;
        } else {
            this.metrics.averageLifetime = (currentAvg * (releases - 1) + lifetime) / releases;
        }
    }

    /**
     * Update average acquisition time
     */
    private updateAverageAcquisitionTime(): void {
        if (this.acquisitionTimes.length > 100) {
            this.acquisitionTimes = this.acquisitionTimes.slice(-50); // Keep recent 50
        }

        const sum = this.acquisitionTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageAcquisitionTime = sum / this.acquisitionTimes.length;
    }

    /**
     * Update average release time
     */
    private updateAverageReleaseTime(): void {
        if (this.releaseTimes.length > 100) {
            this.releaseTimes = this.releaseTimes.slice(-50); // Keep recent 50
        }

        const sum = this.releaseTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageReleaseTime = sum / this.releaseTimes.length;
    }

    /**
     * Start automatic optimization timer
     */
    private startOptimizationTimer(): void {
        this.optimizationTimer = setInterval(() => {
            this.optimize();
        }, this.config.optimizationInterval);
    }

    /**
     * Stop optimization timer
     */
    private stopOptimizationTimer(): void {
        if (this.optimizationTimer) {
            clearInterval(this.optimizationTimer);
            this.optimizationTimer = undefined;
        }
    }

    /**
     * Optimize pool based on usage patterns
     */
    optimize(): void {
        const utilizationRate = this.metrics.activeObjects / (this.pool.length + this.metrics.activeObjects);
        const hitRate = this.metrics.hitRate;

        // Adjust pool size based on patterns
        if (hitRate < 0.8 && this.pool.length < this.config.maxSize) {
            // Low hit rate, increase pool size
            const growthSize = Math.ceil(this.pool.length * 0.2);
            const targetSize = Math.min(this.pool.length + growthSize, this.config.maxSize);

            for (let i = this.pool.length; i < targetSize; i++) {
                this.pool.push(this.factory());
            }

            this.metrics.size = this.pool.length;
        } else if (utilizationRate < 0.2 && this.pool.length > this.config.minSize) {
            // Low utilization, decrease pool size
            const shrinkSize = Math.floor(this.pool.length * 0.2);
            const targetSize = Math.max(this.pool.length - shrinkSize, this.config.minSize);

            this.pool.splice(targetSize);
            this.metrics.size = this.pool.length;
        }

        this.metrics.lastOptimization = Date.now();

        if (this.config.metricsEnabled) {
            console.debug(`[POOL] Optimized: size=${this.pool.length}, hit_rate=${(hitRate * 100).toFixed(1)}%, utilization=${(utilizationRate * 100).toFixed(1)}%`);
        }
    }

    /**
     * Get comprehensive pool metrics
     */
    getMetrics(): PoolMetrics {
        return { ...this.metrics };
    }

    /**
     * Get detailed analytics report
     */
    getAnalyticsReport(): string {
        const metrics = this.getMetrics();

        return [
            '📊 Advanced Object Pool Analytics Report',
            '='.repeat(50),
            `Pool Size: ${metrics.size} (min: ${metrics.minSize}, max: ${metrics.maxSize})`,
            `Active Objects: ${metrics.activeObjects} (peak: ${metrics.peakUsage})`,
            `Hit Rate: ${(metrics.hitRate * 100).toFixed(1)}%`,
            `Miss Rate: ${(metrics.missRate / Math.max(metrics.acquisitions, 1) * 100).toFixed(1)}%`,
            `Total Acquisitions: ${metrics.acquisitions}`,
            `Total Releases: ${metrics.releases}`,
            `Average Object Lifetime: ${metrics.averageLifetime.toFixed(1)}ms`,
            `Average Acquisition Time: ${metrics.averageAcquisitionTime.toFixed(3)}ms`,
            `Average Release Time: ${metrics.averageReleaseTime.toFixed(3)}ms`,
            `Growth Events: ${metrics.growthEvents}`,
            `Shrink Events: ${metrics.shrinkEvents}`,
            `Last Optimization: ${new Date(metrics.lastOptimization).toLocaleTimeString()}`,
            '='.repeat(50)
        ].join('\n');
    }

    /**
     * Reset all metrics (useful for testing)
     */
    resetMetrics(): void {
        this.metrics = {
            size: this.pool.length,
            maxSize: this.config.maxSize,
            minSize: this.config.minSize,
            activeObjects: this.activeObjects.size,
            hitRate: 0,
            missRate: 0,
            acquisitions: 0,
            releases: 0,
            averageLifetime: 0,
            peakUsage: 0,
            growthEvents: 0,
            shrinkEvents: 0,
            averageAcquisitionTime: 0,
            averageReleaseTime: 0,
            lastOptimization: Date.now()
        };

        this.acquisitionTimes = [];
        this.releaseTimes = [];
    }

    /**
     * Force immediate optimization
     */
    forceOptimization(): void {
        this.optimize();
    }

    /**
     * Get current pool size
     */
    getSize(): number {
        return this.pool.length;
    }

    /**
     * Resize the pool to a new size
     */
    resize(newSize: number): void {
        if (newSize < this.config.minSize || newSize > this.config.maxSize) {
            throw new Error(
                `Invalid pool size: ${newSize} (must be between ${this.config.minSize} and ${this.config.maxSize})`
            );
        }

        const currentSize = this.pool.length;

        if (newSize > currentSize) {
            // Grow the pool
            for (let i = currentSize; i < newSize; i++) {
                this.pool.push(this.factory());
            }
            this.metrics.growthEvents++;
        } else if (newSize < currentSize) {
            // Shrink the pool
            this.pool.splice(newSize);
            this.metrics.shrinkEvents++;
        }

        this.metrics.size = this.pool.length;
        logger.debug(`Pool resized from ${currentSize} to ${this.pool.length}`, {
            operation: 'resize',
            oldSize: currentSize,
            newSize: this.pool.length
        });
    }

    /**
     * Get number of active objects
     */
    getActiveCount(): number {
        return this.activeObjects.size;
    }

    /**
     * Clean up and dispose of the pool
     */
    dispose(): void {
        this.stopOptimizationTimer();
        this.pool.length = 0;
        this.activeObjects.clear();
        this.objectLifetimes.clear();
        this.acquisitionTimes = [];
        this.releaseTimes = [];
    }
}

/**
 * Multi-tier Pool Manager for different object types
 */
export class MultiTierPoolManager {
    private readonly pools = new Map<string, AdvancedObjectPool<any>>();
    private readonly configurations = new Map<string, PoolConfiguration>();

    /**
     * Register a new pool tier
     */
    registerPool<T>(
        name: string,
        factory: () => T,
        reset: (obj: T) => void,
        config?: Partial<PoolConfiguration>,
        validator?: (obj: T) => boolean
    ): void {
        const poolConfig: PoolConfiguration = {
            initialSize: 10,
            minSize: 5,
            maxSize: 100,
            growthFactor: 1.5,
            shrinkFactor: 0.75,
            optimizationInterval: 30000,
            warmupEnabled: true,
            metricsEnabled: true,
            autoOptimize: true,
            ...config
        };

        this.configurations.set(name, poolConfig);
        this.pools.set(name, new AdvancedObjectPool(factory, reset, poolConfig, validator));
    }

    /**
     * Get a pool by name
     */
    getPool<T>(name: string): AdvancedObjectPool<T> | undefined {
        return this.pools.get(name) as AdvancedObjectPool<T>;
    }

    /**
     * Get metrics for all pools
     */
    getAllMetrics(): Record<string, PoolMetrics> {
        const metrics: Record<string, PoolMetrics> = {};

        for (const [name, pool] of this.pools) {
            metrics[name] = pool.getMetrics();
        }

        return metrics;
    }

    /**
     * Get comprehensive analytics report for all pools
     */
    getFullAnalyticsReport(): string {
        const reports: string[] = [];

        for (const [name, pool] of this.pools) {
            reports.push(`\n🎯 Pool: ${name.toUpperCase()}`);
            reports.push(pool.getAnalyticsReport());
        }

        return [
            '🚀 Multi-Tier Pool Manager Analytics',
            '='.repeat(60),
            `Total Pools: ${this.pools.size}`,
            ...reports
        ].join('\n');
    }

    /**
     * Optimize all pools
     */
    optimizeAll(): void {
        for (const pool of this.pools.values()) {
            pool.forceOptimization();
        }
    }

    /**
     * Dispose of all pools
     */
    dispose(): void {
        for (const pool of this.pools.values()) {
            pool.dispose();
        }
        this.pools.clear();
        this.configurations.clear();
    }
}

// Global pool manager instance
export const globalPoolManager = new MultiTierPoolManager();

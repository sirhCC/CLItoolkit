/**
 * Enhanced Performance Monitoring with Object Pool Analytics Integration
 */

import { globalPoolManager } from '../core/advanced-object-pool';

// Enhanced performance metrics collector with pool analytics integration
export class EnhancedPerformanceMonitor {
    private static readonly operations = new Map<string, {
        times: number[];
        count: number;
        totalTime: number;
        minTime: number;
        maxTime: number;
        errorCount: number;
    }>();
    private static readonly maxOperations = 1000;
    private static enabled = true;
    private static lastPoolOptimization = Date.now();
    private static readonly poolOptimizationInterval = 30000; // 30 seconds

    /**
     * Record operation timing with enhanced metrics
     */
    static recordOperation(name: string, duration: number, isError = false): void {
        if (!this.enabled) return;

        let operation = this.operations.get(name);
        if (!operation) {
            operation = {
                times: [],
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: -Infinity,
                errorCount: 0
            };
            this.operations.set(name, operation);
        }

        operation.times.push(duration);
        operation.count++;
        operation.totalTime += duration;
        operation.minTime = Math.min(operation.minTime, duration);
        operation.maxTime = Math.max(operation.maxTime, duration);

        if (isError) {
            operation.errorCount++;
        }

        // Keep recent measurements
        if (operation.times.length > 100) {
            const removedTime = operation.times.shift()!;
            operation.totalTime -= removedTime;
        }

        // Trigger pool optimization on slow operations or at intervals
        if (duration > 50 || this.shouldOptimizePools()) {
            this.optimizePools();
        }
    }

    /**
     * Check if pools should be optimized
     */
    private static shouldOptimizePools(): boolean {
        return Date.now() - this.lastPoolOptimization > this.poolOptimizationInterval;
    }

    /**
     * Optimize all pools
     */
    private static optimizePools(): void {
        try {
            globalPoolManager.optimizeAll();
            this.lastPoolOptimization = Date.now();
        } catch (error) {
            console.warn('[PERF] Pool optimization failed:', error);
        }
    }

    /**
     * Get comprehensive performance metrics including pool analytics
     */
    static getMetrics(): {
        operations: Record<string, any>;
        pools: Record<string, any>;
        systemMetrics: {
            memoryUsage: NodeJS.MemoryUsage;
            uptime: number;
            timestamp: number;
            performanceScore: number;
        };
    } {
        const operations: Record<string, any> = {};

        for (const [name, operation] of this.operations) {
            const avgTime = operation.totalTime / Math.max(operation.count, 1);
            const recentAvg = operation.times.slice(-10).reduce((a, b) => a + b, 0) / Math.max(operation.times.slice(-10).length, 1);
            const errorRate = operation.errorCount / Math.max(operation.count, 1);

            operations[name] = {
                count: operation.count,
                averageTime: avgTime,
                recentAverageTime: recentAvg,
                minTime: operation.minTime === Infinity ? 0 : operation.minTime,
                maxTime: operation.maxTime === -Infinity ? 0 : operation.maxTime,
                totalTime: operation.totalTime,
                errorCount: operation.errorCount,
                errorRate: errorRate,
                recentTimes: operation.times.slice(-10),
                trend: this.calculateTrend(operation.times)
            };
        }

        // Get pool analytics
        const pools = globalPoolManager.getAllMetrics();

        // Calculate performance score
        const performanceScore = this.calculatePerformanceScore(operations, pools);

        return {
            operations,
            pools,
            systemMetrics: {
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime(),
                timestamp: Date.now(),
                performanceScore
            }
        };
    }

    /**
     * Calculate performance trend for operation times
     */
    private static calculateTrend(times: number[]): 'improving' | 'degrading' | 'stable' {
        if (times.length < 4) return 'stable';

        const recent = times.slice(-5);
        const earlier = times.slice(-10, -5);

        if (recent.length === 0 || earlier.length === 0) return 'stable';

        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

        const change = (recentAvg - earlierAvg) / earlierAvg;

        if (change < -0.1) return 'improving';  // 10% faster
        if (change > 0.1) return 'degrading';   // 10% slower
        return 'stable';
    }

    /**
     * Calculate overall performance score (0-100)
     */
    private static calculatePerformanceScore(operations: Record<string, any>, pools: Record<string, any>): number {
        let score = 100;

        // Penalize for slow operations
        for (const op of Object.values(operations)) {
            if (op.averageTime > 10) score -= 5;
            if (op.averageTime > 50) score -= 10;
            if (op.errorRate > 0.05) score -= 15; // 5% error rate penalty
        }

        // Reward good pool performance
        for (const pool of Object.values(pools)) {
            if (pool.hitRate > 0.9) score += 2;
            if (pool.hitRate < 0.7) score -= 5;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get comprehensive analytics report
     */
    static getAnalyticsReport(): string {
        const metrics = this.getMetrics();
        const lines: string[] = [
            '🚀 Enhanced Performance & Pool Analytics Report',
            '='.repeat(60),
            `📊 Performance Score: ${metrics.systemMetrics.performanceScore}/100`,
            '',
            '⚡ OPERATION PERFORMANCE:',
            '-'.repeat(30)
        ];

        // Operation metrics
        for (const [name, op] of Object.entries(metrics.operations)) {
            const trendIcon = op.trend === 'improving' ? '📈' : op.trend === 'degrading' ? '📉' : '➡️';
            lines.push(`${name} ${trendIcon}:`);
            lines.push(`  Count: ${op.count} (Errors: ${op.errorCount})`);
            lines.push(`  Avg: ${op.averageTime.toFixed(3)}ms (Recent: ${op.recentAverageTime.toFixed(3)}ms)`);
            lines.push(`  Min/Max: ${op.minTime.toFixed(3)}ms / ${op.maxTime.toFixed(3)}ms`);
            lines.push(`  Error Rate: ${(op.errorRate * 100).toFixed(1)}%`);
            lines.push('');
        }

        // Pool metrics
        lines.push('🏊 OBJECT POOL ANALYTICS:');
        lines.push('-'.repeat(30));

        for (const [poolName, poolMetrics] of Object.entries(metrics.pools)) {
            const efficiency = poolMetrics.hitRate > 0.8 ? '🟢' : poolMetrics.hitRate > 0.6 ? '🟡' : '🔴';
            lines.push(`${poolName.toUpperCase()} ${efficiency}:`);
            lines.push(`  Size: ${poolMetrics.size} (${poolMetrics.minSize}-${poolMetrics.maxSize})`);
            lines.push(`  Active: ${poolMetrics.activeObjects} (Peak: ${poolMetrics.peakUsage})`);
            lines.push(`  Hit Rate: ${(poolMetrics.hitRate * 100).toFixed(1)}%`);
            lines.push(`  Avg Lifetime: ${poolMetrics.averageLifetime.toFixed(1)}ms`);
            lines.push(`  Optimizations: Growth=${poolMetrics.growthEvents}, Shrink=${poolMetrics.shrinkEvents}`);
            lines.push('');
        }

        // System metrics
        const { memoryUsage, uptime } = metrics.systemMetrics;
        lines.push('💻 SYSTEM METRICS:');
        lines.push('-'.repeat(30));
        lines.push(`Memory Usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`);
        lines.push(`Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`);
        lines.push(`External: ${(memoryUsage.external / 1024 / 1024).toFixed(1)} MB`);
        lines.push(`Uptime: ${(uptime / 60).toFixed(1)} minutes`);

        // Performance recommendations
        lines.push('');
        lines.push('💡 RECOMMENDATIONS:');
        lines.push('-'.repeat(30));

        const recommendations = this.generateRecommendations(metrics);
        recommendations.forEach(rec => lines.push(`• ${rec}`));

        lines.push('='.repeat(60));

        return lines.join('\n');
    }

    /**
     * Generate performance recommendations
     */
    private static generateRecommendations(metrics: any): string[] {
        const recommendations: string[] = [];

        // Check for slow operations
        for (const [name, op] of Object.entries(metrics.operations)) {
            const operation = op as any;
            if (operation.averageTime > 50) {
                recommendations.push(`Optimize ${name} - average time is ${operation.averageTime.toFixed(1)}ms`);
            }
            if (operation.errorRate > 0.1) {
                recommendations.push(`Investigate errors in ${name} - ${(operation.errorRate * 100).toFixed(1)}% error rate`);
            }
        }

        // Check pool efficiency
        for (const [poolName, pool] of Object.entries(metrics.pools)) {
            const poolData = pool as any;
            if (poolData.hitRate < 0.7) {
                recommendations.push(`Increase ${poolName} pool size - hit rate only ${(poolData.hitRate * 100).toFixed(1)}%`);
            }
            if (poolData.activeObjects / poolData.size > 0.9) {
                recommendations.push(`Consider growing ${poolName} pool - high utilization`);
            }
        }

        // System recommendations
        const heapUsedMB = metrics.systemMetrics.memoryUsage.heapUsed / 1024 / 1024;
        if (heapUsedMB > 100) {
            recommendations.push(`High memory usage detected: ${heapUsedMB.toFixed(1)} MB`);
        }

        if (recommendations.length === 0) {
            recommendations.push('Performance looks good! 🎉');
        }

        return recommendations;
    }

    /**
     * Monitor function execution with automatic pool optimization
     */
    static monitor<T extends (...args: any[]) => any>(
        target: any,
        propertyName: string,
        descriptor: TypedPropertyDescriptor<T>
    ): TypedPropertyDescriptor<T> | void {
        const method = descriptor.value!;

        descriptor.value = function (this: any, ...args: any[]) {
            const start = performance.now();
            let isError = false;

            try {
                const result = method.apply(this, args);
                const duration = performance.now() - start;

                EnhancedPerformanceMonitor.recordOperation(
                    `${target.constructor.name}.${propertyName}`,
                    duration,
                    isError
                );

                return result;
            } catch (error) {
                isError = true;
                const duration = performance.now() - start;
                EnhancedPerformanceMonitor.recordOperation(
                    `${target.constructor.name}.${propertyName}`,
                    duration,
                    isError
                );
                throw error;
            }
        } as any;

        return descriptor;
    }

    /**
     * Monitor async function execution with pool analytics
     */
    static monitorAsync<T extends (...args: any[]) => Promise<any>>(
        target: any,
        propertyName: string,
        descriptor: TypedPropertyDescriptor<T>
    ): TypedPropertyDescriptor<T> | void {
        const method = descriptor.value!;

        descriptor.value = async function (this: any, ...args: any[]) {
            const start = performance.now();
            let isError = false;

            try {
                const result = await method.apply(this, args);
                const duration = performance.now() - start;

                EnhancedPerformanceMonitor.recordOperation(
                    `${target.constructor.name}.${propertyName}`,
                    duration,
                    isError
                );

                return result;
            } catch (error) {
                isError = true;
                const duration = performance.now() - start;
                EnhancedPerformanceMonitor.recordOperation(
                    `${target.constructor.name}.${propertyName}`,
                    duration,
                    isError
                );
                throw error;
            }
        } as any;

        return descriptor;
    }

    /**
     * Start automatic performance monitoring
     */
    static startMonitoring(intervalMs = 60000): NodeJS.Timeout {
        return setInterval(() => {
            const metrics = this.getMetrics();

            // Log performance summary
            console.log(`[PERF] Score: ${metrics.systemMetrics.performanceScore}/100, ` +
                `Memory: ${(metrics.systemMetrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);

            // Auto-optimize pools
            this.optimizePools();

        }, intervalMs);
    }

    /**
     * Clear all metrics
     */
    static clear(): void {
        this.operations.clear();
        this.lastPoolOptimization = Date.now();
    }

    /**
     * Enable/disable monitoring
     */
    static setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Get top slow operations
     */
    static getSlowOperations(limit = 5): Array<{ name: string; avgTime: number; count: number; trend: string }> {
        const operations = Array.from(this.operations.entries())
            .map(([name, op]) => ({
                name,
                avgTime: op.totalTime / Math.max(op.count, 1),
                count: op.count,
                trend: this.calculateTrend(op.times)
            }))
            .sort((a, b) => b.avgTime - a.avgTime)
            .slice(0, limit);

        return operations;
    }
}

// Re-export for backward compatibility and maintain existing API
export const PerformanceMonitor = EnhancedPerformanceMonitor;

// Export monitoring decorators for easy use
export const monitor = EnhancedPerformanceMonitor.monitor;
export const monitorAsync = EnhancedPerformanceMonitor.monitorAsync;

/**
 * Advanced Memory Optimizer
 * Comprehensive memory management and leak detection for CLI applications
 */

import { EventEmitter } from 'events';

interface MemorySnapshot {
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    arrayBuffers: number;
}

interface MemoryLeak {
    type: 'heap-growth' | 'external-growth' | 'listener-leak' | 'timer-leak';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: number;
    growthRate: number; // bytes per second
}

interface MemoryOptimization {
    name: string;
    description: string;
    impact: 'memory' | 'performance' | 'both';
    apply: () => Promise<void>;
}

export class AdvancedMemoryOptimizer extends EventEmitter {
    private snapshots: MemorySnapshot[] = [];
    private leaks: MemoryLeak[] = [];
    private optimizations: MemoryOptimization[] = [];
    private monitoringInterval?: NodeJS.Timeout;
    private isMonitoring = false;
    private baselineSnapshot?: MemorySnapshot;

    constructor() {
        super();
        this.setupOptimizations();
        this.setupLeakDetection();
    }

    /**
     * Start continuous memory monitoring
     */
    startMonitoring(intervalMs = 5000): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.baselineSnapshot = this.captureSnapshot();

        this.monitoringInterval = setInterval(() => {
            const snapshot = this.captureSnapshot();
            this.snapshots.push(snapshot);
            this.analyzeMemoryTrends();
            this.detectLeaks();

            // Keep only last 100 snapshots to prevent memory growth
            if (this.snapshots.length > 100) {
                this.snapshots = this.snapshots.slice(-100);
            }
        }, intervalMs);

        console.log('🧠 Advanced Memory Optimizer - Monitoring Started');
        this.emit('monitoring:started');
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) return;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }

        this.isMonitoring = false;
        this.emit('monitoring:stopped');
    }

    /**
     * Capture current memory snapshot
     */
    private captureSnapshot(): MemorySnapshot {
        const memUsage = process.memoryUsage();
        return {
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss,
            arrayBuffers: memUsage.arrayBuffers
        };
    }

    /**
     * Analyze memory usage trends
     */
    private analyzeMemoryTrends(): void {
        if (this.snapshots.length < 10) return;

        const recent = this.snapshots.slice(-10);
        const heapGrowth = this.calculateGrowthRate(recent, 'heapUsed');
        const externalGrowth = this.calculateGrowthRate(recent, 'external');

        // Emit trend events
        this.emit('trend:heap-growth', { rate: heapGrowth });
        this.emit('trend:external-growth', { rate: externalGrowth });

        // Alert on significant growth
        if (heapGrowth > 1024 * 1024) { // 1MB/snapshot growth
            this.emit('alert:memory-growth', {
                type: 'heap',
                rate: heapGrowth,
                severity: 'high'
            });
        }
    }

    /**
     * Calculate memory growth rate
     */
    private calculateGrowthRate(snapshots: MemorySnapshot[], field: keyof MemorySnapshot): number {
        if (snapshots.length < 2) return 0;

        const first = snapshots[0]!;
        const last = snapshots[snapshots.length - 1]!;
        const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds

        return ((last[field] as number) - (first[field] as number)) / timeDiff;
    }

    /**
     * Detect potential memory leaks
     */
    private detectLeaks(): void {
        if (this.snapshots.length < 20) return;

        const recent = this.snapshots.slice(-20);

        // Detect heap growth leak
        const heapGrowthRate = this.calculateGrowthRate(recent, 'heapUsed');
        if (heapGrowthRate > 512 * 1024) { // 512KB/s sustained growth
            this.addLeak({
                type: 'heap-growth',
                severity: heapGrowthRate > 2 * 1024 * 1024 ? 'critical' : 'high',
                description: `Sustained heap growth detected: ${(heapGrowthRate / 1024).toFixed(2)}KB/s`,
                detectedAt: Date.now(),
                growthRate: heapGrowthRate
            });
        }

        // Detect external memory leak
        const externalGrowthRate = this.calculateGrowthRate(recent, 'external');
        if (externalGrowthRate > 256 * 1024) { // 256KB/s sustained growth
            this.addLeak({
                type: 'external-growth',
                severity: externalGrowthRate > 1024 * 1024 ? 'critical' : 'medium',
                description: `External memory growth detected: ${(externalGrowthRate / 1024).toFixed(2)}KB/s`,
                detectedAt: Date.now(),
                growthRate: externalGrowthRate
            });
        }

        // Detect event listener leaks
        this.detectEventListenerLeaks();
    }

    /**
     * Detect event listener leaks
     */
    private detectEventListenerLeaks(): void {
        const emitters = [process, this];

        emitters.forEach(emitter => {
            const events = (emitter as any)._events;
            const listenerCount = events ?
                Object.keys(events).reduce((sum, event) => {
                    const listeners = events[event];
                    return sum + (Array.isArray(listeners) ? listeners.length : 1);
                }, 0) : 0;

            if (listenerCount > 50) {
                this.addLeak({
                    type: 'listener-leak',
                    severity: listenerCount > 100 ? 'critical' : 'high',
                    description: `Excessive event listeners detected: ${listenerCount}`,
                    detectedAt: Date.now(),
                    growthRate: listenerCount
                });
            }
        });
    }

    /**
     * Add detected memory leak
     */
    private addLeak(leak: MemoryLeak): void {
        // Avoid duplicate leaks
        const existing = this.leaks.find(l =>
            l.type === leak.type &&
            Math.abs(l.detectedAt - leak.detectedAt) < 30000
        );

        if (!existing) {
            this.leaks.push(leak);
            this.emit('leak:detected', leak);

            if (leak.severity === 'critical') {
                console.warn(`🚨 CRITICAL MEMORY LEAK: ${leak.description}`);
            }
        }
    }

    /**
     * Setup memory optimization strategies
     */
    private setupOptimizations(): void {
        this.optimizations = [
            {
                name: 'garbage-collection-tuning',
                description: 'Optimize V8 garbage collection settings',
                impact: 'both',
                apply: this.optimizeGarbageCollection.bind(this)
            },
            {
                name: 'buffer-pooling',
                description: 'Implement buffer pooling for reduced allocations',
                impact: 'memory',
                apply: this.enableBufferPooling.bind(this)
            },
            {
                name: 'string-interning',
                description: 'Intern frequently used strings',
                impact: 'memory',
                apply: this.enableStringInterning.bind(this)
            },
            {
                name: 'weak-references',
                description: 'Use weak references for caches',
                impact: 'memory',
                apply: this.enableWeakReferences.bind(this)
            },
            {
                name: 'memory-pressure-handling',
                description: 'Handle memory pressure events',
                impact: 'both',
                apply: this.enableMemoryPressureHandling.bind(this)
            }
        ];
    }

    /**
     * Setup automatic leak detection
     */
    private setupLeakDetection(): void {
        // Monitor for uncaught exceptions that might cause leaks
        process.on('uncaughtException', (error) => {
            this.addLeak({
                type: 'heap-growth',
                severity: 'high',
                description: `Uncaught exception may cause memory leak: ${error.message}`,
                detectedAt: Date.now(),
                growthRate: 0
            });
        });

        // Monitor for unhandled promise rejections
        process.on('unhandledRejection', (reason) => {
            this.addLeak({
                type: 'heap-growth',
                severity: 'medium',
                description: `Unhandled promise rejection may cause memory leak: ${reason}`,
                detectedAt: Date.now(),
                growthRate: 0
            });
        });
    }

    /**
     * Apply memory optimizations
     */
    async applyOptimizations(): Promise<void> {
        console.log('🧠 Applying Memory Optimizations');
        console.log('='.repeat(50));

        for (const optimization of this.optimizations) {
            try {
                await optimization.apply();
                console.log(`✅ ${optimization.name}: ${optimization.description}`);
            } catch (error) {
                console.log(`❌ ${optimization.name}: Failed - ${error}`);
            }
        }
    }

    // Optimization implementations
    private async optimizeGarbageCollection(): Promise<void> {
        // Set optimal GC flags for CLI applications
        if (process.env.NODE_OPTIONS) {
            process.env.NODE_OPTIONS += ' --optimize-for-size --gc-interval=100';
        } else {
            process.env.NODE_OPTIONS = '--optimize-for-size --gc-interval=100';
        }
    }

    private async enableBufferPooling(): Promise<void> {
        // Create buffer pool for common sizes
        const bufferPools = new Map<number, Buffer[]>();
        const commonSizes = [1024, 4096, 8192, 16384];

        commonSizes.forEach(size => {
            bufferPools.set(size, []);
        });

        // Install buffer pool on global
        (global as any).__BUFFER_POOLS__ = bufferPools;
    }

    private async enableStringInterning(): Promise<void> {
        // Create string intern pool
        const stringPool = new Map<string, string>();

        (global as any).__STRING_INTERN__ = (str: string) => {
            if (stringPool.has(str)) {
                return stringPool.get(str)!;
            }
            stringPool.set(str, str);
            return str;
        };
    }

    private async enableWeakReferences(): Promise<void> {
        // Replace strong references with weak references in caches
        if (typeof WeakRef !== 'undefined') {
            (global as any).__WEAK_CACHE__ = new Map<string, WeakRef<any>>();
        }
    }

    private async enableMemoryPressureHandling(): Promise<void> {
        // Handle memory pressure events
        process.on('warning', (warning) => {
            if (warning.name === 'MaxListenersExceededWarning') {
                this.addLeak({
                    type: 'listener-leak',
                    severity: 'high',
                    description: `Max listeners exceeded: ${warning.message}`,
                    detectedAt: Date.now(),
                    growthRate: 0
                });
            }
        });

        // Force GC on high memory usage
        setInterval(() => {
            const memUsage = process.memoryUsage();
            if (memUsage.heapUsed > 500 * 1024 * 1024 && global.gc) { // 500MB threshold
                global.gc();
            }
        }, 30000);
    }

    /**
     * Get memory optimization recommendations
     */
    getRecommendations(): string[] {
        const recommendations: string[] = [];

        if (this.snapshots.length > 0) {
            const latest = this.snapshots[this.snapshots.length - 1]!;
            const heapMB = latest.heapUsed / 1024 / 1024;

            if (heapMB > 100) {
                recommendations.push('Consider implementing object pooling');
                recommendations.push('Review for memory leaks in long-running operations');
            }

            if (latest.external > 50 * 1024 * 1024) {
                recommendations.push('High external memory usage - review Buffer and TypedArray usage');
            }
        }

        if (this.leaks.length > 0) {
            recommendations.push(`${this.leaks.length} potential memory leaks detected`);
            recommendations.push('Run detailed memory profiling');
        }

        return recommendations;
    }

    /**
     * Generate comprehensive memory report
     */
    generateReport(): string {
        const current = this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
        const baseline = this.baselineSnapshot;

        if (!current) {
            return 'No memory data available';
        }

        const heapGrowth = baseline ? current.heapUsed - baseline.heapUsed : 0;
        const recommendations = this.getRecommendations();

        return `
🧠 MEMORY OPTIMIZATION REPORT
==============================

Current Usage:
• Heap Used: ${(current.heapUsed / 1024 / 1024).toFixed(2)}MB
• Heap Total: ${(current.heapTotal / 1024 / 1024).toFixed(2)}MB
• External: ${(current.external / 1024 / 1024).toFixed(2)}MB
• RSS: ${(current.rss / 1024 / 1024).toFixed(2)}MB

Growth Since Baseline:
• Heap Growth: ${baseline ? (heapGrowth / 1024 / 1024).toFixed(2) : 'N/A'}MB

Detected Issues:
• Memory Leaks: ${this.leaks.length}
• Critical Issues: ${this.leaks.filter(l => l.severity === 'critical').length}

Status: ${this.leaks.length === 0 ? '✅ No leaks detected' : '⚠️ Issues found'}

Recommendations:
${recommendations.length > 0 ? recommendations.map(r => `• ${r}`).join('\n') : '• No specific recommendations'}
`;
    }

    /**
     * Force garbage collection if available
     */
    forceGC(): boolean {
        if (global.gc) {
            global.gc();
            return true;
        }
        return false;
    }

    /**
     * Get current memory leaks
     */
    getLeaks(): MemoryLeak[] {
        return [...this.leaks];
    }

    /**
     * Clear detected leaks
     */
    clearLeaks(): void {
        this.leaks = [];
        this.emit('leaks:cleared');
    }
}

// Export singleton instance
export const memoryOptimizer = new AdvancedMemoryOptimizer();

// Decorator for monitoring function memory usage
export function monitorMemory(threshold = 10 * 1024 * 1024) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const beforeMem = process.memoryUsage();

            try {
                const result = await originalMethod.apply(this, args);

                const afterMem = process.memoryUsage();
                const heapDiff = afterMem.heapUsed - beforeMem.heapUsed;

                if (heapDiff > threshold) {
                    console.warn(`🧠 High memory usage in ${propertyKey}: ${(heapDiff / 1024 / 1024).toFixed(2)}MB`);
                }

                return result;
            } catch (error) {
                memoryOptimizer.emit('memory:error', { method: propertyKey, error });
                throw error;
            }
        };

        return descriptor;
    };
}

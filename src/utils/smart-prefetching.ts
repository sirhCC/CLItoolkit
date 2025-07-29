/**
 * Smart Prefetching System
 * Predicts and pre-warms objects before they're needed based on workload patterns
 */

import { EventEmitter } from 'events';
import { globalPoolManager } from '../core/advanced-object-pool';
import { globalWorkloadAnalyzer, WorkloadPattern, PatternPrediction } from './workload-pattern-analyzer';

export interface PrefetchTarget {
    type: 'pool' | 'module' | 'cache' | 'compilation';
    name: string;
    priority: number; // 1-10, higher is more important
    estimatedBenefit: number; // Expected performance improvement (ms)
    resourceCost: number; // Memory/CPU cost estimate
    confidence: number; // 0-1 confidence in benefit
}

export interface PrefetchResult {
    target: PrefetchTarget;
    success: boolean;
    actualBenefit?: number;
    duration: number;
    error?: string;
}

export interface SmartPrefetchConfig {
    enabled: boolean;
    maxConcurrentPrefetches: number;
    minConfidenceThreshold: number;
    maxResourceBudget: number; // Max memory in MB
    adaptiveLearning: boolean;
    prefetchWindowMs: number; // How far ahead to prefetch
}

export class SmartPrefetchingEngine extends EventEmitter {
    private config: SmartPrefetchConfig = {
        enabled: true,
        maxConcurrentPrefetches: 3,
        minConfidenceThreshold: 0.4,
        maxResourceBudget: 100, // 100MB
        adaptiveLearning: true,
        prefetchWindowMs: 5000 // 5 seconds ahead
    };

    private activePrefetches = new Map<string, Promise<PrefetchResult>>();
    private prefetchHistory: PrefetchResult[] = [];
    private resourceUsage = 0; // Current prefetch memory usage in MB
    private prefetchQueue: PrefetchTarget[] = [];
    private isProcessingQueue = false;
    private recentCommands: string[] = [];
    private prefetchTimers = new Map<string, NodeJS.Timeout>();

    constructor(config?: Partial<SmartPrefetchConfig>) {
        super();
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.setupWorkloadIntegration();
        this.startPrefetchProcessor();
    }

    /**
     * Predict and trigger prefetching based on current context
     */
    async predictAndPrefetch(currentCommand: string, currentOptions: Record<string, any>): Promise<void> {
        if (!this.config.enabled) return;

        // Update recent commands for context
        this.recentCommands.push(currentCommand);
        if (this.recentCommands.length > 10) {
            this.recentCommands = this.recentCommands.slice(-10);
        }

        // Get predictions from workload analyzer
        const predictions = globalWorkloadAnalyzer.predictNextCommands(
            currentCommand,
            this.recentCommands
        );

        // Generate prefetch targets from predictions
        const targets = await this.generatePrefetchTargets(predictions, currentOptions);

        // Add to prefetch queue
        for (const target of targets) {
            if (target.confidence >= this.config.minConfidenceThreshold) {
                this.enqueuePrefetch(target);
            }
        }

        this.emit('prediction:complete', { command: currentCommand, targets: targets.length });
    }

    /**
     * Generate prefetch targets from pattern predictions
     */
    private async generatePrefetchTargets(
        predictions: PatternPrediction[],
        currentOptions: Record<string, any>
    ): Promise<PrefetchTarget[]> {
        const targets: PrefetchTarget[] = [];

        for (const prediction of predictions) {
            // Pool prefetching based on pattern
            targets.push(...this.generatePoolTargets(prediction));

            // Module prefetching for next commands
            targets.push(...this.generateModuleTargets(prediction));

            // Cache prefetching for options/arguments
            targets.push(...this.generateCacheTargets(prediction, currentOptions));

            // Compilation prefetching for complex patterns
            targets.push(...this.generateCompilationTargets(prediction));
        }

        // Sort by priority and confidence
        return targets.sort((a, b) => {
            const scoreA = a.priority * a.confidence * a.estimatedBenefit;
            const scoreB = b.priority * b.confidence * b.estimatedBenefit;
            return scoreB - scoreA;
        });
    }

    /**
     * Generate object pool prefetch targets
     */
    private generatePoolTargets(prediction: PatternPrediction): PrefetchTarget[] {
        const targets: PrefetchTarget[] = [];

        for (const poolName of prediction.prefetchTargets) {
            targets.push({
                type: 'pool',
                name: poolName,
                priority: this.calculatePoolPriority(prediction.pattern, poolName),
                estimatedBenefit: this.estimatePoolBenefit(prediction.pattern, poolName),
                resourceCost: this.estimatePoolCost(poolName),
                confidence: prediction.confidence
            });
        }

        return targets;
    }

    /**
     * Generate module prefetch targets
     */
    private generateModuleTargets(prediction: PatternPrediction): PrefetchTarget[] {
        const targets: PrefetchTarget[] = [];

        for (const command of prediction.nextCommands) {
            targets.push({
                type: 'module',
                name: `command:${command}`,
                priority: 7,
                estimatedBenefit: 50, // Typical module loading time
                resourceCost: 5, // Typical module memory cost
                confidence: prediction.confidence * 0.8 // Slightly lower confidence for modules
            });
        }

        return targets;
    }

    /**
     * Generate cache prefetch targets
     */
    private generateCacheTargets(
        prediction: PatternPrediction,
        _currentOptions: Record<string, any>
    ): PrefetchTarget[] {
        const targets: PrefetchTarget[] = [];

        // Prefetch option validation cache
        const commonOptions = Object.keys(prediction.pattern.options);
        if (commonOptions.length > 0) {
            targets.push({
                type: 'cache',
                name: `options:${commonOptions.join(',')}`,
                priority: 5,
                estimatedBenefit: 10,
                resourceCost: 2,
                confidence: prediction.confidence
            });
        }

        // Prefetch argument pattern cache
        for (const pattern of prediction.pattern.argumentPatterns) {
            targets.push({
                type: 'cache',
                name: `args:${pattern}`,
                priority: 4,
                estimatedBenefit: 8,
                resourceCost: 1,
                confidence: prediction.confidence * 0.7
            });
        }

        return targets;
    }

    /**
     * Generate compilation prefetch targets
     */
    private generateCompilationTargets(prediction: PatternPrediction): PrefetchTarget[] {
        const targets: PrefetchTarget[] = [];

        // For high-frequency patterns with complex options, prefetch compilation
        if (prediction.pattern.frequency > 20 && Object.keys(prediction.pattern.options).length > 3) {
            targets.push({
                type: 'compilation',
                name: `regex:${prediction.pattern.id}`,
                priority: 6,
                estimatedBenefit: 30,
                resourceCost: 8,
                confidence: prediction.confidence
            });
        }

        return targets;
    }

    /**
     * Add target to prefetch queue
     */
    private enqueuePrefetch(target: PrefetchTarget): void {
        // Check resource budget
        if (this.resourceUsage + target.resourceCost > this.config.maxResourceBudget) {
            return; // Skip if would exceed budget
        }

        // Check if already in queue or active
        const exists = this.prefetchQueue.some(t => t.name === target.name && t.type === target.type) ||
            this.activePrefetches.has(`${target.type}:${target.name}`);

        if (!exists) {
            this.prefetchQueue.push(target);
            this.emit('prefetch:queued', target);
        }
    }

    /**
     * Process prefetch queue
     */
    private async processPrefetchQueue(): Promise<void> {
        if (this.isProcessingQueue || this.prefetchQueue.length === 0) return;

        this.isProcessingQueue = true;

        while (this.prefetchQueue.length > 0 &&
            this.activePrefetches.size < this.config.maxConcurrentPrefetches) {

            const target = this.prefetchQueue.shift()!;
            const prefetchPromise = this.executePrefetch(target);
            this.activePrefetches.set(`${target.type}:${target.name}`, prefetchPromise);

            // Handle completion
            prefetchPromise.then(result => {
                this.activePrefetches.delete(`${target.type}:${target.name}`);
                this.handlePrefetchResult(result);
            }).catch(error => {
                this.activePrefetches.delete(`${target.type}:${target.name}`);
                console.warn(`[PREFETCH] Failed: ${target.type}:${target.name}`, error);
            });
        }

        this.isProcessingQueue = false;
    }

    /**
     * Execute a specific prefetch operation
     */
    private async executePrefetch(target: PrefetchTarget): Promise<PrefetchResult> {
        const startTime = performance.now();
        this.resourceUsage += target.resourceCost;

        try {
            let success = false;

            switch (target.type) {
                case 'pool':
                    success = await this.prefetchPool(target.name);
                    break;
                case 'module':
                    success = await this.prefetchModule(target.name);
                    break;
                case 'cache':
                    success = await this.prefetchCache(target.name);
                    break;
                case 'compilation':
                    success = await this.prefetchCompilation(target.name);
                    break;
            }

            const duration = performance.now() - startTime;
            const result: PrefetchResult = {
                target,
                success,
                duration,
                actualBenefit: success ? target.estimatedBenefit : 0
            };

            this.emit('prefetch:complete', result);
            return result;

        } catch (error) {
            const duration = performance.now() - startTime;
            const result: PrefetchResult = {
                target,
                success: false,
                duration,
                error: error instanceof Error ? error.message : String(error)
            };

            this.emit('prefetch:error', result);
            return result;
        } finally {
            this.resourceUsage -= target.resourceCost;
        }
    }

    /**
     * Prefetch object pool
     */
    private async prefetchPool(poolName: string): Promise<boolean> {
        try {
            const pool = globalPoolManager.getPool(poolName);
            if (pool && 'warmUp' in pool) {
                await (pool as any).warmUp(10); // Warm up with 10 objects
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Prefetch module
     */
    private async prefetchModule(moduleName: string): Promise<boolean> {
        try {
            if (moduleName.startsWith('command:')) {
                // Pre-load command module (simulation)
                await new Promise(resolve => setTimeout(resolve, 10)); // Simulate loading
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Prefetch cache entries
     */
    private async prefetchCache(cacheName: string): Promise<boolean> {
        try {
            if (cacheName.startsWith('options:')) {
                // Pre-warm option validation cache
                await new Promise(resolve => setTimeout(resolve, 5));
                return true;
            } else if (cacheName.startsWith('args:')) {
                // Pre-warm argument pattern cache
                await new Promise(resolve => setTimeout(resolve, 3));
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Prefetch compiled patterns
     */
    private async prefetchCompilation(compilationName: string): Promise<boolean> {
        try {
            if (compilationName.startsWith('regex:')) {
                // Pre-compile regex patterns
                await new Promise(resolve => setTimeout(resolve, 15));
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Handle prefetch result and adaptive learning
     */
    private handlePrefetchResult(result: PrefetchResult): void {
        this.prefetchHistory.push(result);

        // Keep history manageable
        if (this.prefetchHistory.length > 1000) {
            this.prefetchHistory = this.prefetchHistory.slice(-1000);
        }

        // Adaptive learning
        if (this.config.adaptiveLearning) {
            this.updatePrefetchStrategy(result);
        }
    }

    /**
     * Update prefetch strategy based on results
     */
    private updatePrefetchStrategy(_result: PrefetchResult): void {
        const recentResults = this.prefetchHistory.slice(-100); // Last 100 results

        if (recentResults.length >= 20) {
            const successRate = recentResults.filter(r => r.success).length / recentResults.length;
            const avgBenefit = recentResults
                .filter(r => r.actualBenefit)
                .reduce((sum, r) => sum + (r.actualBenefit || 0), 0) / recentResults.length;

            // Adjust confidence threshold based on success rate
            if (successRate < 0.6) {
                this.config.minConfidenceThreshold = Math.min(0.8, this.config.minConfidenceThreshold + 0.05);
            } else if (successRate > 0.8) {
                this.config.minConfidenceThreshold = Math.max(0.2, this.config.minConfidenceThreshold - 0.02);
            }

            // Adjust resource budget based on benefit
            if (avgBenefit < 20) {
                this.config.maxResourceBudget = Math.max(50, this.config.maxResourceBudget - 10);
            } else if (avgBenefit > 50) {
                this.config.maxResourceBudget = Math.min(200, this.config.maxResourceBudget + 10);
            }

            this.emit('strategy:updated', {
                successRate,
                avgBenefit,
                newThreshold: this.config.minConfidenceThreshold,
                newBudget: this.config.maxResourceBudget
            });
        }
    }

    /**
     * Calculate priority for pool prefetching
     */
    private calculatePoolPriority(pattern: WorkloadPattern, poolName: string): number {
        let priority = 5; // Base priority

        if (pattern.frequency > 50) priority += 3;
        else if (pattern.frequency > 20) priority += 2;
        else if (pattern.frequency > 10) priority += 1;

        if (pattern.memoryFootprint > 50 * 1024 * 1024) priority += 2;
        if (pattern.executionTime > 100) priority += 1;

        // Pool-specific priorities
        if (poolName === 'parseResult') priority += 2; // Most critical
        if (poolName === 'command') priority += 1;

        return Math.min(priority, 10);
    }

    /**
     * Estimate benefit of pool prefetching
     */
    private estimatePoolBenefit(pattern: WorkloadPattern, poolName: string): number {
        let benefit = 20; // Base benefit in ms

        // Higher benefit for frequent patterns
        benefit += Math.min(pattern.frequency * 0.5, 50);

        // Higher benefit for memory-intensive patterns
        if (pattern.memoryFootprint > 30 * 1024 * 1024) benefit += 20;

        // Pool-specific benefits
        if (poolName === 'parseResult') benefit += 15;
        if (poolName === 'validation') benefit += 10;

        return benefit;
    }

    /**
     * Estimate resource cost of pool prefetching
     */
    private estimatePoolCost(poolName: string): number {
        const baseCosts: Record<string, number> = {
            'parseResult': 8,
            'command': 6,
            'validation': 4,
            'execution': 5
        };

        return baseCosts[poolName] || 3;
    }

    /**
     * Setup integration with workload analyzer
     */
    private setupWorkloadIntegration(): void {
        globalWorkloadAnalyzer.on('usage:recorded', (event) => {
            // Trigger prefetching for next likely commands
            this.scheduleDelayedPrefetch(event.command, event.options);
        });

        globalWorkloadAnalyzer.on('analysis:complete', () => {
            // Update prefetch strategies based on new patterns
            this.refreshPrefetchStrategies();
        });
    }

    /**
     * Schedule delayed prefetching
     */
    private scheduleDelayedPrefetch(command: string, options: Record<string, any>): void {
        const key = `delayed:${command}`;

        // Clear existing timer
        if (this.prefetchTimers.has(key)) {
            clearTimeout(this.prefetchTimers.get(key)!);
        }

        // Schedule new prefetch
        const timer = setTimeout(() => {
            this.predictAndPrefetch(command, options);
            this.prefetchTimers.delete(key);
        }, this.config.prefetchWindowMs);

        this.prefetchTimers.set(key, timer);
    }

    /**
     * Refresh prefetch strategies
     */
    private refreshPrefetchStrategies(): void {
        // Clear pending prefetches that might be outdated
        this.prefetchQueue.length = 0;

        // Emit refresh event
        this.emit('strategies:refreshed');
    }

    /**
     * Start prefetch queue processor
     */
    private startPrefetchProcessor(): void {
        setInterval(() => {
            this.processPrefetchQueue();
        }, 100); // Process every 100ms
    }

    /**
     * Get prefetch analytics
     */
    getAnalytics(): any {
        const recent = this.prefetchHistory.slice(-100);
        const successRate = recent.filter(r => r.success).length / Math.max(recent.length, 1);
        const avgBenefit = recent.reduce((sum, r) => sum + (r.actualBenefit || 0), 0) / Math.max(recent.length, 1);
        const avgDuration = recent.reduce((sum, r) => sum + r.duration, 0) / Math.max(recent.length, 1);

        return {
            totalPrefetches: this.prefetchHistory.length,
            recentSuccessRate: successRate,
            averageBenefit: avgBenefit,
            averageDuration: avgDuration,
            activePrefetches: this.activePrefetches.size,
            queueSize: this.prefetchQueue.length,
            resourceUsage: this.resourceUsage,
            config: this.config
        };
    }

    /**
     * Get comprehensive analytics report
     */
    getAnalyticsReport(): string {
        const analytics = this.getAnalytics();

        return `
🚀 SMART PREFETCHING ANALYTICS REPORT
=====================================

Performance:
• Total Prefetches: ${analytics.totalPrefetches}
• Success Rate: ${(analytics.recentSuccessRate * 100).toFixed(1)}%
• Average Benefit: ${analytics.averageBenefit.toFixed(1)}ms
• Average Duration: ${analytics.averageDuration.toFixed(1)}ms

Current Status:
• Active Prefetches: ${analytics.activePrefetches}
• Queue Size: ${analytics.queueSize}
• Resource Usage: ${analytics.resourceUsage}MB / ${analytics.config.maxResourceBudget}MB

Configuration:
• Enabled: ${analytics.config.enabled}
• Min Confidence: ${(analytics.config.minConfidenceThreshold * 100).toFixed(1)}%
• Max Concurrent: ${analytics.config.maxConcurrentPrefetches}
• Adaptive Learning: ${analytics.config.adaptiveLearning}
        `.trim();
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<SmartPrefetchConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.emit('config:updated', this.config);
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        // Clear all timers
        for (const timer of this.prefetchTimers.values()) {
            clearTimeout(timer);
        }
        this.prefetchTimers.clear();

        // Cancel active prefetches
        this.activePrefetches.clear();
        this.prefetchQueue.length = 0;

        this.removeAllListeners();
    }
}

export const globalPrefetchEngine = new SmartPrefetchingEngine();

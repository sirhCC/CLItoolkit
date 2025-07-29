/**
 * Real-Time Performance Scoring System (0-100)
 * Enterprise-grade live performance scoring with automatic optimization triggers
 */

import { EventEmitter } from 'events';
import { EnhancedPerformanceMonitor } from './enhanced-performance';
import { globalPoolManager } from '../core/advanced-object-pool';
import { globalEnterpriseAnalytics } from './enterprise-analytics';

/**
 * Performance scoring criteria configuration
 */
interface PerformanceScoringCriteria {
    operationTime: {
        excellent: number;  // < this = full points
        good: number;       // < this = partial points
        weight: number;     // scoring weight (0-1)
    };
    errorRate: {
        excellent: number;  // < this = full points
        acceptable: number; // < this = partial points
        weight: number;
    };
    poolEfficiency: {
        excellent: number;  // > this = full points
        good: number;       // > this = partial points
        weight: number;
    };
    memoryUsage: {
        excellent: number;  // < this MB = full points
        acceptable: number; // < this MB = partial points
        weight: number;
    };
    systemLoad: {
        excellent: number;  // < this = full points
        acceptable: number; // < this = partial points
        weight: number;
    };
}

/**
 * Real-time performance score with detailed breakdown
 */
interface PerformanceScore {
    overall: number;        // 0-100
    timestamp: number;
    level: 'EXCEPTIONAL' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    components: {
        operationPerformance: number;
        errorHandling: number;
        poolEfficiency: number;
        memoryManagement: number;
        systemStability: number;
    };
    trends: {
        shortTerm: 'improving' | 'stable' | 'degrading';  // last 10 scores
        mediumTerm: 'improving' | 'stable' | 'degrading'; // last 50 scores
    };
    recommendations: string[];
    triggers: {
        optimizationNeeded: boolean;
        alertLevel: 'none' | 'info' | 'warning' | 'critical';
        autoTuneActions: string[];
    };
}

/**
 * Real-time performance scoring engine
 */
export class RealTimePerformanceScorer extends EventEmitter {
    private static instance: RealTimePerformanceScorer;
    private scoreHistory: PerformanceScore[] = [];
    private monitoringInterval?: NodeJS.Timeout;
    private isActive = false;
    private readonly maxHistorySize = 1000;

    private readonly scoringCriteria: PerformanceScoringCriteria = {
        operationTime: {
            excellent: 5,      // < 5ms = excellent
            good: 20,          // < 20ms = good
            weight: 0.3
        },
        errorRate: {
            excellent: 0.01,   // < 1% = excellent
            acceptable: 0.05,  // < 5% = acceptable
            weight: 0.25
        },
        poolEfficiency: {
            excellent: 0.90,   // > 90% hit rate = excellent
            good: 0.70,        // > 70% hit rate = good
            weight: 0.2
        },
        memoryUsage: {
            excellent: 100,    // < 100MB = excellent
            acceptable: 250,   // < 250MB = acceptable
            weight: 0.15
        },
        systemLoad: {
            excellent: 0.5,    // < 50% = excellent
            acceptable: 0.8,   // < 80% = acceptable
            weight: 0.1
        }
    };

    private constructor() {
        super();
        this.setupEventListeners();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): RealTimePerformanceScorer {
        if (!RealTimePerformanceScorer.instance) {
            RealTimePerformanceScorer.instance = new RealTimePerformanceScorer();
        }
        return RealTimePerformanceScorer.instance;
    }

    /**
     * Start real-time performance scoring
     */
    startScoring(intervalMs = 5000): void {
        if (this.isActive) {
            console.warn('[PERF-SCORER] Already active');
            return;
        }

        this.isActive = true;
        this.monitoringInterval = setInterval(() => {
            this.calculateScore();
        }, intervalMs);

        console.log('🎯 Real-Time Performance Scorer - Started');
        this.emit('scoring:started', { interval: intervalMs });
    }

    /**
     * Stop real-time performance scoring
     */
    stopScoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
        this.isActive = false;
        console.log('🔴 Real-Time Performance Scorer - Stopped');
        this.emit('scoring:stopped');
    }

    /**
     * Calculate comprehensive performance score
     */
    private calculateScore(): PerformanceScore {
        const timestamp = Date.now();
        const metrics = EnhancedPerformanceMonitor.getMetrics();
        const poolMetrics = globalPoolManager.getAllMetrics();

        // Calculate component scores (0-100 each)
        const operationPerformance = this.calculateOperationScore(metrics.operations);
        const errorHandling = this.calculateErrorScore(metrics.operations);
        const poolEfficiency = this.calculatePoolScore(poolMetrics);
        const memoryManagement = this.calculateMemoryScore(metrics.systemMetrics.memoryUsage);
        const systemStability = this.calculateSystemScore(metrics.systemMetrics);

        // Calculate weighted overall score
        const overall = Math.round(
            operationPerformance * this.scoringCriteria.operationTime.weight +
            errorHandling * this.scoringCriteria.errorRate.weight +
            poolEfficiency * this.scoringCriteria.poolEfficiency.weight +
            memoryManagement * this.scoringCriteria.memoryUsage.weight +
            systemStability * this.scoringCriteria.systemLoad.weight
        );

        // Determine performance level
        const level = this.getPerformanceLevel(overall);

        // Calculate trends
        const trends = this.calculateTrends();

        // Generate recommendations and triggers
        const recommendations = this.generateRecommendations(operationPerformance, errorHandling, poolEfficiency, memoryManagement, systemStability);
        const triggers = this.calculateTriggers(overall, trends);

        const score: PerformanceScore = {
            overall,
            timestamp,
            level,
            components: {
                operationPerformance,
                errorHandling,
                poolEfficiency,
                memoryManagement,
                systemStability
            },
            trends,
            recommendations,
            triggers
        };

        // Store in history
        this.scoreHistory.push(score);
        if (this.scoreHistory.length > this.maxHistorySize) {
            this.scoreHistory.shift();
        }

        // Emit events for real-time monitoring
        this.emit('score:calculated', score);

        // Trigger optimization if needed
        if (triggers.optimizationNeeded) {
            this.emit('optimization:needed', score);
            this.triggerAutoOptimizations(triggers.autoTuneActions);
        }

        // Emit alerts
        if (triggers.alertLevel !== 'none') {
            this.emit('alert:performance', {
                level: triggers.alertLevel,
                score: overall,
                message: `Performance score dropped to ${overall}/100 (${level})`
            });
        }

        return score;
    }

    /**
     * Calculate operation performance score (0-100)
     */
    private calculateOperationScore(operations: Record<string, any>): number {
        if (Object.keys(operations).length === 0) return 100;

        let totalScore = 0;
        let operationCount = 0;

        for (const op of Object.values(operations)) {
            const avgTime = op.averageTime || 0;
            let score = 100;

            if (avgTime > this.scoringCriteria.operationTime.good) {
                score = 0; // Very slow
            } else if (avgTime > this.scoringCriteria.operationTime.excellent) {
                // Linear interpolation between excellent and good
                const factor = (this.scoringCriteria.operationTime.good - avgTime) /
                    (this.scoringCriteria.operationTime.good - this.scoringCriteria.operationTime.excellent);
                score = 50 + (factor * 50); // 50-100 range
            }

            totalScore += score;
            operationCount++;
        }

        return operationCount > 0 ? Math.round(totalScore / operationCount) : 100;
    }

    /**
     * Calculate error handling score (0-100)
     */
    private calculateErrorScore(operations: Record<string, any>): number {
        if (Object.keys(operations).length === 0) return 100;

        let totalScore = 0;
        let operationCount = 0;

        for (const op of Object.values(operations)) {
            const errorRate = op.errorRate || 0;
            let score = 100;

            if (errorRate > this.scoringCriteria.errorRate.acceptable) {
                score = 0; // High error rate
            } else if (errorRate > this.scoringCriteria.errorRate.excellent) {
                // Linear interpolation
                const factor = (this.scoringCriteria.errorRate.acceptable - errorRate) /
                    (this.scoringCriteria.errorRate.acceptable - this.scoringCriteria.errorRate.excellent);
                score = 50 + (factor * 50);
            }

            totalScore += score;
            operationCount++;
        }

        return operationCount > 0 ? Math.round(totalScore / operationCount) : 100;
    }

    /**
     * Calculate pool efficiency score (0-100)
     */
    private calculatePoolScore(poolMetrics: Record<string, any>): number {
        if (Object.keys(poolMetrics).length === 0) return 100;

        let totalScore = 0;
        let poolCount = 0;

        for (const pool of Object.values(poolMetrics)) {
            const hitRate = pool.hitRate || 0;
            let score = 0;

            if (hitRate >= this.scoringCriteria.poolEfficiency.excellent) {
                score = 100;
            } else if (hitRate >= this.scoringCriteria.poolEfficiency.good) {
                // Linear interpolation
                const factor = (hitRate - this.scoringCriteria.poolEfficiency.good) /
                    (this.scoringCriteria.poolEfficiency.excellent - this.scoringCriteria.poolEfficiency.good);
                score = 50 + (factor * 50);
            } else {
                score = (hitRate / this.scoringCriteria.poolEfficiency.good) * 50;
            }

            totalScore += score;
            poolCount++;
        }

        return poolCount > 0 ? Math.round(totalScore / poolCount) : 100;
    }

    /**
     * Calculate memory management score (0-100)
     */
    private calculateMemoryScore(memoryUsage: NodeJS.MemoryUsage): number {
        const heapUsedMB = memoryUsage.heapUsed / (1024 * 1024);

        if (heapUsedMB <= this.scoringCriteria.memoryUsage.excellent) {
            return 100;
        } else if (heapUsedMB <= this.scoringCriteria.memoryUsage.acceptable) {
            const factor = (this.scoringCriteria.memoryUsage.acceptable - heapUsedMB) /
                (this.scoringCriteria.memoryUsage.acceptable - this.scoringCriteria.memoryUsage.excellent);
            return Math.round(50 + (factor * 50));
        } else {
            // Exponential decay for very high memory usage
            const excessFactor = Math.max(0, 1 - ((heapUsedMB - this.scoringCriteria.memoryUsage.acceptable) / 500));
            return Math.round(50 * excessFactor);
        }
    }

    /**
     * Calculate system stability score (0-100)
     */
    private calculateSystemScore(systemMetrics: any): number {
        // For now, base on uptime and general system health
        // In a real implementation, you might include CPU usage, disk I/O, etc.
        const uptimeHours = systemMetrics.uptime / 3600;

        // Score improves with uptime (stability indicator)
        if (uptimeHours > 24) return 100;
        if (uptimeHours > 12) return 90;
        if (uptimeHours > 6) return 80;
        if (uptimeHours > 1) return 70;
        return 60; // Recently started systems get lower stability score
    }

    /**
     * Get performance level based on overall score
     */
    private getPerformanceLevel(score: number): PerformanceScore['level'] {
        if (score >= 95) return 'EXCEPTIONAL';
        if (score >= 85) return 'EXCELLENT';
        if (score >= 70) return 'GOOD';
        if (score >= 50) return 'FAIR';
        if (score >= 30) return 'POOR';
        return 'CRITICAL';
    }

    /**
     * Calculate performance trends
     */
    private calculateTrends(): PerformanceScore['trends'] {
        const recentScores = this.scoreHistory.slice(-10).map(s => s.overall);
        const mediumTermScores = this.scoreHistory.slice(-50).map(s => s.overall);

        return {
            shortTerm: this.analyzeTrend(recentScores),
            mediumTerm: this.analyzeTrend(mediumTermScores)
        };
    }

    /**
     * Analyze trend from score array
     */
    private analyzeTrend(scores: number[]): 'improving' | 'stable' | 'degrading' {
        if (scores.length < 3) return 'stable';

        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        const change = (secondAvg - firstAvg) / firstAvg;

        if (change > 0.05) return 'improving';  // 5% improvement
        if (change < -0.05) return 'degrading'; // 5% degradation
        return 'stable';
    }

    /**
     * Generate performance recommendations
     */
    private generateRecommendations(
        operationPerf: number,
        errorHandling: number,
        poolEff: number,
        memoryMgmt: number,
        systemStab: number
    ): string[] {
        const recommendations: string[] = [];

        if (operationPerf < 70) {
            recommendations.push('🚀 Optimize slow operations - consider caching or algorithm improvements');
        }

        if (errorHandling < 80) {
            recommendations.push('🛠️ Improve error handling - high error rates detected');
        }

        if (poolEff < 75) {
            recommendations.push('🏊 Optimize object pools - low hit rates affecting performance');
        }

        if (memoryMgmt < 70) {
            recommendations.push('🧠 Reduce memory usage - consider memory optimization techniques');
        }

        if (systemStab < 80) {
            recommendations.push('💻 Monitor system stability - recent instability detected');
        }

        if (recommendations.length === 0) {
            recommendations.push('🎉 Performance is excellent! System running optimally.');
        }

        return recommendations;
    }

    /**
     * Calculate optimization triggers and auto-tune actions
     */
    private calculateTriggers(overall: number, trends: PerformanceScore['trends']): PerformanceScore['triggers'] {
        const optimizationNeeded = overall < 70 || trends.shortTerm === 'degrading';

        let alertLevel: 'none' | 'info' | 'warning' | 'critical' = 'none';
        if (overall < 30) alertLevel = 'critical';
        else if (overall < 50) alertLevel = 'warning';
        else if (overall < 70) alertLevel = 'info';

        const autoTuneActions: string[] = [];

        if (overall < 60) {
            autoTuneActions.push('increase-pool-sizes');
            autoTuneActions.push('optimize-memory-usage');
        }

        if (trends.shortTerm === 'degrading') {
            autoTuneActions.push('reset-pool-optimization');
            autoTuneActions.push('clear-performance-caches');
        }

        return {
            optimizationNeeded,
            alertLevel,
            autoTuneActions
        };
    }

    /**
     * Trigger automatic optimizations
     */
    private triggerAutoOptimizations(actions: string[]): void {
        for (const action of actions) {
            try {
                switch (action) {
                    case 'increase-pool-sizes':
                        globalPoolManager.optimizeAll();
                        console.log('🎯 Auto-optimization: Pool sizes increased');
                        break;
                    case 'optimize-memory-usage':
                        if (global.gc) {
                            global.gc();
                            console.log('🧠 Auto-optimization: Memory cleanup triggered');
                        }
                        break;
                    case 'reset-pool-optimization':
                        globalPoolManager.optimizeAll();
                        console.log('🔄 Auto-optimization: Pool optimization reset');
                        break;
                    case 'clear-performance-caches':
                        EnhancedPerformanceMonitor.clear();
                        console.log('🧹 Auto-optimization: Performance caches cleared');
                        break;
                }
            } catch (error) {
                console.warn(`[PERF-SCORER] Auto-optimization failed: ${action}`, error);
            }
        }
    }

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        // Listen to enterprise analytics events
        globalEnterpriseAnalytics.on('alert:created', (alert) => {
            // Correlate analytics alerts with performance scoring
            this.emit('correlation:alert', {
                source: 'enterprise-analytics',
                alert,
                currentScore: this.getCurrentScore()
            });
        });
    }

    /**
     * Get current performance score
     */
    getCurrentScore(): PerformanceScore | null {
        return this.scoreHistory.length > 0 ? this.scoreHistory[this.scoreHistory.length - 1] || null : null;
    }

    /**
     * Get performance score history
     */
    getScoreHistory(limit?: number): PerformanceScore[] {
        if (limit) {
            return this.scoreHistory.slice(-limit);
        }
        return [...this.scoreHistory];
    }

    /**
     * Get real-time performance dashboard data
     */
    getDashboardData(): {
        current: PerformanceScore | null;
        trend: PerformanceScore[];
        averages: {
            last10: number;
            last50: number;
            overall: number;
        };
        activeAlerts: number;
    } {
        const current = this.getCurrentScore();
        const last10 = this.scoreHistory.slice(-10);
        const last50 = this.scoreHistory.slice(-50);

        return {
            current,
            trend: last10,
            averages: {
                last10: last10.length > 0 ? last10.reduce((sum, score) => sum + score.overall, 0) / last10.length : 0,
                last50: last50.length > 0 ? last50.reduce((sum, score) => sum + score.overall, 0) / last50.length : 0,
                overall: this.scoreHistory.length > 0 ? this.scoreHistory.reduce((sum, score) => sum + score.overall, 0) / this.scoreHistory.length : 0
            },
            activeAlerts: this.scoreHistory.filter(s => s.triggers.alertLevel !== 'none').length
        };
    }

    /**
     * Get comprehensive performance report
     */
    getPerformanceReport(): string {
        const current = this.getCurrentScore();
        if (!current) {
            return '📊 Real-Time Performance Scoring - No data available yet';
        }

        const dashboard = this.getDashboardData();
        const lines: string[] = [
            '🎯 REAL-TIME PERFORMANCE SCORING REPORT',
            '═'.repeat(60),
            `📊 Current Score: ${current.overall}/100 (${current.level})`,
            `⏰ Last Updated: ${new Date(current.timestamp).toLocaleTimeString()}`,
            `📈 Status: ${this.isActive ? '🟢 Active' : '🔴 Inactive'}`,
            '',
            '🔍 COMPONENT BREAKDOWN:',
            '─'.repeat(30),
            `⚡ Operation Performance: ${current.components.operationPerformance}/100`,
            `🛠️ Error Handling: ${current.components.errorHandling}/100`,
            `🏊 Pool Efficiency: ${current.components.poolEfficiency}/100`,
            `🧠 Memory Management: ${current.components.memoryManagement}/100`,
            `💻 System Stability: ${current.components.systemStability}/100`,
            '',
            '📈 PERFORMANCE TRENDS:',
            '─'.repeat(30),
            `Short-term (10 samples): ${this.getTrendIcon(current.trends.shortTerm)} ${current.trends.shortTerm.toUpperCase()}`,
            `Medium-term (50 samples): ${this.getTrendIcon(current.trends.mediumTerm)} ${current.trends.mediumTerm.toUpperCase()}`,
            `10-sample average: ${dashboard.averages.last10.toFixed(1)}/100`,
            `50-sample average: ${dashboard.averages.last50.toFixed(1)}/100`,
            '',
            '💡 RECOMMENDATIONS:',
            '─'.repeat(30)
        ];

        current.recommendations.forEach(rec => lines.push(`• ${rec}`));

        if (current.triggers.optimizationNeeded) {
            lines.push('');
            lines.push('🚨 OPTIMIZATION TRIGGERS:');
            lines.push('─'.repeat(30));
            lines.push(`Alert Level: ${this.getAlertIcon(current.triggers.alertLevel)} ${current.triggers.alertLevel.toUpperCase()}`);
            lines.push(`Auto-tune Actions: ${current.triggers.autoTuneActions.length}`);
            current.triggers.autoTuneActions.forEach(action => lines.push(`  • ${action}`));
        }

        lines.push('');
        lines.push('═'.repeat(60));

        return lines.join('\n');
    }

    /**
     * Get trend icon for display
     */
    private getTrendIcon(trend: string): string {
        switch (trend) {
            case 'improving': return '📈';
            case 'degrading': return '📉';
            default: return '➡️';
        }
    }

    /**
     * Get alert icon for display
     */
    private getAlertIcon(level: string): string {
        switch (level) {
            case 'critical': return '🔴';
            case 'warning': return '🟡';
            case 'info': return '🔵';
            default: return '🟢';
        }
    }

    /**
     * Configure scoring criteria
     */
    configureCriteria(newCriteria: Partial<PerformanceScoringCriteria>): void {
        Object.assign(this.scoringCriteria, newCriteria);
        this.emit('criteria:updated', this.scoringCriteria);
    }

    /**
     * Get current scoring criteria
     */
    getScoringCriteria(): PerformanceScoringCriteria {
        return { ...this.scoringCriteria };
    }

    /**
     * Force immediate score calculation
     */
    calculateImmediateScore(): PerformanceScore {
        return this.calculateScore();
    }

    /**
     * Clear score history
     */
    clearHistory(): void {
        this.scoreHistory = [];
        this.emit('history:cleared');
    }
}

// Export singleton instance
export const globalPerformanceScorer = RealTimePerformanceScorer.getInstance();

// Export types
export type { PerformanceScore, PerformanceScoringCriteria };

/**
 * Enterprise-Grade Analytics and Reporting System
 * Extends the existing performance monitoring with comprehensive analytics capabilities
 */

import { EventEmitter } from 'events';
import { EnhancedPerformanceMonitor } from './enhanced-performance';
import { globalOptimizationHub } from './advanced-optimization-hub';

/**
 * Analytics data point structure
 */
interface AnalyticsDataPoint {
    timestamp: number;
    metricName: string;
    value: number;
    tags: Record<string, string>;
    metadata?: Record<string, any>;
}

/**
 * Performance trend analysis result
 */
interface TrendAnalysis {
    direction: 'improving' | 'degrading' | 'stable';
    confidence: number; // 0-1
    slope: number;
    rSquared: number;
    prediction: number;
    anomalies: number[];
}

/**
 * Enterprise analytics configuration
 */
interface EnterpriseAnalyticsConfig {
    enableRealTimeAnalytics: boolean;
    enablePredictiveAnalytics: boolean;
    enableAnomalyDetection: boolean;
    analyticsRetentionDays: number;
    aggregationIntervals: number[];
    alertThresholds: {
        performanceScore: number;
        errorRate: number;
        responseTime: number;
        memoryUsage: number;
    };
}

/**
 * Enterprise-grade analytics and reporting system
 */
export class EnterpriseAnalytics extends EventEmitter {
    private static instance: EnterpriseAnalytics;
    private dataPoints: AnalyticsDataPoint[] = [];
    private aggregatedMetrics: Map<string, any> = new Map();
    private trendCache: Map<string, TrendAnalysis> = new Map();
    private alerts: Array<{ timestamp: number; severity: string; message: string; resolved: boolean }> = [];
    private monitoringActive = false;
    private monitoringInterval?: NodeJS.Timeout;

    private readonly config: EnterpriseAnalyticsConfig = {
        enableRealTimeAnalytics: true,
        enablePredictiveAnalytics: true,
        enableAnomalyDetection: true,
        analyticsRetentionDays: 30,
        aggregationIntervals: [60000, 300000, 900000, 3600000], // 1m, 5m, 15m, 1h
        alertThresholds: {
            performanceScore: 70,
            errorRate: 0.05,
            responseTime: 100,
            memoryUsage: 512 * 1024 * 1024 // 512MB
        }
    };

    private constructor() {
        super();
        this.setupEventListeners();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): EnterpriseAnalytics {
        if (!EnterpriseAnalytics.instance) {
            EnterpriseAnalytics.instance = new EnterpriseAnalytics();
        }
        return EnterpriseAnalytics.instance;
    }

    /**
     * Start real-time analytics monitoring
     */
    startMonitoring(intervalMs = 10000): void {
        if (this.monitoringActive) {
            console.warn('[ANALYTICS] Monitoring already active');
            return;
        }

        this.monitoringActive = true;
        this.monitoringInterval = setInterval(async () => {
            await this.collectMetrics();
            this.performAnalysis();
            this.checkAlerts();
        }, intervalMs);

        console.log('🚀 Enterprise Analytics - Monitoring Started');
        this.emit('monitoring:started', { interval: intervalMs });
    }

    /**
     * Stop analytics monitoring
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
        this.monitoringActive = false;
        console.log('🔴 Enterprise Analytics - Monitoring Stopped');
        this.emit('monitoring:stopped');
    }

    /**
     * Collect comprehensive metrics from all systems
     */
    private async collectMetrics(): Promise<void> {
        const timestamp = Date.now();

        try {
            // Performance metrics
            const perfMetrics = EnhancedPerformanceMonitor.getMetrics();
            this.recordDataPoint('performance.score', perfMetrics.systemMetrics.performanceScore, timestamp, { source: 'performance' });
            this.recordDataPoint('memory.heap.used', perfMetrics.systemMetrics.memoryUsage.heapUsed, timestamp, { source: 'system' });
            this.recordDataPoint('memory.heap.total', perfMetrics.systemMetrics.memoryUsage.heapTotal, timestamp, { source: 'system' });
            this.recordDataPoint('system.uptime', perfMetrics.systemMetrics.uptime, timestamp, { source: 'system' });

            // Operation metrics
            for (const [name, op] of Object.entries(perfMetrics.operations)) {
                this.recordDataPoint(`operation.${name}.avgTime`, op.averageTime, timestamp, { operation: name, source: 'operations' });
                this.recordDataPoint(`operation.${name}.errorRate`, op.errorRate, timestamp, { operation: name, source: 'operations' });
                this.recordDataPoint(`operation.${name}.count`, op.count, timestamp, { operation: name, source: 'operations' });
            }

            // Pool metrics
            for (const [poolName, pool] of Object.entries(perfMetrics.pools)) {
                this.recordDataPoint(`pool.${poolName}.hitRate`, pool.hitRate, timestamp, { pool: poolName, source: 'pools' });
                this.recordDataPoint(`pool.${poolName}.activeObjects`, pool.activeObjects, timestamp, { pool: poolName, source: 'pools' });
                this.recordDataPoint(`pool.${poolName}.size`, pool.size, timestamp, { pool: poolName, source: 'pools' });
            }

            // Optimization hub metrics (async)
            if (globalOptimizationHub) {
                try {
                    const systemMetrics = await globalOptimizationHub.getSystemMetrics();
                    if (systemMetrics) {
                        this.recordDataPoint('optimization.cpu.improvement', (systemMetrics as any).cpu?.averageImprovement || 0, timestamp, { source: 'optimization' });
                        this.recordDataPoint('optimization.cache.hitRatio', (systemMetrics as any).cache?.hitRatio || 0, timestamp, { source: 'optimization' });
                    }
                } catch (error) {
                    // Optimization hub metrics optional
                }
            }

        } catch (error) {
            console.warn('[ANALYTICS] Metrics collection failed:', error);
        }
    }

    /**
     * Record a data point for analytics
     */
    private recordDataPoint(metricName: string, value: number, timestamp?: number, tags: Record<string, string> = {}): void {
        const dataPoint: AnalyticsDataPoint = {
            timestamp: timestamp || Date.now(),
            metricName,
            value,
            tags
        };

        this.dataPoints.push(dataPoint);

        // Maintain retention policy
        const retentionCutoff = Date.now() - (this.config.analyticsRetentionDays * 24 * 60 * 60 * 1000);
        this.dataPoints = this.dataPoints.filter(dp => dp.timestamp > retentionCutoff);

        this.emit('datapoint:recorded', dataPoint);
    }

    /**
     * Perform trend analysis and predictive analytics
     */
    private performAnalysis(): void {
        if (!this.config.enablePredictiveAnalytics) return;

        const keyMetrics = [
            'performance.score',
            'memory.heap.used',
            'operation.*.avgTime',
            'pool.*.hitRate'
        ];

        for (const metricPattern of keyMetrics) {
            const matchingMetrics = this.getMetricsByPattern(metricPattern);
            
            for (const metricName of matchingMetrics) {
                const analysis = this.analyzeTrend(metricName);
                if (analysis) {
                    this.trendCache.set(metricName, analysis);
                    
                    // Emit events for significant trends
                    if (analysis.confidence > 0.7) {
                        this.emit('trend:detected', { metricName, analysis });
                    }
                }
            }
        }
    }

    /**
     * Get metrics matching a pattern (supports wildcards)
     */
    private getMetricsByPattern(pattern: string): string[] {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const uniqueMetrics = new Set(this.dataPoints.map(dp => dp.metricName));
        return Array.from(uniqueMetrics).filter(name => regex.test(name));
    }

    /**
     * Analyze trend for a specific metric using linear regression
     */
    private analyzeTrend(metricName: string, windowHours = 2): TrendAnalysis | null {
        const cutoffTime = Date.now() - (windowHours * 60 * 60 * 1000);
        const points = this.dataPoints
            .filter(dp => dp.metricName === metricName && dp.timestamp > cutoffTime)
            .sort((a, b) => a.timestamp - b.timestamp);

        if (points.length < 5) return null;

        // Linear regression calculation
        const n = points.length;
        const x = points.map((_, i) => i);
        const y = points.map(p => p.value);
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * (y[i] || 0), 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calculate R²
        const yMean = sumY / n;
        const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
        const ssResidual = y.reduce((sum, yi, i) => {
            const predicted = intercept + slope * i;
            return sum + Math.pow(yi - predicted, 2);
        }, 0);
        const rSquared = 1 - (ssResidual / ssTotal);

        // Detect anomalies (values outside 2 standard deviations)
        const residuals = y.map((yi, i) => yi - (intercept + slope * i));
        const residualMean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
        const residualStd = Math.sqrt(residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / residuals.length);
        const anomalies = points
            .map((point, i) => ({ index: i, timestamp: point.timestamp, residual: Math.abs(residuals[i] || 0) }))
            .filter(({ residual }) => residual > 2 * residualStd)
            .map(({ timestamp }) => timestamp);

        // Determine direction and confidence
        const direction: 'improving' | 'degrading' | 'stable' = 
            Math.abs(slope) < 0.001 ? 'stable' :
            slope > 0 ? (metricName.includes('error') || metricName.includes('time') ? 'degrading' : 'improving') :
            (metricName.includes('error') || metricName.includes('time') ? 'improving' : 'degrading');

        const confidence = Math.min(rSquared * (n / 10), 1); // Scale confidence by sample size

        // Predict next value
        const prediction = intercept + slope * n;

        return {
            direction,
            confidence,
            slope,
            rSquared,
            prediction,
            anomalies
        };
    }

    /**
     * Check for alert conditions
     */
    private checkAlerts(): void {
        const currentMetrics = EnhancedPerformanceMonitor.getMetrics();
        const timestamp = Date.now();

        // Performance score alert
        if (currentMetrics.systemMetrics.performanceScore < this.config.alertThresholds.performanceScore) {
            this.createAlert('high', `Performance score dropped to ${currentMetrics.systemMetrics.performanceScore}/100`, timestamp);
        }

        // Memory usage alert
        const memoryUsageMB = currentMetrics.systemMetrics.memoryUsage.heapUsed;
        if (memoryUsageMB > this.config.alertThresholds.memoryUsage) {
            this.createAlert('medium', `High memory usage: ${(memoryUsageMB / 1024 / 1024).toFixed(1)}MB`, timestamp);
        }

        // Error rate alerts
        for (const [name, op] of Object.entries(currentMetrics.operations)) {
            if (op.errorRate > this.config.alertThresholds.errorRate) {
                this.createAlert('high', `High error rate in ${name}: ${(op.errorRate * 100).toFixed(1)}%`, timestamp);
            }
        }

        // Response time alerts
        for (const [name, op] of Object.entries(currentMetrics.operations)) {
            if (op.averageTime > this.config.alertThresholds.responseTime) {
                this.createAlert('medium', `Slow operation ${name}: ${op.averageTime.toFixed(1)}ms average`, timestamp);
            }
        }
    }

    /**
     * Create an alert
     */
    private createAlert(severity: string, message: string, timestamp: number): void {
        const alert = { timestamp, severity, message, resolved: false };
        this.alerts.push(alert);
        
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }

        console.warn(`[ALERT-${severity.toUpperCase()}] ${message}`);
        this.emit('alert:created', alert);
    }

    /**
     * Get comprehensive enterprise analytics report
     */
    getEnterpriseReport(): string {
        const metrics = EnhancedPerformanceMonitor.getMetrics();
        const lines: string[] = [
            '🏢 ENTERPRISE ANALYTICS REPORT',
            '═'.repeat(60),
            `📊 Generated: ${new Date().toISOString()}`,
            `🔄 Monitoring: ${this.monitoringActive ? '🟢 Active' : '🔴 Inactive'}`,
            `📈 Data Points: ${this.dataPoints.length.toLocaleString()}`,
            '',
            '🎯 PERFORMANCE OVERVIEW:',
            '─'.repeat(30),
            `• Overall Score: ${metrics.systemMetrics.performanceScore}/100`,
            `• System Uptime: ${(metrics.systemMetrics.uptime / 3600).toFixed(1)} hours`,
            `• Memory Usage: ${(metrics.systemMetrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`,
            ''
        ];

        // Trend analysis
        lines.push('📈 TREND ANALYSIS:');
        lines.push('─'.repeat(30));
        
        const trendsToShow = Array.from(this.trendCache.entries())
            .filter(([, analysis]) => analysis.confidence > 0.5)
            .sort(([, a], [, b]) => b.confidence - a.confidence)
            .slice(0, 5);

        if (trendsToShow.length > 0) {
            for (const [metricName, analysis] of trendsToShow) {
                const trendIcon = analysis.direction === 'improving' ? '📈' : 
                                analysis.direction === 'degrading' ? '📉' : '➡️';
                const confidenceBar = '█'.repeat(Math.floor(analysis.confidence * 10));
                lines.push(`${trendIcon} ${metricName}`);
                lines.push(`  Confidence: ${confidenceBar} ${(analysis.confidence * 100).toFixed(1)}%`);
                lines.push(`  R²: ${analysis.rSquared.toFixed(3)}, Prediction: ${analysis.prediction.toFixed(2)}`);
            }
        } else {
            lines.push('• No significant trends detected');
        }

        lines.push('');

        // Alerts
        const recentAlerts = this.alerts.filter(a => !a.resolved && Date.now() - a.timestamp < 24 * 60 * 60 * 1000);
        lines.push('🚨 ACTIVE ALERTS:');
        lines.push('─'.repeat(30));
        
        if (recentAlerts.length > 0) {
            for (const alert of recentAlerts.slice(-5)) {
                const severityIcon = alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🟠';
                const timeAgo = Math.floor((Date.now() - alert.timestamp) / 60000);
                lines.push(`${severityIcon} ${alert.message} (${timeAgo}m ago)`);
            }
        } else {
            lines.push('• No active alerts 🎉');
        }

        lines.push('');

        // Top metrics
        lines.push('🔝 TOP METRICS (24H):');
        lines.push('─'.repeat(30));
        
        const last24h = Date.now() - 24 * 60 * 60 * 1000;
        const recentPoints = this.dataPoints.filter(dp => dp.timestamp > last24h);
        const metricSummary = new Map<string, { count: number; avg: number; min: number; max: number }>();

        for (const point of recentPoints) {
            if (!metricSummary.has(point.metricName)) {
                metricSummary.set(point.metricName, { count: 0, avg: 0, min: Infinity, max: -Infinity });
            }
            const summary = metricSummary.get(point.metricName)!;
            summary.count++;
            summary.avg = (summary.avg * (summary.count - 1) + point.value) / summary.count;
            summary.min = Math.min(summary.min, point.value);
            summary.max = Math.max(summary.max, point.value);
        }

        const topMetrics = Array.from(metricSummary.entries())
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 5);

        for (const [metricName, summary] of topMetrics) {
            lines.push(`• ${metricName}: ${summary.count} points, avg: ${summary.avg.toFixed(2)}`);
        }

        lines.push('');
        lines.push('═'.repeat(60));
        
        return lines.join('\n');
    }

    /**
     * Export analytics data for external tools
     */
    exportData(format: 'json' | 'csv' = 'json', metricFilter?: string): string {
        let filteredData = this.dataPoints;
        
        if (metricFilter) {
            const regex = new RegExp(metricFilter.replace(/\*/g, '.*'));
            filteredData = this.dataPoints.filter(dp => regex.test(dp.metricName));
        }

        if (format === 'csv') {
            const headers = 'timestamp,metricName,value,tags';
            const rows = filteredData.map(dp => 
                `${dp.timestamp},${dp.metricName},${dp.value},"${JSON.stringify(dp.tags)}"`
            );
            return [headers, ...rows].join('\n');
        }

        return JSON.stringify({
            exportTime: Date.now(),
            dataPoints: filteredData,
            trendAnalysis: Object.fromEntries(this.trendCache),
            alerts: this.alerts,
            config: this.config
        }, null, 2);
    }

    /**
     * Configure analytics settings
     */
    configure(newConfig: Partial<EnterpriseAnalyticsConfig>): void {
        Object.assign(this.config, newConfig);
        this.emit('config:updated', this.config);
    }

    /**
     * Get analytics configuration
     */
    getConfig(): EnterpriseAnalyticsConfig {
        return { ...this.config };
    }

    /**
     * Setup event listeners for other system components
     */
    private setupEventListeners(): void {
        // Listen to optimization hub events
        if (globalOptimizationHub) {
            globalOptimizationHub.on('suite:metrics', (metrics) => {
                this.recordDataPoint('optimization.overall.score', metrics.overall.performanceScore, Date.now(), { source: 'optimization' });
            });
        }

        // Listen to our own events for logging
        this.on('alert:created', (alert) => {
            console.log(`[ANALYTICS] Alert created: ${alert.severity} - ${alert.message}`);
        });

        this.on('trend:detected', ({ metricName, analysis }) => {
            console.log(`[ANALYTICS] Trend detected in ${metricName}: ${analysis.direction} (${(analysis.confidence * 100).toFixed(1)}% confidence)`);
        });
    }
}

// Export singleton instance
export const globalEnterpriseAnalytics = EnterpriseAnalytics.getInstance();

// Export types for external use
export type { AnalyticsDataPoint, TrendAnalysis, EnterpriseAnalyticsConfig };

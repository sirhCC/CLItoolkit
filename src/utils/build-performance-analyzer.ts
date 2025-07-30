/**
 * Build Performance Analytics System
 * Monitors TypeScript compilation performance and provides optimization insights
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface BuildMetrics {
    compilationTime: number;
    memoryUsage: number;
    fileCount: number;
    errorCount: number;
    warningCount: number;
    bundleSize: number;
    incrementalBuildTime?: number;
}

export interface BuildAnalyticsReport {
    currentBuild: BuildMetrics;
    previousBuild?: BuildMetrics;
    performance: {
        improvement: number;
        recommendation: string;
        optimizationScore: number;
    };
    trends: {
        averageCompileTime: number;
        buildSpeedTrend: 'improving' | 'degrading' | 'stable';
        memoryTrend: 'improving' | 'degrading' | 'stable';
    };
}

class BuildPerformanceAnalyzer {
    private readonly metricsFile = path.join(process.cwd(), 'dist', '.build-metrics.json');
    private readonly maxHistoryEntries = 50;

    /**
     * Analyze build performance and generate comprehensive report
     */
    async analyzeBuild(metrics: BuildMetrics): Promise<BuildAnalyticsReport> {
        const history = this.loadBuildHistory();
        const previousBuild = history.length > 0 ? history[history.length - 1] : undefined;

        // Save current metrics
        history.push(metrics);
        if (history.length > this.maxHistoryEntries) {
            history.splice(0, history.length - this.maxHistoryEntries);
        }
        this.saveBuildHistory(history);

        // Calculate performance insights
        const performance = this.calculatePerformanceMetrics(metrics, previousBuild);
        const trends = this.analyzeTrends(history);

        return {
            currentBuild: metrics,
            previousBuild,
            performance,
            trends
        };
    }

    /**
     * Measure TypeScript compilation performance
     */
    async measureCompilation(configFile: string = 'tsconfig.build.json'): Promise<BuildMetrics> {
        const startTime = performance.now();
        const initialMemory = process.memoryUsage();

        try {
            // Run TypeScript compilation
            const output = execSync(`npx tsc -p ${configFile}`, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });

            const compilationTime = performance.now() - startTime;
            const finalMemory = process.memoryUsage();
            const memoryUsage = finalMemory.heapUsed - initialMemory.heapUsed;

            // Analyze output for errors and warnings
            const lines = output.split('\n');
            const errorCount = lines.filter(line => line.includes('error TS')).length;
            const warningCount = lines.filter(line => line.includes('warning TS')).length;

            // Count TypeScript files
            const fileCount = this.countTypeScriptFiles();

            // Measure bundle size
            const bundleSize = this.measureBundleSize();

            return {
                compilationTime,
                memoryUsage,
                fileCount,
                errorCount,
                warningCount,
                bundleSize
            };

        } catch (error) {
            // Handle compilation errors
            const compilationTime = performance.now() - startTime;
            const finalMemory = process.memoryUsage();
            const memoryUsage = finalMemory.heapUsed - initialMemory.heapUsed;

            const errorOutput = error instanceof Error ? error.message : String(error);
            const errorCount = (errorOutput.match(/error TS/g) || []).length;
            const warningCount = (errorOutput.match(/warning TS/g) || []).length;

            return {
                compilationTime,
                memoryUsage,
                fileCount: this.countTypeScriptFiles(),
                errorCount,
                warningCount,
                bundleSize: 0
            };
        }
    }

    /**
     * Measure incremental build performance
     */
    async measureIncrementalBuild(): Promise<number> {
        const startTime = performance.now();
        
        try {
            execSync('npx tsc -p tsconfig.build.json --incremental', { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            return performance.now() - startTime;
        } catch {
            return performance.now() - startTime;
        }
    }

    /**
     * Generate optimization recommendations
     */
    generateOptimizationRecommendations(metrics: BuildMetrics, history: BuildMetrics[]): string[] {
        const recommendations: string[] = [];

        // Compilation time recommendations
        if (metrics.compilationTime > 10000) { // > 10 seconds
            recommendations.push('Consider enabling project references for faster builds');
            recommendations.push('Use skipLibCheck and skipDefaultLibCheck for faster compilation');
        }

        // Memory usage recommendations
        if (metrics.memoryUsage > 100 * 1024 * 1024) { // > 100MB
            recommendations.push('Enable incremental compilation to reduce memory usage');
            recommendations.push('Consider using composite projects for better memory management');
        }

        // File count recommendations
        if (metrics.fileCount > 500) {
            recommendations.push('Consider splitting into multiple projects with project references');
        }

        // Error handling recommendations
        if (metrics.errorCount > 0) {
            recommendations.push('Fix TypeScript errors to improve compilation performance');
        }

        // Bundle size recommendations
        if (metrics.bundleSize > 5 * 1024 * 1024) { // > 5MB
            recommendations.push('Enable tree-shaking and dead code elimination');
            recommendations.push('Consider code splitting for better bundle performance');
        }

        // Trend-based recommendations
        if (history.length >= 3) {
            const recentBuilds = history.slice(-3);
            const avgTime = recentBuilds.reduce((sum, build) => sum + build.compilationTime, 0) / 3;
            
            if (avgTime > metrics.compilationTime * 1.2) {
                recommendations.push('Build performance is degrading - consider cleaning dist folder');
            }
        }

        return recommendations;
    }

    /**
     * Calculate performance score (0-100)
     */
    calculatePerformanceScore(metrics: BuildMetrics): number {
        let score = 100;

        // Compilation time penalty (0-40 points)
        const timeScore = Math.max(0, 40 - (metrics.compilationTime / 1000) * 2);
        score = Math.min(score, 60 + timeScore);

        // Memory usage penalty (0-20 points)
        const memoryPenalty = Math.min(20, (metrics.memoryUsage / (50 * 1024 * 1024)) * 20);
        score -= memoryPenalty;

        // Error penalty (0-30 points)
        const errorPenalty = Math.min(30, metrics.errorCount * 5);
        score -= errorPenalty;

        // Warning penalty (0-10 points)
        const warningPenalty = Math.min(10, metrics.warningCount);
        score -= warningPenalty;

        return Math.max(0, Math.round(score));
    }

    /**
     * Generate comprehensive analytics report
     */
    generateReport(analytics: BuildAnalyticsReport): string {
        const { currentBuild, previousBuild, performance, trends } = analytics;
        
        const report = [
            '📊 Build Performance Analytics Report',
            '=' .repeat(60),
            '',
            '🏗️ Current Build Metrics:',
            `   Compilation Time: ${(currentBuild.compilationTime / 1000).toFixed(2)}s`,
            `   Memory Usage: ${(currentBuild.memoryUsage / (1024 * 1024)).toFixed(2)}MB`,
            `   Files Processed: ${currentBuild.fileCount}`,
            `   Errors: ${currentBuild.errorCount}`,
            `   Warnings: ${currentBuild.warningCount}`,
            `   Bundle Size: ${(currentBuild.bundleSize / (1024 * 1024)).toFixed(2)}MB`,
            '',
            '⚡ Performance Analysis:',
            `   Optimization Score: ${performance.optimizationScore}/100`,
            `   Recommendation: ${performance.recommendation}`,
        ];

        if (previousBuild) {
            const timeImprovement = ((previousBuild.compilationTime - currentBuild.compilationTime) / previousBuild.compilationTime * 100);
            report.push(`   Time Improvement: ${timeImprovement > 0 ? '+' : ''}${timeImprovement.toFixed(1)}%`);
        }

        report.push(
            '',
            '📈 Trends:',
            `   Average Compile Time: ${(trends.averageCompileTime / 1000).toFixed(2)}s`,
            `   Build Speed Trend: ${trends.buildSpeedTrend}`,
            `   Memory Usage Trend: ${trends.memoryTrend}`,
            '',
            '=' .repeat(60)
        );

        return report.join('\n');
    }

    private calculatePerformanceMetrics(current: BuildMetrics, previous?: BuildMetrics) {
        const optimizationScore = this.calculatePerformanceScore(current);
        let improvement = 0;
        let recommendation = 'Build performance is optimal';

        if (previous) {
            improvement = ((previous.compilationTime - current.compilationTime) / previous.compilationTime) * 100;
        }

        if (optimizationScore < 70) {
            recommendation = 'Consider enabling incremental builds and project references';
        } else if (optimizationScore < 85) {
            recommendation = 'Good performance, minor optimizations possible';
        }

        return { improvement, recommendation, optimizationScore };
    }

    private analyzeTrends(history: BuildMetrics[]) {
        if (history.length < 3) {
            return {
                averageCompileTime: history.length > 0 ? history[0].compilationTime : 0,
                buildSpeedTrend: 'stable' as const,
                memoryTrend: 'stable' as const
            };
        }

        const recent = history.slice(-5);
        const averageCompileTime = recent.reduce((sum, build) => sum + build.compilationTime, 0) / recent.length;

        // Trend analysis
        const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
        const secondHalf = recent.slice(Math.floor(recent.length / 2));

        const firstAvgTime = firstHalf.reduce((sum, build) => sum + build.compilationTime, 0) / firstHalf.length;
        const secondAvgTime = secondHalf.reduce((sum, build) => sum + build.compilationTime, 0) / secondHalf.length;

        const firstAvgMemory = firstHalf.reduce((sum, build) => sum + build.memoryUsage, 0) / firstHalf.length;
        const secondAvgMemory = secondHalf.reduce((sum, build) => sum + build.memoryUsage, 0) / secondHalf.length;

        const buildSpeedTrend = secondAvgTime < firstAvgTime * 0.9 ? 'improving' :
                              secondAvgTime > firstAvgTime * 1.1 ? 'degrading' : 'stable';

        const memoryTrend = secondAvgMemory < firstAvgMemory * 0.9 ? 'improving' :
                           secondAvgMemory > firstAvgMemory * 1.1 ? 'degrading' : 'stable';

        return { averageCompileTime, buildSpeedTrend, memoryTrend };
    }

    private loadBuildHistory(): BuildMetrics[] {
        try {
            if (fs.existsSync(this.metricsFile)) {
                const data = fs.readFileSync(this.metricsFile, 'utf8');
                return JSON.parse(data) || [];
            }
        } catch {
            // Ignore errors and return empty array
        }
        return [];
    }

    private saveBuildHistory(history: BuildMetrics[]): void {
        try {
            const dir = path.dirname(this.metricsFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.metricsFile, JSON.stringify(history, null, 2));
        } catch {
            // Ignore save errors
        }
    }

    private countTypeScriptFiles(): number {
        try {
            const output = execSync('find src -name "*.ts" | wc -l', { encoding: 'utf8' });
            return parseInt(output.trim()) || 0;
        } catch {
            return 0;
        }
    }

    private measureBundleSize(): number {
        try {
            const distPath = path.join(process.cwd(), 'dist');
            if (!fs.existsSync(distPath)) return 0;

            let totalSize = 0;
            const walkDir = (dir: string) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                        walkDir(filePath);
                    } else if (file.endsWith('.js') || file.endsWith('.d.ts')) {
                        totalSize += stat.size;
                    }
                }
            };
            walkDir(distPath);
            return totalSize;
        } catch {
            return 0;
        }
    }
}

// Global build analyzer instance
export const buildPerformanceAnalyzer = new BuildPerformanceAnalyzer();

// CLI command for build analysis
export async function runBuildAnalysis(configFile?: string): Promise<void> {
    console.log('📊 Starting build performance analysis...\n');

    const metrics = await buildPerformanceAnalyzer.measureCompilation(configFile);
    const analytics = await buildPerformanceAnalyzer.analyzeBuild(metrics);
    
    console.log(buildPerformanceAnalyzer.generateReport(analytics));

    // Generate recommendations
    const history = buildPerformanceAnalyzer['loadBuildHistory']();
    const recommendations = buildPerformanceAnalyzer.generateOptimizationRecommendations(metrics, history);
    
    if (recommendations.length > 0) {
        console.log('\n💡 Optimization Recommendations:');
        recommendations.forEach((rec, index) => {
            console.log(`   ${index + 1}. ${rec}`);
        });
    }

    console.log('\n✅ Build analysis complete!');
}

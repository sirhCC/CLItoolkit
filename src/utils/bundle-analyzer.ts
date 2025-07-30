/**
 * Advanced Bundle Size Analyzer
 * Enterprise-grade bundle optimization and monitoring
 */

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

export interface BundleAnalysis {
    totalSize: number;
    gzippedSize: number;
    modules: ModuleInfo[];
    dependencies: DependencyInfo[];
    treeshakingOpportunities: TreeshakingOpportunity[];
    recommendations: BundleRecommendation[];
    metrics: BundleMetrics;
}

export interface ModuleInfo {
    name: string;
    size: number;
    path: string;
    imports: string[];
    exports: string[];
    usageCount: number;
    isTreeShakeable: boolean;
}

export interface DependencyInfo {
    name: string;
    version: string;
    size: number;
    type: 'production' | 'development';
    usage: 'direct' | 'transitive';
    treeshakeable: boolean;
}

export interface TreeshakingOpportunity {
    module: string;
    unusedExports: string[];
    potentialSavings: number;
    confidence: number;
}

export interface BundleRecommendation {
    type: 'size' | 'performance' | 'dependency';
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    action: string;
    estimatedSavings: number;
}

export interface BundleMetrics {
    analysisTime: number;
    moduleCount: number;
    dependencyCount: number;
    duplicatedModules: number;
    treeshakingEfficiency: number;
    compressionRatio: number;
}

export class AdvancedBundleAnalyzer {
    private startTime: number = 0;
    private cacheEnabled: boolean = true;
    private analysisCache = new Map<string, BundleAnalysis>();

    constructor(private options: {
        enableCache?: boolean;
        enableCompression?: boolean;
        analyzeNodeModules?: boolean;
    } = {}) {
        this.cacheEnabled = options.enableCache ?? true;
    }

    /**
     * Analyze bundle size and optimization opportunities
     */
    async analyzeBundleSize(bundlePath: string): Promise<BundleAnalysis> {
        this.startTime = performance.now();

        // Check cache first
        if (this.cacheEnabled && this.analysisCache.has(bundlePath)) {
            const cached = this.analysisCache.get(bundlePath)!;
            if (this.isCacheValid(bundlePath, cached)) {
                return cached;
            }
        }

        const analysis: BundleAnalysis = {
            totalSize: 0,
            gzippedSize: 0,
            modules: [],
            dependencies: [],
            treeshakingOpportunities: [],
            recommendations: [],
            metrics: this.createInitialMetrics()
        };

        try {
            // Analyze main bundle
            await this.analyzeBundleFiles(bundlePath, analysis);

            // Analyze dependencies
            await this.analyzeDependencies(bundlePath, analysis);

            // Find tree-shaking opportunities
            await this.analyzeTreeshakingOpportunities(analysis);

            // Generate recommendations
            this.generateRecommendations(analysis);

            // Calculate final metrics
            this.calculateFinalMetrics(analysis);

            // Cache results
            if (this.cacheEnabled) {
                this.analysisCache.set(bundlePath, analysis);
            }

            return analysis;
        } catch (error) {
            console.error('Bundle analysis failed:', error);
            throw error;
        }
    }

    /**
     * Analyze individual bundle files
     */
    private async analyzeBundleFiles(bundlePath: string, analysis: BundleAnalysis): Promise<void> {
        const distPath = path.resolve(bundlePath, 'dist');

        if (!fs.existsSync(distPath)) {
            // No dist folder, analyze source files
            await this.analyzeSourceFiles(bundlePath, analysis);
            return;
        }

        const files = this.getAllFiles(distPath, ['.js', '.ts', '.mjs']);

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const size = Buffer.byteLength(content, 'utf-8');

            const moduleInfo: ModuleInfo = {
                name: path.relative(distPath, file),
                size,
                path: file,
                imports: this.extractImports(content),
                exports: this.extractExports(content),
                usageCount: 0,
                isTreeShakeable: this.isModuleTreeShakeable(content)
            };

            analysis.modules.push(moduleInfo);
            analysis.totalSize += size;
        }

        // Calculate gzipped size estimate
        analysis.gzippedSize = Math.round(analysis.totalSize * 0.3); // Rough estimate
    }

    /**
     * Analyze source files when no dist exists
     */
    private async analyzeSourceFiles(bundlePath: string, analysis: BundleAnalysis): Promise<void> {
        const srcPath = path.resolve(bundlePath, 'src');

        if (!fs.existsSync(srcPath)) {
            throw new Error('Neither dist nor src directory found');
        }

        const files = this.getAllFiles(srcPath, ['.ts', '.js']);

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const size = Buffer.byteLength(content, 'utf-8');

            const moduleInfo: ModuleInfo = {
                name: path.relative(srcPath, file),
                size,
                path: file,
                imports: this.extractImports(content),
                exports: this.extractExports(content),
                usageCount: 0,
                isTreeShakeable: this.isModuleTreeShakeable(content)
            };

            analysis.modules.push(moduleInfo);
            analysis.totalSize += size;
        }

        analysis.gzippedSize = Math.round(analysis.totalSize * 0.3);
    }

    /**
     * Analyze package dependencies
     */
    private async analyzeDependencies(bundlePath: string, analysis: BundleAnalysis): Promise<void> {
        const packageJsonPath = path.resolve(bundlePath, 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
            return;
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        for (const [name, version] of Object.entries(dependencies)) {
            const depInfo: DependencyInfo = {
                name,
                version: version as string,
                size: await this.estimateDependencySize(bundlePath, name),
                type: packageJson.dependencies?.[name] ? 'production' : 'development',
                usage: 'direct',
                treeshakeable: await this.isDependencyTreeShakeable(bundlePath, name)
            };

            analysis.dependencies.push(depInfo);
        }
    }

    /**
     * Find tree-shaking opportunities
     */
    private async analyzeTreeshakingOpportunities(analysis: BundleAnalysis): Promise<void> {
        for (const module of analysis.modules) {
            const unusedExports = this.findUnusedExports(module, analysis.modules);

            if (unusedExports.length > 0) {
                const potentialSavings = this.estimateSavings(module, unusedExports);

                analysis.treeshakingOpportunities.push({
                    module: module.name,
                    unusedExports,
                    potentialSavings,
                    confidence: this.calculateConfidence(module, unusedExports)
                });
            }
        }
    }

    /**
     * Generate optimization recommendations
     */
    private generateRecommendations(analysis: BundleAnalysis): void {
        // Large bundle recommendation
        if (analysis.totalSize > 1024 * 1024) { // 1MB
            analysis.recommendations.push({
                type: 'size',
                priority: 'high',
                message: 'Bundle size exceeds 1MB',
                action: 'Consider code splitting and lazy loading',
                estimatedSavings: analysis.totalSize * 0.3
            });
        }

        // Tree-shaking opportunities
        const totalTreeshakingSavings = analysis.treeshakingOpportunities
            .reduce((sum, opp) => sum + opp.potentialSavings, 0);

        if (totalTreeshakingSavings > 50 * 1024) { // 50KB
            analysis.recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'Significant tree-shaking opportunities detected',
                action: 'Remove unused exports and enable strict tree-shaking',
                estimatedSavings: totalTreeshakingSavings
            });
        }

        // Large dependencies
        const largeDeps = analysis.dependencies.filter(dep => dep.size > 100 * 1024);
        if (largeDeps.length > 0) {
            analysis.recommendations.push({
                type: 'dependency',
                priority: 'medium',
                message: `${largeDeps.length} large dependencies detected`,
                action: 'Consider lighter alternatives or selective imports',
                estimatedSavings: largeDeps.reduce((sum, dep) => sum + dep.size * 0.5, 0)
            });
        }
    }

    /**
     * Calculate final metrics
     */
    private calculateFinalMetrics(analysis: BundleAnalysis): void {
        const endTime = performance.now();

        analysis.metrics = {
            analysisTime: endTime - this.startTime,
            moduleCount: analysis.modules.length,
            dependencyCount: analysis.dependencies.length,
            duplicatedModules: this.countDuplicatedModules(analysis.modules),
            treeshakingEfficiency: this.calculateTreeshakingEfficiency(analysis),
            compressionRatio: analysis.totalSize > 0 ? analysis.gzippedSize / analysis.totalSize : 0
        };
    }

    /**
     * Helper methods
     */
    private getAllFiles(dir: string, extensions: string[]): string[] {
        const files: string[] = [];

        if (!fs.existsSync(dir)) {
            return files;
        }

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                files.push(...this.getAllFiles(fullPath, extensions));
            } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                files.push(fullPath);
            }
        }

        return files;
    }

    private extractImports(content: string): string[] {
        const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
        const imports: string[] = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            if (match[1]) {
                imports.push(match[1]);
            }
        }

        return imports;
    }

    private extractExports(content: string): string[] {
        const exportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
        const exports: string[] = [];
        let match;

        while ((match = exportRegex.exec(content)) !== null) {
            if (match[1]) {
                exports.push(match[1]);
            }
        }

        return exports;
    }

    private isModuleTreeShakeable(content: string): boolean {
        // Check for ES module exports
        return /export\s+(const|let|var|function|class|interface|type|enum)/.test(content);
    }

    private async estimateDependencySize(bundlePath: string, depName: string): Promise<number> {
        const nodeModulesPath = path.resolve(bundlePath, 'node_modules', depName);

        if (!fs.existsSync(nodeModulesPath)) {
            return 0;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(
                path.join(nodeModulesPath, 'package.json'), 'utf-8'
            ));

            const mainFile = packageJson.main || 'index.js';
            const mainPath = path.join(nodeModulesPath, mainFile);

            if (fs.existsSync(mainPath)) {
                const stats = fs.statSync(mainPath);
                return stats.size;
            }
        } catch (error) {
            // Ignore errors and return estimate
        }

        return 50 * 1024; // Default estimate: 50KB
    }

    private async isDependencyTreeShakeable(bundlePath: string, depName: string): Promise<boolean> {
        const nodeModulesPath = path.resolve(bundlePath, 'node_modules', depName);

        if (!fs.existsSync(nodeModulesPath)) {
            return false;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(
                path.join(nodeModulesPath, 'package.json'), 'utf-8'
            ));

            return packageJson.sideEffects === false || Array.isArray(packageJson.sideEffects);
        } catch (error) {
            return false;
        }
    }

    private findUnusedExports(module: ModuleInfo, allModules: ModuleInfo[]): string[] {
        const unusedExports: string[] = [];

        for (const exportName of module.exports) {
            const isUsed = allModules.some(otherModule =>
                otherModule !== module &&
                otherModule.imports.some(imp => imp.includes(exportName))
            );

            if (!isUsed) {
                unusedExports.push(exportName);
            }
        }

        return unusedExports;
    }

    private estimateSavings(module: ModuleInfo, unusedExports: string[]): number {
        const exportRatio = unusedExports.length / Math.max(module.exports.length, 1);
        return Math.round(module.size * exportRatio);
    }

    private calculateConfidence(module: ModuleInfo, unusedExports: string[]): number {
        // Higher confidence for more exports analyzed
        const baseConfidence = Math.min(module.exports.length / 10, 1) * 0.8;
        const unusedRatio = unusedExports.length / Math.max(module.exports.length, 1);

        return Math.round((baseConfidence + unusedRatio * 0.2) * 100);
    }

    private countDuplicatedModules(modules: ModuleInfo[]): number {
        const seen = new Set<string>();
        let duplicates = 0;

        for (const module of modules) {
            const baseName = path.basename(module.name, path.extname(module.name));
            if (seen.has(baseName)) {
                duplicates++;
            } else {
                seen.add(baseName);
            }
        }

        return duplicates;
    }

    private calculateTreeshakingEfficiency(analysis: BundleAnalysis): number {
        const totalPotentialSavings = analysis.treeshakingOpportunities
            .reduce((sum, opp) => sum + opp.potentialSavings, 0);

        if (analysis.totalSize === 0) return 100;

        const efficiency = ((analysis.totalSize - totalPotentialSavings) / analysis.totalSize) * 100;
        return Math.max(0, Math.min(100, efficiency));
    }

    private createInitialMetrics(): BundleMetrics {
        return {
            analysisTime: 0,
            moduleCount: 0,
            dependencyCount: 0,
            duplicatedModules: 0,
            treeshakingEfficiency: 0,
            compressionRatio: 0
        };
    }

    private isCacheValid(bundlePath: string, cached: BundleAnalysis): boolean {
        // Simple cache validation - could be enhanced with file timestamps
        try {
            const stats = fs.statSync(bundlePath);
            const cacheTime = cached.metrics.analysisTime;
            const fileModTime = stats.mtime.getTime();

            // Cache is valid if file hasn't been modified since analysis
            return fileModTime < cacheTime + (5 * 60 * 1000); // 5 minutes buffer
        } catch {
            // If we can't stat the file, assume cache is invalid
            return false;
        }
    }

    /**
     * Export analysis results
     */
    exportAnalysis(analysis: BundleAnalysis, format: 'json' | 'csv' = 'json'): string {
        if (format === 'json') {
            return JSON.stringify(analysis, null, 2);
        }

        // CSV format for spreadsheet analysis
        const csv = [
            'Module,Size (bytes),Tree-shakeable,Imports,Exports',
            ...analysis.modules.map(m =>
                `"${m.name}",${m.size},${m.isTreeShakeable},${m.imports.length},${m.exports.length}`
            )
        ].join('\n');

        return csv;
    }

    /**
     * Generate optimization report
     */
    generateOptimizationReport(analysis: BundleAnalysis): string {
        const report = [
            '# Bundle Size Optimization Report',
            '',
            `## Summary`,
            `- **Total Size:** ${this.formatBytes(analysis.totalSize)}`,
            `- **Gzipped Size:** ${this.formatBytes(analysis.gzippedSize)}`,
            `- **Modules:** ${analysis.metrics.moduleCount}`,
            `- **Dependencies:** ${analysis.metrics.dependencyCount}`,
            `- **Tree-shaking Efficiency:** ${analysis.metrics.treeshakingEfficiency.toFixed(1)}%`,
            '',
            '## Recommendations',
            ...analysis.recommendations.map(rec =>
                `- **${rec.priority.toUpperCase()}:** ${rec.message} (${this.formatBytes(rec.estimatedSavings)} savings)`
            ),
            '',
            '## Tree-shaking Opportunities',
            ...analysis.treeshakingOpportunities.map(opp =>
                `- **${opp.module}:** ${opp.unusedExports.length} unused exports (${this.formatBytes(opp.potentialSavings)} potential savings, ${opp.confidence}% confidence)`
            )
        ].join('\n');

        return report;
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
}

// Global bundle analyzer instance
export const globalBundleAnalyzer = new AdvancedBundleAnalyzer({
    enableCache: true,
    enableCompression: true,
    analyzeNodeModules: true
});

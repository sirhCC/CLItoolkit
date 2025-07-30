/**
 * Advanced Module Splitter
 * Intelligent code splitting and lazy loading optimization
 */

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

export interface ModuleSplitResult {
    originalSize: number;
    totalChunks: number;
    mainChunkSize: number;
    lazyChunks: LazyChunk[];
    loadingStrategies: LoadingStrategy[];
    metrics: ModuleSplitMetrics;
    configuration: SplitConfiguration;
}

export interface LazyChunk {
    name: string;
    size: number;
    modules: string[];
    dependencies: string[];
    loadPriority: 'critical' | 'high' | 'medium' | 'low';
    estimatedLoadTime: number;
    cacheStrategy: 'aggressive' | 'normal' | 'minimal';
}

export interface LoadingStrategy {
    chunkName: string;
    strategy: 'preload' | 'prefetch' | 'on-demand' | 'intersectionObserver';
    trigger: string;
    fallback?: string;
    timeout?: number;
}

export interface ModuleSplitMetrics {
    analysisTime: number;
    chunksCreated: number;
    averageChunkSize: number;
    splitEfficiency: number;
    parallelLoadingGain: number;
    cacheHitPrediction: number;
}

export interface SplitConfiguration {
    maxChunkSize: number;
    minChunkSize: number;
    enableAsyncChunks: boolean;
    enablePrefetch: boolean;
    chunkStrategy: 'route' | 'component' | 'feature' | 'dependency';
}

export class AdvancedModuleSplitter {
    private dependencyGraph = new Map<string, Set<string>>();
    private moduleWeights = new Map<string, number>();
    private routeMapping = new Map<string, string[]>();

    constructor(private options: Partial<SplitConfiguration> = {}) {
        this.options = {
            maxChunkSize: 500 * 1024, // 500KB
            minChunkSize: 50 * 1024,  // 50KB
            enableAsyncChunks: true,
            enablePrefetch: true,
            chunkStrategy: 'feature',
            ...options
        };
    }

    /**
     * Perform intelligent module splitting
     */
    async splitProject(projectPath: string): Promise<ModuleSplitResult> {
        const startTime = performance.now();

        const result: ModuleSplitResult = {
            originalSize: 0,
            totalChunks: 0,
            mainChunkSize: 0,
            lazyChunks: [],
            loadingStrategies: [],
            metrics: this.createInitialMetrics(),
            configuration: this.options as SplitConfiguration
        };

        try {
            // Step 1: Analyze project structure
            await this.analyzeProjectStructure(projectPath);

            // Step 2: Build dependency graph
            await this.buildDependencyGraph(projectPath);

            // Step 3: Calculate module weights
            await this.calculateModuleWeights(projectPath);

            // Step 4: Identify split points
            const splitPoints = await this.identifySplitPoints(projectPath);

            // Step 5: Create chunks
            result.lazyChunks = await this.createLazyChunks(splitPoints, projectPath);

            // Step 6: Generate loading strategies
            result.loadingStrategies = this.generateLoadingStrategies(result.lazyChunks);

            // Step 7: Calculate metrics
            this.calculateFinalMetrics(result, startTime);

            // Step 8: Generate configuration files
            await this.generateSplitConfiguration(projectPath, result);

            return result;
        } catch (error) {
            console.error('Module splitting failed:', error);
            throw error;
        }
    }

    /**
     * Analyze project structure to understand architecture
     */
    private async analyzeProjectStructure(projectPath: string): Promise<void> {
        const srcPath = path.join(projectPath, 'src');

        if (!fs.existsSync(srcPath)) {
            return;
        }

        // Analyze folder structure for natural split points
        const folders = this.getFolders(srcPath);

        for (const folder of folders) {
            const folderName = path.basename(folder);
            const files = this.getFilesInFolder(folder, ['.ts', '.tsx', '.js', '.jsx']);

            // Map folder to its modules for potential chunking
            this.routeMapping.set(folderName, files);
        }
    }

    /**
     * Build comprehensive dependency graph
     */
    private async buildDependencyGraph(projectPath: string): Promise<void> {
        const sourceFiles = this.getSourceFiles(projectPath);

        for (const file of sourceFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const imports = this.extractImports(content);
            const moduleName = this.getModuleName(file, projectPath);

            this.dependencyGraph.set(moduleName, new Set(imports));
        }
    }

    /**
     * Calculate weights for modules based on usage and size
     */
    private async calculateModuleWeights(projectPath: string): Promise<void> {
        const sourceFiles = this.getSourceFiles(projectPath);

        for (const file of sourceFiles) {
            const stats = fs.statSync(file);
            const content = fs.readFileSync(file, 'utf-8');
            const moduleName = this.getModuleName(file, projectPath);

            // Base weight on file size
            let weight = stats.size;

            // Increase weight for frequently imported modules
            const importCount = this.countImports(moduleName);
            weight += importCount * 1000;

            // Increase weight for complex modules
            const complexity = this.calculateComplexity(content);
            weight += complexity * 100;

            // Decrease weight for leaf modules (no dependencies)
            const deps = this.dependencyGraph.get(moduleName);
            if (!deps || deps.size === 0) {
                weight *= 0.8;
            }

            this.moduleWeights.set(moduleName, weight);
        }
    }

    /**
     * Identify optimal split points
     */
    private async identifySplitPoints(projectPath: string): Promise<string[]> {
        const splitPoints: string[] = [];

        switch (this.options.chunkStrategy) {
            case 'route':
                splitPoints.push(...this.identifyRouteSplitPoints());
                break;
            case 'component':
                splitPoints.push(...this.identifyComponentSplitPoints(projectPath));
                break;
            case 'feature':
                splitPoints.push(...this.identifyFeatureSplitPoints());
                break;
            case 'dependency':
                splitPoints.push(...this.identifyDependencySplitPoints());
                break;
        }

        return splitPoints;
    }

    /**
     * Create lazy loading chunks
     */
    private async createLazyChunks(splitPoints: string[], _projectPath: string): Promise<LazyChunk[]> {
        const chunks: LazyChunk[] = [];

        for (const splitPoint of splitPoints) {
            const modules = this.getModulesForSplitPoint(splitPoint);
            const dependencies = this.calculateChunkDependencies(modules);
            const size = this.calculateChunkSize(modules);

            if (size >= this.options.minChunkSize! && size <= this.options.maxChunkSize!) {
                const chunk: LazyChunk = {
                    name: this.generateChunkName(splitPoint),
                    size,
                    modules,
                    dependencies,
                    loadPriority: this.calculateLoadPriority(modules),
                    estimatedLoadTime: this.estimateLoadTime(size),
                    cacheStrategy: this.determineCacheStrategy(modules)
                };

                chunks.push(chunk);
            }
        }

        return chunks;
    }

    /**
     * Generate loading strategies for chunks
     */
    private generateLoadingStrategies(chunks: LazyChunk[]): LoadingStrategy[] {
        const strategies: LoadingStrategy[] = [];

        for (const chunk of chunks) {
            const strategy: LoadingStrategy = {
                chunkName: chunk.name,
                strategy: this.selectOptimalStrategy(chunk),
                trigger: this.generateTrigger(chunk),
                timeout: chunk.estimatedLoadTime * 1.5
            };

            if (chunk.loadPriority === 'critical') {
                strategy.fallback = this.generateFallback(chunk);
            }

            strategies.push(strategy);
        }

        return strategies;
    }

    /**
     * Generate split configuration files
     */
    private async generateSplitConfiguration(projectPath: string, result: ModuleSplitResult): Promise<void> {
        // Generate webpack.config.js modifications
        const webpackConfig = this.generateWebpackConfig(result);
        await this.writeConfigFile(
            path.join(projectPath, 'webpack.split.config.js'),
            `// Auto-generated webpack configuration for module splitting\n${webpackConfig}`
        );

        // Generate loading utilities
        const loaderUtils = this.generateLoaderUtils(result);
        await this.writeConfigFile(
            path.join(projectPath, 'src', 'utils', 'chunk-loader.ts'),
            loaderUtils
        );

        // Generate route configuration
        const routeConfig = this.generateRouteConfig(result);
        await this.writeConfigFile(
            path.join(projectPath, 'src', 'config', 'lazy-routes.ts'),
            routeConfig
        );
    }

    /**
     * Helper methods for split point identification
     */
    private identifyRouteSplitPoints(): string[] {
        const splitPoints: string[] = [];

        for (const [routeName] of this.routeMapping) {
            if (routeName.includes('route') || routeName.includes('page')) {
                splitPoints.push(routeName);
            }
        }

        return splitPoints;
    }

    private identifyComponentSplitPoints(projectPath: string): string[] {
        const splitPoints: string[] = [];
        const componentsPath = path.join(projectPath, 'src', 'components');

        if (fs.existsSync(componentsPath)) {
            const componentFolders = this.getFolders(componentsPath);
            splitPoints.push(...componentFolders.map(folder => path.basename(folder)));
        }

        return splitPoints;
    }

    private identifyFeatureSplitPoints(): string[] {
        const splitPoints: string[] = [];

        for (const [featureName] of this.routeMapping) {
            // Look for feature-like folder patterns
            if (!featureName.includes('util') && !featureName.includes('shared') &&
                !featureName.includes('common') && !featureName.includes('core')) {
                splitPoints.push(featureName);
            }
        }

        return splitPoints;
    }

    private identifyDependencySplitPoints(): string[] {
        const splitPoints: string[] = [];
        const heavyModules: string[] = [];

        // Identify modules with high dependency count
        for (const [module, deps] of this.dependencyGraph) {
            if (deps.size > 5) {
                heavyModules.push(module);
            }
        }

        // Group related heavy modules
        const groups = this.groupRelatedModules(heavyModules);
        splitPoints.push(...groups);

        return splitPoints;
    }

    /**
     * Chunk analysis methods
     */
    private getModulesForSplitPoint(splitPoint: string): string[] {
        const modules = this.routeMapping.get(splitPoint) || [];

        // Add related modules through dependency analysis
        const related = this.findRelatedModules(modules);

        return [...modules, ...related];
    }

    private calculateChunkDependencies(modules: string[]): string[] {
        const dependencies = new Set<string>();

        for (const module of modules) {
            const deps = this.dependencyGraph.get(module);
            if (deps) {
                deps.forEach(dep => {
                    if (!modules.includes(dep)) {
                        dependencies.add(dep);
                    }
                });
            }
        }

        return Array.from(dependencies);
    }

    private calculateChunkSize(modules: string[]): number {
        return modules.reduce((total, module) => {
            return total + (this.moduleWeights.get(module) || 0);
        }, 0);
    }

    private calculateLoadPriority(modules: string[]): 'critical' | 'high' | 'medium' | 'low' {
        const totalWeight = this.calculateChunkSize(modules);
        const avgWeight = totalWeight / modules.length;

        if (avgWeight > 50000) return 'critical';
        if (avgWeight > 20000) return 'high';
        if (avgWeight > 5000) return 'medium';
        return 'low';
    }

    private estimateLoadTime(size: number): number {
        // Estimate based on average connection speed (3G: 1.6Mbps)
        const bytesPerSecond = 200 * 1024; // 200KB/s
        return Math.ceil((size / bytesPerSecond) * 1000); // milliseconds
    }

    private determineCacheStrategy(modules: string[]): 'aggressive' | 'normal' | 'minimal' {
        const hasUtilities = modules.some(m => m.includes('util') || m.includes('helper'));
        const hasComponents = modules.some(m => m.includes('component') || m.includes('widget'));

        if (hasUtilities) return 'aggressive';
        if (hasComponents) return 'normal';
        return 'minimal';
    }

    /**
     * Loading strategy methods
     */
    private selectOptimalStrategy(chunk: LazyChunk): 'preload' | 'prefetch' | 'on-demand' | 'intersectionObserver' {
        switch (chunk.loadPriority) {
            case 'critical':
                return 'preload';
            case 'high':
                return 'prefetch';
            case 'medium':
                return 'intersectionObserver';
            default:
                return 'on-demand';
        }
    }

    private generateTrigger(chunk: LazyChunk): string {
        const baseName = chunk.name.replace(/[^a-zA-Z0-9]/g, '');

        switch (chunk.loadPriority) {
            case 'critical':
                return 'immediate';
            case 'high':
                return 'domContentLoaded';
            case 'medium':
                return `intersection:${baseName}`;
            default:
                return `user-action:${baseName}`;
        }
    }

    private generateFallback(chunk: LazyChunk): string {
        return `fallback-${chunk.name}`;
    }

    /**
     * Configuration generation methods
     */
    private generateWebpackConfig(result: ModuleSplitResult): string {
        const chunkConfig = result.lazyChunks.map(chunk =>
            `  '${chunk.name}': {\n    name: '${chunk.name}',\n    chunks: 'async',\n    priority: ${this.getPriorityValue(chunk.loadPriority)}\n  }`
        ).join(',\n');

        return `
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
${chunkConfig}
      }
    }
  }
};`;
    }

    private generateLoaderUtils(result: ModuleSplitResult): string {
        const imports = result.lazyChunks.map(chunk =>
            `const load${this.capitalizeFirst(chunk.name)} = () => import(/* webpackChunkName: "${chunk.name}" */ './${chunk.name}');`
        ).join('\n');

        const loaders = result.lazyChunks.map(chunk =>
            `  ${chunk.name}: load${this.capitalizeFirst(chunk.name)}`
        ).join(',\n');

        return `
// Auto-generated chunk loaders
${imports}

export const chunkLoaders = {
${loaders}
};

export const loadChunk = async (chunkName: string) => {
  const loader = chunkLoaders[chunkName];
  if (!loader) {
    throw new Error(\`Chunk '\${chunkName}' not found\`);
  }
  return loader();
};`;
    }

    private generateRouteConfig(result: ModuleSplitResult): string {
        const routes = result.lazyChunks.map(chunk => {
            const strategy = result.loadingStrategies.find(s => s.chunkName === chunk.name);
            return `  {
    name: '${chunk.name}',
    loadStrategy: '${strategy?.strategy || 'on-demand'}',
    trigger: '${strategy?.trigger || 'user-action'}',
    estimatedLoadTime: ${chunk.estimatedLoadTime},
    cacheStrategy: '${chunk.cacheStrategy}'
  }`;
        }).join(',\n');

        return `
// Auto-generated lazy route configuration
export interface LazyRouteConfig {
  name: string;
  loadStrategy: string;
  trigger: string;
  estimatedLoadTime: number;
  cacheStrategy: string;
}

export const lazyRoutes: LazyRouteConfig[] = [
${routes}
];`;
    }

    /**
     * Utility methods
     */
    private getSourceFiles(projectPath: string): string[] {
        const srcPath = path.join(projectPath, 'src');
        return this.getAllFiles(srcPath, ['.ts', '.tsx', '.js', '.jsx']);
    }

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

    private getFolders(dir: string): string[] {
        if (!fs.existsSync(dir)) {
            return [];
        }

        return fs.readdirSync(dir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => path.join(dir, entry.name));
    }

    private getFilesInFolder(folder: string, extensions: string[]): string[] {
        return this.getAllFiles(folder, extensions);
    }

    private extractImports(content: string): string[] {
        const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
        const imports: string[] = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            if (match[1] && !match[1].startsWith('.')) {
                imports.push(match[1]);
            }
        }

        return imports;
    }

    private getModuleName(filePath: string, projectPath: string): string {
        return path.relative(path.join(projectPath, 'src'), filePath);
    }

    private countImports(moduleName: string): number {
        let count = 0;
        for (const [, deps] of this.dependencyGraph) {
            if (deps.has(moduleName)) {
                count++;
            }
        }
        return count;
    }

    private calculateComplexity(content: string): number {
        const patterns = [
            /function/g,
            /class/g,
            /interface/g,
            /if\s*\(/g,
            /for\s*\(/g,
            /while\s*\(/g,
            /switch\s*\(/g
        ];

        return patterns.reduce((complexity, pattern) => {
            const matches = content.match(pattern);
            return complexity + (matches?.length || 0);
        }, 0);
    }

    private findRelatedModules(modules: string[]): string[] {
        const related = new Set<string>();

        for (const module of modules) {
            const deps = this.dependencyGraph.get(module);
            if (deps) {
                deps.forEach(dep => {
                    if (dep.startsWith('./') || dep.startsWith('../')) {
                        related.add(dep);
                    }
                });
            }
        }

        return Array.from(related);
    }

    private groupRelatedModules(modules: string[]): string[] {
        // Simple grouping by path prefix
        const groups = new Map<string, string[]>();

        for (const module of modules) {
            const pathParts = module.split('/');
            const groupKey = pathParts.slice(0, -1).join('/') || 'root';

            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey)!.push(module);
        }

        return Array.from(groups.keys()).filter(key => groups.get(key)!.length > 1);
    }

    private generateChunkName(splitPoint: string): string {
        return splitPoint.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    private getPriorityValue(priority: string): number {
        const values = { critical: 30, high: 20, medium: 10, low: 5 };
        return values[priority as keyof typeof values] || 5;
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private async writeConfigFile(filePath: string, content: string): Promise<void> {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content);
    }

    private createInitialMetrics(): ModuleSplitMetrics {
        return {
            analysisTime: 0,
            chunksCreated: 0,
            averageChunkSize: 0,
            splitEfficiency: 0,
            parallelLoadingGain: 0,
            cacheHitPrediction: 0
        };
    }

    private calculateFinalMetrics(result: ModuleSplitResult, startTime: number): void {
        const endTime = performance.now();

        result.metrics = {
            analysisTime: endTime - startTime,
            chunksCreated: result.lazyChunks.length,
            averageChunkSize: result.lazyChunks.length > 0
                ? result.lazyChunks.reduce((sum, chunk) => sum + chunk.size, 0) / result.lazyChunks.length
                : 0,
            splitEfficiency: this.calculateSplitEfficiency(result),
            parallelLoadingGain: this.calculateParallelGain(result),
            cacheHitPrediction: this.calculateCacheHitPrediction(result)
        };

        result.totalChunks = result.lazyChunks.length;
        result.originalSize = result.lazyChunks.reduce((sum, chunk) => sum + chunk.size, 0);
        result.mainChunkSize = this.calculateMainChunkSize(result);
    }

    private calculateSplitEfficiency(result: ModuleSplitResult): number {
        if (result.lazyChunks.length === 0) return 0;

        const optimalChunkCount = Math.ceil(result.originalSize / this.options.maxChunkSize!);
        const actualChunkCount = result.lazyChunks.length;

        return Math.max(0, 100 - Math.abs(optimalChunkCount - actualChunkCount) * 10);
    }

    private calculateParallelGain(result: ModuleSplitResult): number {
        // Estimate parallel loading improvement
        const sequentialTime = result.lazyChunks.reduce((sum, chunk) => sum + chunk.estimatedLoadTime, 0);
        const parallelTime = Math.max(...result.lazyChunks.map(chunk => chunk.estimatedLoadTime));

        return sequentialTime > 0 ? ((sequentialTime - parallelTime) / sequentialTime) * 100 : 0;
    }

    private calculateCacheHitPrediction(result: ModuleSplitResult): number {
        const aggressiveCacheChunks = result.lazyChunks.filter(chunk => chunk.cacheStrategy === 'aggressive').length;
        return result.lazyChunks.length > 0 ? (aggressiveCacheChunks / result.lazyChunks.length) * 100 : 0;
    }

    private calculateMainChunkSize(result: ModuleSplitResult): number {
        // Estimate main chunk as remaining after lazy chunks
        return Math.max(0, result.originalSize * 0.3); // Assume 30% remains in main chunk
    }

    /**
     * Generate optimization report
     */
    generateReport(result: ModuleSplitResult): string {
        const report = [
            '# Module Splitting Optimization Report',
            '',
            '## Summary',
            `- **Total Chunks:** ${result.totalChunks}`,
            `- **Main Chunk Size:** ${this.formatBytes(result.mainChunkSize)}`,
            `- **Average Lazy Chunk Size:** ${this.formatBytes(result.metrics.averageChunkSize)}`,
            `- **Split Efficiency:** ${result.metrics.splitEfficiency.toFixed(1)}%`,
            `- **Parallel Loading Gain:** ${result.metrics.parallelLoadingGain.toFixed(1)}%`,
            '',
            '## Lazy Chunks',
            ...result.lazyChunks.map(chunk =>
                `- **${chunk.name}:** ${this.formatBytes(chunk.size)} (${chunk.loadPriority} priority, ` +
                `${chunk.estimatedLoadTime}ms load time, ${chunk.cacheStrategy} caching)`
            ),
            '',
            '## Loading Strategies',
            ...result.loadingStrategies.map(strategy =>
                `- **${strategy.chunkName}:** ${strategy.strategy} (trigger: ${strategy.trigger})`
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

// Global module splitter instance
export const globalModuleSplitter = new AdvancedModuleSplitter({
    maxChunkSize: 500 * 1024,
    minChunkSize: 50 * 1024,
    enableAsyncChunks: true,
    enablePrefetch: true,
    chunkStrategy: 'feature'
});

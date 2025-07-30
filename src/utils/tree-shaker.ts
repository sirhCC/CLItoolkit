/**
 * Advanced Tree-Shaking Optimizer
 * Intelligent dead code elimination and module optimization
 */

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

export interface TreeShakingResult {
    originalSize: number;
    optimizedSize: number;
    savings: number;
    eliminatedModules: string[];
    optimizedModules: ModuleOptimization[];
    warnings: TreeShakingWarning[];
    metrics: TreeShakingMetrics;
}

export interface ModuleOptimization {
    moduleName: string;
    originalSize: number;
    optimizedSize: number;
    removedExports: string[];
    removedImports: string[];
    confidence: number;
}

export interface TreeShakingWarning {
    type: 'potential-side-effect' | 'dynamic-import' | 'circular-dependency';
    message: string;
    moduleName: string;
    severity: 'low' | 'medium' | 'high';
}

export interface TreeShakingMetrics {
    analysisTime: number;
    modulesAnalyzed: number;
    exportsRemoved: number;
    importsRemoved: number;
    eliminationEfficiency: number;
    safetyScore: number;
}

export interface TreeShakingOptions {
    aggressive: boolean;
    preserveComments: boolean;
    analyzeNodeModules: boolean;
    safetyThreshold: number; // 0-100, higher = more conservative
    whitelist: string[];
    blacklist: string[];
}

export class AdvancedTreeShaker {
    private options: TreeShakingOptions;
    private dependencyGraph = new Map<string, Set<string>>();
    private exportUsageMap = new Map<string, Set<string>>();
    private sideEffectModules = new Set<string>();

    constructor(options: Partial<TreeShakingOptions> = {}) {
        this.options = {
            aggressive: false,
            preserveComments: true,
            analyzeNodeModules: false,
            safetyThreshold: 80,
            whitelist: [],
            blacklist: [],
            ...options
        };
    }

    /**
     * Perform advanced tree-shaking optimization
     */
    async optimizeProject(projectPath: string): Promise<TreeShakingResult> {
        const startTime = performance.now();

        const result: TreeShakingResult = {
            originalSize: 0,
            optimizedSize: 0,
            savings: 0,
            eliminatedModules: [],
            optimizedModules: [],
            warnings: [],
            metrics: this.createInitialMetrics()
        };

        try {
            // Step 1: Build dependency graph
            await this.buildDependencyGraph(projectPath);

            // Step 2: Analyze export usage
            await this.analyzeExportUsage(projectPath);

            // Step 3: Detect side effects
            await this.detectSideEffects(projectPath);

            // Step 4: Calculate original size
            result.originalSize = await this.calculateProjectSize(projectPath);

            // Step 5: Perform optimization
            await this.performOptimization(projectPath, result);

            // Step 6: Calculate metrics
            this.calculateFinalMetrics(result, startTime);

            return result;
        } catch (error) {
            console.error('Tree-shaking optimization failed:', error);
            throw error;
        }
    }

    /**
     * Build comprehensive dependency graph
     */
    private async buildDependencyGraph(projectPath: string): Promise<void> {
        const sourceFiles = this.getSourceFiles(projectPath);

        for (const file of sourceFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const imports = this.extractDetailedImports(content);
            const moduleName = this.getModuleName(file, projectPath);

            this.dependencyGraph.set(moduleName, new Set(imports.map(imp => imp.source)));

            // Track specific import/export relationships
            for (const imp of imports) {
                if (!this.exportUsageMap.has(imp.source)) {
                    this.exportUsageMap.set(imp.source, new Set());
                }

                imp.specifiers.forEach(spec => {
                    this.exportUsageMap.get(imp.source)!.add(spec);
                });
            }
        }
    }

    /**
     * Analyze which exports are actually used
     */
    private async analyzeExportUsage(projectPath: string): Promise<void> {
        const sourceFiles = this.getSourceFiles(projectPath);

        for (const file of sourceFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const exports = this.extractDetailedExports(content);
            const moduleName = this.getModuleName(file, projectPath);

            // Check if exports are used by other modules
            for (const exp of exports) {
                let isUsed = false;

                // Check direct usage
                for (const [, usedExports] of this.exportUsageMap) {
                    if (usedExports.has(exp.name)) {
                        isUsed = true;
                        break;
                    }
                }

                // Check re-exports
                if (!isUsed) {
                    isUsed = this.isReExported(exp.name, moduleName);
                }

                if (!isUsed && !this.options.whitelist.includes(exp.name)) {
                    if (!this.exportUsageMap.has(moduleName)) {
                        this.exportUsageMap.set(moduleName, new Set());
                    }
                    // Mark as potentially removable
                }
            }
        }
    }

    /**
     * Detect modules with side effects
     */
    private async detectSideEffects(projectPath: string): Promise<void> {
        const sourceFiles = this.getSourceFiles(projectPath);

        for (const file of sourceFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const moduleName = this.getModuleName(file, projectPath);

            if (this.hasSideEffects(content)) {
                this.sideEffectModules.add(moduleName);
            }
        }
    }

    /**
     * Perform the actual tree-shaking optimization
     */
    private async performOptimization(projectPath: string, result: TreeShakingResult): Promise<void> {
        const sourceFiles = this.getSourceFiles(projectPath);

        for (const file of sourceFiles) {
            const originalContent = fs.readFileSync(file, 'utf-8');
            const moduleName = this.getModuleName(file, projectPath);
            const originalSize = Buffer.byteLength(originalContent, 'utf-8');

            // Skip if module has side effects and we're not in aggressive mode
            if (this.sideEffectModules.has(moduleName) && !this.options.aggressive) {
                continue;
            }

            const optimization = await this.optimizeModule(
                originalContent,
                moduleName,
                projectPath
            );

            if (optimization) {
                optimization.originalSize = originalSize;
                result.optimizedModules.push(optimization);

                // Optionally write optimized content back to file
                if (this.shouldWriteOptimization(optimization)) {
                    fs.writeFileSync(file, this.reconstructModule(originalContent, optimization));
                }
            }
        }

        // Calculate total optimized size
        result.optimizedSize = result.originalSize - result.optimizedModules
            .reduce((sum, opt) => sum + (opt.originalSize - opt.optimizedSize), 0);

        result.savings = result.originalSize - result.optimizedSize;
    }

    /**
     * Optimize individual module
     */
    private async optimizeModule(
        content: string,
        moduleName: string,
        _projectPath: string
    ): Promise<ModuleOptimization | null> {
        const exports = this.extractDetailedExports(content);
        const imports = this.extractDetailedImports(content);

        const removedExports: string[] = [];
        const removedImports: string[] = [];

        // Remove unused exports
        for (const exp of exports) {
            if (!this.isExportUsed(exp.name)) {
                removedExports.push(exp.name);
            }
        }

        // Remove unused imports
        for (const imp of imports) {
            if (!this.isImportUsed(imp, content)) {
                removedImports.push(...imp.specifiers);
            }
        }

        if (removedExports.length === 0 && removedImports.length === 0) {
            return null;
        }

        const optimizedContent = this.removeUnusedCode(content, removedExports, removedImports);
        const optimizedSize = Buffer.byteLength(optimizedContent, 'utf-8');
        const originalSize = Buffer.byteLength(content, 'utf-8');

        return {
            moduleName,
            originalSize,
            optimizedSize,
            removedExports,
            removedImports,
            confidence: this.calculateOptimizationConfidence(content, removedExports, removedImports)
        };
    }

    /**
     * Extract detailed import information
     */
    private extractDetailedImports(content: string): Array<{
        source: string;
        specifiers: string[];
        isDefault: boolean;
        isNamespace: boolean;
    }> {
        const imports: Array<{
            source: string;
            specifiers: string[];
            isDefault: boolean;
            isNamespace: boolean;
        }> = [];

        // Named imports: import { a, b } from 'module'
        const namedImportRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"`]([^'"`]+)['"`]/g;
        let match;

        while ((match = namedImportRegex.exec(content)) !== null) {
            if (match[1] && match[2]) {
                const specifiers = match[1].split(',').map(s => s.trim().split(' as ')[0].trim());
                imports.push({
                    source: match[2],
                    specifiers,
                    isDefault: false,
                    isNamespace: false
                });
            }
        }

        // Default imports: import a from 'module'
        const defaultImportRegex = /import\s+(\w+)\s+from\s*['"`]([^'"`]+)['"`]/g;
        while ((match = defaultImportRegex.exec(content)) !== null) {
            if (match[1] && match[2]) {
                imports.push({
                    source: match[2],
                    specifiers: [match[1]],
                    isDefault: true,
                    isNamespace: false
                });
            }
        }

        // Namespace imports: import * as a from 'module'
        const namespaceImportRegex = /import\s*\*\s*as\s+(\w+)\s+from\s*['"`]([^'"`]+)['"`]/g;
        while ((match = namespaceImportRegex.exec(content)) !== null) {
            if (match[1] && match[2]) {
                imports.push({
                    source: match[2],
                    specifiers: [match[1]],
                    isDefault: false,
                    isNamespace: true
                });
            }
        }

        return imports;
    }

    /**
     * Extract detailed export information
     */
    private extractDetailedExports(content: string): Array<{
        name: string;
        type: 'function' | 'class' | 'variable' | 'interface' | 'type';
        isDefault: boolean;
    }> {
        const exports: Array<{
            name: string;
            type: 'function' | 'class' | 'variable' | 'interface' | 'type';
            isDefault: boolean;
        }> = [];

        // Named exports
        const patterns = [
            { regex: /export\s+(?:const|let|var)\s+(\w+)/g, type: 'variable' as const },
            { regex: /export\s+function\s+(\w+)/g, type: 'function' as const },
            { regex: /export\s+class\s+(\w+)/g, type: 'class' as const },
            { regex: /export\s+interface\s+(\w+)/g, type: 'interface' as const },
            { regex: /export\s+type\s+(\w+)/g, type: 'type' as const }
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.regex.exec(content)) !== null) {
                if (match[1]) {
                    exports.push({
                        name: match[1],
                        type: pattern.type,
                        isDefault: false
                    });
                }
            }
        }

        // Default exports
        const defaultExportRegex = /export\s+default\s+(?:function\s+(\w+)|class\s+(\w+)|(\w+))/g;
        let match;
        while ((match = defaultExportRegex.exec(content)) !== null) {
            const name = match[1] || match[2] || match[3];
            if (name) {
                exports.push({
                    name,
                    type: match[1] ? 'function' : match[2] ? 'class' : 'variable',
                    isDefault: true
                });
            }
        }

        return exports;
    }

    /**
     * Check if module has side effects
     */
    private hasSideEffects(content: string): boolean {
        const sideEffectPatterns = [
            /console\.[log|error|warn|info]/,           // Console calls
            /document\./,                               // DOM manipulation
            /window\./,                                 // Window object access
            /process\.env/,                            // Environment variables
            /require\(['"`][^'"`]+['"`]\)/,            // Dynamic requires
            /import\(['"`][^'"`]+['"`]\)/,             // Dynamic imports
            /new\s+Worker/,                            // Web workers
            /localStorage|sessionStorage/,              // Storage access
            /fetch|XMLHttpRequest/,                    // Network calls
            /setInterval|setTimeout/,                  // Timers
        ];

        return sideEffectPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Check if export is used elsewhere
     */
    private isExportUsed(exportName: string): boolean {
        // Check if it's in whitelist
        if (this.options.whitelist.includes(exportName)) {
            return true;
        }

        // Check usage in dependency graph
        for (const [, usedExports] of this.exportUsageMap) {
            if (usedExports.has(exportName)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if import is used in module content
     */
    private isImportUsed(imp: { source: string; specifiers: string[] }, content: string): boolean {
        return imp.specifiers.some(spec => {
            const usageRegex = new RegExp(`\\b${spec}\\b`, 'g');
            const matches = content.match(usageRegex);
            // More than 1 match means it's used (1 match is the import itself)
            return matches && matches.length > 1;
        });
    }

    /**
     * Check if export is re-exported
     */
    private isReExported(exportName: string, moduleName: string): boolean {
        // Simple implementation - could be enhanced
        for (const [_module, deps] of this.dependencyGraph) {
            if (deps.has(moduleName)) {
                // This module depends on the one we're checking
                return true;
            }
        }
        return false;
    }

    /**
     * Remove unused code from content
     */
    private removeUnusedCode(content: string, removedExports: string[], removedImports: string[]): string {
        let optimizedContent = content;

        // Remove unused exports
        for (const exportName of removedExports) {
            const exportPatterns = [
                `export\\s+(?:const|let|var)\\s+${exportName}\\s*[=:].*?(?=\\n|$)`,
                `export\\s+function\\s+${exportName}\\s*\\([^)]*\\)\\s*\\{[^}]*\\}`,
                `export\\s+class\\s+${exportName}\\s*\\{[^}]*\\}`,
                `export\\s+interface\\s+${exportName}\\s*\\{[^}]*\\}`,
                `export\\s+type\\s+${exportName}\\s*=.*?(?=\\n|$)`
            ];

            for (const pattern of exportPatterns) {
                const regex = new RegExp(pattern, 'gs');
                optimizedContent = optimizedContent.replace(regex, '');
            }
        }

        // Remove unused imports
        for (const importName of removedImports) {
            const importPattern = `import\\\\s*\\\\{[^}]*\\\\b${importName}\\\\b[^}]*\\\\}\\\\s*from\\\\s*['"\`][^'"\`]+['"\`];?`;
            const regex = new RegExp(importPattern, 'g');
            optimizedContent = optimizedContent.replace(regex, '');
        }

        // Clean up empty lines
        optimizedContent = optimizedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

        return optimizedContent;
    }

    /**
     * Reconstruct module with optimizations
     */
    private reconstructModule(originalContent: string, optimization: ModuleOptimization): string {
        return this.removeUnusedCode(
            originalContent,
            optimization.removedExports,
            optimization.removedImports
        );
    }

    /**
     * Calculate optimization confidence
     */
    private calculateOptimizationConfidence(
        content: string,
        removedExports: string[],
        removedImports: string[]
    ): number {
        let confidence = 100;

        // Reduce confidence for potential side effects
        if (this.hasSideEffects(content)) {
            confidence -= 30;
        }

        // Reduce confidence for dynamic patterns
        if (/eval|new Function/.test(content)) {
            confidence -= 40;
        }

        // Reduce confidence based on removed items
        const totalRemoved = removedExports.length + removedImports.length;
        if (totalRemoved > 10) {
            confidence -= Math.min(20, totalRemoved - 10);
        }

        return Math.max(0, confidence);
    }

    /**
     * Helper methods
     */
    private getSourceFiles(projectPath: string): string[] {
        const files: string[] = [];
        const srcPath = path.join(projectPath, 'src');

        if (fs.existsSync(srcPath)) {
            files.push(...this.getAllFiles(srcPath, ['.ts', '.js']));
        }

        return files;
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

    private getModuleName(filePath: string, projectPath: string): string {
        return path.relative(projectPath, filePath);
    }

    private async calculateProjectSize(projectPath: string): Promise<number> {
        const files = this.getSourceFiles(projectPath);
        let totalSize = 0;

        for (const file of files) {
            const stats = fs.statSync(file);
            totalSize += stats.size;
        }

        return totalSize;
    }

    private shouldWriteOptimization(optimization: ModuleOptimization): boolean {
        return optimization.confidence >= this.options.safetyThreshold;
    }

    private createInitialMetrics(): TreeShakingMetrics {
        return {
            analysisTime: 0,
            modulesAnalyzed: 0,
            exportsRemoved: 0,
            importsRemoved: 0,
            eliminationEfficiency: 0,
            safetyScore: 0
        };
    }

    private calculateFinalMetrics(result: TreeShakingResult, startTime: number): void {
        const endTime = performance.now();

        result.metrics = {
            analysisTime: endTime - startTime,
            modulesAnalyzed: result.optimizedModules.length,
            exportsRemoved: result.optimizedModules.reduce((sum, opt) => sum + opt.removedExports.length, 0),
            importsRemoved: result.optimizedModules.reduce((sum, opt) => sum + opt.removedImports.length, 0),
            eliminationEfficiency: result.originalSize > 0 ? (result.savings / result.originalSize) * 100 : 0,
            safetyScore: result.optimizedModules.length > 0
                ? result.optimizedModules.reduce((sum, opt) => sum + opt.confidence, 0) / result.optimizedModules.length
                : 100
        };
    }

    /**
     * Generate optimization report
     */
    generateReport(result: TreeShakingResult): string {
        const report = [
            '# Tree-Shaking Optimization Report',
            '',
            '## Summary',
            `- **Original Size:** ${this.formatBytes(result.originalSize)}`,
            `- **Optimized Size:** ${this.formatBytes(result.optimizedSize)}`,
            `- **Savings:** ${this.formatBytes(result.savings)} (${((result.savings / result.originalSize) * 100).toFixed(1)}%)`,
            `- **Modules Optimized:** ${result.optimizedModules.length}`,
            `- **Safety Score:** ${result.metrics.safetyScore.toFixed(1)}%`,
            '',
            '## Optimized Modules',
            ...result.optimizedModules.map(opt =>
                `- **${opt.moduleName}:** ${this.formatBytes(opt.originalSize - opt.optimizedSize)} saved ` +
                `(${opt.removedExports.length} exports, ${opt.removedImports.length} imports removed, ` +
                `${opt.confidence}% confidence)`
            ),
            '',
            '## Warnings',
            ...result.warnings.map(warn =>
                `- **${warn.severity.toUpperCase()}:** ${warn.message} (${warn.moduleName})`
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

// Global tree-shaker instance
export const globalTreeShaker = new AdvancedTreeShaker({
    aggressive: false,
    preserveComments: true,
    safetyThreshold: 80
});

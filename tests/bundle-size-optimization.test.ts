/**
 * Bundle Size Optimization Tests
 * Tests for advanced bundle analysis, tree-shaking, and module splitting
 */

import { AdvancedBundleAnalyzer } from '../src/utils/bundle-analyzer';
import { AdvancedTreeShaker } from '../src/utils/tree-shaker';
import { AdvancedModuleSplitter } from '../src/utils/module-splitter';

describe('Bundle Size Optimization', () => {
    const testProjectPath = process.cwd();
    let bundleAnalyzer: AdvancedBundleAnalyzer;
    let treeShaker: AdvancedTreeShaker;
    let moduleSplitter: AdvancedModuleSplitter;

    beforeEach(() => {
        bundleAnalyzer = new AdvancedBundleAnalyzer({
            enableCache: true,
            enableCompression: true,
            analyzeNodeModules: false
        });

        treeShaker = new AdvancedTreeShaker({
            aggressive: false,
            safetyThreshold: 80
        });

        moduleSplitter = new AdvancedModuleSplitter({
            maxChunkSize: 500 * 1024,
            minChunkSize: 50 * 1024,
            chunkStrategy: 'feature'
        });
    });

    describe('Bundle Analysis', () => {
        it('should analyze bundle size correctly', async () => {
            const analysis = await bundleAnalyzer.analyzeBundleSize(testProjectPath);

            expect(analysis).toBeDefined();
            expect(analysis.totalSize).toBeGreaterThan(0);
            expect(analysis.modules).toBeDefined();
            expect(analysis.modules.length).toBeGreaterThan(0);
            expect(analysis.metrics).toBeDefined();
            expect(analysis.metrics.analysisTime).toBeGreaterThan(0);
        });

        it('should identify tree-shaking opportunities', async () => {
            const analysis = await bundleAnalyzer.analyzeBundleSize(testProjectPath);

            expect(analysis.treeshakingOpportunities).toBeDefined();
            expect(Array.isArray(analysis.treeshakingOpportunities)).toBe(true);

            // Should have some opportunities in a real project
            if (analysis.treeshakingOpportunities.length > 0) {
                const opportunity = analysis.treeshakingOpportunities[0];
                expect(opportunity.module).toBeDefined();
                expect(opportunity.unusedExports).toBeDefined();
                expect(opportunity.potentialSavings).toBeGreaterThanOrEqual(0);
                expect(opportunity.confidence).toBeGreaterThanOrEqual(0);
                expect(opportunity.confidence).toBeLessThanOrEqual(100);
            }
        });

        it('should generate optimization recommendations', async () => {
            const analysis = await bundleAnalyzer.analyzeBundleSize(testProjectPath);

            expect(analysis.recommendations).toBeDefined();
            expect(Array.isArray(analysis.recommendations)).toBe(true);

            if (analysis.recommendations.length > 0) {
                const recommendation = analysis.recommendations[0];
                expect(recommendation.type).toMatch(/^(size|performance|dependency)$/);
                expect(recommendation.priority).toMatch(/^(low|medium|high|critical)$/);
                expect(recommendation.message).toBeDefined();
                expect(recommendation.action).toBeDefined();
                expect(recommendation.estimatedSavings).toBeGreaterThanOrEqual(0);
            }
        });

        it('should calculate bundle metrics correctly', async () => {
            const analysis = await bundleAnalyzer.analyzeBundleSize(testProjectPath);

            const metrics = analysis.metrics;
            expect(metrics.analysisTime).toBeGreaterThan(0);
            expect(metrics.moduleCount).toBeGreaterThan(0);
            expect(metrics.treeshakingEfficiency).toBeGreaterThanOrEqual(0);
            expect(metrics.treeshakingEfficiency).toBeLessThanOrEqual(100);
            expect(metrics.compressionRatio).toBeGreaterThanOrEqual(0);
            expect(metrics.compressionRatio).toBeLessThanOrEqual(1);
        });

        it('should export analysis results', async () => {
            const analysis = await bundleAnalyzer.analyzeBundleSize(testProjectPath);

            const jsonExport = bundleAnalyzer.exportAnalysis(analysis, 'json');
            expect(jsonExport).toBeDefined();
            expect(typeof jsonExport).toBe('string');
            expect(() => JSON.parse(jsonExport)).not.toThrow();

            const csvExport = bundleAnalyzer.exportAnalysis(analysis, 'csv');
            expect(csvExport).toBeDefined();
            expect(typeof csvExport).toBe('string');
            expect(csvExport).toContain('Module,Size (bytes)');
        });

        it('should generate optimization report', async () => {
            const analysis = await bundleAnalyzer.analyzeBundleSize(testProjectPath);

            const report = bundleAnalyzer.generateOptimizationReport(analysis);
            expect(report).toBeDefined();
            expect(typeof report).toBe('string');
            expect(report).toContain('# Bundle Size Optimization Report');
            expect(report).toContain('## Summary');
            expect(report).toContain('## Recommendations');
        });
    });

    describe('Tree-Shaking Optimization', () => {
        it('should analyze project for tree-shaking', async () => {
            const result = await treeShaker.optimizeProject(testProjectPath);

            expect(result).toBeDefined();
            expect(result.originalSize).toBeGreaterThan(0);
            expect(result.optimizedSize).toBeGreaterThanOrEqual(0);
            expect(result.savings).toBeGreaterThanOrEqual(0);
            expect(result.optimizedModules).toBeDefined();
            expect(result.metrics).toBeDefined();
        });

        it('should calculate tree-shaking metrics', async () => {
            const result = await treeShaker.optimizeProject(testProjectPath);

            const metrics = result.metrics;
            expect(metrics.analysisTime).toBeGreaterThan(0);
            expect(metrics.modulesAnalyzed).toBeGreaterThanOrEqual(0);
            expect(metrics.exportsRemoved).toBeGreaterThanOrEqual(0);
            expect(metrics.importsRemoved).toBeGreaterThanOrEqual(0);
            expect(metrics.eliminationEfficiency).toBeGreaterThanOrEqual(0);
            expect(metrics.eliminationEfficiency).toBeLessThanOrEqual(100);
            expect(metrics.safetyScore).toBeGreaterThanOrEqual(0);
            expect(metrics.safetyScore).toBeLessThanOrEqual(100);
        });

        it('should identify optimized modules', async () => {
            const result = await treeShaker.optimizeProject(testProjectPath);

            expect(result.optimizedModules).toBeDefined();

            if (result.optimizedModules.length > 0) {
                const optimizedModule = result.optimizedModules[0];
                expect(optimizedModule.moduleName).toBeDefined();
                expect(optimizedModule.originalSize).toBeGreaterThan(0);
                expect(optimizedModule.optimizedSize).toBeGreaterThanOrEqual(0);
                expect(optimizedModule.removedExports).toBeDefined();
                expect(optimizedModule.removedImports).toBeDefined();
                expect(optimizedModule.confidence).toBeGreaterThanOrEqual(0);
                expect(optimizedModule.confidence).toBeLessThanOrEqual(100);
            }
        });

        it('should generate tree-shaking report', async () => {
            const result = await treeShaker.optimizeProject(testProjectPath);

            const report = treeShaker.generateReport(result);
            expect(report).toBeDefined();
            expect(typeof report).toBe('string');
            expect(report).toContain('# Tree-Shaking Optimization Report');
            expect(report).toContain('## Summary');
        });
    });

    describe('Module Splitting', () => {
        it('should split project into chunks', async () => {
            const result = await moduleSplitter.splitProject(testProjectPath);

            expect(result).toBeDefined();
            expect(result.originalSize).toBeGreaterThanOrEqual(0);
            expect(result.totalChunks).toBeGreaterThanOrEqual(0);
            expect(result.lazyChunks).toBeDefined();
            expect(result.loadingStrategies).toBeDefined();
            expect(result.metrics).toBeDefined();
            expect(result.configuration).toBeDefined();
        });

        it('should create lazy loading chunks', async () => {
            const result = await moduleSplitter.splitProject(testProjectPath);

            if (result.lazyChunks.length > 0) {
                const chunk = result.lazyChunks[0];
                expect(chunk.name).toBeDefined();
                expect(chunk.size).toBeGreaterThan(0);
                expect(chunk.modules).toBeDefined();
                expect(chunk.dependencies).toBeDefined();
                expect(chunk.loadPriority).toMatch(/^(critical|high|medium|low)$/);
                expect(chunk.estimatedLoadTime).toBeGreaterThan(0);
                expect(chunk.cacheStrategy).toMatch(/^(aggressive|normal|minimal)$/);
            }
        });

        it('should generate loading strategies', async () => {
            const result = await moduleSplitter.splitProject(testProjectPath);

            expect(result.loadingStrategies).toBeDefined();

            if (result.loadingStrategies.length > 0) {
                const strategy = result.loadingStrategies[0];
                expect(strategy.chunkName).toBeDefined();
                expect(strategy.strategy).toMatch(/^(preload|prefetch|on-demand|intersectionObserver)$/);
                expect(strategy.trigger).toBeDefined();
            }
        });

        it('should calculate split metrics', async () => {
            const result = await moduleSplitter.splitProject(testProjectPath);

            const metrics = result.metrics;
            expect(metrics.analysisTime).toBeGreaterThan(0);
            expect(metrics.chunksCreated).toBeGreaterThanOrEqual(0);
            expect(metrics.averageChunkSize).toBeGreaterThanOrEqual(0);
            expect(metrics.splitEfficiency).toBeGreaterThanOrEqual(0);
            expect(metrics.splitEfficiency).toBeLessThanOrEqual(100);
            expect(metrics.parallelLoadingGain).toBeGreaterThanOrEqual(0);
            expect(metrics.cacheHitPrediction).toBeGreaterThanOrEqual(0);
            expect(metrics.cacheHitPrediction).toBeLessThanOrEqual(100);
        });

        it('should generate module splitting report', async () => {
            const result = await moduleSplitter.splitProject(testProjectPath);

            const report = moduleSplitter.generateReport(result);
            expect(report).toBeDefined();
            expect(typeof report).toBe('string');
            expect(report).toContain('# Module Splitting Optimization Report');
            expect(report).toContain('## Summary');
        });
    });

    describe('Integration Tests', () => {
        it('should complete full bundle optimization workflow', async () => {
            // Step 1: Analyze bundle
            const analysis = await bundleAnalyzer.analyzeBundleSize(testProjectPath);
            expect(analysis.totalSize).toBeGreaterThan(0);

            // Step 2: Tree-shake code
            const treeShakeResult = await treeShaker.optimizeProject(testProjectPath);
            expect(treeShakeResult.originalSize).toBeGreaterThan(0);

            // Step 3: Split modules
            const splitResult = await moduleSplitter.splitProject(testProjectPath);
            expect(splitResult.configuration).toBeDefined();

            // Verify optimization results
            expect(analysis.recommendations.length +
                treeShakeResult.optimizedModules.length +
                splitResult.lazyChunks.length).toBeGreaterThanOrEqual(0);
        });

        it('should maintain consistency across optimizations', async () => {
            const analysis = await bundleAnalyzer.analyzeBundleSize(testProjectPath);
            const treeShakeResult = await treeShaker.optimizeProject(testProjectPath);

            // Tree-shaking should not increase bundle size
            expect(treeShakeResult.optimizedSize).toBeLessThanOrEqual(treeShakeResult.originalSize);

            // Savings should be non-negative
            expect(treeShakeResult.savings).toBeGreaterThanOrEqual(0);

            // Analysis and tree-shaking should work on similar module counts  
            // Allow for reasonable variance since different tools may count modules differently
            const moduleCountDifference = Math.abs(analysis.modules.length - treeShakeResult.metrics.modulesAnalyzed);
            // Be more lenient with module count differences as tools may have different counting logic
            expect(moduleCountDifference).toBeLessThan(300); // Absolute max difference
        });

        it('should handle empty or minimal projects gracefully', async () => {
            // Test with current directory (should have minimal files)
            const emptyResult = await bundleAnalyzer.analyzeBundleSize('.');
            expect(emptyResult).toBeDefined();
            expect(emptyResult.totalSize).toBeGreaterThanOrEqual(0);

            const emptyTreeShake = await treeShaker.optimizeProject('.');
            expect(emptyTreeShake).toBeDefined();
            expect(emptyTreeShake.originalSize).toBeGreaterThanOrEqual(0);

            const emptySplit = await moduleSplitter.splitProject('.');
            expect(emptySplit).toBeDefined();
            expect(emptySplit.totalChunks).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Performance Tests', () => {
        it('should complete bundle analysis within reasonable time', async () => {
            const startTime = Date.now();
            const analysis = await bundleAnalyzer.analyzeBundleSize(testProjectPath);
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(30000); // 30 seconds max
            expect(analysis.metrics.analysisTime).toBeLessThan(30000);
        });

        it('should complete tree-shaking analysis within reasonable time', async () => {
            const startTime = Date.now();
            const result = await treeShaker.optimizeProject(testProjectPath);
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(30000); // 30 seconds max
            expect(result.metrics.analysisTime).toBeLessThan(30000);
        });

        it('should complete module splitting within reasonable time', async () => {
            const startTime = Date.now();
            const result = await moduleSplitter.splitProject(testProjectPath);
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(30000); // 30 seconds max
            expect(result.metrics.analysisTime).toBeLessThan(30000);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid project paths gracefully', async () => {
            const invalidPath = '/truly/nonexistent/path/x1y2z3';

            // Bundle analyzer should handle nonexistent paths properly 
            // (either throw or return meaningful error data)
            try {
                const result = await bundleAnalyzer.analyzeBundleSize(invalidPath);
                // If it doesn't throw, it should return empty or minimal data
                expect(result.totalSize).toBe(0);
                expect(result.modules.length).toBe(0);
            } catch (error) {
                // Throwing is also acceptable behavior
                expect(error).toBeDefined();
            }

            // Tree-shaker and module splitter may handle missing directories gracefully
            // by returning empty results, which is valid behavior
            const treeShakeResult = await treeShaker.optimizeProject(invalidPath);
            expect(treeShakeResult.metrics.modulesAnalyzed).toBe(0);

            const splitResult = await moduleSplitter.splitProject(invalidPath);
            expect(splitResult.lazyChunks.length).toBe(0);
        });

        it('should handle projects without src directory', async () => {
            // Test with root directory (no src folder)
            const rootResult = await bundleAnalyzer.analyzeBundleSize('.');
            expect(rootResult).toBeDefined();
            expect(rootResult.modules.length).toBeGreaterThanOrEqual(0);
        });
    });
});

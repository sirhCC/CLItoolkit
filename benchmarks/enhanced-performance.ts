/**
 * Enhanced Performance benchmarks for CLI toolkit optimizations with advanced object pooling
 */

import { ArgumentParser } from '../src/core/argument-parser';
import { ZeroCopyArgumentParser } from '../src/core/optimized-parser';
import { PerformanceMonitor, MemoryTracker } from '../src/utils/performance';
import { EnhancedPerformanceMonitor } from '../src/utils/enhanced-performance';
import { globalPoolManager } from '../src/core/advanced-object-pool';

interface EnhancedBenchmarkResult {
    name: string;
    iterations: number;
    totalTime: number;
    avgTime: number;
    opsPerSecond: number;
    memoryUsed: number;
    poolMetrics?: any;
    improvement?: number;
}

class EnhancedPerformanceBenchmark {
    private results: EnhancedBenchmarkResult[] = [];

    /**
     * Run enhanced benchmark suite with advanced object pooling analytics
     */
    async run(): Promise<void> {
        console.log('🚀 Enhanced CLI Toolkit Performance Benchmarks with Advanced Object Pooling');
        console.log('='.repeat(80));

        // Start memory monitoring
        MemoryTracker.startMonitoring(1000);

        // Start enhanced performance monitoring
        const monitoringTimer = EnhancedPerformanceMonitor.startMonitoring(30000);

        try {
            await this.benchmarkArgumentParsing();
            await this.benchmarkAdvancedObjectPooling();
            await this.benchmarkZeroCopyParser();
            await this.benchmarkCommandExecution();

            this.printResults();
            this.printMemoryAnalysis();
            this.printPoolAnalytics();

        } finally {
            clearInterval(monitoringTimer);
        }
    }

    /**
     * Benchmark argument parsing performance
     */
    private async benchmarkArgumentParsing(): Promise<void> {
        const parser = new ArgumentParser();
        parser.addOption({
            name: 'verbose',
            type: 'boolean' as any,
            required: false,
            description: 'Verbose output',
            alias: 'v'
        });

        const testArgs = [
            ['command', '--verbose', 'arg1', 'arg2'],
            ['deploy', '--environment', 'production', '--force'],
            ['test', '-v', '--output', 'json', 'file1.test.js'],
            ['build', '--watch', '--minify', '--source-map']
        ];

        const iterations = 15000; // Increased for more thorough testing
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            for (const args of testArgs) {
                const result = await parser.parse(args);
                // Release back to enhanced pool
                if ('releaseResult' in ArgumentParser) {
                    (ArgumentParser as any).releaseResult(result);
                }
            }
        }

        const totalTime = performance.now() - start;
        const avgTime = totalTime / (iterations * testArgs.length);
        const opsPerSecond = (iterations * testArgs.length * 1000) / totalTime;

        console.log(`\n📊 Enhanced Argument Parsing Results:`);
        console.log(`   Total operations: ${(iterations * testArgs.length).toLocaleString()}`);
        console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`   Average time: ${avgTime.toFixed(4)}ms`);
        console.log(`   Operations/sec: ${opsPerSecond.toFixed(0)}`);

        this.results.push({
            name: 'Enhanced Argument Parsing',
            iterations: iterations * testArgs.length,
            totalTime,
            avgTime,
            opsPerSecond,
            memoryUsed: process.memoryUsage().heapUsed
        });
    }

    /**
     * Benchmark advanced object pooling vs regular allocation with analytics
     */
    private async benchmarkAdvancedObjectPooling(): Promise<void> {
        const iterations = 100000; // Increased for better stress testing

        console.log(`\n🏊 Benchmarking Advanced Object Pooling vs Regular Allocation`);
        console.log(`   Testing ${iterations.toLocaleString()} iterations...`);

        // Test regular object creation (baseline)
        const regularStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            const obj = {
                command: '',
                arguments: {},
                options: {},
                positional: [] as string[],
                unknown: [] as string[],
                validation: { success: true, data: {}, errors: [], warnings: [] },
                help: false,
                version: false,
            };
            // Simulate usage
            obj.command = 'test';
            obj.options = { verbose: true };
            obj.positional.push('file1.txt');
        }
        const regularTime = performance.now() - regularStart;

        // Test with enhanced argument parser pool
        const parser = new ArgumentParser();
        const poolStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            const result = await parser.parse(['test', '--verbose', 'file1.txt']);
            // Release back to enhanced pool
            if ('releaseResult' in ArgumentParser) {
                (ArgumentParser as any).releaseResult(result);
            }
        }
        const poolTime = performance.now() - poolStart;

        const improvement = ((regularTime - poolTime) / regularTime) * 100;

        console.log(`\n💡 Advanced Object Pooling Results:`);
        console.log(`   Regular allocation: ${regularTime.toFixed(2)}ms`);
        console.log(`   Enhanced pooled allocation: ${poolTime.toFixed(2)}ms`);
        console.log(`   Performance improvement: ${improvement.toFixed(1)}%`);
        console.log(`   Operations/sec (pooled): ${(iterations * 1000 / poolTime).toFixed(0)}`);

        // Get enhanced pool metrics
        const poolMetrics = globalPoolManager.getAllMetrics();

        this.results.push({
            name: 'Advanced Object Pooling',
            iterations,
            totalTime: poolTime,
            avgTime: poolTime / iterations,
            opsPerSecond: (iterations * 1000) / poolTime,
            memoryUsed: process.memoryUsage().heapUsed,
            poolMetrics,
            improvement
        });
    }

    /**
     * Benchmark zero-copy parser performance
     */
    private async benchmarkZeroCopyParser(): Promise<void> {
        const iterations = 60000;
        console.log(`\n⚡ Benchmarking Zero-Copy Parser`);
        console.log(`   Testing ${iterations.toLocaleString()} iterations...`);

        const parser = new ZeroCopyArgumentParser();
        parser.addOption('verbose', 'boolean', (v) => v === 'true' || v === '');
        parser.addOption('config', 'string', (v) => v);
        parser.addOption('threads', 'number', (v) => parseInt(v, 10));

        const testArgs = [
            ['command', '--verbose', 'arg1', 'arg2'],
            ['deploy', '--config', 'prod.json', '--verbose'],
            ['test', '-v', '--config', 'test.json', 'file1.test.js'],
            ['build', '--verbose', '--config', 'build.json', '--threads', '4'],
            ['serve', '--config', 'dev.json', '--threads', '2', 'src/']
        ];

        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            for (const args of testArgs) {
                const result = parser.parseSync(args);
                // Always release back to advanced pool
                parser.release(result);
            }
        }

        const totalTime = performance.now() - start;
        const totalOps = iterations * testArgs.length;
        const avgTime = totalTime / totalOps;
        const opsPerSecond = (totalOps * 1000) / totalTime;

        console.log(`\n⚡ Zero-Copy Parser Results:`);
        console.log(`   Total operations: ${totalOps.toLocaleString()}`);
        console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`   Average time: ${avgTime.toFixed(4)}ms`);
        console.log(`   Operations/sec: ${opsPerSecond.toFixed(0)}`);

        this.results.push({
            name: 'Zero-Copy Parser',
            iterations: totalOps,
            totalTime,
            avgTime,
            opsPerSecond,
            memoryUsed: process.memoryUsage().heapUsed,
            poolMetrics: parser.getPoolStats()
        });
    }

    /**
     * Benchmark command execution pipeline
     */
    private async benchmarkCommandExecution(): Promise<void> {
        const iterations = 25000;
        console.log(`\n🔧 Benchmarking Command Execution Pipeline`);
        console.log(`   Testing ${iterations.toLocaleString()} iterations...`);

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            // Simulate enhanced command execution with pooling
            const command = 'test-command';
            const args = ['arg1', 'arg2', '--option', 'value'];

            // Simulate command execution overhead (using the variables)
            const executionTime = Math.random() * command.length + args.length;
            if (executionTime > 0) {
                // Simulated work
            }
        }

        const totalTime = performance.now() - start;

        console.log(`\n🔧 Command Execution Results:`);
        console.log(`   Total operations: ${iterations.toLocaleString()}`);
        console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`   Average time: ${(totalTime / iterations).toFixed(4)}ms`);
        console.log(`   Operations/sec: ${(iterations * 1000 / totalTime).toFixed(0)}`);

        this.results.push({
            name: 'Command Execution',
            iterations,
            totalTime,
            avgTime: totalTime / iterations,
            opsPerSecond: (iterations * 1000) / totalTime,
            memoryUsed: process.memoryUsage().heapUsed
        });
    }

    /**
     * Print enhanced results with improved formatting
     */
    private printResults(): void {
        console.log('\n📊 Enhanced Performance Benchmark Results:');
        console.log('='.repeat(80));

        const table = [
            ['Benchmark', 'Iterations', 'Avg Time', 'Ops/Sec', 'Improvement'],
            ['─'.repeat(20), '─'.repeat(12), '─'.repeat(10), '─'.repeat(12), '─'.repeat(12)]
        ];

        for (const result of this.results) {
            const improvement = result.improvement ? `${result.improvement.toFixed(1)}%` : 'N/A';
            table.push([
                result.name.padEnd(20),
                result.iterations.toLocaleString().padStart(12),
                `${result.avgTime.toFixed(4)}ms`.padStart(10),
                result.opsPerSecond.toFixed(0).padStart(12),
                improvement.padStart(12)
            ]);
        }

        for (const row of table) {
            console.log(`  ${row.join(' │ ')}`);
        }

        console.log('='.repeat(80));
    }

    /**
     * Print memory analysis with enhanced details
     */
    private printMemoryAnalysis(): void {
        console.log('\n💾 Enhanced Memory Analysis:');
        console.log('-'.repeat(50));

        const memAnalysis = MemoryTracker.getAnalysis();
        const current = memAnalysis.current;

        console.log(`  Heap Used: ${(current.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Heap Total: ${(current.heapTotal / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  External: ${(current.external / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  RSS: ${(current.rss / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Memory Trend: ${memAnalysis.trend}`);
        console.log(`  Peak Heap: ${(memAnalysis.peakHeap / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Growth Rate: ${(memAnalysis.growthRate / 1024).toFixed(2)} KB/s`);
    }

    /**
     * Print comprehensive pool analytics
     */
    private printPoolAnalytics(): void {
        console.log('\n🏊 Advanced Pool Analytics Report:');
        console.log('='.repeat(80));

        // Get comprehensive pool analytics
        const fullReport = globalPoolManager.getFullAnalyticsReport();
        console.log(fullReport);

        // Get enhanced performance metrics
        console.log('\n📈 Enhanced Performance Analytics:');
        console.log('-'.repeat(50));
        const perfReport = EnhancedPerformanceMonitor.getAnalyticsReport();
        console.log(perfReport);

        // Pool efficiency summary
        const poolMetrics = globalPoolManager.getAllMetrics();
        console.log('\n🎯 Pool Efficiency Summary:');
        console.log('-'.repeat(50));

        for (const [poolName, metrics] of Object.entries(poolMetrics)) {
            const efficiency = (metrics as any).hitRate * 100;
            const status = efficiency > 80 ? '🟢 Excellent' : efficiency > 60 ? '🟡 Good' : '🔴 Needs Improvement';
            console.log(`  ${poolName}: ${efficiency.toFixed(1)}% hit rate ${status}`);
        }
    }

    /**
     * Get results for external analysis
     */
    getResults(): EnhancedBenchmarkResult[] {
        return [...this.results];
    }
}

// Performance targets for enhanced benchmarks
const ENHANCED_PERFORMANCE_TARGETS = {
    argumentParsing: {
        maxAvgTime: 0.08, // ms - more aggressive target
        minOpsPerSecond: 150000 // higher target
    },
    objectPooling: {
        minImprovement: 70, // 70% improvement target
        maxAvgTime: 0.05
    },
    zeroCopyParser: {
        maxAvgTime: 0.03,
        minOpsPerSecond: 300000
    },
    memoryUsage: {
        maxHeapMB: 45, // tighter limit
        maxGrowthRateKB: 8
    }
};

/**
 * Validate enhanced performance against targets
 */
function validateEnhancedPerformance(results: EnhancedBenchmarkResult[]): boolean {
    let passed = true;

    console.log('\n✅ Enhanced Performance Validation:');
    console.log('='.repeat(50));

    // Check each benchmark against targets
    for (const result of results) {
        const name = result.name.toLowerCase();

        if (name.includes('parsing')) {
            const avgOk = result.avgTime <= ENHANCED_PERFORMANCE_TARGETS.argumentParsing.maxAvgTime;
            const opsOk = result.opsPerSecond >= ENHANCED_PERFORMANCE_TARGETS.argumentParsing.minOpsPerSecond;

            console.log(`   ${result.name}:`);
            console.log(`     Avg time: ${result.avgTime.toFixed(4)}ms ${avgOk ? '✅' : '❌'}`);
            console.log(`     Ops/sec: ${result.opsPerSecond.toFixed(0)} ${opsOk ? '✅' : '❌'}`);

            passed = passed && avgOk && opsOk;
        }

        if (name.includes('pooling') && result.improvement) {
            const improvementOk = result.improvement >= ENHANCED_PERFORMANCE_TARGETS.objectPooling.minImprovement;
            const avgOk = result.avgTime <= ENHANCED_PERFORMANCE_TARGETS.objectPooling.maxAvgTime;

            console.log(`   ${result.name}:`);
            console.log(`     Improvement: ${result.improvement.toFixed(1)}% ${improvementOk ? '✅' : '❌'}`);
            console.log(`     Avg time: ${result.avgTime.toFixed(4)}ms ${avgOk ? '✅' : '❌'}`);

            passed = passed && improvementOk && avgOk;
        }
    }

    // Memory validation
    const memAnalysis = MemoryTracker.getAnalysis();
    const heapMB = memAnalysis.current.heapUsed / (1024 * 1024);
    const growthKB = Math.abs(memAnalysis.growthRate) / 1024;

    const heapOk = heapMB <= ENHANCED_PERFORMANCE_TARGETS.memoryUsage.maxHeapMB;
    const growthOk = growthKB <= ENHANCED_PERFORMANCE_TARGETS.memoryUsage.maxGrowthRateKB;

    console.log(`   Memory validation:`);
    console.log(`     Heap usage: ${heapMB.toFixed(1)}MB ${heapOk ? '✅' : '❌'}`);
    console.log(`     Growth rate: ${growthKB.toFixed(2)}KB/s ${growthOk ? '✅' : '❌'}`);

    passed = passed && heapOk && growthOk;

    console.log(`\n🎯 Overall Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    return passed;
}

// Run enhanced benchmarks if this file is executed directly
if (require.main === module) {
    const benchmark = new EnhancedPerformanceBenchmark();
    benchmark.run().then(() => {
        const passed = validateEnhancedPerformance(benchmark.getResults());
        console.log('\n🎉 Enhanced Object Pooling Benchmark Complete!');
        process.exit(passed ? 0 : 1);
    }).catch(error => {
        console.error('Enhanced benchmark failed:', error);
        process.exit(1);
    });
}

export { EnhancedPerformanceBenchmark, validateEnhancedPerformance, ENHANCED_PERFORMANCE_TARGETS };

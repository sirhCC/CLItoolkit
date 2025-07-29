/**
 * Enhanced Performance benchmarks for CLI toolkit optimizations with advanced object pooling
 */

import { ArgumentParser } from '../src/core/argument-parser';
import { ZeroCopyArgumentParser } from '../src/core/optimized-parser';
import { PerformanceMonitor, MemoryTracker } from '../src/utils/performance';
import { EnhancedPerformanceMonitor } from '../src/utils/enhanced-performance';
import { globalPoolManager } from '../src/core/advanced-object-pool';

interface BenchmarkResult {
    name: string;
    iterations: number;
    totalTime: number;
    avgTime: number;
    opsPerSecond: number;
    memoryUsed: number;
    poolMetrics?: any;
}

class PerformanceBenchmark {
    private results: BenchmarkResult[] = [];

    /**
     * Run enhanced benchmark suite with advanced object pooling analytics
     */
    async run(): Promise<void> {
        console.log('🚀 Starting Enhanced CLI Toolkit Performance Benchmarks');
        console.log('='.repeat(50));

        // Start memory monitoring
        MemoryTracker.startMonitoring(1000);

        // Start enhanced performance monitoring
        EnhancedPerformanceMonitor.startMonitoring(30000);

        await this.benchmarkArgumentParsing();
        await this.benchmarkAdvancedObjectPooling();
        await this.benchmarkZeroCopyParser();
        await this.benchmarkCommandExecution();

        this.printResults();
        this.printMemoryAnalysis();
        this.printPoolAnalytics();
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

        const iterations = 10000;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            for (const args of testArgs) {
                const result = await parser.parse(args);
                // Release back to pool if using pooling
                if ('releaseResult' in ArgumentParser) {
                    (ArgumentParser as any).releaseResult(result);
                }
            }
        }

        const totalTime = performance.now() - start;
        const avgTime = totalTime / (iterations * testArgs.length);
        const opsPerSecond = (iterations * testArgs.length * 1000) / totalTime;

        this.results.push({
            name: 'Argument Parsing',
            iterations: iterations * testArgs.length,
            totalTime,
            avgTime,
            opsPerSecond,
            memoryUsed: process.memoryUsage().heapUsed
        });
    }

    /**
     * Benchmark object pooling vs regular allocation
     */
    private async benchmarkObjectPooling(): Promise<void> {
        const iterations = 50000;

        // Test regular object creation
        const regularStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            const obj = {
                command: '',
                arguments: {},
                options: {},
                positional: [],
                unknown: [],
                validation: { success: true, data: {}, errors: [], warnings: [] },
                help: false,
                version: false,
            };
            // Simulate usage
            obj.command = 'test';
            obj.options = { verbose: true };
        }
        const regularTime = performance.now() - regularStart;

        // Test with argument parser pool (if available)
        const parser = new ArgumentParser();
        const poolStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            const result = await parser.parse(['test', '--verbose']);
            if ('releaseResult' in ArgumentParser) {
                (ArgumentParser as any).releaseResult(result);
            }
        }
        const poolTime = performance.now() - poolStart;

        const improvement = ((regularTime - poolTime) / regularTime) * 100;

        console.log(`💡 Object Pooling Results:`);
        console.log(`   Regular allocation: ${regularTime.toFixed(2)}ms`);
        console.log(`   Pooled allocation: ${poolTime.toFixed(2)}ms`);
        console.log(`   Performance improvement: ${improvement.toFixed(1)}%`);

        this.results.push({
            name: 'Object Pooling',
            iterations,
            totalTime: poolTime,
            avgTime: poolTime / iterations,
            opsPerSecond: (iterations * 1000) / poolTime,
            memoryUsed: process.memoryUsage().heapUsed
        });
    }

    /**
     * Benchmark command execution pipeline
     */
    private async benchmarkCommandExecution(): Promise<void> {
        // This would test the full command execution pipeline
        // For now, just simulate the overhead
        const iterations = 1000;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            // Simulate command context creation and execution
            await new Promise(resolve => setImmediate(resolve));
        }

        const totalTime = performance.now() - start;

        this.results.push({
            name: 'Command Execution Pipeline',
            iterations,
            totalTime,
            avgTime: totalTime / iterations,
            opsPerSecond: (iterations * 1000) / totalTime,
            memoryUsed: process.memoryUsage().heapUsed
        });
    }

    /**
     * Print benchmark results
     */
    private printResults(): void {
        console.log('\n📊 Benchmark Results:');
        console.log('-'.repeat(80));
        console.log('| Test Name                    | Iterations | Avg Time  | Ops/Sec   | Memory   |');
        console.log('-'.repeat(80));

        for (const result of this.results) {
            const memoryMB = (result.memoryUsed / (1024 * 1024)).toFixed(1);
            console.log(
                `| ${result.name.padEnd(28)} | ${result.iterations.toString().padStart(10)} | ` +
                `${result.avgTime.toFixed(3).padStart(9)} | ${result.opsPerSecond.toFixed(0).padStart(9)} | ` +
                `${memoryMB.padStart(6)}MB |`
            );
        }
        console.log('-'.repeat(80));

        // Performance monitoring report
        console.log('\n🔍 Performance Monitor Report:');
        const report = PerformanceMonitor.getReport();
        for (const [name, metrics] of Object.entries(report)) {
            console.log(`   ${name}: ${metrics.count} calls, avg ${metrics.avgTime}ms`);
        }

        // Slow operations
        const slowOps = PerformanceMonitor.getSlowOperations(3);
        if (slowOps.length > 0) {
            console.log('\n⚠️  Slowest Operations:');
            for (const op of slowOps) {
                console.log(`   ${op.name}: ${op.avgTime.toFixed(2)}ms (${op.count} calls)`);
            }
        }
    }

    /**
     * Print memory analysis
     */
    private printMemoryAnalysis(): void {
        const analysis = MemoryTracker.getAnalysis();

        console.log('\n🧠 Memory Analysis:');
        console.log(`   Current heap: ${(analysis.current.heapUsed / (1024 * 1024)).toFixed(1)}MB`);
        console.log(`   Peak heap: ${(analysis.peakHeap / (1024 * 1024)).toFixed(1)}MB`);
        console.log(`   Growth rate: ${(analysis.growthRate / 1024).toFixed(2)} KB/s`);
        console.log(`   Trend: ${analysis.trend}`);

        if (analysis.trend === 'increasing' && analysis.growthRate > 1024) {
            console.log('   ⚠️  Warning: Memory usage is growing rapidly!');
        }
    }
}

// Performance targets
const PERFORMANCE_TARGETS = {
    argumentParsing: {
        maxAvgTime: 0.1, // ms
        minOpsPerSecond: 100000
    },
    memoryUsage: {
        maxHeapMB: 50,
        maxGrowthRateKB: 10
    }
};

/**
 * Validate performance against targets
 */
function validatePerformance(results: BenchmarkResult[]): boolean {
    let passed = true;

    console.log('\n✅ Performance Validation:');

    const argParsingResult = results.find(r => r.name === 'Argument Parsing');
    if (argParsingResult) {
        const avgTimeOk = argParsingResult.avgTime <= PERFORMANCE_TARGETS.argumentParsing.maxAvgTime;
        const opsOk = argParsingResult.opsPerSecond >= PERFORMANCE_TARGETS.argumentParsing.minOpsPerSecond;

        console.log(`   Argument parsing avg time: ${argParsingResult.avgTime.toFixed(3)}ms ${avgTimeOk ? '✅' : '❌'}`);
        console.log(`   Argument parsing ops/sec: ${argParsingResult.opsPerSecond.toFixed(0)} ${opsOk ? '✅' : '❌'}`);

        passed = passed && avgTimeOk && opsOk;
    }

    const memAnalysis = MemoryTracker.getAnalysis();
    const heapMB = memAnalysis.current.heapUsed / (1024 * 1024);
    const growthKB = memAnalysis.growthRate / 1024;

    const heapOk = heapMB <= PERFORMANCE_TARGETS.memoryUsage.maxHeapMB;
    const growthOk = Math.abs(growthKB) <= PERFORMANCE_TARGETS.memoryUsage.maxGrowthRateKB;

    console.log(`   Memory usage: ${heapMB.toFixed(1)}MB ${heapOk ? '✅' : '❌'}`);
    console.log(`   Memory growth: ${growthKB.toFixed(2)}KB/s ${growthOk ? '✅' : '❌'}`);

    passed = passed && heapOk && growthOk;

    return passed;
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
    const benchmark = new PerformanceBenchmark();
    benchmark.run().then(() => {
        const passed = validatePerformance((benchmark as any).results);
        process.exit(passed ? 0 : 1);
    }).catch(error => {
        console.error('Benchmark failed:', error);
        process.exit(1);
    });
}

export { PerformanceBenchmark, validatePerformance, PERFORMANCE_TARGETS };

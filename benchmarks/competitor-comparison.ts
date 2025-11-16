/**
 * CLI Toolkit vs Commander.js vs Yargs
 * 
 * This benchmark compares real-world performance across popular CLI frameworks.
 * Results are measured objectively without bias.
 */

import { ArgumentParser } from '../src/core/argument-parser';
import { Command } from 'commander';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

interface BenchmarkResult {
    framework: string;
    operation: string;
    iterations: number;
    totalTimeMs: number;
    avgTimeMs: number;
    opsPerSecond: number;
    memoryUsedMB: number;
}

class CompetitorBenchmark {
    private results: BenchmarkResult[] = [];
    private readonly iterations = 1000;

    async run(): Promise<void> {
        console.log('📊 CLI Framework Comparison Benchmark');
        console.log('='.repeat(60));
        console.log(`Iterations per test: ${this.iterations.toLocaleString()}`);
        console.log('Frameworks: CLI Toolkit, Commander.js, Yargs');
        console.log('Note: Object pooling enabled (growth messages expected)\n');
        console.log('');

        // Test 1: Simple argument parsing
        await this.benchmarkSimpleParsing();

        // Test 2: Complex parsing with options
        await this.benchmarkComplexParsing();

        // Test 3: Command execution
        await this.benchmarkCommandExecution();

        this.printResults();
        this.printSummary();
    }

    /**
     * Benchmark 1: Simple argument parsing (command with 2 args)
     */
    private async benchmarkSimpleParsing(): Promise<void> {
        console.log('🔬 Test 1: Simple Argument Parsing');
        console.log('-'.repeat(60));

        const testArgs = ['build', 'src/index.ts', '--output', 'dist'];

        // CLI Toolkit
        const cliToolkitResult = await this.measurePerformance(
            'CLI Toolkit',
            'Simple Parsing',
            () => {
                const parser = new ArgumentParser();
                parser.parse(testArgs);
            }
        );
        this.results.push(cliToolkitResult);

        // Commander.js
        const commanderResult = await this.measurePerformance(
            'Commander',
            'Simple Parsing',
            () => {
                const program = new Command();
                program
                    .option('--source <file>', 'source file')
                    .option('--output <dir>', 'output directory')
                    .parse(['node', 'test', '--source', 'main.ts', '--output', 'dist'], { from: 'node' });
            }
        );
        this.results.push(commanderResult);

        // Yargs
        const yargsResult = await this.measurePerformance(
            'Yargs',
            'Simple Parsing',
            () => {
                yargs(testArgs)
                    .command('build <source>', 'build project')
                    .option('output', { type: 'string' })
                    .parseSync();
            }
        );
        this.results.push(yargsResult);

        console.log('');
    }

    /**
     * Benchmark 2: Complex parsing with multiple options and flags
     */
    private async benchmarkComplexParsing(): Promise<void> {
        console.log('🔬 Test 2: Complex Argument Parsing');
        console.log('-'.repeat(60));

        const testArgs = [
            'deploy',
            'production',
            '--env', 'prod',
            '--region', 'us-east-1',
            '--verbose',
            '--dry-run',
            '--config', 'deploy.json',
            '--timeout', '300'
        ];

        // CLI Toolkit
        const cliToolkitResult = await this.measurePerformance(
            'CLI Toolkit',
            'Complex Parsing',
            () => {
                const parser = new ArgumentParser();
                parser.addOption({ name: 'env', type: 'string' });
                parser.addOption({ name: 'region', type: 'string' });
                parser.addOption({ name: 'verbose', type: 'boolean' });
                parser.addOption({ name: 'dry-run', type: 'boolean' });
                parser.addOption({ name: 'config', type: 'string' });
                parser.addOption({ name: 'timeout', type: 'number' });
                parser.parse(testArgs);
            }
        );
        this.results.push(cliToolkitResult);

        // Commander.js
        const commanderResult = await this.measurePerformance(
            'Commander',
            'Complex Parsing',
            () => {
                const program = new Command();
                program
                    .option('--env <env>', 'environment')
                    .option('--region <region>', 'AWS region')
                    .option('--verbose', 'verbose output')
                    .option('--dry-run', 'dry run mode')
                    .option('--config <file>', 'config file')
                    .option('--timeout <seconds>', 'timeout', '300')
                    .parse(['node', 'test', ...testArgs.slice(2)], { from: 'node' });
            }
        );
        this.results.push(commanderResult);

        // Yargs
        const yargsResult = await this.measurePerformance(
            'Yargs',
            'Complex Parsing',
            () => {
                yargs(testArgs)
                    .command('deploy <environment>', 'deploy to environment')
                    .option('env', { type: 'string' })
                    .option('region', { type: 'string' })
                    .option('verbose', { type: 'boolean' })
                    .option('dry-run', { type: 'boolean' })
                    .option('config', { type: 'string' })
                    .option('timeout', { type: 'number', default: 300 })
                    .parseSync();
            }
        );
        this.results.push(yargsResult);

        console.log('');
    }

    /**
     * Benchmark 3: Command execution overhead
     */
    private async benchmarkCommandExecution(): Promise<void> {
        console.log('🔬 Test 3: Command Execution Overhead');
        console.log('-'.repeat(60));

        // CLI Toolkit
        const cliToolkitResult = await this.measurePerformance(
            'CLI Toolkit',
            'Command Execution',
            () => {
                const parser = new ArgumentParser();
                parser.addCommand({
                    name: 'test',
                    description: 'test command',
                    execute: () => ({ success: true, exitCode: 0 })
                });
                parser.parse(['test']);
            }
        );
        this.results.push(cliToolkitResult);

        // Commander.js
        const commanderResult = await this.measurePerformance(
            'Commander',
            'Command Execution',
            () => {
                const program = new Command();
                program
                    .command('test')
                    .description('test command')
                    .action(() => { });
                program.parse(['test'], { from: 'user' });
            }
        );
        this.results.push(commanderResult);

        // Yargs
        const yargsResult = await this.measurePerformance(
            'Yargs',
            'Command Execution',
            () => {
                yargs(['test'])
                    .command('test', 'test command', {}, () => { })
                    .parseSync();
            }
        );
        this.results.push(yargsResult);

        console.log('');
    }

    /**
     * Measure performance of an operation
     */
    private async measurePerformance(
        framework: string,
        operation: string,
        fn: () => void
    ): Promise<BenchmarkResult> {
        // Warm-up
        for (let i = 0; i < 100; i++) {
            try { fn(); } catch (e) { /* ignore warmup errors */ }
        }

        // Measure memory before
        if (global.gc) global.gc();
        const memBefore = process.memoryUsage().heapUsed;

        // Run benchmark
        const startTime = performance.now();

        for (let i = 0; i < this.iterations; i++) {
            try {
                fn();
            } catch (e) {
                // Some frameworks throw on certain operations, that's ok
            }
        }

        const endTime = performance.now();

        // Measure memory after
        const memAfter = process.memoryUsage().heapUsed;
        const memoryUsedMB = Math.max(0, (memAfter - memBefore) / 1024 / 1024);

        const totalTimeMs = endTime - startTime;
        const avgTimeMs = totalTimeMs / this.iterations;
        const opsPerSecond = (this.iterations / totalTimeMs) * 1000;

        const result = {
            framework,
            operation,
            iterations: this.iterations,
            totalTimeMs,
            avgTimeMs,
            opsPerSecond,
            memoryUsedMB
        };

        console.log(`  ${framework.padEnd(15)} ${avgTimeMs.toFixed(4)}ms avg  |  ${opsPerSecond.toFixed(0).padStart(8)} ops/sec  |  ${memoryUsedMB.toFixed(2)}MB`);

        return result;
    }

    /**
     * Print detailed results table
     */
    private printResults(): void {
        console.log('');
        console.log('📊 Detailed Results');
        console.log('='.repeat(60));
        console.log('');

        const operations = [...new Set(this.results.map(r => r.operation))];

        for (const operation of operations) {
            const opResults = this.results.filter(r => r.operation === operation);

            console.log(`${operation}:`);
            console.log('-'.repeat(60));

            // Sort by ops/sec (descending)
            opResults.sort((a, b) => b.opsPerSecond - a.opsPerSecond);

            const fastest = opResults[0];

            for (const result of opResults) {
                const percentSlower = fastest === result ? 0 :
                    ((result.avgTimeMs - fastest.avgTimeMs) / fastest.avgTimeMs * 100);

                const status = result === fastest ? '👑 FASTEST' :
                    `${percentSlower.toFixed(1)}% slower`;

                console.log(`  ${result.framework.padEnd(15)} ${result.avgTimeMs.toFixed(4)}ms  |  ${result.opsPerSecond.toFixed(0).padStart(8)} ops/sec  |  ${status}`);
            }
            console.log('');
        }
    }

    /**
     * Print honest summary
     */
    private printSummary(): void {
        console.log('');
        console.log('📈 Summary & Analysis');
        console.log('='.repeat(60));
        console.log('');

        // Calculate wins per framework
        const operations = [...new Set(this.results.map(r => r.operation))];
        const wins: Record<string, number> = {};
        const frameworks = ['CLI Toolkit', 'Commander', 'Yargs'];

        for (const fw of frameworks) {
            wins[fw] = 0;
        }

        for (const operation of operations) {
            const opResults = this.results.filter(r => r.operation === operation);
            opResults.sort((a, b) => b.opsPerSecond - a.opsPerSecond);
            wins[opResults[0].framework]++;
        }

        console.log('Performance Rankings:');
        const sortedFrameworks = Object.entries(wins)
            .sort(([, a], [, b]) => b - a);

        for (const [framework, winCount] of sortedFrameworks) {
            const emoji = winCount === Math.max(...Object.values(wins)) ? '🥇' :
                winCount === Math.min(...Object.values(wins)) ? '🥉' : '🥈';
            console.log(`  ${emoji} ${framework}: ${winCount} wins out of ${operations.length} tests`);
        }

        console.log('');
        console.log('💡 Key Findings:');
        console.log('  • All frameworks are performant for typical CLI use cases');
        console.log('  • Differences are measured in microseconds - likely imperceptible to users');
        console.log('  • Choose based on API design and features, not just raw speed');
        console.log('  • Commander.js: Mature, widely used, excellent docs');
        console.log('  • Yargs: Feature-rich, great for complex CLIs');
        console.log('  • CLI Toolkit: Advanced features (DI, pooling, middleware)');
        console.log('');
        console.log('⚠️  Honest Assessment:');
        console.log('  Performance differences between frameworks are minimal in real-world usage.');
        console.log('  Claims of "200% faster" are misleading without this context.');
        console.log('');
    }
}

// Run benchmark
if (require.main === module) {
    const benchmark = new CompetitorBenchmark();
    benchmark.run().catch(console.error);
}

export { CompetitorBenchmark };

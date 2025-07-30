#!/usr/bin/env node

/**
 * Enhanced Build Script with Performance Analytics
 * Provides comprehensive build optimization and monitoring
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

class EnhancedBuildSystem {
    constructor() {
        this.distPath = path.join(process.cwd(), 'dist');
    }

    /**
     * Execute optimized build with performance monitoring
     */
    async build(options = {}) {
        console.log('🚀 Starting enhanced build process...\n');

        const startTime = performance.now();

        try {
            // Clean if requested
            if (options.clean) {
                await this.clean();
            }

            // Determine build configuration
            const configFile = options.production ? 'tsconfig.build.json' : 'tsconfig.json';
            let buildCommand = `npx tsc -p ${configFile}`;

            // Add build optimizations
            if (options.incremental) {
                buildCommand += ' --incremental';
            }

            if (options.projectRefs) {
                buildCommand += ' --build';
            }

            if (options.verbose) {
                buildCommand += ' --verbose';
            }

            if (options.watch) {
                buildCommand += ' --watch';
                console.log('👀 Starting watch mode...');
            }

            // Execute build
            console.log(`📦 Building with: ${buildCommand}`);

            if (options.watch) {
                // For watch mode, run in background
                console.log('Watch mode active. Press Ctrl+C to stop.');
                execSync(buildCommand, { stdio: 'inherit' });
            } else {
                // Regular build with output capture
                const output = execSync(buildCommand, {
                    encoding: 'utf8',
                    stdio: options.verbose ? 'inherit' : 'pipe'
                });

                if (!options.verbose && output) {
                    console.log('Build output:', output);
                }
            }

            // Performance analysis
            if (options.analyze && !options.watch) {
                console.log('\n📊 Analyzing build performance...');
                await this.performanceAnalysis(configFile);
            }

            const buildTime = (performance.now() - startTime) / 1000;
            console.log(`\n✅ Build completed in ${buildTime.toFixed(2)}s`);

        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    }

    /**
     * Clean build artifacts
     */
    async clean() {
        console.log('🧹 Cleaning build artifacts...');

        try {
            if (fs.existsSync(this.distPath)) {
                fs.rmSync(this.distPath, { recursive: true, force: true });
            }

            // Clean TypeScript build info files
            const buildInfoFiles = [
                '.tsbuildinfo',
                '.tsbuildinfo-core',
                '.tsbuildinfo-utils',
                '.tsbuildinfo-types'
            ];

            for (const file of buildInfoFiles) {
                const filePath = path.join(process.cwd(), file);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            console.log('✅ Clean completed');
        } catch (error) {
            console.warn('⚠️ Clean warning:', error);
        }
    }

    /**
     * Run comprehensive performance analysis
     */
    async performanceAnalysis(configFile) {
        try {
            // Import the build analyzer dynamically
            const { buildPerformanceAnalyzer } = await import('../dist/utils/build-performance-analyzer.js');

            const metrics = await buildPerformanceAnalyzer.measureCompilation(configFile);
            const analytics = await buildPerformanceAnalyzer.analyzeBuild(metrics);

            console.log(buildPerformanceAnalyzer.generateReport(analytics));

            // Generate optimization recommendations
            const history = buildPerformanceAnalyzer.loadBuildHistory();
            const recommendations = buildPerformanceAnalyzer.generateOptimizationRecommendations(metrics, history);

            if (recommendations.length > 0) {
                console.log('\n💡 Optimization Recommendations:');
                recommendations.forEach((rec, index) => {
                    console.log(`   ${index + 1}. ${rec}`);
                });
            }

            // Check for performance thresholds
            this.checkPerformanceThresholds(analytics.performance.optimizationScore);

        } catch (error) {
            console.warn('⚠️ Performance analysis failed:', error);
            console.warn('   Make sure to build the project first: npm run build');
        }
    }

    /**
     * Check if build meets performance thresholds
     */
    checkPerformanceThresholds(score) {
        console.log('\n🎯 Performance Thresholds:');

        if (score >= 90) {
            console.log('   ✅ Excellent performance (90+)');
        } else if (score >= 75) {
            console.log('   ✅ Good performance (75-89)');
        } else if (score >= 60) {
            console.log('   ⚠️ Acceptable performance (60-74)');
            console.log('   💡 Consider enabling incremental builds and project references');
        } else {
            console.log('   ❌ Poor performance (<60)');
            console.log('   🚨 Immediate optimization recommended');
        }
    }

    /**
     * Validate build environment
     */
    async validateEnvironment() {
        console.log('🔍 Validating build environment...');

        const checks = [
            { name: 'TypeScript compiler', command: 'npx tsc --version' },
            { name: 'Node.js version', command: 'node --version' },
            { name: 'npm version', command: 'npm --version' }
        ];

        let allValid = true;

        for (const check of checks) {
            try {
                const result = execSync(check.command, { encoding: 'utf8' }).trim();
                console.log(`   ✅ ${check.name}: ${result}`);
            } catch (error) {
                console.error(`   ❌ ${check.name}: Not available`);
                allValid = false;
            }
        }

        // Check for required configuration files
        const configs = ['tsconfig.json', 'package.json'];
        for (const config of configs) {
            if (fs.existsSync(config)) {
                console.log(`   ✅ ${config}: Found`);
            } else {
                console.error(`   ❌ ${config}: Missing`);
                allValid = false;
            }
        }

        return allValid;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const buildSystem = new EnhancedBuildSystem();

    // Parse command line options
    const options = {
        clean: args.includes('--clean') || args.includes('-c'),
        watch: args.includes('--watch') || args.includes('-w'),
        production: args.includes('--prod') || args.includes('-p'),
        analyze: args.includes('--analyze') || args.includes('-a'),
        incremental: args.includes('--incremental') || args.includes('-i'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        projectRefs: args.includes('--refs') || args.includes('-r')
    };

    // Handle special commands
    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        return;
    }

    if (args.includes('--validate')) {
        const isValid = await buildSystem.validateEnvironment();
        process.exit(isValid ? 0 : 1);
    }

    if (args.includes('--analyze-only')) {
        console.log('📊 Running performance analysis only...');
        const configFile = options.production ? 'tsconfig.build.json' : 'tsconfig.json';

        try {
            const { buildPerformanceAnalyzer } = await import('../dist/utils/build-performance-analyzer.js');
            const metrics = await buildPerformanceAnalyzer.measureCompilation(configFile);
            const analytics = await buildPerformanceAnalyzer.analyzeBuild(metrics);
            console.log(buildPerformanceAnalyzer.generateReport(analytics));
        } catch (error) {
            console.error('❌ Performance analysis failed:', error);
            console.error('   Make sure to build the project first: npm run build');
        }
        return;
    }

    // Validate environment before building
    const isValid = await buildSystem.validateEnvironment();
    if (!isValid) {
        console.error('\n❌ Environment validation failed. Please fix the issues above.');
        process.exit(1);
    }

    // Execute build
    await buildSystem.build(options);
}

function printHelp() {
    console.log(`
🚀 Enhanced Build System

Usage: node scripts/enhanced-build.mjs [options]

Options:
  -c, --clean        Clean build artifacts before building
  -w, --watch        Watch for file changes and rebuild
  -p, --prod         Use production configuration (tsconfig.build.json)
  -a, --analyze      Run performance analysis after build
  -i, --incremental  Enable incremental compilation
  -v, --verbose      Enable verbose output
  -r, --refs         Use project references (--build flag)
  -h, --help         Show this help message

Special Commands:
  --validate         Validate build environment only
  --analyze-only     Run performance analysis without building

Examples:
  node scripts/enhanced-build.mjs --clean --prod --analyze
  node scripts/enhanced-build.mjs --watch --incremental
  node scripts/enhanced-build.mjs --validate
    `);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Build system error:', error);
        process.exit(1);
    });
}

export { EnhancedBuildSystem };

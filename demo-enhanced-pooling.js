/**
 * Quick demonstration of Enhanced Object Pooling System
 */

const { ArgumentParser } = require('./dist/core/argument-parser');
const { ZeroCopyArgumentParser } = require('./dist/core/optimized-parser');
const { EnhancedPerformanceMonitor } = require('./dist/utils/enhanced-performance');
const { globalPoolManager } = require('./dist/core/advanced-object-pool');

async function demonstrateEnhancedPooling() {
    console.log('🚀 Enhanced Object Pooling System Demonstration\n');

    // Test enhanced argument parser pool
    console.log('📊 Testing Enhanced Argument Parser Pool...');
    const parser = new ArgumentParser();

    // Perform some parsing operations
    for (let i = 0; i < 1000; i++) {
        const result = await parser.parse(['test', '--verbose', 'file.txt']);
        // Pool automatically handles release in enhanced version
    }

    // Test zero-copy parser with advanced pooling
    console.log('\n⚡ Testing Zero-Copy Parser with Advanced Pooling...');
    const zcParser = new ZeroCopyArgumentParser();
    zcParser.addOption('verbose', 'boolean', (v) => v === 'true');

    for (let i = 0; i < 1000; i++) {
        const result = zcParser.parseSync(['command', '--verbose', 'arg1']);
        zcParser.release(result); // Explicit release to advanced pool
    }

    // Get comprehensive analytics
    console.log('\n📈 Pool Analytics Report:');
    console.log('='.repeat(50));
    console.log(globalPoolManager.getFullAnalyticsReport());

    console.log('\n📊 Enhanced Performance Report:');
    console.log('='.repeat(50));
    console.log(EnhancedPerformanceMonitor.getAnalyticsReport());

    console.log('\n✨ Enhanced Object Pooling Demonstration Complete! ✨');
}

// Run demonstration
demonstrateEnhancedPooling().catch(console.error);

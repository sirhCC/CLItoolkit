/**
 * Memory Management Examples for CLI Toolkit Framework
 * 
 * Demonstrates how to use the advanced memory management features:
 * - Weak Reference Caching
 * - Buffer Pooling
 * - Smart Garbage Collection
 * - Memory Optimization
 * 
 * @version 1.0.0
 * @author CLI Toolkit Framework Team
 */

import {
    globalMemoryManager,
    WeakReferenceCache,
    BufferPoolManager,
    SmartGarbageCollector,
    AdvancedMemoryManager,
    withBufferPooling,
    getOptimizedString,
    returnOptimizedString
} from '../utils/memory-manager';

// ====================
// EXAMPLE 1: BASIC MEMORY MANAGEMENT
// ====================

async function basicMemoryManagementExample(): Promise<void> {
    console.log('🧠 Basic Memory Management Example');
    console.log('=====================================');

    // Get current memory status
    const initialReport = globalMemoryManager.getMemoryReport();
    console.log('📊 Initial Memory Status:', {
        heapUsed: `${(initialReport.currentMetrics.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        memoryPressure: initialReport.memoryPressure.level,
        recommendations: initialReport.recommendations
    });

    // Use buffer pooling for string operations
    const buffer1 = globalMemoryManager.getStringBuffer(1024);
    const buffer2 = globalMemoryManager.getStringBuffer(2048);

    console.log('✅ Retrieved buffers from pool');
    console.log(`   Buffer 1 length: ${buffer1?.length || 0}`);
    console.log(`   Buffer 2 length: ${buffer2?.length || 0}`);

    // Return buffers when done
    if (buffer1) globalMemoryManager.returnStringBuffer(buffer1);
    if (buffer2) globalMemoryManager.returnStringBuffer(buffer2);

    console.log('✅ Returned buffers to pool');

    // Force memory optimization
    const optimization = await globalMemoryManager.optimizeMemory();
    console.log('🔧 Memory Optimization Results:', {
        success: optimization.success,
        actionsPerformed: optimization.actionsPerformed,
        memoryFreed: `${(optimization.memoryFreed / 1024 / 1024).toFixed(2)}MB`
    });

    console.log('');
}

// ====================
// EXAMPLE 2: WEAK REFERENCE CACHING
// ====================

function weakReferenceCachingExample(): void {
    console.log('🔗 Weak Reference Caching Example');
    console.log('==================================');

    // Create a weak cache for parsed command data
    const commandCache = new WeakReferenceCache<string, {
        name: string;
        args: string[];
        timestamp: number
    }>({
        maxAge: 60000, // 1 minute
        cleanupInterval: 10000 // 10 seconds
    });

    // Add some command objects
    const command1 = { name: 'build', args: ['--watch'], timestamp: Date.now() };
    const command2 = { name: 'test', args: ['--coverage'], timestamp: Date.now() };
    const command3 = { name: 'lint', args: ['--fix'], timestamp: Date.now() };

    commandCache.set('cmd1', command1);
    commandCache.set('cmd2', command2);
    commandCache.set('cmd3', command3);

    console.log('✅ Added 3 commands to weak cache');

    // Retrieve cached commands
    const cachedCommand1 = commandCache.get('cmd1');
    const cachedCommand2 = commandCache.get('cmd2');

    console.log('📦 Retrieved from cache:', {
        cmd1: cachedCommand1?.name,
        cmd2: cachedCommand2?.name,
        cacheStats: commandCache.getStats()
    });

    // Listen for cleanup events
    commandCache.on('cleanup', (key) => {
        console.log(`🧹 Cache cleanup: ${key} was garbage collected`);
    });

    commandCache.on('cleanup-cycle', (count) => {
        console.log(`🔄 Cleanup cycle completed: ${count} entries removed`);
    });

    // Simulate some time passing and cleanup
    setTimeout(() => {
        const finalStats = commandCache.getStats();
        console.log('📈 Final cache statistics:', finalStats);
        commandCache.destroy();
    }, 2000);

    console.log('');
}

// ====================
// EXAMPLE 3: BUFFER POOLING OPTIMIZATION
// ====================

function bufferPoolingExample(): void {
    console.log('🏊 Buffer Pooling Example');
    console.log('=========================');

    const bufferPool = new BufferPoolManager({
        maxBuffers: 100,
        maxBufferSize: 10240, // 10KB
        cleanupInterval: 5000
    });

    // Listen for pool events
    bufferPool.on('buffer-reused', (type, size) => {
        console.log(`♻️  Buffer reused: ${type} (${size} bytes)`);
    });

    bufferPool.on('buffer-created', (type, size) => {
        console.log(`🆕 New buffer created: ${type} (${size} bytes)`);
    });

    bufferPool.on('cleanup-performed', (count) => {
        console.log(`🧹 Buffer cleanup: ${count} buffers removed`);
    });

    // Simulate heavy string operations
    console.log('🔄 Performing string operations...');

    const operations = [];
    for (let i = 0; i < 50; i++) {
        const buffer = bufferPool.getStringBuffer(1024);
        operations.push(buffer);

        // Use the buffer for some operation
        const processedData = buffer.substring(0, 100) + `_processed_${i}`;

        // Return to pool after a short delay
        setTimeout(() => {
            bufferPool.returnStringBuffer(buffer);
        }, Math.random() * 1000);
    }

    // Show statistics after operations
    setTimeout(() => {
        const stats = bufferPool.getStats();
        console.log('📊 Buffer Pool Statistics:', {
            allocations: stats.allocations,
            hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
            poolSizes: stats.poolSizes
        });

        bufferPool.destroy();
    }, 2000);

    console.log('');
}

// ====================
// EXAMPLE 4: SMART GARBAGE COLLECTION
// ====================

function smartGarbageCollectionExample(): void {
    console.log('🗑️  Smart Garbage Collection Example');
    console.log('====================================');

    const gcManager = new SmartGarbageCollector({
        gcInterval: 5000, // 5 seconds
        memoryThresholds: {
            warning: 100,   // 100MB
            critical: 200   // 200MB
        }
    });

    // Listen for GC events
    gcManager.on('gc-completed', (data) => {
        console.log('🔄 Garbage collection completed:', {
            duration: `${data.duration}ms`,
            memoryFreed: `${(data.memoryFreed / 1024 / 1024).toFixed(2)}MB`,
            before: `${(data.beforeMetrics.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            after: `${(data.afterMetrics.heapUsed / 1024 / 1024).toFixed(2)}MB`
        });
    });

    gcManager.on('metrics-updated', (metrics) => {
        const heapUsedMB = (metrics.heapUsed / 1024 / 1024).toFixed(2);
        console.log(`📈 Memory update: ${heapUsedMB}MB heap used`);
    });

    // Analyze current memory pressure
    const pressure = gcManager.analyzeMemoryPressure();
    console.log('🌡️  Memory Pressure Analysis:', {
        level: pressure.level,
        percentage: `${pressure.percentage.toFixed(2)}%`,
        recommendation: pressure.recommendation
    });

    // Get memory trends
    const trends = gcManager.getMemoryTrends();
    console.log('📊 Memory Trends:', {
        averageHeapUsed: `${(trends.averageHeapUsed / 1024 / 1024).toFixed(2)}MB`,
        peakHeapUsed: `${(trends.peakHeapUsed / 1024 / 1024).toFixed(2)}MB`,
        growthRate: `${(trends.memoryGrowthRate / 1024).toFixed(2)}KB/s`,
        gcRecommended: trends.gcRecommended
    });

    // Force garbage collection if recommended
    if (trends.gcRecommended) {
        console.log('⚡ Forcing garbage collection...');
        gcManager.forceGarbageCollection();
    }

    // Clean up after demo
    setTimeout(() => {
        gcManager.destroy();
        console.log('✅ GC manager destroyed');
    }, 10000);

    console.log('');
}

// ====================
// EXAMPLE 5: COMPREHENSIVE MEMORY OPTIMIZATION
// ====================

async function comprehensiveMemoryOptimizationExample(): Promise<void> {
    console.log('🚀 Comprehensive Memory Optimization Example');
    console.log('============================================');

    // Create a custom memory manager with specific settings
    const customMemoryManager = new AdvancedMemoryManager({
        enableWeakReferences: true,
        enableGcHints: true,
        enableBufferPooling: true,
        memoryThresholds: {
            warning: 256,   // 256MB
            critical: 512   // 512MB
        },
        gcInterval: 15000,     // 15 seconds
        metricsInterval: 5000  // 5 seconds
    });

    // Listen for memory events
    customMemoryManager.on('memory-report', (report) => {
        console.log('📊 Memory Report:', {
            heapUsed: `${(report.currentMetrics.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            pressure: report.memoryPressure.level,
            recommendations: report.recommendations.length
        });
    });

    customMemoryManager.on('gc-completed', (data) => {
        console.log(`🔄 Auto-GC freed ${(data.memoryFreed / 1024 / 1024).toFixed(2)}MB`);
    });

    customMemoryManager.on('weak-cache-cleanup', (key) => {
        console.log(`🧹 Weak cache cleaned up: ${key}`);
    });

    customMemoryManager.on('buffer-reused', (type, size) => {
        console.log(`♻️  Buffer reused: ${type} (${size} bytes)`);
    });

    // Simulate heavy memory usage
    console.log('🔄 Simulating heavy memory operations...');

    const heavyObjects: any[] = [];
    for (let i = 0; i < 100; i++) {
        const obj = {
            id: i,
            data: new Array(1000).fill(`heavy_data_${i}`),
            timestamp: Date.now()
        };

        // Store in weak cache
        customMemoryManager.setWeakCached(`obj_${i}`, obj);
        heavyObjects.push(obj);

        // Use buffer pooling
        const buffer = customMemoryManager.getStringBuffer(2048);
        if (buffer) {
            // Simulate processing
            setTimeout(() => {
                customMemoryManager.returnStringBuffer(buffer);
            }, Math.random() * 1000);
        }
    }

    // Get comprehensive report
    setTimeout(async () => {
        const report = customMemoryManager.getMemoryReport();
        console.log('📈 Comprehensive Memory Report:', {
            currentMemory: `${(report.currentMetrics.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            pressure: report.memoryPressure,
            trends: {
                growthRate: `${(report.memoryTrends.memoryGrowthRate / 1024).toFixed(2)}KB/s`,
                gcRecommended: report.memoryTrends.gcRecommended
            },
            weakCache: report.weakCacheStats,
            bufferPool: report.bufferPoolStats,
            recommendations: report.recommendations
        });

        // Perform optimization
        console.log('🔧 Performing memory optimization...');
        const optimization = await customMemoryManager.optimizeMemory();
        console.log('✅ Optimization completed:', {
            success: optimization.success,
            actionsPerformed: optimization.actionsPerformed,
            memoryFreed: `${(optimization.memoryFreed / 1024 / 1024).toFixed(2)}MB`
        });

        // Clean up
        customMemoryManager.destroy();
        console.log('🧹 Custom memory manager destroyed');
    }, 5000);

    console.log('');
}

// ====================
// EXAMPLE 6: DECORATOR USAGE
// ====================

class ExampleStringProcessor {
    @withBufferPooling
    processLargeString(input: string): string {
        console.log('🔄 Processing large string with buffer pooling...');

        // Simulate heavy string processing
        let result = '';
        for (let i = 0; i < 1000; i++) {
            result += `${input}_processed_${i}_`;
        }

        return result;
    }

    demonstrateDecorator(): void {
        console.log('🎭 Buffer Pooling Decorator Example');
        console.log('===================================');

        const input = 'test_string';
        const processed = this.processLargeString(input);

        console.log('✅ String processed with automatic buffer management');
        console.log(`   Input length: ${input.length}`);
        console.log(`   Output length: ${processed.length}`);
        console.log('   Buffer automatically returned to pool');
        console.log('');
    }
}

// ====================
// EXAMPLE 7: UTILITY FUNCTIONS
// ====================

function utilityFunctionsExample(): void {
    console.log('🛠️  Utility Functions Example');
    console.log('=============================');

    // Get optimized string
    const optimizedString = getOptimizedString(1024);
    console.log('✅ Got optimized string:', {
        length: optimizedString.length,
        fromPool: optimizedString.length >= 256
    });

    // Use the string for operations
    const processedString = optimizedString.substring(0, 100) + '_processed';
    console.log('🔄 Processed string:', processedString.length);

    // Return to pool
    returnOptimizedString(optimizedString);
    console.log('♻️  Returned string to pool');

    // Use with ArrayBuffers
    const arrayBuffer = globalMemoryManager.getArrayBuffer(4096);
    if (arrayBuffer) {
        console.log('✅ Got ArrayBuffer from pool:', arrayBuffer.byteLength);

        // Simulate usage
        const view = new Uint8Array(arrayBuffer);
        view.fill(42); // Use the buffer

        globalMemoryManager.returnArrayBuffer(arrayBuffer);
        console.log('♻️  Returned ArrayBuffer to pool');
    }

    console.log('');
}

// ====================
// EXAMPLE 8: REAL-WORLD CLI ARGUMENT PROCESSING
// ====================

function realWorldCliExample(): void {
    console.log('🖥️  Real-World CLI Processing Example');
    console.log('====================================');

    // Simulate CLI argument processing with memory optimization
    const argumentCache = new WeakReferenceCache<string, {
        parsed: any;
        validated: boolean;
        timestamp: number;
    }>();

    function processCliArguments(args: string[]): any {
        const cacheKey = args.join('|');

        // Check cache first
        const cached = argumentCache.get(cacheKey);
        if (cached) {
            console.log('🎯 Cache hit for arguments:', args.slice(0, 3));
            return cached.parsed;
        }

        // Use buffer pooling for string operations
        const workBuffer = globalMemoryManager.getStringBuffer(args.join(' ').length * 2);

        if (workBuffer) {
            // Simulate parsing (using buffer for intermediate operations)
            const parsed = {
                command: args[0],
                flags: args.filter(arg => arg.startsWith('--')),
                options: args.filter(arg => arg.includes('=')),
                positional: args.filter(arg => !arg.startsWith('-') && !arg.includes('='))
            };

            // Cache the result
            const cacheEntry = {
                parsed,
                validated: true,
                timestamp: Date.now()
            };
            argumentCache.set(cacheKey, cacheEntry);

            // Return buffer to pool
            globalMemoryManager.returnStringBuffer(workBuffer);

            console.log('✅ Processed and cached arguments:', {
                command: parsed.command,
                flags: parsed.flags.length,
                options: parsed.options.length
            });

            return parsed;
        }

        return null;
    }

    // Process different argument sets
    const testArguments = [
        ['build', '--watch', '--mode=production', 'src/index.ts'],
        ['test', '--coverage', '--reporter=json'],
        ['lint', '--fix', '--format=stylish', 'src/**/*.ts'],
        ['build', '--watch', '--mode=production', 'src/index.ts'] // Duplicate for cache demo
    ];

    testArguments.forEach((args, index) => {
        console.log(`\n🔄 Processing argument set ${index + 1}:`);
        const result = processCliArguments(args);
        if (result) {
            console.log('   Result:', {
                command: result.command,
                totalArgs: Object.values(result).flat().length
            });
        }
    });

    // Show cache statistics
    setTimeout(() => {
        const stats = argumentCache.getStats();
        console.log('\n📊 Final Argument Cache Stats:', {
            totalEntries: stats.size,
            activeReferences: stats.activeReferences,
            hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
            averageAge: `${(stats.averageAge / 1000).toFixed(2)}s`
        });

        argumentCache.destroy();
    }, 1000);

    console.log('');
}

// ====================
// MAIN DEMO FUNCTION
// ====================

async function runAllMemoryManagementExamples(): Promise<void> {
    console.log('🧠 CLI Toolkit Framework - Memory Management Examples');
    console.log('=====================================================');
    console.log('');

    try {
        // Run all examples in sequence
        await basicMemoryManagementExample();
        weakReferenceCachingExample();
        bufferPoolingExample();
        smartGarbageCollectionExample();
        await comprehensiveMemoryOptimizationExample();

        const processor = new ExampleStringProcessor();
        processor.demonstrateDecorator();

        utilityFunctionsExample();
        realWorldCliExample();

        console.log('🎉 All memory management examples completed successfully!');
        console.log('');

        // Final memory report
        const finalReport = globalMemoryManager.getMemoryReport();
        console.log('📋 Final System Memory Report:');
        console.log('==============================');
        console.log('Memory Usage:', `${(finalReport.currentMetrics.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        console.log('Pressure Level:', finalReport.memoryPressure.level);
        console.log('Recommendations:', finalReport.recommendations);

    } catch (error) {
        console.error('❌ Error running memory management examples:', error);
    }
}

// Export all example functions
export {
    runAllMemoryManagementExamples,
    ExampleStringProcessor
};

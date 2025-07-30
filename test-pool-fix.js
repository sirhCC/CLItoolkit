// Quick test to verify object pool fix
const { AdvancedObjectPool } = require('./dist/src/core/advanced-object-pool.js');

console.log('🧪 Testing Object Pool Fix...\n');

try {
    const pool = new AdvancedObjectPool(() => ({ id: Math.random() }), {
        minSize: 0,
        maxSize: 50,
        metricsEnabled: false  // Disable console spam for test
    });

    console.log('✅ Pool created successfully');
    console.log('Initial pool size:', pool.getMetrics().size);

    // Test the scenario that was causing infinite loops
    const obj1 = pool.acquire();
    console.log('✅ First acquire successful, pool size:', pool.getMetrics().size);

    const obj2 = pool.acquire();
    console.log('✅ Second acquire successful, pool size:', pool.getMetrics().size);

    // Release objects
    pool.release(obj1);
    pool.release(obj2);
    console.log('✅ Objects released, pool size:', pool.getMetrics().size);

    console.log('\n🎉 Object Pool fix verified - no infinite loops!');

} catch (error) {
    console.error('❌ Test failed:', error.message);
}

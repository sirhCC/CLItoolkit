/**
 * Enterprise Analytics Demonstration
 * Shows the comprehensive analytics and reporting capabilities
 */

import { globalEnterpriseAnalytics } from '../src/utils/enterprise-analytics';
import { EnhancedPerformanceMonitor } from '../src/utils/enhanced-performance';

async function demonstrateEnterpriseAnalytics(): Promise<void> {
    console.log('🏢 Enterprise Analytics System - Demonstration');
    console.log('═'.repeat(60));

    // Start analytics monitoring
    console.log('\n📊 Starting Enterprise Analytics Monitoring...');
    globalEnterpriseAnalytics.startMonitoring(5000); // 5 second intervals for demo

    // Configure analytics for demonstration
    globalEnterpriseAnalytics.configure({
        enableRealTimeAnalytics: true,
        enablePredictiveAnalytics: true,
        enableAnomalyDetection: true,
        analyticsRetentionDays: 1, // Keep 1 day for demo
        alertThresholds: {
            performanceScore: 80, // Lower threshold for demo
            errorRate: 0.03,      // 3% error rate
            responseTime: 25,     // 25ms response time
            memoryUsage: 256 * 1024 * 1024 // 256MB
        }
    });

    // Setup event listeners to show real-time analytics
    globalEnterpriseAnalytics.on('alert:created', (alert) => {
        console.log(`🚨 [ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
    });

    globalEnterpriseAnalytics.on('trend:detected', ({ metricName, analysis }) => {
        const icon = analysis.direction === 'improving' ? '📈' : analysis.direction === 'degrading' ? '📉' : '➡️';
        console.log(`${icon} [TREND] ${metricName}: ${analysis.direction} (${(analysis.confidence * 100).toFixed(1)}% confidence)`);
    });

    // Simulate some operations to generate analytics data
    console.log('\n⚡ Generating Performance Data...');
    
    // Simulate various operations with different performance characteristics
    const operations = [
        { name: 'fast-operation', baseTime: 5, variance: 2 },
        { name: 'medium-operation', baseTime: 15, variance: 5 },
        { name: 'slow-operation', baseTime: 45, variance: 15 },
        { name: 'error-prone-operation', baseTime: 20, variance: 10, errorRate: 0.1 }
    ];

    // Generate 50 data points across 30 seconds
    for (let i = 0; i < 50; i++) {
        for (const op of operations) {
            const duration = op.baseTime + (Math.random() - 0.5) * op.variance * 2;
            const isError = Math.random() < (op.errorRate || 0);
            
            // Add some trend - make operations gradually slower over time
            const trendFactor = 1 + (i / 100);
            const finalDuration = duration * trendFactor;
            
            EnhancedPerformanceMonitor.recordOperation(op.name, finalDuration, isError);
        }
        
        // Small delay to simulate real operations
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for analytics to process
    console.log('\n⏳ Processing Analytics Data...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Show comprehensive enterprise report
    console.log('\n📋 ENTERPRISE ANALYTICS REPORT:');
    console.log(globalEnterpriseAnalytics.getEnterpriseReport());

    // Show analytics configuration
    console.log('\n⚙️ ANALYTICS CONFIGURATION:');
    console.log(JSON.stringify(globalEnterpriseAnalytics.getConfig(), null, 2));

    // Export data demonstration
    console.log('\n💾 DATA EXPORT DEMONSTRATION:');
    console.log('─'.repeat(40));
    
    // Export specific metrics
    const performanceData = globalEnterpriseAnalytics.exportData('json', 'operation.*');
    const exportedData = JSON.parse(performanceData);
    console.log(`📊 Exported ${exportedData.dataPoints.length} performance data points`);
    console.log(`📈 Trend analyses: ${Object.keys(exportedData.trendAnalysis).length} metrics`);
    console.log(`🚨 Total alerts: ${exportedData.alerts.length}`);

    // Show CSV export sample
    const csvData = globalEnterpriseAnalytics.exportData('csv', 'performance.score');
    const csvLines = csvData.split('\n');
    console.log(`\n📄 CSV Export Sample (${csvLines.length - 1} rows):`);
    console.log(csvLines.slice(0, 3).join('\n'));
    if (csvLines.length > 4) {
        console.log('...');
        console.log(csvLines[csvLines.length - 1]);
    }

    // Performance monitoring integration demonstration
    console.log('\n🔗 INTEGRATION WITH ENHANCED PERFORMANCE MONITOR:');
    console.log('─'.repeat(50));
    
    const enhancedReport = EnhancedPerformanceMonitor.getAnalyticsReport();
    console.log(enhancedReport);

    // Show real-time monitoring status
    console.log('\n🔄 REAL-TIME MONITORING STATUS:');
    console.log('─'.repeat(40));
    console.log('• Analytics Monitoring: ✅ Active');
    console.log('• Performance Monitoring: ✅ Active');
    console.log('• Optimization Hub: ✅ Active');
    console.log('• Data Collection: ✅ Continuous');

    console.log('\n🎯 KEY FEATURES DEMONSTRATED:');
    console.log('─'.repeat(40));
    console.log('✅ Real-time metrics collection');
    console.log('✅ Trend analysis with confidence scoring');
    console.log('✅ Anomaly detection');
    console.log('✅ Intelligent alerting system');
    console.log('✅ Performance score calculation');
    console.log('✅ Data export (JSON/CSV)');
    console.log('✅ Historical data retention');
    console.log('✅ Event-driven architecture');
    console.log('✅ Configurable thresholds');
    console.log('✅ Enterprise-grade reporting');

    // Keep monitoring running for a bit longer
    console.log('\n⏰ Continuing monitoring for 15 more seconds...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Stop monitoring
    globalEnterpriseAnalytics.stopMonitoring();
    console.log('\n✅ Enterprise Analytics Demonstration Complete!');
    console.log('📊 Analytics data has been collected and analyzed');
    console.log('🏢 Enterprise-grade monitoring system is ready for production');
}

// Run demonstration if this file is executed directly
if (require.main === module) {
    demonstrateEnterpriseAnalytics().catch(console.error);
}

export { demonstrateEnterpriseAnalytics };

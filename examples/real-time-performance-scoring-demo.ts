/**
 * Real-Time Performance Scoring Demonstration
 * Shows the comprehensive real-time performance scoring capabilities
 */

import { globalPerformanceScorer } from '../src/utils/real-time-performance-scorer';
import { EnhancedPerformanceMonitor } from '../src/utils/enhanced-performance';
import { globalEnterpriseAnalytics } from '../src/utils/enterprise-analytics';

async function demonstrateRealTimePerformanceScoring(): Promise<void> {
    console.log('🎯 Real-Time Performance Scoring System - Demonstration');
    console.log('═'.repeat(70));

    // Configure scoring criteria for demonstration
    globalPerformanceScorer.configureCriteria({
        operationTime: {
            excellent: 3,      // Very strict for demo
            good: 15,
            weight: 0.35
        },
        errorRate: {
            excellent: 0.005,  // 0.5% for excellent
            acceptable: 0.03,  // 3% acceptable
            weight: 0.25
        }
    });

    // Setup event listeners for real-time monitoring
    globalPerformanceScorer.on('score:calculated', (score) => {
        const levelIcon = score.level === 'EXCEPTIONAL' ? '🌟' :
            score.level === 'EXCELLENT' ? '✨' :
                score.level === 'GOOD' ? '👍' :
                    score.level === 'FAIR' ? '⚠️' :
                        score.level === 'POOR' ? '💔' : '🚨';

        console.log(`📊 [SCORE] ${score.overall}/100 ${levelIcon} ${score.level} (${new Date(score.timestamp).toLocaleTimeString()})`);

        // Show component breakdown for interesting scores
        if (score.overall < 80 || score.level === 'EXCEPTIONAL') {
            console.log(`   🔍 Components: OP:${score.components.operationPerformance} ERR:${score.components.errorHandling} POOL:${score.components.poolEfficiency} MEM:${score.components.memoryManagement} SYS:${score.components.systemStability}`);
        }
    });

    globalPerformanceScorer.on('optimization:needed', (score) => {
        console.log(`🚨 [AUTO-OPT] Optimization triggered! Score: ${score.overall}/100`);
        console.log(`   Actions: ${score.triggers.autoTuneActions.join(', ')}`);
    });

    globalPerformanceScorer.on('alert:performance', (alert) => {
        const alertIcon = alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : '🔵';
        console.log(`${alertIcon} [ALERT] ${alert.message}`);
    });

    // Start real-time scoring
    console.log('\n🚀 Starting Real-Time Performance Scoring...');
    globalPerformanceScorer.startScoring(3000); // 3 second intervals for demo

    // Start enterprise analytics for correlation
    globalEnterpriseAnalytics.startMonitoring(4000);

    console.log('\n⚡ Simulating Performance Scenarios...');
    console.log('─'.repeat(50));

    // Scenario 1: Excellent Performance Phase
    console.log('\n🌟 Phase 1: Excellent Performance (10 seconds)');
    for (let i = 0; i < 20; i++) {
        // Fast operations with no errors
        EnhancedPerformanceMonitor.recordOperation('fast-operation', 1.5 + Math.random() * 2, false);
        EnhancedPerformanceMonitor.recordOperation('efficient-task', 2.8 + Math.random() * 1.5, false);

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Show intermediate dashboard
    console.log('\n📊 PERFORMANCE DASHBOARD (Phase 1):');
    const dashboard1 = globalPerformanceScorer.getDashboardData();
    if (dashboard1.current) {
        console.log(`   Current: ${dashboard1.current.overall}/100 (${dashboard1.current.level})`);
        console.log(`   Trend: Short=${dashboard1.current.trends.shortTerm}, Medium=${dashboard1.current.trends.mediumTerm}`);
        console.log(`   Averages: 10-sample=${dashboard1.averages.last10.toFixed(1)}, Overall=${dashboard1.averages.overall.toFixed(1)}`);
    }

    // Scenario 2: Performance Degradation
    console.log('\n📉 Phase 2: Performance Degradation (8 seconds)');
    for (let i = 0; i < 16; i++) {
        // Gradually slower operations with some errors
        const baseTime = 8 + (i * 2); // Getting slower over time
        const hasError = Math.random() < 0.15; // 15% error rate

        EnhancedPerformanceMonitor.recordOperation('degrading-operation', baseTime, hasError);
        EnhancedPerformanceMonitor.recordOperation('unstable-task', baseTime * 1.2, hasError);

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Scenario 3: Critical Performance Issues
    console.log('\n🚨 Phase 3: Critical Performance Issues (6 seconds)');
    for (let i = 0; i < 12; i++) {
        // Very slow operations with high error rates
        const slowTime = 80 + Math.random() * 40; // Very slow
        const hasError = Math.random() < 0.4; // 40% error rate

        EnhancedPerformanceMonitor.recordOperation('critical-operation', slowTime, hasError);
        EnhancedPerformanceMonitor.recordOperation('failing-task', slowTime * 1.5, true); // Always fails

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Scenario 4: Recovery Phase
    console.log('\n🔄 Phase 4: Performance Recovery (8 seconds)');
    for (let i = 0; i < 16; i++) {
        // Gradually improving performance
        const improvingTime = 40 - (i * 2); // Getting faster
        const errorRate = Math.max(0.05, 0.3 - (i * 0.02)); // Decreasing errors

        EnhancedPerformanceMonitor.recordOperation('recovering-operation', Math.max(2, improvingTime), Math.random() < errorRate);
        EnhancedPerformanceMonitor.recordOperation('stabilizing-task', Math.max(1.5, improvingTime * 0.8), false);

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Wait for final scoring cycles
    console.log('\n⏳ Processing Final Performance Data...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Show comprehensive results
    console.log('\n📋 COMPREHENSIVE PERFORMANCE REPORT:');
    console.log('═'.repeat(70));
    const finalReport = globalPerformanceScorer.getPerformanceReport();
    console.log(finalReport);

    // Show dashboard summary
    console.log('\n📊 FINAL DASHBOARD SUMMARY:');
    console.log('─'.repeat(50));
    const finalDashboard = globalPerformanceScorer.getDashboardData();
    console.log(`📈 Performance Journey:`);
    console.log(`   Current Score: ${finalDashboard.current?.overall || 'N/A'}/100`);
    console.log(`   Best Performance: ${Math.max(...globalPerformanceScorer.getScoreHistory().map(s => s.overall))}/100`);
    console.log(`   Worst Performance: ${Math.min(...globalPerformanceScorer.getScoreHistory().map(s => s.overall))}/100`);
    console.log(`   Total Scores Calculated: ${globalPerformanceScorer.getScoreHistory().length}`);
    console.log(`   Active Alerts: ${finalDashboard.activeAlerts}`);

    // Show score history trend
    console.log('\n📈 SCORE HISTORY TREND (Last 10):');
    const recentScores = globalPerformanceScorer.getScoreHistory(10);
    const scoreTrend = recentScores.map(s => {
        const bar = '█'.repeat(Math.floor(s.overall / 10));
        const level = s.level.substring(0, 3);
        return `   ${s.overall.toString().padStart(3)}/100 ${bar.padEnd(10)} ${level}`;
    }).join('\n');
    console.log(scoreTrend);

    // Integration demonstration
    console.log('\n🔗 INTEGRATION WITH ENTERPRISE ANALYTICS:');
    console.log('─'.repeat(50));
    const analyticsReport = globalEnterpriseAnalytics.getEnterpriseReport();
    console.log(analyticsReport);

    // Configuration demonstration
    console.log('\n⚙️ CURRENT SCORING CONFIGURATION:');
    console.log('─'.repeat(50));
    const criteria = globalPerformanceScorer.getScoringCriteria();
    console.log(`Operation Time: Excellent<${criteria.operationTime.excellent}ms, Good<${criteria.operationTime.good}ms (Weight: ${criteria.operationTime.weight})`);
    console.log(`Error Rate: Excellent<${(criteria.errorRate.excellent * 100).toFixed(1)}%, Acceptable<${(criteria.errorRate.acceptable * 100).toFixed(1)}% (Weight: ${criteria.errorRate.weight})`);
    console.log(`Pool Efficiency: Excellent>${(criteria.poolEfficiency.excellent * 100).toFixed(0)}%, Good>${(criteria.poolEfficiency.good * 100).toFixed(0)}% (Weight: ${criteria.poolEfficiency.weight})`);
    console.log(`Memory Usage: Excellent<${criteria.memoryUsage.excellent}MB, Acceptable<${criteria.memoryUsage.acceptable}MB (Weight: ${criteria.memoryUsage.weight})`);

    // Cleanup
    globalPerformanceScorer.stopScoring();
    globalEnterpriseAnalytics.stopMonitoring();

    console.log('\n✅ Real-Time Performance Scoring Demonstration Complete!');
    console.log('\n🎯 KEY FEATURES DEMONSTRATED:');
    console.log('─'.repeat(50));
    console.log('✅ Real-time performance scoring (0-100)');
    console.log('✅ Component-based score breakdown');
    console.log('✅ Performance level classification');
    console.log('✅ Trend analysis (short & medium term)');
    console.log('✅ Automatic optimization triggers');
    console.log('✅ Intelligent recommendations');
    console.log('✅ Alert system with severity levels');
    console.log('✅ Configurable scoring criteria');
    console.log('✅ Real-time event system');
    console.log('✅ Dashboard data for monitoring');
    console.log('✅ Comprehensive reporting');
    console.log('✅ Enterprise analytics integration');
    console.log('✅ Performance history tracking');

    console.log('\n🏆 ENTERPRISE-GRADE REAL-TIME PERFORMANCE SCORING READY! 🎉');
}

// Run demonstration if this file is executed directly
if (require.main === module) {
    demonstrateRealTimePerformanceScoring().catch(console.error);
}

export { demonstrateRealTimePerformanceScoring };

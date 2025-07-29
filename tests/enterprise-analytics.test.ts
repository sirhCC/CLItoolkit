/**
 * Enterprise Analytics System Tests
 */

import { EnterpriseAnalytics, globalEnterpriseAnalytics } from '../src/utils/enterprise-analytics';
import { EnhancedPerformanceMonitor } from '../src/utils/enhanced-performance';

describe('EnterpriseAnalytics', () => {
    let analytics: EnterpriseAnalytics;

    beforeEach(() => {
        analytics = EnterpriseAnalytics.getInstance();
        analytics.configure({
            enableRealTimeAnalytics: true,
            enablePredictiveAnalytics: true,
            enableAnomalyDetection: true,
            analyticsRetentionDays: 1,
            aggregationIntervals: [60000], // 1 minute for testing
            alertThresholds: {
                performanceScore: 70,
                errorRate: 0.05,
                responseTime: 50,
                memoryUsage: 256 * 1024 * 1024
            }
        });
        
        // Clear any existing data
        EnhancedPerformanceMonitor.clear();
    });

    afterEach(() => {
        analytics.stopMonitoring();
    });

    describe('Basic Functionality', () => {
        test('should start and stop monitoring', () => {
            expect(() => analytics.startMonitoring(1000)).not.toThrow();
            expect(() => analytics.stopMonitoring()).not.toThrow();
        });

        test('should be a singleton', () => {
            const instance1 = EnterpriseAnalytics.getInstance();
            const instance2 = EnterpriseAnalytics.getInstance();
            expect(instance1).toBe(instance2);
        });

        test('should export the global instance', () => {
            expect(globalEnterpriseAnalytics).toBeInstanceOf(EnterpriseAnalytics);
            expect(globalEnterpriseAnalytics).toBe(EnterpriseAnalytics.getInstance());
        });
    });

    describe('Configuration Management', () => {
        test('should update configuration', () => {
            const newConfig = {
                enableRealTimeAnalytics: false,
                analyticsRetentionDays: 7
            };

            analytics.configure(newConfig);
            const config = analytics.getConfig();

            expect(config.enableRealTimeAnalytics).toBe(false);
            expect(config.analyticsRetentionDays).toBe(7);
        });

        test('should retain other config values when partially updating', () => {
            const originalConfig = analytics.getConfig();
            
            analytics.configure({ analyticsRetentionDays: 14 });
            const updatedConfig = analytics.getConfig();

            expect(updatedConfig.analyticsRetentionDays).toBe(14);
            expect(updatedConfig.enablePredictiveAnalytics).toBe(originalConfig.enablePredictiveAnalytics);
        });
    });

    describe('Data Collection and Analysis', () => {
        test('should collect performance metrics', (done) => {
            analytics.startMonitoring(500); // 500ms for quick testing

            // Generate some performance data
            EnhancedPerformanceMonitor.recordOperation('test-operation', 25, false);
            EnhancedPerformanceMonitor.recordOperation('test-operation', 30, false);
            EnhancedPerformanceMonitor.recordOperation('slow-operation', 75, false);

            // Listen for data collection
            analytics.on('datapoint:recorded', (dataPoint) => {
                expect(dataPoint).toHaveProperty('timestamp');
                expect(dataPoint).toHaveProperty('metricName');
                expect(dataPoint).toHaveProperty('value');
                expect(dataPoint).toHaveProperty('tags');
                
                if (dataPoint.metricName.includes('test-operation')) {
                    analytics.stopMonitoring();
                    done();
                }
            });
        }, 10000);

        test('should generate enterprise report', () => {
            // Add some test data
            EnhancedPerformanceMonitor.recordOperation('report-test', 15, false);
            EnhancedPerformanceMonitor.recordOperation('report-test', 20, false);
            
            const report = analytics.getEnterpriseReport();
            
            expect(report).toContain('ENTERPRISE ANALYTICS REPORT');
            expect(report).toContain('PERFORMANCE OVERVIEW');
            expect(report).toContain('TREND ANALYSIS');
            expect(report).toContain('ACTIVE ALERTS');
            expect(typeof report).toBe('string');
            expect(report.length).toBeGreaterThan(100);
        });
    });

    describe('Data Export', () => {
        test('should export data in JSON format', () => {
            // Add some test data
            EnhancedPerformanceMonitor.recordOperation('export-test', 10, false);
            
            const jsonData = analytics.exportData('json');
            const parsed = JSON.parse(jsonData);
            
            expect(parsed).toHaveProperty('exportTime');
            expect(parsed).toHaveProperty('dataPoints');
            expect(parsed).toHaveProperty('trendAnalysis');
            expect(parsed).toHaveProperty('alerts');
            expect(parsed).toHaveProperty('config');
            expect(Array.isArray(parsed.dataPoints)).toBe(true);
        });

        test('should export data in CSV format', () => {
            // Add some test data
            EnhancedPerformanceMonitor.recordOperation('csv-test', 15, false);
            
            const csvData = analytics.exportData('csv');
            
            expect(csvData).toContain('timestamp,metricName,value,tags');
            expect(typeof csvData).toBe('string');
            
            const lines = csvData.split('\n');
            expect(lines.length).toBeGreaterThan(1); // At least header + data
        });

        test('should filter exported data by metric pattern', () => {
            // Add test data with different patterns
            EnhancedPerformanceMonitor.recordOperation('filter-test-1', 10, false);
            EnhancedPerformanceMonitor.recordOperation('other-operation', 20, false);
            
            const filteredData = analytics.exportData('json', 'operation.filter-test-1.*');
            const parsed = JSON.parse(filteredData);
            
            const filteredPoints = parsed.dataPoints.filter((dp: any) => 
                dp.metricName.includes('filter-test-1')
            );
            
            expect(filteredPoints.length).toBeGreaterThan(0);
        });
    });

    describe('Event System', () => {
        test('should emit events for configuration updates', (done) => {
            analytics.on('config:updated', (config) => {
                expect(config).toHaveProperty('enableRealTimeAnalytics');
                expect(config.analyticsRetentionDays).toBe(5);
                done();
            });

            analytics.configure({ analyticsRetentionDays: 5 });
        });

        test('should emit events when monitoring starts and stops', (done) => {
            let eventsReceived = 0;

            analytics.on('monitoring:started', (data) => {
                expect(data).toHaveProperty('interval');
                eventsReceived++;
                analytics.stopMonitoring();
            });

            analytics.on('monitoring:stopped', () => {
                eventsReceived++;
                expect(eventsReceived).toBe(2);
                done();
            });

            analytics.startMonitoring(1000);
        });
    });

    describe('Alert System', () => {
        test('should create alerts for poor performance', (done) => {
            analytics.configure({
                alertThresholds: {
                    performanceScore: 95, // Very high threshold to trigger alert
                    errorRate: 0.01,
                    responseTime: 5,
                    memoryUsage: 1024 * 1024 // 1MB - very low to trigger alert
                }
            });

            analytics.on('alert:created', (alert) => {
                expect(alert).toHaveProperty('timestamp');
                expect(alert).toHaveProperty('severity');
                expect(alert).toHaveProperty('message');
                expect(alert).toHaveProperty('resolved');
                expect(alert.resolved).toBe(false);
                done();
            });

            analytics.startMonitoring(100);
            
            // Generate operations that should trigger alerts
            EnhancedPerformanceMonitor.recordOperation('slow-test', 50, false);
        }, 5000);
    });

    describe('Trend Analysis', () => {
        test('should detect performance trends', (done) => {
            analytics.configure({
                enablePredictiveAnalytics: true
            });

            analytics.on('trend:detected', ({ metricName, analysis }) => {
                expect(metricName).toBeTruthy();
                expect(analysis).toHaveProperty('direction');
                expect(analysis).toHaveProperty('confidence');
                expect(analysis).toHaveProperty('slope');
                expect(analysis).toHaveProperty('rSquared');
                expect(analysis.confidence).toBeGreaterThan(0);
                expect(analysis.confidence).toBeLessThanOrEqual(1);
                done();
            });

            analytics.startMonitoring(200);

            // Generate trending data (gradually increasing times)
            setTimeout(() => {
                for (let i = 0; i < 10; i++) {
                    EnhancedPerformanceMonitor.recordOperation('trend-test', 10 + i * 2, false);
                }
            }, 300);
        }, 8000);
    });

    describe('Integration with Performance Monitor', () => {
        test('should integrate with EnhancedPerformanceMonitor', () => {
            // Record some operations
            EnhancedPerformanceMonitor.recordOperation('integration-test', 25, false);
            EnhancedPerformanceMonitor.recordOperation('integration-test', 30, true); // with error
            
            const metrics = EnhancedPerformanceMonitor.getMetrics();
            expect(metrics.operations['integration-test']).toBeDefined();
            expect(metrics.operations['integration-test'].count).toBe(2);
            expect(metrics.operations['integration-test'].errorCount).toBe(1);
            
            // The enterprise analytics should be able to read this data
            const report = analytics.getEnterpriseReport();
            expect(report).toContain('ENTERPRISE ANALYTICS REPORT');
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid configuration gracefully', () => {
            expect(() => {
                analytics.configure({
                    analyticsRetentionDays: -1, // Invalid value
                    alertThresholds: {
                        performanceScore: 150, // Invalid range
                        errorRate: -0.1,
                        responseTime: -10,
                        memoryUsage: -1000
                    }
                } as any);
            }).not.toThrow();
        });

        test('should handle export with invalid pattern gracefully', () => {
            expect(() => {
                analytics.exportData('json', '[invalid-regex');
            }).not.toThrow();
        });
    });
});

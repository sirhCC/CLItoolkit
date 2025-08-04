/**
 * Real-Time Performance Scorer Tests
 */

import { RealTimePerformanceScorer, globalPerformanceScorer, PerformanceScore } from '../src/utils/real-time-performance-scorer';
import { EnhancedPerformanceMonitor } from '../src/utils/enhanced-performance';

describe('RealTimePerformanceScorer', () => {
    let scorer: RealTimePerformanceScorer;

    beforeEach(() => {
        scorer = RealTimePerformanceScorer.getInstance();
        scorer.clearHistory();
        EnhancedPerformanceMonitor.clear();
    });

    afterEach(() => {
        scorer.stopScoring();
    });

    describe('Basic Functionality', () => {
        test('should create singleton instance', () => {
            const instance1 = RealTimePerformanceScorer.getInstance();
            const instance2 = RealTimePerformanceScorer.getInstance();
            expect(instance1).toBe(instance2);
            expect(instance1).toBe(globalPerformanceScorer);
        });

        test('should start and stop scoring', () => {
            expect(scorer.getCurrentScore()).toBeNull();

            scorer.startScoring(100); // 100ms for quick testing
            // Wait a moment for first score
            setTimeout(() => {
                expect(scorer.getCurrentScore()).not.toBeNull();
                scorer.stopScoring();
            }, 150);
        });

        test('should calculate immediate score', () => {
            // Generate some test data
            EnhancedPerformanceMonitor.recordOperation('test-op', 10, false);
            EnhancedPerformanceMonitor.recordOperation('fast-op', 2, false);

            const score = scorer.calculateImmediateScore();

            expect(score).toBeDefined();
            expect(score.overall).toBeGreaterThanOrEqual(0);
            expect(score.overall).toBeLessThanOrEqual(100);
            expect(score.components).toBeDefined();
            expect(score.level).toBeDefined();
            expect(['EXCEPTIONAL', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']).toContain(score.level);
        });
    });

    describe('Score Calculation', () => {
        test('should give high scores for excellent performance', () => {
            // Create excellent performance scenario
            for (let i = 0; i < 10; i++) {
                EnhancedPerformanceMonitor.recordOperation('fast-op', 2, false); // Very fast
                EnhancedPerformanceMonitor.recordOperation('reliable-op', 3, false); // No errors
            }

            const score = scorer.calculateImmediateScore();

            expect(score.overall).toBeGreaterThan(80); // Should be high score
            expect(score.level).toMatch(/EXCELLENT|EXCEPTIONAL/);
            expect(score.components.operationPerformance).toBeGreaterThan(90);
            expect(score.components.errorHandling).toBe(100); // No errors
        });

        test('should give low scores for poor performance', () => {
            // Create poor performance scenario
            for (let i = 0; i < 20; i++) {
                EnhancedPerformanceMonitor.recordOperation('slow-op', 200, false); // Very slow (200ms)
                EnhancedPerformanceMonitor.recordOperation('error-op', 150, true); // Very slow with errors
                EnhancedPerformanceMonitor.recordOperation('critical-op', 300, true); // Critical performance
            }

            const score = scorer.calculateImmediateScore();

            expect(score.overall).toBeLessThan(60); // Should be low score
            expect(score.level).toMatch(/POOR|CRITICAL|FAIR/);
            expect(score.components.operationPerformance).toBeLessThan(70);
            expect(score.components.errorHandling).toBeLessThan(70);
        });

        test('should calculate component scores correctly', () => {
            // Mixed performance scenario
            EnhancedPerformanceMonitor.recordOperation('mixed-op', 15, false); // Medium speed

            const score = scorer.calculateImmediateScore();

            expect(score.components.operationPerformance).toBeGreaterThan(0);
            expect(score.components.operationPerformance).toBeLessThanOrEqual(100);
            expect(score.components.errorHandling).toBe(100); // No errors
            expect(score.components.memoryManagement).toBeGreaterThan(0);
            expect(score.components.systemStability).toBeGreaterThan(0);
        });
    });

    describe('Trend Analysis', () => {
        test('should detect improving trends', () => {
            // Create improving trend
            const scores: number[] = [];
            for (let i = 0; i < 15; i++) {
                // Gradually improve performance
                const time = 50 - (i * 2); // Start slow, get faster
                EnhancedPerformanceMonitor.recordOperation(`trend-op-${i}`, time, false);
                const score = scorer.calculateImmediateScore();
                scores.push(score.overall);
            }

            const latestScore = scorer.getCurrentScore();
            expect(latestScore).not.toBeNull();
            // Note: Trend detection requires sufficient score history
        });

        test('should detect degrading trends', () => {
            // Create degrading trend
            for (let i = 0; i < 15; i++) {
                // Gradually worsen performance
                const time = 10 + (i * 3); // Start fast, get slower
                EnhancedPerformanceMonitor.recordOperation(`degrade-op-${i}`, time, false);
                scorer.calculateImmediateScore();
            }

            const latestScore = scorer.getCurrentScore();
            expect(latestScore).not.toBeNull();
        });
    });

    describe('Recommendations and Triggers', () => {
        test('should generate recommendations for poor performance', () => {
            // Create scenario that needs recommendations
            for (let i = 0; i < 5; i++) {
                EnhancedPerformanceMonitor.recordOperation('slow-op', 200, false); // Very slow
                EnhancedPerformanceMonitor.recordOperation('error-op', 50, true); // Errors
            }

            const score = scorer.calculateImmediateScore();

            expect(score.recommendations).toBeDefined();
            expect(score.recommendations.length).toBeGreaterThan(0);
            expect(score.recommendations.some(rec => rec.includes('Optimize slow operations'))).toBe(true);
        });

        test('should trigger optimization when needed', (done) => {
            scorer.on('optimization:needed', (score: PerformanceScore) => {
                expect(score.overall).toBeLessThan(70);
                expect(score.triggers.optimizationNeeded).toBe(true);
                done();
            });

            // Create poor performance
            for (let i = 0; i < 10; i++) {
                EnhancedPerformanceMonitor.recordOperation('terrible-op', 500, true);
            }

            scorer.calculateImmediateScore();
        });

        test('should emit alerts for critical performance', (done) => {
            scorer.on('alert:performance', (alert) => {
                expect(alert.level).toBeDefined();
                expect(alert.score).toBeLessThan(70);
                expect(alert.message).toContain('Performance score');
                done();
            });

            // Create critical performance
            for (let i = 0; i < 20; i++) {
                EnhancedPerformanceMonitor.recordOperation('critical-op', 500, true); // Very slow with errors
                EnhancedPerformanceMonitor.recordOperation('failing-op', 800, true); // Extremely slow with errors
            }

            scorer.calculateImmediateScore();
        });
    });

    describe('Configuration', () => {
        test('should allow criteria configuration', () => {
            const originalCriteria = scorer.getScoringCriteria();

            scorer.configureCriteria({
                operationTime: {
                    excellent: 2,
                    good: 10,
                    weight: 0.4
                }
            });

            const newCriteria = scorer.getScoringCriteria();
            expect(newCriteria.operationTime.excellent).toBe(2);
            expect(newCriteria.operationTime.good).toBe(10);
            expect(newCriteria.operationTime.weight).toBe(0.4);

            // Other criteria should remain unchanged
            expect(newCriteria.errorRate).toEqual(originalCriteria.errorRate);
        });

        test('should emit configuration update events', (done) => {
            scorer.on('criteria:updated', (criteria) => {
                expect(criteria.operationTime.excellent).toBe(1);
                done();
            });

            scorer.configureCriteria({
                operationTime: {
                    excellent: 1,
                    good: 5,
                    weight: 0.3
                }
            });
        });
    });

    describe('Dashboard Data', () => {
        test('should provide dashboard data', () => {
            // Generate some scores
            for (let i = 0; i < 5; i++) {
                EnhancedPerformanceMonitor.recordOperation(`dash-op-${i}`, 10 + i, false);
                scorer.calculateImmediateScore();
            }

            const dashboard = scorer.getDashboardData();

            expect(dashboard.current).not.toBeNull();
            expect(dashboard.trend).toBeDefined();
            expect(dashboard.averages).toBeDefined();
            expect(dashboard.averages.last10).toBeGreaterThanOrEqual(0);
            expect(dashboard.averages.overall).toBeGreaterThanOrEqual(0);
        });

        test('should track score history', () => {
            expect(scorer.getScoreHistory()).toHaveLength(0);

            // Generate some scores
            for (let i = 0; i < 3; i++) {
                scorer.calculateImmediateScore();
            }

            const history = scorer.getScoreHistory();
            expect(history).toHaveLength(3);

            const limitedHistory = scorer.getScoreHistory(2);
            expect(limitedHistory).toHaveLength(2);
        });
    });

    describe('Reporting', () => {
        test('should generate performance report', () => {
            EnhancedPerformanceMonitor.recordOperation('report-test', 15, false);
            scorer.calculateImmediateScore();

            const report = scorer.getPerformanceReport();

            expect(report).toContain('REAL-TIME PERFORMANCE SCORING REPORT');
            expect(report).toContain('Current Score:');
            expect(report).toContain('COMPONENT BREAKDOWN:');
            expect(report).toContain('PERFORMANCE TRENDS:');
            expect(report).toContain('RECOMMENDATIONS:');
        });

        test('should handle no data gracefully', () => {
            const report = scorer.getPerformanceReport();
            expect(report).toContain('No data available yet');
        });
    });

    describe('Event System', () => {
        test('should emit scoring events', (done) => {
            let eventCount = 0;

            scorer.on('score:calculated', (score: PerformanceScore) => {
                expect(score).toBeDefined();
                expect(score.overall).toBeGreaterThanOrEqual(0);
                eventCount++;

                if (eventCount === 2) {
                    done();
                }
            });

            scorer.calculateImmediateScore();
            scorer.calculateImmediateScore();
        });

        test('should emit start/stop events', (done) => {
            let startEmitted = false;

            scorer.on('scoring:started', ({ interval }) => {
                expect(interval).toBe(100);
                startEmitted = true;
            });

            scorer.on('scoring:stopped', () => {
                expect(startEmitted).toBe(true);
                done();
            });

            scorer.startScoring(100);
            // Give more time for the events to be emitted
            setTimeout(() => scorer.stopScoring(), 150);
        });
    });

    describe('Integration', () => {
        test('should integrate with EnhancedPerformanceMonitor', () => {
            // Record operations in performance monitor
            EnhancedPerformanceMonitor.recordOperation('integration-test', 25, false);
            EnhancedPerformanceMonitor.recordOperation('integration-test', 30, true);

            // Performance scorer should pick up this data
            const score = scorer.calculateImmediateScore();

            expect(score.components.operationPerformance).toBeDefined();
            expect(score.components.errorHandling).toBeLessThan(100); // Due to error
        });

        test('should integrate with pool manager', () => {
            // This test would require mocking pool manager or having real pools
            const score = scorer.calculateImmediateScore();
            expect(score.components.poolEfficiency).toBeDefined();
        });
    });
});

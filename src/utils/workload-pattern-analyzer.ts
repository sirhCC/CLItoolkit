/**
 * Advanced Workload Pattern Recognition System
 * Automatically adapts to different CLI usage patterns and optimizes accordingly
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface WorkloadPattern {
    id: string;
    name: string;
    frequency: number;
    commands: string[];
    options: Record<string, any>;
    argumentPatterns: string[];
    timeOfDay: number[];
    memoryFootprint: number;
    executionTime: number;
    confidence: number; // 0-1 confidence score
}

export interface UsageEvent {
    timestamp: number;
    command: string;
    arguments: string[];
    options: Record<string, any>;
    executionTime: number;
    memoryUsed: number;
    success: boolean;
}

export interface PatternPrediction {
    pattern: WorkloadPattern;
    confidence: number;
    nextCommands: string[];
    recommendedOptimizations: string[];
    prefetchTargets: string[];
}

export class WorkloadPatternAnalyzer extends EventEmitter {
    private patterns: Map<string, WorkloadPattern> = new Map();
    private usageHistory: UsageEvent[] = [];
    private sessionEvents: UsageEvent[] = [];
    private analysisInterval?: NodeJS.Timeout;
    private isAnalyzing = false;
    private maxHistorySize = 10000;
    private patternCacheFile = './dist/.cache/workload-patterns.json';

    constructor() {
        super();
        this.loadPatterns();
        this.setupPeriodicAnalysis();
    }

    /**
     * Record a CLI usage event for pattern analysis
     */
    recordUsage(event: UsageEvent): void {
        this.usageHistory.push(event);
        this.sessionEvents.push(event);

        // Maintain history size limit
        if (this.usageHistory.length > this.maxHistorySize) {
            this.usageHistory = this.usageHistory.slice(-this.maxHistorySize);
        }

        // Emit event for real-time processing
        this.emit('usage:recorded', event);

        // Trigger pattern analysis if we have enough new data
        if (this.sessionEvents.length % 50 === 0) {
            this.analyzePatterns();
        }
    }

    /**
     * Analyze usage patterns and identify common workflows
     */
    async analyzePatterns(): Promise<void> {
        if (this.isAnalyzing || this.usageHistory.length < 10) return;

        this.isAnalyzing = true;
        console.log('🔍 Analyzing workload patterns...');

        try {
            // Sequence pattern analysis
            const sequencePatterns = this.analyzeCommandSequences();

            // Time-based pattern analysis
            const timePatterns = this.analyzeTimePatterns();

            // Option combination analysis
            const optionPatterns = this.analyzeOptionCombinations();

            // Memory usage pattern analysis
            const memoryPatterns = this.analyzeMemoryPatterns();

            // Merge and update patterns
            this.mergePatterns([
                ...sequencePatterns,
                ...timePatterns,
                ...optionPatterns,
                ...memoryPatterns
            ]);

            // Save updated patterns
            await this.savePatterns();

            // Emit analysis complete event
            this.emit('analysis:complete', this.patterns.size);

        } catch (error) {
            console.error('[WORKLOAD] Pattern analysis failed:', error);
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * Predict next likely commands based on current context
     */
    predictNextCommands(currentCommand: string, recentCommands: string[]): PatternPrediction[] {
        const predictions: PatternPrediction[] = [];

        for (const [, pattern] of this.patterns) {
            const confidence = this.calculatePatternConfidence(pattern, currentCommand, recentCommands);

            if (confidence > 0.3) { // Minimum confidence threshold
                const nextCommands = this.extractNextCommands(pattern, currentCommand);
                const prefetchTargets = this.identifyPrefetchTargets(pattern);
                const optimizations = this.recommendOptimizations(pattern);

                predictions.push({
                    pattern,
                    confidence,
                    nextCommands,
                    recommendedOptimizations: optimizations,
                    prefetchTargets
                });
            }
        }

        // Sort by confidence
        return predictions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Get optimization recommendations based on usage patterns
     */
    getOptimizationRecommendations(): string[] {
        const recommendations: string[] = [];
        const patternsByFrequency = Array.from(this.patterns.values())
            .sort((a, b) => b.frequency - a.frequency);

        for (const pattern of patternsByFrequency.slice(0, 5)) {
            if (pattern.frequency > 10) {
                recommendations.push(...this.recommendOptimizations(pattern));
            }
        }

        return [...new Set(recommendations)]; // Remove duplicates
    }

    /**
     * Analyze command sequence patterns
     */
    private analyzeCommandSequences(): WorkloadPattern[] {
        const sequences = new Map<string, number>();
        const sequenceDetails = new Map<string, UsageEvent[]>();

        // Sliding window analysis for command sequences
        for (let i = 0; i < this.usageHistory.length - 2; i++) {
            const sequence = this.usageHistory.slice(i, i + 3)
                .map(e => e.command)
                .join(' → ');

            sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
            if (!sequenceDetails.has(sequence)) {
                sequenceDetails.set(sequence, []);
            }
            sequenceDetails.get(sequence)!.push(...this.usageHistory.slice(i, i + 3));
        }

        const patterns: WorkloadPattern[] = [];
        for (const [sequence, frequency] of sequences) {
            if (frequency >= 3) { // Minimum frequency threshold
                const events = sequenceDetails.get(sequence)!;
                const commands = sequence.split(' → ');

                patterns.push({
                    id: `seq_${Buffer.from(sequence).toString('base64').slice(0, 8)}`,
                    name: `Sequence: ${sequence}`,
                    frequency,
                    commands,
                    options: this.extractCommonOptions(events),
                    argumentPatterns: this.extractArgumentPatterns(events),
                    timeOfDay: this.extractTimePatterns(events),
                    memoryFootprint: this.calculateAverageMemory(events),
                    executionTime: this.calculateAverageExecutionTime(events),
                    confidence: Math.min(frequency / 10, 1.0)
                });
            }
        }

        return patterns;
    }

    /**
     * Analyze time-based usage patterns
     */
    private analyzeTimePatterns(): WorkloadPattern[] {
        const timeSlots = new Map<string, UsageEvent[]>();

        // Group events by hour of day
        for (const event of this.usageHistory) {
            const hour = new Date(event.timestamp).getHours();
            const slot = `${Math.floor(hour / 2) * 2}-${Math.floor(hour / 2) * 2 + 2}h`;

            if (!timeSlots.has(slot)) {
                timeSlots.set(slot, []);
            }
            timeSlots.get(slot)!.push(event);
        }

        const patterns: WorkloadPattern[] = [];
        for (const [slot, events] of timeSlots) {
            if (events.length >= 5) {
                const commands = [...new Set(events.map(e => e.command))];

                patterns.push({
                    id: `time_${slot.replace('-', '_')}`,
                    name: `Time Pattern: ${slot}`,
                    frequency: events.length,
                    commands,
                    options: this.extractCommonOptions(events),
                    argumentPatterns: this.extractArgumentPatterns(events),
                    timeOfDay: [parseInt(slot.split('-')[0] || '0')],
                    memoryFootprint: this.calculateAverageMemory(events),
                    executionTime: this.calculateAverageExecutionTime(events),
                    confidence: Math.min(events.length / 20, 1.0)
                });
            }
        }

        return patterns;
    }

    /**
     * Analyze option combination patterns
     */
    private analyzeOptionCombinations(): WorkloadPattern[] {
        const optionCombos = new Map<string, UsageEvent[]>();

        for (const event of this.usageHistory) {
            const optionKeys = Object.keys(event.options).sort().join(',');
            if (optionKeys) {
                if (!optionCombos.has(optionKeys)) {
                    optionCombos.set(optionKeys, []);
                }
                optionCombos.get(optionKeys)!.push(event);
            }
        }

        const patterns: WorkloadPattern[] = [];
        for (const [combo, events] of optionCombos) {
            if (events.length >= 3) {
                const commands = [...new Set(events.map(e => e.command))];

                patterns.push({
                    id: `opts_${Buffer.from(combo).toString('base64').slice(0, 8)}`,
                    name: `Options: ${combo}`,
                    frequency: events.length,
                    commands,
                    options: this.extractCommonOptions(events),
                    argumentPatterns: this.extractArgumentPatterns(events),
                    timeOfDay: this.extractTimePatterns(events),
                    memoryFootprint: this.calculateAverageMemory(events),
                    executionTime: this.calculateAverageExecutionTime(events),
                    confidence: Math.min(events.length / 8, 1.0)
                });
            }
        }

        return patterns;
    }

    /**
     * Analyze memory usage patterns
     */
    private analyzeMemoryPatterns(): WorkloadPattern[] {
        const patterns: WorkloadPattern[] = [];

        // High memory usage patterns
        const highMemoryEvents = this.usageHistory.filter(e => e.memoryUsed > 50 * 1024 * 1024); // >50MB
        if (highMemoryEvents.length >= 3) {
            const commands = [...new Set(highMemoryEvents.map(e => e.command))];

            patterns.push({
                id: 'high_memory',
                name: 'High Memory Usage Pattern',
                frequency: highMemoryEvents.length,
                commands,
                options: this.extractCommonOptions(highMemoryEvents),
                argumentPatterns: this.extractArgumentPatterns(highMemoryEvents),
                timeOfDay: this.extractTimePatterns(highMemoryEvents),
                memoryFootprint: this.calculateAverageMemory(highMemoryEvents),
                executionTime: this.calculateAverageExecutionTime(highMemoryEvents),
                confidence: Math.min(highMemoryEvents.length / 10, 1.0)
            });
        }

        return patterns;
    }

    /**
     * Calculate pattern confidence based on current context
     */
    private calculatePatternConfidence(
        pattern: WorkloadPattern,
        currentCommand: string,
        recentCommands: string[]
    ): number {
        let confidence = pattern.confidence;

        // Boost confidence if current command is in pattern
        if (pattern.commands.includes(currentCommand)) {
            confidence += 0.3;
        }

        // Boost confidence based on recent command matches
        const recentMatches = recentCommands.filter(cmd => pattern.commands.includes(cmd)).length;
        confidence += (recentMatches / recentCommands.length) * 0.4;

        // Time-based confidence boost
        const currentHour = new Date().getHours();
        if (pattern.timeOfDay.some(hour => Math.abs(hour - currentHour) <= 1)) {
            confidence += 0.2;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Extract next likely commands from pattern
     */
    private extractNextCommands(pattern: WorkloadPattern, currentCommand: string): string[] {
        const commands = pattern.commands;
        const currentIndex = commands.indexOf(currentCommand);

        if (currentIndex >= 0 && currentIndex < commands.length - 1) {
            return commands.slice(currentIndex + 1, currentIndex + 3);
        }

        return commands.slice(0, 2);
    }

    /**
     * Identify prefetch targets for a pattern
     */
    private identifyPrefetchTargets(pattern: WorkloadPattern): string[] {
        const targets: string[] = [];

        // Heavy memory patterns need object pool pre-warming
        if (pattern.memoryFootprint > 30 * 1024 * 1024) {
            targets.push('parseResult', 'command', 'validation');
        }

        // Complex option patterns need option parsing optimization
        if (Object.keys(pattern.options).length > 3) {
            targets.push('optionParser', 'validator');
        }

        // Long execution time patterns need performance optimization
        if (pattern.executionTime > 100) {
            targets.push('executionContext', 'pipeline');
        }

        return targets;
    }

    /**
     * Recommend optimizations for a pattern
     */
    private recommendOptimizations(pattern: WorkloadPattern): string[] {
        const recommendations: string[] = [];

        if (pattern.frequency > 20) {
            recommendations.push('Increase object pool size for high-frequency pattern');
        }

        if (pattern.memoryFootprint > 50 * 1024 * 1024) {
            recommendations.push('Enable memory pressure handling for high-memory pattern');
        }

        if (pattern.executionTime > 200) {
            recommendations.push('Enable JIT optimization for slow execution pattern');
        }

        if (pattern.commands.length > 1) {
            recommendations.push('Pre-warm command pipeline for sequence pattern');
        }

        return recommendations;
    }

    /**
     * Helper methods for pattern extraction
     */
    private extractCommonOptions(events: UsageEvent[]): Record<string, any> {
        const optionCounts = new Map<string, Map<any, number>>();

        for (const event of events) {
            for (const [key, value] of Object.entries(event.options)) {
                if (!optionCounts.has(key)) {
                    optionCounts.set(key, new Map());
                }
                const valueCounts = optionCounts.get(key)!;
                valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
            }
        }

        const commonOptions: Record<string, any> = {};
        for (const [key, valueCounts] of optionCounts) {
            const totalEvents = events.length;
            for (const [value, count] of valueCounts) {
                if (count / totalEvents > 0.5) { // More than 50% of events
                    commonOptions[key] = value;
                    break;
                }
            }
        }

        return commonOptions;
    }

    private extractArgumentPatterns(events: UsageEvent[]): string[] {
        const patterns = new Set<string>();

        for (const event of events) {
            if (event.arguments.length > 0) {
                // Extract file patterns
                const fileArgs = event.arguments.filter(arg =>
                    arg.includes('.') || arg.includes('/') || arg.includes('\\')
                );
                for (const fileArg of fileArgs) {
                    const ext = path.extname(fileArg);
                    if (ext) patterns.add(`*${ext}`);
                }

                // Extract common argument structures
                patterns.add(`${event.arguments.length}_args`);
            }
        }

        return Array.from(patterns);
    }

    private extractTimePatterns(events: UsageEvent[]): number[] {
        const hours = events.map(e => new Date(e.timestamp).getHours());
        const hourCounts = new Map<number, number>();

        for (const hour of hours) {
            hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        }

        return Array.from(hourCounts.entries())
            .filter(([, count]) => count >= 2)
            .map(([hour]) => hour);
    }

    private calculateAverageMemory(events: UsageEvent[]): number {
        const totalMemory = events.reduce((sum, e) => sum + e.memoryUsed, 0);
        return totalMemory / events.length;
    }

    private calculateAverageExecutionTime(events: UsageEvent[]): number {
        const totalTime = events.reduce((sum, e) => sum + e.executionTime, 0);
        return totalTime / events.length;
    }

    /**
     * Merge new patterns with existing ones
     */
    private mergePatterns(newPatterns: WorkloadPattern[]): void {
        for (const pattern of newPatterns) {
            if (this.patterns.has(pattern.id)) {
                const existing = this.patterns.get(pattern.id)!;
                // Update existing pattern with new data
                existing.frequency = Math.max(existing.frequency, pattern.frequency);
                existing.confidence = (existing.confidence + pattern.confidence) / 2;
            } else {
                this.patterns.set(pattern.id, pattern);
            }
        }
    }

    /**
     * Setup periodic pattern analysis
     */
    private setupPeriodicAnalysis(): void {
        this.analysisInterval = setInterval(() => {
            if (this.sessionEvents.length >= 10) {
                this.analyzePatterns();
                this.sessionEvents = []; // Reset session events
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Load patterns from cache
     */
    private async loadPatterns(): Promise<void> {
        try {
            await fs.mkdir(path.dirname(this.patternCacheFile), { recursive: true });
            const data = await fs.readFile(this.patternCacheFile, 'utf8');
            const patternsArray = JSON.parse(data) as WorkloadPattern[];

            for (const pattern of patternsArray) {
                this.patterns.set(pattern.id, pattern);
            }

            console.log(`📊 Loaded ${this.patterns.size} workload patterns from cache`);
        } catch (error) {
            // No existing patterns file, start fresh
            console.log('📊 Starting with fresh workload pattern analysis');
        }
    }

    /**
     * Save patterns to cache
     */
    private async savePatterns(): Promise<void> {
        try {
            const patternsArray = Array.from(this.patterns.values());
            await fs.writeFile(this.patternCacheFile, JSON.stringify(patternsArray, null, 2));
        } catch (error) {
            console.warn('[WORKLOAD] Failed to save patterns:', error);
        }
    }

    /**
     * Get comprehensive analytics report
     */
    getAnalyticsReport(): string {
        const totalPatterns = this.patterns.size;
        const totalEvents = this.usageHistory.length;
        const topPatterns = Array.from(this.patterns.values())
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 5);

        return `
🔍 WORKLOAD PATTERN ANALYSIS REPORT
====================================

Statistics:
• Total Patterns Detected: ${totalPatterns}
• Total Usage Events: ${totalEvents}
• Session Events: ${this.sessionEvents.length}

Top Patterns:
${topPatterns.map(p =>
            `• ${p.name}: ${p.frequency} occurrences (${(p.confidence * 100).toFixed(1)}% confidence)`
        ).join('\n')}

Analysis Status: ${this.isAnalyzing ? 'Running' : 'Idle'}
        `.trim();
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }
        this.removeAllListeners();
    }
}

export const globalWorkloadAnalyzer = new WorkloadPatternAnalyzer();

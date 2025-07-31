#!/usr/bin/env tsx

/**
 * Enhanced Phase 6 Demo: Advanced Features Showcase
 * Demonstrates the dramatically improved capabilities of Phase 6 components
 */

import {
    AdvancedOutputFormatter,
    OutputFormat,
    ColorTheme,
    TableConfig,
    TableAlignment,
    TableBorderStyle
} from '../src/core/output-formatter';

import {
    InteractivePrompts,
    PromptType,
    ProgressIndicator,
    ProgressType,
    Choice
} from '../src/core/interactive-ui';

import {
    AdvancedTemplateEngine,
    TemplateOptions,
    TemplateContext
} from '../src/core/template-engine';

import {
    AdvancedRichTextRenderer,
    MarkdownOptions
} from '../src/core/rich-text-renderer';

import {
    AdvancedUIBuilder,
    BOX_CHARS,
    TextAlignment,
    LayoutDirection
} from '../src/core/ui-components';

/**
 * Demo: Advanced Output Formatting with New Features
 */
async function demoAdvancedFormatting() {
    console.log('\n🎨 ADVANCED OUTPUT FORMATTING DEMO\n');

    const formatter = new AdvancedOutputFormatter({
        enableCaching: true,
        enableMetrics: true,
        enableProfiling: true
    });

    // Sample data with complex structures
    const salesData = [
        { region: 'North America', q1: 125000, q2: 138000, q3: 142000, q4: 155000, growth: 8.2 },
        { region: 'Europe', q1: 98000, q2: 105000, q3: 112000, q4: 118000, growth: 5.8 },
        { region: 'Asia Pacific', q1: 87000, q2: 95000, q3: 108000, q4: 125000, growth: 12.4 },
        { region: 'Latin America', q1: 45000, q2: 48000, q3: 52000, q4: 58000, growth: 7.9 },
        { region: 'Middle East & Africa', q1: 32000, q2: 35000, q3: 38000, q4: 42000, growth: 9.1 }
    ];

    // 1. Advanced Table with Multiple Themes
    console.log('📊 SALES PERFORMANCE TABLE (Multiple Formats)\n');

    // Theme 1: Solarized theme with rounded borders
    const tableConfig: TableConfig = {
        headers: ['Region', 'Q1', 'Q2', 'Q3', 'Q4', 'Growth %'],
        rows: salesData.map(row => [
            row.region,
            `$${(row.q1 / 1000).toFixed(0)}K`,
            `$${(row.q2 / 1000).toFixed(0)}K`,
            `$${(row.q3 / 1000).toFixed(0)}K`,
            `$${(row.q4 / 1000).toFixed(0)}K`,
            `${row.growth}%`
        ]),
        borderStyle: TableBorderStyle.Rounded,
        alternatingRows: true,
        alignment: [
            TableAlignment.Left,
            TableAlignment.Right,
            TableAlignment.Right,
            TableAlignment.Right,
            TableAlignment.Right,
            TableAlignment.Center
        ],
        sortable: true,
        sortBy: 'Growth %',
        sortDirection: 'desc'
    };

    const solarizedTable = await formatter.format(tableConfig, OutputFormat.Table, {
        theme: ColorTheme.Solarized,
        enableColors: true
    });
    console.log(solarizedTable.content);

    // Theme 2: Monokai theme with double borders
    tableConfig.borderStyle = TableBorderStyle.Double;
    const monokaiTable = await formatter.format(tableConfig, OutputFormat.Table, {
        theme: ColorTheme.Monokai,
        enableColors: true
    });
    console.log('\n🎯 MONOKAI THEME:\n');
    console.log(monokaiTable.content);

    // 2. Advanced JSON with Syntax Highlighting
    console.log('\n📋 JSON OUTPUT WITH ADVANCED HIGHLIGHTING:\n');

    const complexData = {
        metadata: {
            version: '2.1.0',
            timestamp: new Date().toISOString(),
            environment: 'production',
            features: ['caching', 'streaming', 'ai-assist']
        },
        analytics: {
            performance: {
                averageResponseTime: '45ms',
                cacheHitRate: '96.8%',
                errorRate: '0.02%'
            },
            usage: {
                dailyActiveUsers: 15420,
                peakConcurrentUsers: 2847,
                apiCallsPerSecond: 1250
            }
        },
        configuration: {
            database: {
                host: 'cluster-prod.example.com',
                port: 5432,
                ssl: true,
                poolSize: 20
            },
            cache: {
                provider: 'redis',
                ttl: 3600,
                maxMemory: '512MB'
            }
        }
    };

    const jsonOutput = await formatter.format(complexData, OutputFormat.JSON, {
        theme: ColorTheme.GitHub,
        enableColors: true,
        indent: 2
    });
    console.log(jsonOutput.content);

    // 3. CSV and Excel formats
    console.log('\n📈 CSV FORMAT FOR DATA EXPORT:\n');
    const csvOutput = await formatter.format(salesData, OutputFormat.CSV);
    console.log(csvOutput.content);

    // 4. XML with Structure Highlighting
    console.log('\n🔖 XML FORMAT WITH STRUCTURE:\n');
    const xmlOutput = await formatter.format(complexData, OutputFormat.XML, {
        theme: ColorTheme.Material,
        enableColors: true
    });
    console.log(xmlOutput.content);

    // 5. Performance Metrics
    console.log('\n⚡ FORMATTING PERFORMANCE METRICS:\n');
    const metrics = formatter.getMetrics();
    console.log(`Total Operations: ${metrics.totalOperations}`);
    console.log(`Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Average Execution Time: ${metrics.averageExecutionTime.toFixed(2)}ms`);
    console.log(`Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
}

/**
 * Demo: Enhanced Interactive UI with Advanced Features
 */
async function demoAdvancedInteractiveUI() {
    console.log('\n🖱️  ADVANCED INTERACTIVE UI DEMO\n');

    const prompts = new InteractivePrompts({
        enableAnimations: true,
        enableAI: false, // Disable for demo
        theme: {
            name: 'enhanced',
            colors: {
                primary: '\x1b[38;5;33m',
                secondary: '\x1b[38;5;51m',
                success: '\x1b[38;5;76m',
                warning: '\x1b[38;5;214m',
                error: '\x1b[38;5;203m',
                info: '\x1b[38;5;117m',
                muted: '\x1b[38;5;145m'
            },
            symbols: {
                pointer: '▶',
                checked: '✓',
                unchecked: '○',
                radio: '●',
                bullet: '•'
            },
            animations: true,
            transitions: true
        }
    });

    // 1. Enhanced Progress Indicators
    console.log('📊 ADVANCED PROGRESS INDICATORS:\n');

    // Rainbow progress bar
    const rainbowProgress = new ProgressIndicator({
        type: ProgressType.Rainbow,
        message: 'Processing data with rainbow visualization...',
        showPercentage: true,
        showETA: true,
        showSpeed: true,
        width: 50,
        style: 'fancy',
        gradient: true
    });

    rainbowProgress.start();
    for (let i = 0; i <= 100; i += 5) {
        rainbowProgress.update(i, `Processing ${i}% complete`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    rainbowProgress.complete('✨ Data processing completed successfully!');

    // Matrix-style progress
    console.log('\n');
    const matrixProgress = new ProgressIndicator({
        type: ProgressType.Matrix,
        message: 'Analyzing system matrix...',
        showPercentage: true,
        animation: true,
        color: '\x1b[32m' // Green
    });

    matrixProgress.start();
    for (let i = 0; i <= 100; i += 10) {
        matrixProgress.update(i, `Matrix analysis ${i}%`);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    matrixProgress.complete('🔍 Matrix analysis complete');

    // 2. Enhanced Choice Selection
    console.log('\n\n🎯 ENHANCED CHOICE SELECTION:\n');

    const frameworkChoices: Choice[] = [
        {
            name: 'React',
            value: 'react',
            description: 'A JavaScript library for building user interfaces',
            icon: '⚛️',
            category: 'Frontend',
            tags: ['ui', 'component-based', 'virtual-dom'],
            metadata: { popularity: 95, learning_curve: 'moderate' }
        },
        {
            name: 'Vue.js',
            value: 'vue',
            description: 'The Progressive JavaScript Framework',
            icon: '💚',
            category: 'Frontend',
            tags: ['ui', 'progressive', 'approachable'],
            metadata: { popularity: 85, learning_curve: 'easy' }
        },
        {
            name: 'Angular',
            value: 'angular',
            description: 'Platform for building mobile and desktop web applications',
            icon: '🅰️',
            category: 'Frontend',
            tags: ['ui', 'typescript', 'enterprise'],
            metadata: { popularity: 75, learning_curve: 'steep' }
        },
        {
            name: 'Node.js',
            value: 'node',
            description: 'JavaScript runtime built on Chrome\'s V8 JavaScript engine',
            icon: '🟢',
            category: 'Backend',
            tags: ['runtime', 'server', 'async'],
            metadata: { popularity: 90, learning_curve: 'moderate' }
        },
        {
            name: 'Express.js',
            value: 'express',
            description: 'Fast, unopinionated, minimalist web framework',
            icon: '🚀',
            category: 'Backend',
            tags: ['framework', 'middleware', 'routing'],
            metadata: { popularity: 88, learning_curve: 'easy' }
        }
    ];

    console.log('Select your preferred frameworks (multiple selection):');
    const selectedFrameworks = await prompts.multiSelect(
        'Choose frameworks for your project:',
        frameworkChoices,
        {
            pageSize: 10,
            searchable: true,
            categorized: true,
            showDescriptions: true
        }
    );

    console.log('\\n✅ Selected frameworks:', selectedFrameworks);

    // 3. Advanced autocomplete with fuzzy search
    console.log('\\n🔍 FUZZY SEARCH AUTOCOMPLETE:\\n');

    const programmingLanguages = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
        'Swift', 'Kotlin', 'Ruby', 'PHP', 'Scala', 'Clojure', 'Elixir', 'Dart',
        'Haskell', 'F#', 'OCaml', 'Elm', 'ReasonML', 'Crystal', 'Nim', 'Zig'
    ].map(lang => ({
        name: lang,
        value: lang.toLowerCase(),
        description: `${lang} programming language`,
        tags: ['programming', 'language']
    }));

    const favoriteLanguage = await prompts.autocomplete(
        'What\\'s your favorite programming language ? ',
        programmingLanguages,
        {
            fuzzySearch: true,
            caseSensitive: false,
            suggestOnly: false,
            minSearchLength: 1
        }
    );

    console.log('\\n💖 Favorite language:', favoriteLanguage);
}

/**
 * Demo: Advanced Template Engine
 */
async function demoAdvancedTemplateEngine() {
    console.log('\\n📄 ADVANCED TEMPLATE ENGINE DEMO\\n');

    const engine = new AdvancedTemplateEngine({
        enableCaching: true,
        enableProfiling: true,
        enableAI: false, // Disable for demo
        security: {
            allowUnsafeEval: false,
            xssProtection: true,
            sanitizeHtml: true
        },
        performance: {
            maxExecutionTime: 5000,
            enableWorkers: false
        }
    });

    // Register advanced custom helpers
    engine.registerHelper('formatCurrency', function (amount: number, currency = 'USD', locale = 'en-US') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    });

    engine.registerHelper('formatRelativeTime', function (date: Date) {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const diff = date.getTime() - Date.now();
        const days = Math.round(diff / (1000 * 60 * 60 * 24));
        return rtf.format(days, 'day');
    });

    engine.registerHelper('progressBar', function (current: number, total: number, width = 20) {
        const percentage = current / total;
        const filled = Math.round(percentage * width);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage * 100)}%`;
    });

    engine.registerHelper('badge', function (text: string, type = 'default') {
        const colors = {
            success: '\\x1b[42m\\x1b[30m',
            warning: '\\x1b[43m\\x1b[30m',
            error: '\\x1b[41m\\x1b[37m',
            info: '\\x1b[44m\\x1b[37m',
            default: '\\x1b[47m\\x1b[30m'
        };
        const color = colors[type as keyof typeof colors] || colors.default;
        return `${color} ${text} \\x1b[0m`;
    });

    // 1. Dashboard Template with Real-time Data
    console.log('🖥️  SYSTEM DASHBOARD TEMPLATE:\\n');

    const dashboardTemplate = `
# {{colorize "System Dashboard" "primary"}} {{badge "LIVE" "success"}}

**Last Updated:** {{formatDate now "YYYY-MM-DD HH:mm:ss"}}

## 📊 System Performance
{{#each metrics}}
- **{{name}}**: {{progressBar current max 25}} ({{formatCurrency value}}/month)
{{/each}}

## 🌍 Regional Sales
{{#each regions}}
### {{flag}} {{name}}
- Revenue: {{formatCurrency revenue}}
- Growth: {{#if (gt growth 0)}}{{colorize (concat "+" growth "%") "success"}}{{else}}{{colorize (concat growth "%") "error"}}{{/if}}
- Trend: {{#if (gt growth 5)}}📈{{else if (gt growth 0)}}➡️{{else}}📉{{/if}}
{{/each}}

## ⚡ Quick Actions
{{#each actions}}
- [{{shortcut}}] {{colorize description "info"}}
{{/each}}

---
{{colorize "Generated by CLI Toolkit Framework v6.0" "muted"}}
`;

    const dashboardContext: TemplateContext = {
        now: new Date(),
        metrics: [
            { name: 'CPU Usage', current: 45, max: 100, value: 450 },
            { name: 'Memory', current: 68, max: 100, value: 680 },
            { name: 'Network I/O', current: 23, max: 100, value: 230 },
            { name: 'Disk Usage', current: 82, max: 100, value: 820 }
        ],
        regions: [
            { flag: '🇺🇸', name: 'North America', revenue: 1250000, growth: 8.2 },
            { flag: '🇪🇺', name: 'Europe', revenue: 980000, growth: 5.8 },
            { flag: '🌏', name: 'Asia Pacific', revenue: 1420000, growth: 12.4 },
            { flag: '🌎', name: 'Latin America', revenue: 580000, growth: -2.1 }
        ],
        actions: [
            { shortcut: 'R', description: 'Refresh dashboard' },
            { shortcut: 'S', description: 'System settings' },
            { shortcut: 'L', description: 'View logs' },
            { shortcut: 'Q', description: 'Quit application' }
        ]
    };

    const renderedDashboard = await engine.render(dashboardTemplate, dashboardContext);
    console.log(renderedDashboard);

    // 2. Report Template with Loops and Conditionals
    console.log('\\n\\n📈 SALES REPORT TEMPLATE:\\n');

    const reportTemplate = `
{{#>header title="Q4 Sales Report" subtitle="Performance Analysis"}}

{{#each departments}}
## 🏢 {{name}} Department

{{#if targets}}
### Targets vs Actual
{{#each targets}}
- **{{metric}}**: {{actual}} / {{target}} {{progressBar actual target 15}}
  {{#if (gte actual target)}}{{badge "TARGET MET" "success"}}{{else}}{{badge "BELOW TARGET" "warning"}}{{/if}}
{{/each}}
{{/if}}

{{#if team}}
### Team Performance
| Member | Sales | Commission |
|--------|-------|------------|
{{#each team}}
| {{name}} | {{formatCurrency sales}} | {{formatCurrency commission}} |
{{/each}}
{{/if}}

{{#unless (isEmpty achievements)}}
### 🏆 Achievements
{{#each achievements}}
- {{icon}} **{{title}}**: {{description}}
{{/each}}
{{/unless}}

---
{{/each}}

**Report generated on {{formatDate timestamp "MMMM DD, YYYY"}}**
`;

    // Register a partial template
    engine.registerPartial('header', `
# {{title}}
{{#if subtitle}}*{{subtitle}}*{{/if}}

---
`);

    const reportContext: TemplateContext = {
        timestamp: new Date(),
        departments: [
            {
                name: 'Sales',
                targets: [
                    { metric: 'Revenue', actual: 1250000, target: 1200000 },
                    { metric: 'Deals Closed', actual: 145, target: 150 },
                    { metric: 'New Clients', actual: 23, target: 20 }
                ],
                team: [
                    { name: 'Alice Johnson', sales: 450000, commission: 22500 },
                    { name: 'Bob Smith', sales: 380000, commission: 19000 },
                    { name: 'Carol Davis', sales: 420000, commission: 21000 }
                ],
                achievements: [
                    { icon: '🥇', title: 'Top Performer', description: 'Alice Johnson exceeded targets by 125%' },
                    { icon: '🎯', title: 'Accuracy Award', description: 'Highest forecast accuracy this quarter' }
                ]
            },
            {
                name: 'Marketing',
                targets: [
                    { metric: 'Lead Generation', actual: 2800, target: 3000 },
                    { metric: 'Conversion Rate', actual: 3.2, target: 3.5 },
                    { metric: 'Campaign ROI', actual: 4.8, target: 4.0 }
                ],
                achievements: [
                    { icon: '📈', title: 'ROI Excellence', description: 'Exceeded ROI targets by 20%' }
                ]
            }
        ]
    };

    const renderedReport = await engine.render(reportTemplate, reportContext);
    console.log(renderedReport);

    // 3. Performance metrics
    console.log('\\n⚡ TEMPLATE ENGINE PERFORMANCE:\\n');
    const metrics = engine.getMetrics();
    console.log(`Templates Compiled: ${metrics.templatesCompiled}`);
    console.log(`Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Average Render Time: ${metrics.averageRenderTime.toFixed(2)}ms`);
}

/**
 * Demo: Enhanced Rich Text Rendering
 */
async function demoAdvancedRichText() {
    console.log('\\n🎨 ADVANCED RICH TEXT RENDERING DEMO\\n');

    const renderer = new AdvancedRichTextRenderer({
        enableCaching: true,
        enableProfiling: true
    });

    // Set advanced theme
    renderer.setTheme('dracula');

    // 1. Advanced Markdown with Extended Features
    console.log('📝 ENHANCED MARKDOWN RENDERING:\\n');

    const advancedMarkdown = `
# 🚀 CLI Toolkit Framework v6.0

## ✨ What's New in Phase 6

### 🎯 Key Features

- **Advanced Output Formatting** with 14+ format types
- **Interactive UI Components** with AI assistance
- **Enterprise Template Engine** with 50+ helpers
- **Rich Text Rendering** with syntax highlighting
- **Responsive UI Layouts** with real-time adaptation

### 📊 Performance Improvements

| Component | Before | After | Improvement |
|-----------|---------|--------|-------------|
| Formatting | 2.5ms | 0.8ms | **68% faster** |
| Templates | 15ms | 3.2ms | **79% faster** |
| Rendering | 8ms | 1.5ms | **81% faster** |

### 🎨 Code Examples

Here's how to use the advanced output formatter:

\`\`\`typescript
import { AdvancedOutputFormatter, ColorTheme } from 'cli-toolkit';

const formatter = new AdvancedOutputFormatter({
    enableCaching: true,
    enableMetrics: true,
    theme: ColorTheme.Dracula
});

// Format complex data with multiple themes
const result = await formatter.format(data, OutputFormat.Table, {
    theme: ColorTheme.Solarized,
    sortable: true,
    filterable: true,
    responsive: true
});
\`\`\`

And here's the interactive UI system:

\`\`\`python
# Python example for comparison
def create_dashboard():
    dashboard = UIBuilder()
    
    # Create responsive layout
    layout = dashboard.responsive_grid([
        dashboard.metric_card("CPU", "45%", "success"),
        dashboard.metric_card("Memory", "68%", "warning"),
        dashboard.chart("performance", data)
    ])
    
    return layout.render()
\`\`\`

### 🌟 Advanced Features

> **Note**: The framework now includes AI-powered optimization and real-time performance monitoring.

#### Accessibility Support
- Screen reader compatibility
- High contrast themes
- Keyboard navigation
- Voice guidance options

#### Performance Monitoring
- Real-time metrics collection
- Memory usage optimization
- Cache hit rate tracking
- Automated performance tuning

### 🔗 Related Links

- [Documentation](https://cli-toolkit.dev/docs)
- [GitHub Repository](https://github.com/cli-toolkit/framework)
- [Examples Gallery](https://cli-toolkit.dev/examples)

---

**Built with ❤️ by the CLI Toolkit team**
`;

    const renderedMarkdown = await renderer.markdown(advancedMarkdown, {
        colorize: true,
        enableCodeBlocks: true,
        enableTables: true,
        enableMath: true,
        interactive: false,
        responsive: true,
        width: 100
    });

    console.log(renderedMarkdown);

    // 2. Syntax Highlighting for Multiple Languages
    console.log('\\n\\n🔍 MULTI-LANGUAGE SYNTAX HIGHLIGHTING:\\n');

    // TypeScript code
    const typescriptCode = `
interface AdvancedConfig {
    performance: {
        enableCaching: boolean;
        maxExecutionTime: number;
        workerCount?: number;
    };
    security: SecurityConfig;
    ai: {
        enabled: boolean;
        model: 'gpt-4' | 'claude-3' | 'local';
        maxTokens: number;
    };
}

class EnhancedFramework extends BaseFramework {
    private readonly config: AdvancedConfig;
    private readonly ai: AIAssistant;
    
    constructor(config: AdvancedConfig) {
        super();
        this.config = config;
        this.ai = new AIAssistant(config.ai);
    }
    
    async processWithAI<T>(input: T): Promise<T> {
        if (!this.config.ai.enabled) {
            return this.processStandard(input);
        }
        
        const optimizedInput = await this.ai.optimize(input);
        return this.processStandard(optimizedInput);
    }
}
`;

    console.log('🔷 TypeScript with Dracula Theme:');
    const highlightedTS = await renderer.code(typescriptCode, 'typescript');
    console.log(highlightedTS);

    // Python code
    const pythonCode = `
import asyncio
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

@dataclass
class PerformanceMetrics:
    execution_time: float
    memory_usage: int
    cache_hit_rate: float
    errors: List[str]

class AdvancedCLI:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.metrics = PerformanceMetrics(0.0, 0, 0.0, [])
        self._performance_monitor = PerformanceMonitor()
    
    async def execute_command(self, command: str) -> Optional[str]:
        \"\"\"Execute command with performance monitoring\"\"\"
        start_time = time.perf_counter()
        
        try:
            # AI-powered command optimization
            if self.config.get('ai_assist', False):
                command = await self.optimize_with_ai(command)
            
            result = await self._execute_internal(command)
            
            # Update metrics
            execution_time = time.perf_counter() - start_time
            self.metrics.execution_time = execution_time
            
            return result
            
        except Exception as e:
            self.metrics.errors.append(str(e))
            raise
    
    def format_output(self, data: Any, format_type: str = 'table') -> str:
        \"\"\"Format output with advanced styling\"\"\"
        formatters = {
            'table': self._format_table,
            'json': self._format_json,
            'yaml': self._format_yaml,
            'xml': self._format_xml
        }
        
        formatter = formatters.get(format_type, self._format_table)
        return formatter(data)
`;

    console.log('\\n🐍 Python with Syntax Highlighting:');
    const highlightedPython = await renderer.code(pythonCode, 'python');
    console.log(highlightedPython);

    // 3. Performance Metrics
    console.log('\\n\\n⚡ RICH TEXT PERFORMANCE METRICS:\\n');
    const richTextMetrics = renderer.getMetrics();
    console.log(`Documents Rendered: ${richTextMetrics.documentsRendered}`);
    console.log(`Syntax Highlighting Operations: ${richTextMetrics.syntaxHighlightingOps}`);
    console.log(`Average Render Time: ${richTextMetrics.averageRenderTime.toFixed(2)}ms`);
    console.log(`Cache Hit Rate: ${(richTextMetrics.cacheHitRate * 100).toFixed(1)}%`);
}

/**
 * Demo: Advanced UI Components
 */
async function demoAdvancedUIComponents() {
    console.log('\\n🎯 ADVANCED UI COMPONENTS DEMO\\n');

    const ui = new AdvancedUIBuilder({
        enableAnimations: true,
        enableResponsive: true,
        defaultTheme: 'modern'
    });

    // 1. Complex Dashboard Layout
    console.log('🖥️  ENTERPRISE DASHBOARD LAYOUT:\\n');

    // Create header
    const header = ui.text('🚀 CLI Toolkit Dashboard v6.0', {
        textAlign: TextAlignment.Center,
        bold: true,
        color: '\\x1b[36m',
        background: '\\x1b[44m',
        padding: { top: 1, bottom: 1, left: 2, right: 2 }
    });

    // Create metrics cards
    const cpuCard = ui.card('CPU Usage', '45%', ['Monitor', 'Optimize'], {
        borderStyle: 'rounded',
        status: 'success',
        width: 25
    });

    const memoryCard = ui.card('Memory', '68%', ['Details', 'Clear'], {
        borderStyle: 'rounded',
        status: 'warning',
        width: 25
    });

    const networkCard = ui.card('Network I/O', '23%', ['Statistics', 'Configure'], {
        borderStyle: 'rounded',
        status: 'info',
        width: 25
    });

    const diskCard = ui.card('Disk Usage', '82%', ['Cleanup', 'Expand'], {
        borderStyle: 'rounded',
        status: 'error',
        width: 25
    });

    // Create metrics row
    const metricsRow = ui.hstack([cpuCard, memoryCard, networkCard, diskCard], 2);

    // Create performance chart
    const chartData = [
        ['Time', 'CPU', 'Memory', 'Network'],
        ['00:00', '42%', '65%', '18%'],
        ['00:15', '45%', '68%', '23%'],
        ['00:30', '48%', '71%', '28%'],
        ['00:45', '44%', '69%', '21%'],
        ['01:00', '41%', '66%', '19%']
    ];

    const performanceChart = ui.table(
        chartData[0] as string[],
        chartData.slice(1) as string[][],
        {
            borderStyle: 'double',
            title: '📊 Performance Trends (Last Hour)',
            responsive: true,
            sortable: true
        }
    );

    // Create activity log
    const activityLog = ui.panel('📝 Recent Activity', ui.text(`
• 10:45 - System backup completed successfully
• 10:30 - New user registration: user@example.com
• 10:15 - Database optimization finished
• 10:00 - Cache cleared and refreshed
• 09:45 - Security scan completed - no issues found
• 09:30 - Performance monitoring started
`), {
        borderStyle: 'single',
        maxHeight: 8,
        scrollable: true
    });

    // Create alerts panel
    const alertsPanel = ui.panel('⚠️  System Alerts', ui.text(`
🔴 HIGH: Disk usage above 80% threshold
🟡 MEDIUM: Memory usage increasing trend
🟢 LOW: SSL certificate expires in 30 days
🔵 INFO: Backup scheduled for tonight
`), {
        borderStyle: 'thick',
        status: 'warning'
    });

    // Create main layout
    const leftColumn = ui.vstack([performanceChart, activityLog], 2);
    const rightColumn = ui.vstack([alertsPanel], 2);
    const contentRow = ui.hstack([leftColumn, rightColumn], 3);

    // Create footer
    const footer = ui.text('Press [Q] to quit • [R] to refresh • [S] for settings', {
        textAlign: TextAlignment.Center,
        color: '\\x1b[90m',
        padding: { top: 1 }
    });

    // Combine everything
    const dashboard = ui.vstack([header, metricsRow, contentRow, footer], 2);

    // Render with responsive sizing
    const rendered = ui.render(dashboard, 120, 40);
    console.log(rendered);

    // 2. Different Border Styles Showcase
    console.log('\\n\\n🎨 BORDER STYLES SHOWCASE:\\n');

    const borderDemo = [
        ui.box(ui.text('Single Border', { textAlign: TextAlignment.Center }), { borderStyle: 'single', width: 20 }),
        ui.box(ui.text('Double Border', { textAlign: TextAlignment.Center }), { borderStyle: 'double', width: 20 }),
        ui.box(ui.text('Rounded Border', { textAlign: TextAlignment.Center }), { borderStyle: 'rounded', width: 20 }),
        ui.box(ui.text('Thick Border', { textAlign: TextAlignment.Center }), { borderStyle: 'thick', width: 20 }),
        ui.box(ui.text('Dashed Border', { textAlign: TextAlignment.Center }), { borderStyle: 'dashed', width: 20 }),
        ui.box(ui.text('Dotted Border', { textAlign: TextAlignment.Center }), { borderStyle: 'dotted', width: 20 })
    ];

    const borderShowcase = ui.grid(borderDemo, 3, 2);
    console.log(ui.render(borderShowcase, 80));

    // 3. Responsive Layout Demo
    console.log('\\n\\n📱 RESPONSIVE LAYOUT DEMO:\\n');

    console.log('Wide screen layout (120 columns):');
    const wideLayout = ui.hstack([
        ui.panel('Panel 1', ui.text('Content for wide screens'), { width: 40 }),
        ui.panel('Panel 2', ui.text('More content'), { width: 40 }),
        ui.panel('Panel 3', ui.text('Even more content'), { width: 40 })
    ], 2);
    console.log(ui.render(wideLayout, 120));

    console.log('\\nNarrow screen layout (60 columns):');
    const narrowLayout = ui.vstack([
        ui.panel('Panel 1', ui.text('Content stacked vertically for narrow screens')),
        ui.panel('Panel 2', ui.text('More content below')),
        ui.panel('Panel 3', ui.text('Even more content at bottom'))
    ], 1);
    console.log(ui.render(narrowLayout, 60));

    // 4. Advanced Component Performance
    console.log('\\n\\n⚡ UI COMPONENTS PERFORMANCE:\\n');
    const uiMetrics = ui.getMetrics();
    console.log(`Components Rendered: ${uiMetrics.componentsRendered}`);
    console.log(`Layout Calculations: ${uiMetrics.layoutCalculations}`);
    console.log(`Average Render Time: ${uiMetrics.averageRenderTime.toFixed(2)}ms`);
    console.log(`Memory Usage: ${(uiMetrics.memoryUsage / 1024).toFixed(2)}KB`);
}

/**
 * Main demo execution
 */
async function main() {
    console.log('🎉 PHASE 6 ENHANCED FEATURES DEMO');
    console.log('=====================================');
    console.log('Showcasing dramatically improved CLI Toolkit Framework capabilities\\n');

    try {
        await demoAdvancedFormatting();
        await demoAdvancedInteractiveUI();
        await demoAdvancedTemplateEngine();
        await demoAdvancedRichText();
        await demoAdvancedUIComponents();

        console.log('\\n\\n🎊 DEMO COMPLETED SUCCESSFULLY!');
        console.log('=====================================');
        console.log('✨ All Phase 6 enhanced features demonstrated');
        console.log('🚀 Framework performance and capabilities significantly improved');
        console.log('🎯 Ready for enterprise production deployment');

    } catch (error) {
        console.error('\\n❌ Demo failed:', error);
        process.exit(1);
    }
}

// Run the demo
if (require.main === module) {
    main().catch(console.error);
}

export { main as runEnhancedDemo };

/**
 * Phase 6 Integration Demo
 * Comprehensive demonstration of Output Formatting & UI components
 */

import {
  // Output Formatting
  formatters,
  
  // Template Engine
  templates,
  
  // Rich Text Rendering
  richText,
  SYNTAX_THEMES,
  
  // UI Components
  ui,
  BOX_CHARS
} from '../src/index';

/**
 * Demo: Advanced Output Formatting
 */
async function demoOutputFormatting(): Promise<void> {
  console.log('\n🎨 Phase 6: Advanced Output Formatting Demo\n');
  
  // Demo data
  const data = [
    { name: 'John Doe', age: 30, role: 'Developer', salary: 75000 },
    { name: 'Jane Smith', age: 28, role: 'Designer', salary: 68000 },
    { name: 'Bob Johnson', age: 35, role: 'Manager', salary: 85000 }
  ];
  
  const metrics = {
    performance: 95.2,
    memory: 67.8,
    cpu: 23.4,
    network: 89.1
  };
  
  // JSON formatting
  console.log('📄 JSON Formatting:');
  const jsonOutput = formatters.json(metrics);
  console.log(jsonOutput.content);
  
  // YAML formatting
  console.log('\n📋 YAML Formatting:');
  const yamlOutput = formatters.yaml(metrics);
  console.log(yamlOutput.content);
  
  // CSV formatting
  console.log('\n📈 CSV Formatting:');
  const csvOutput = formatters.csv(data);
  console.log(csvOutput.content);
  
  // Pretty formatting
  console.log('\n✨ Pretty Formatting:');
  const prettyOutput = formatters.pretty(metrics);
  console.log(prettyOutput.content);
}

/**
 * Demo: Template Engine
 */
async function demoTemplateEngine(): Promise<void> {
  console.log('\n📝 Phase 6: Template Engine Demo\n');
  
  // Register custom helpers
  templates.registerHelper('formatCurrency', (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  });
  
  templates.registerHelper('badge', (text: string, color: string = 'blue') => {
    const colors: Record<string, string> = {
      red: '\x1b[41m\x1b[37m',
      green: '\x1b[42m\x1b[37m',
      blue: '\x1b[44m\x1b[37m',
      yellow: '\x1b[43m\x1b[30m'
    };
    const colorCode = colors[color] || colors.blue;
    return `${colorCode} ${text} \x1b[0m`;
  });
  
  // User profile template
  const profileTemplate = `
{{colorize "User Profile" "cyan"}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: {{capitalize name}}
Email: {{email}}
Role: {{badge role "green"}}
Salary: {{formatCurrency salary}}
Status: {{#if active}}{{badge "Active" "green"}}{{else}}{{badge "Inactive" "red"}}{{/if}}

Skills:
{{#each skills}}
  • {{this}}
{{/each}}

Performance Metrics:
{{#each metrics}}
  {{@key}}: {{progress this 100 20}}
{{/each}}

Last Login: {{formatDate lastLogin "DD/MM/YYYY HH:mm"}}
`;
  
  const userData = {
    name: 'john doe',
    email: 'john.doe@company.com',
    role: 'developer',
    salary: 75000,
    active: true,
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
    metrics: {
      productivity: 87,
      quality: 92,
      collaboration: 78,
      innovation: 85
    },
    lastLogin: new Date()
  };
  
  const renderedProfile = templates.render(profileTemplate, userData);
  console.log(renderedProfile);
}

/**
 * Demo: Rich Text Rendering
 */
async function demoRichTextRendering(): Promise<void> {
  console.log('\n🎨 Phase 6: Rich Text Rendering Demo\n');
  
  // Markdown rendering
  const markdownContent = `
# CLI Toolkit Framework

Welcome to the **advanced** CLI toolkit with *rich* formatting support!

## Features

- ~~Basic~~ **Advanced** output formatting
- Interactive prompts and progress indicators
- Template engine with custom helpers
- Syntax highlighting for multiple languages
- Responsive UI components

### Code Example

\`\`\`typescript
import { ui, formatters } from 'cli-toolkit';

function main() {
  const data = { name: 'example', timestamp: new Date() };
  console.log(formatters.json(data).content);
}
\`\`\`

### Performance Table

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Speed  | 100ms  | 45ms  | 55% faster |
| Memory | 25MB   | 12MB  | 52% less   |
| CPU    | 80%    | 35%   | 56% less   |

---

> **Note**: This framework provides enterprise-grade CLI capabilities with zero configuration.

For more information, visit: https://github.com/cli-toolkit/framework
`;
  
  console.log('📖 Markdown Rendering:');
  const renderedMarkdown = richText.markdown(markdownContent, {
    colorize: true,
    width: 80,
    enableCodeBlocks: true,
    enableTables: true,
    enableLists: true
  });
  console.log(renderedMarkdown);
  
  // Code syntax highlighting
  console.log('\n💻 Code Syntax Highlighting:');
  
  const codeExamples = [
    {
      language: 'typescript',
      code: `interface User {
  id: number;
  name: string;
  active: boolean;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}`
    },
    {
      language: 'python',
      code: `def calculate_fibonacci(n: int) -> int:
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return calculate_fibonacci(n - 1) + calculate_fibonacci(n - 2)

# Example usage
result = calculate_fibonacci(10)
print(f"The 10th Fibonacci number is: {result}")`
    }
  ];
  
  for (const example of codeExamples) {
    console.log(`\n${example.language.toUpperCase()}:`);
    const highlighted = richText.code(example.code, example.language, {
      theme: SYNTAX_THEMES.monokai
    });
    console.log(highlighted);
  }
}

/**
 * Demo: UI Components
 */
async function demoUIComponents(): Promise<void> {
  console.log('\n🏗️ Phase 6: UI Components Demo\n');
  
  // Text components
  const title = ui.text('CLI Toolkit Dashboard', {
    textAlign: 'center',
    foreground: '\x1b[1;36m' // Bold cyan
  });
  
  const subtitle = ui.text('Enterprise-grade command line interface framework', {
    textAlign: 'center',
    foreground: '\x1b[90m' // Gray
  });
  
  // Status cards
  const statusData = [
    { title: 'Active Users', value: '1,247', trend: '+12%', color: '\x1b[32m' },
    { title: 'Commands/sec', value: '342', trend: '+8%', color: '\x1b[33m' },
    { title: 'Uptime', value: '99.9%', trend: '0%', color: '\x1b[36m' },
    { title: 'Memory Usage', value: '67MB', trend: '-5%', color: '\x1b[35m' }
  ];
  
  const statusCards = statusData.map(stat => {
    const content = `${stat.title}\n${stat.color}${stat.value}\x1b[0m ${stat.trend}`;
    return ui.box(ui.text(content, { textAlign: 'center' }), {
      borderStyle: 'rounded',
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      borderColor: stat.color
    });
  });
  
  // Performance table
  const performanceTable = ui.table(
    ['Component', 'Load Time', 'Memory', 'CPU'],
    [
      ['CLI Parser', '23ms', '2.1MB', '0.8%'],
      ['Command Registry', '15ms', '1.7MB', '0.5%'],
      ['Output Formatter', '31ms', '3.2MB', '1.2%'],
      ['Template Engine', '28ms', '2.8MB', '1.0%']
    ],
    { borderStyle: 'single' }
  );
  
  // System information panel
  const systemInfo = ui.text(`
OS: ${process.platform}
Node.js: ${process.version}
Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
Uptime: ${Math.round(process.uptime())}s
`, { foreground: '\x1b[37m' });
  
  const systemPanel = ui.panel('System Information', systemInfo, {
    borderStyle: 'double',
    borderColor: '\x1b[34m'
  });
  
  // Create layout
  const header = ui.vstack([title, subtitle], 0);
  const statusRow = ui.hstack(statusCards, 2);
  const mainContent = ui.hstack([performanceTable, systemPanel], 2);
  const dashboard = ui.vstack([header, statusRow, mainContent], 2);
  
  // Render dashboard
  console.log('📊 Dashboard Layout:');
  const dashboardOutput = ui.render(dashboard, 120, 30);
  console.log(dashboardOutput);
  
  // Box drawing examples
  console.log('\n📦 Box Drawing Styles:');
  const boxStyles = Object.keys(BOX_CHARS) as Array<keyof typeof BOX_CHARS>;
  
  for (const style of boxStyles) {
    const styledBox = ui.box(
      ui.text(`${style} border style`, { textAlign: 'center' }), 
      { 
        borderStyle: style,
        padding: { top: 1, right: 2, bottom: 1, left: 2 }
      }
    );
    console.log(`\n${style.toUpperCase()}:`);
    console.log(ui.render(styledBox));
  }
}

/**
 * Demo: Integration Example
 */
async function demoIntegration(): Promise<void> {
  console.log('\n🔗 Phase 6: Integration Example\n');
  
  // Simulate a CLI application workflow
  console.log('Building a sample CLI application...\n');
  
  // Simple progress simulation
  console.log('Installing dependencies...');
  for (let i = 0; i <= 100; i += 10) {
    const progress = '█'.repeat(Math.floor(i/5)) + '░'.repeat(20 - Math.floor(i/5));
    process.stdout.write(`\r[${progress}] ${i}%`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log('\n✅ Dependencies installed\n');
  
  // Configuration template
  const configTemplate = `
# Application Configuration
name: {{name}}
version: {{version}}
description: {{description}}

server:
  port: {{server.port}}
  host: {{server.host}}
  ssl: {{#if server.ssl}}enabled{{else}}disabled{{/if}}

database:
  type: {{database.type}}
  host: {{database.host}}
  port: {{database.port}}
  
features:
{{#each features}}
  - {{name}}: {{#if enabled}}✅{{else}}❌{{/if}}
{{/each}}

environment: {{badge environment "green"}}
`;
  
  const configData = {
    name: 'CLI Toolkit App',
    version: '1.0.0',
    description: 'Advanced CLI application with rich formatting',
    server: {
      port: 3000,
      host: 'localhost',
      ssl: true
    },
    database: {
      type: 'postgresql',
      host: 'localhost',
      port: 5432
    },
    features: [
      { name: 'Authentication', enabled: true },
      { name: 'Caching', enabled: true },
      { name: 'Monitoring', enabled: false },
      { name: 'Analytics', enabled: true }
    ],
    environment: 'production'
  };
  
  console.log('📄 Generated Configuration:');
  const configOutput = templates.render(configTemplate, configData);
  console.log(configOutput);
  
  // Final summary
  const summary = ui.card(
    'Deployment Summary',
    'Application successfully configured and ready for deployment. All components are functioning optimally.',
    ['Deploy', 'Test', 'Monitor']
  );
  
  console.log('\n📋 Summary:');
  console.log(ui.render(summary, 60));
}

/**
 * Main demo function
 */
export async function runPhase6Demo(): Promise<void> {
  console.log('🚀 CLI Toolkit Framework - Phase 6 Demo');
  console.log('==========================================\n');
  
  try {
    await demoOutputFormatting();
    await demoTemplateEngine();
    await demoRichTextRendering();
    await demoUIComponents();
    await demoIntegration();
    
    console.log('\n🎉 Phase 6 Demo Complete!');
    console.log('All output formatting and UI components are working perfectly.');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if called directly
if (require.main === module) {
  runPhase6Demo().catch(console.error);
}

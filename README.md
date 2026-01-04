# CLI Toolkit Framework

**An enterprise-grade TypeScript CLI framework with dependency injection, middleware pipelines, and performance optimizations.**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-success?style=flat&logo=node.js)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/Version-0.1.0--beta.1-blue?style=flat)](https://github.com/sirhCC/CLItoolkit)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](LICENSE)

---

## 🎯 Who Is This For?

**Use this if you need:**
- Complex CLI applications with multiple commands and subcommands
- Dependency injection and service lifecycle management
- Middleware pipelines for validation, logging, and error handling
- High-throughput CLI tools (100K+ operations/second)
- Advanced memory optimization and object pooling

**Use Commander.js if you need:**
- A simple CLI tool up and running in 5 minutes
- Battle-tested library with 10+ years of production use
- Minimal learning curve and straightforward API

**The honest truth**: This framework is overbuilt for most CLI tools. It's designed for teams building sophisticated command-line applications where DI patterns, middleware, and microsecond optimizations actually matter.

---

## ⚡ Performance First

Real benchmarks against Commander.js and Yargs (1000 iterations):

| Operation | CLI Toolkit | Commander | Yargs | Improvement |
|-----------|-------------|-----------|-------|-------------|
| Simple Parsing | **194K ops/sec** | 74K ops/sec | 523 ops/sec | **2.6x faster** |
| Complex Parsing | **153K ops/sec** | 46K ops/sec | 260 ops/sec | **3.4x faster** |
| Command Execution | **110K ops/sec** | 69K ops/sec | 668 ops/sec | **1.6x faster** |

**Reality check**: The difference between 0.005ms and 0.014ms won't matter for most CLI tools. Choose based on architecture needs, not microseconds.

Run benchmarks: `npm run benchmark:vs`

**How we achieve this:**
- Zero-copy string parsing with `StringView` interface (no substring allocations)
- Object pooling with 96%+ cache hit rates
- Adaptive buffer management for high-frequency operations
- Pattern compilation caching with `PatternCache`

---

## 🚀 Quick Start

```bash
# Clone and install
git clone <repository-url>
cd CLItoolkit
npm install

# Try the real-world example
npm run demo:env

# Run tests
npm test

# Compare performance
npm run benchmark:vs
```

---

## 📦 Status: Beta (v0.1.0-beta.1)

**Production-Ready:**
- ✅ Argument parsing with flags, options, and subcommands
- ✅ Fluent command builder with type safety
- ✅ Service container with lifecycle management (singleton, transient, scoped)
- ✅ Execution middleware pipeline
- ✅ Zod schema validation
- ✅ Performance optimizations (object pooling, zero-copy, memory management)

**Known Limitations:**
- ⚠️ Not yet published to npm (install from source)
- ⚠️ Limited production battle-testing
- ⚠️ Some advanced features may be overkill for simple CLIs
- ⚠️ Documentation could be more comprehensive

---

## Quick Start

```bash
# Install dependencies
npm install

# Try the demo
npm run demo:env

# Run tests
npm test

# Run benchmarks
npm run benchmark:vs
```

## 💡 Simple Example

```typescript
import { CommandBuilder } from 'cli-toolkit-framework';

// Build a command with the fluent API
const createCmd = new CommandBuilder('create', 'Create new environment')
  .addArgument({
    name: 'name',
    description: 'Environment name',
    required: true,
    type: 'string'
  })
  .addOption({
    name: 'copy-from',
    description: 'Copy from existing environment',
    alias: 'c',
    type: 'string'
  })
  .setAction(async (context) => {
    const { name } = context.args;
    const { 'copy-from': copyFrom } = context.options;
    
    console.log(`Creating environment: ${name}`);
    if (copyFrom) {
      console.log(`Copying from: ${copyFrom}`);
    }
    
    return { success: true };
  })
  .build();

// Execute: node cli.js create prod --copy-from staging
```

---

## 🏗️ Architecture Highlights

### 1. **Dependency Injection Container**

Full-featured DI with service lifetimes and circular dependency detection:

```typescript
import { EnhancedServiceContainer, ServiceLifetime } from 'cli-toolkit-framework';

const container = new EnhancedServiceContainer();

// Register services with lifecycle management
container.register('logger', LoggerService, ServiceLifetime.Singleton);
container.register('config', ConfigService, ServiceLifetime.Scoped);

// Resolve with dependencies injected
const logger = container.resolve<LoggerService>('logger');
```📂 Project Structure

```
src/
├── core/                          # Core framework
│   ├── enhanced-cli-framework.ts  # Main framework with DI integration
│   ├── enhanced-service-container.ts # DI container with lifecycle management
│   ├── execution-pipeline.ts      # Middleware pipeline
│   ├── command-builder.ts         # Fluent API for building commands
│   ├── command-executor.ts        # Command execution with concurrency control
│   ├── argument-parser.ts         # Fast argument parsing
│   ├── optimized-parser.ts        # Zero-copy parser implementation
│   └── advanced-object-pool.ts    # Object pooling for performance
│
├── utils/                         # Performance & utilities
│   ├── adaptive-performance-optimizer.ts # Adaptive optimization engine
│   ├── memory-optimizer.ts        # Memory management and leak detection
│   ├── buffer-pool-manager.ts     # Buffer pooling for string operations
│   └── performance-monitor.ts     # Benchmarking and metrics
│
├── types/                         # TypeScript interfaces
│   ├── index.ts                   # Core type definitions
│   └── middleware.ts              # Middleware types
│
└── index.ts                       # Public API exports

tests/                             # Test suites
benchmarks/                        # Performance comparisons
examples/real-world/               # Production-like examples
```

---

## 🔧 Development

```bash
# Development
npm run dev              # Run in dev mode
npm run dev:watch        # Watch mode with auto-reload

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report

# Performance
npm run benchmark:vs     # Compare vs Commander/Yargs
npm run perf:enhanced    # Enhanced performance benchmarks
npm run adaptive:report  # Adaptive optimization analysis

# Build
npm run build           # Production build
npm run build:analyze   # Analyze bundle size
npm run build:watch     # Watch mode for development

# Code Quality
npm run lint            # Check code style
npm run lint:fix        # Auto-fix issues
npm run format          # Format with Prettier
npm run type-check      # TypeScript validation
npm run validate        # Full validation (type + lint + test + build)
```

---

## 🎓 When to Use This Framework

### ✅ **Good Fit**

- **Complex enterprise CLIs** with multiple commands, subcommands, and workflows
- **High-throughput tools** processing thousands of commands per second
- **Dependency injection needs** for testability and modularity
- **Middleware requirements** for cross-cutting concerns (validation, logging, metrics)
- **Teams familiar with DI patterns** from NestJS, Spring, or .NET

### ❌ **Overkill For**

- **Simple scripts** with 1-2 commands (use Commander.js)
- **Quick prototypes** needing minimal setup
- **Teams wanting convention over configuration**
- **Projects prioritizing simplicity** over advanced features

---

## 📖 Documentation

- **[ROADMAP_PRIORITY.md](ROADMAP_PRIORITY.md)** - Development roadmap and completed milestones
- **[examples/real-world/](examples/real-world/)** - Complete working examples
- **[src/types/](src/types/)** - TypeScript interfaces and type definitions

---

## 🤝 Contributing

This project needs real-world validation. We welcome:

1. **Production usage stories** - Tell us how you're using it
2. **Bug reports** with reproducible test cases
3. **Performance improvements** backed by benchmarks
4. **Documentation enhancements** for clarity
5. **Real-world examples** beyond toy demos

See [ROADMAP_PRIORITY.md](ROADMAP_PRIORITY.md) for current priorities.

---

## 📊 Comparison Matrix

| Feature | CLI Toolkit | Commander.js | Yargs |
|---------|-------------|--------------|-------|
| **Learning Curve** | Steep | Easy | Moderate |
| **Setup Time** | 15-30 min | 5 min | 10 min |
| **DI Container** | ✅ Full | ❌ No | ❌ No |
| **Middleware** | ✅ Pipeline | ❌ No | ⚠️ Limited |
| **Performance** | 194K ops/sec | 74K ops/sec | 523 ops/sec |
| **Object Pooling** | ✅ Yes | ❌ No | ❌ No |
| **Memory Optimization** | ✅ Advanced | ⚠️ Basic | ⚠️ Basic |
| **Production Battle-Tested** | ⚠️ Beta | ✅ 10+ years | ✅ 8+ years |
| **npm Weekly Downloads** | 0 (unreleased) | 25M+ | 18M+ |
| **Best For** | Enterprise CLIs | Simple CLIs | Feature-rich CLIs |

---

## 🔬 Technical Deep Dive

### Memory Management

- **Object pooling**: `AdvancedObjectPool` with adaptive sizing (70-85% gains)
- **Buffer pooling**: `BufferPoolManager` for string reuse
- **Leak detection**: `AdvancedMemoryOptimizer` monitors allocation patterns
- **Metrics**: Real-time pool analytics with >96% hit rates

### Zero-Copy Architecture

- **StringView interface**: Operations on string slices without allocations
- **Pattern caching**: Compiled regex reuse with `PatternCache`
- **Reference management**: Weak references for cache optimization

### Service Container

- **Lifetimes**: Singleton (app-wide), Scoped (per-request), Transient (per-resolve)
- **Circular detection**: Prevents dependency cycles
- **Lazy resolution**: Services instantiated on first use
- **Disposal**: Automatic cleanup with `IDisposable` pattern

---

## 📄 License

MIT © 2026

---

## 🛣️ What's Next

See [ROADMAP_PRIORITY.md](ROADMAP_PRIORITY.md) for:
- npm publication timeline
- Planned features and improvements
- Known issues and limitations
- Community feedback priorities

**Current Focus**: Gathering production usage data and real-world feedback before npm release
Environment configuration manager with:
- Multiple commands (create, list, delete, switch)
- Service injection (ConfigService, LoggerService)
- Validation and error handling
- Interactive prompts

Run it: `npm run demo:env`

---

## Project Structure

```
src/
├── core/              # Core implementations
│   ├── argument-parser.ts
│   ├── command-builder.ts
│   ├── command-registry.ts
│   └── enhanced-service-container.ts
├── utils/             # Utilities and optimizations
│   ├── performance.ts
│   ├── memory-manager.ts
│   └── advanced-optimization-hub.ts
├── types/             # TypeScript definitions
└── index.ts           # Main entry point

tests/                 # Test suites (12 test files)
examples/              # Usage examples
benchmarks/            # Performance comparisons
```

## Documentation

- **[ROADMAP_PRIORITY.md](ROADMAP_PRIORITY.md)** - Development priorities and what's done
- **[examples/real-world/](examples/real-world/)** - Complete working example
- **[src/types/](src/types/)** - Type definitions and interfaces

## What Makes This Different?

**Commander.js**: Simple, mature, widely used. If you want battle-tested and minimal, use Commander.

**Yargs**: Feature-rich with great docs. If you need complex parsing and lots of helpers, use Yargs.

**CLI Toolkit**: Advanced features like DI, middleware, object pooling. If you're building complex CLI tools and want modern patterns, try this.

## Development

```bash
# Development mode
npm run dev

# Watch tests
npm run test:watch

# Type check
npm run type-check

# Lint & format
npm run lint:fix
npm run format

# Build
npm run build
```

## Contributing

This project is in active development. Check the roadmap for priorities. PRs welcome for:

1. Real-world usage examples
2. Bug fixes and performance improvements
3. Documentation improvements
4. Test coverage for edge cases

## License

MIT © [Your Name]

---

**Honest Assessment**: This is a solid foundation for a CLI framework with some genuinely useful optimizations. But it's over-engineered in places and needs real-world validation. Use it if you need the advanced features. Otherwise, Commander.js is probably fine.

See [ROADMAP_PRIORITY.md](ROADMAP_PRIORITY.md) for what's next.

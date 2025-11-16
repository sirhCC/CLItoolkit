# CLI Toolkit Framework

**A modern TypeScript CLI framework focused on performance and developer experience.**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-success?style=flat&logo=node.js)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/Version-0.1.0--beta.1-blue?style=flat)](https://github.com/sirhCC/CLItoolkit)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](LICENSE)

## What Is This?

A TypeScript framework for building command-line tools with advanced features like object pooling, dependency injection, and middleware pipelines. Currently in beta - the core works, but it needs real-world testing.

## Status: Beta (v0.1.0-beta.1)

**Working:**
- ✅ Argument parsing (flags, options, subcommands)
- ✅ Command builder with fluent API
- ✅ Dependency injection container
- ✅ Validation with Zod schemas
- ✅ Performance optimizations (object pooling, zero-copy parsing)

**Needs Work:**
- ⚠️ Not published to npm yet
- ⚠️ Needs more real-world usage
- ⚠️ Some features are over-engineered

## Performance vs Competitors

Benchmarked against Commander.js and Yargs (1000 iterations):

| Test | CLI Toolkit | Commander | Yargs |
|------|-------------|-----------|-------|
| Simple Parsing | 194K ops/sec | 74K ops/sec | 523 ops/sec |
| Complex Parsing | 153K ops/sec | 46K ops/sec | 260 ops/sec |
| Command Execution | 110K ops/sec | 69K ops/sec | 668 ops/sec |

**Reality check**: We're 2-3x faster than Commander, but the difference is microseconds (0.005ms vs 0.014ms). For typical CLI usage, all frameworks are plenty fast. Choose based on features you need.

Run the benchmarks yourself: `npm run benchmark:vs`

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

## Real-World Example

See [`examples/real-world/env-manager.ts`](examples/real-world/env-manager.ts) for a complete CLI tool that manages environment configurations.

```typescript
import { CommandBuilder } from 'cli-toolkit-framework';

const command = new CommandBuilder('create', 'Create new environment')
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
    
    // Your command logic here
    console.log(`Creating environment: ${name}`);
    
    return { success: true };
  })
  .build();
```

## Key Features

### Command Builder
Fluent API for building commands with validation and type safety.

### Argument Parser
Handles flags, options, multi-value arguments, and subcommands.

### Dependency Injection
Service container with singleton, transient, and scoped lifetimes.

### Performance
Object pooling, zero-copy parsing, and memory optimization for high-throughput scenarios.

### Validation
Zod-powered schema validation with custom rules.

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

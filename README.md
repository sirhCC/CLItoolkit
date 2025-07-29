# 🚀 CLI Toolkit Framework

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Jest](https://img.shields.io/badge/Jest-323330?style=for-the-badge&logo=Jest&logoColor=white)](https://jestjs.io/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://choosealicense.com/licenses/mit/)

> A modern, extensible, and developer-friendly CLI toolkit framework built with TypeScript. Create powerful command-line applications with ease.

## ✨ Features

🎯 **Type-Safe & Modern**
- Built with strict TypeScript for bulletproof type safety
- Modern ES2022+ features and async/await support
- Comprehensive error handling with custom error hierarchy

⚡ **High Performance**
- Lazy loading for optimal startup times
- Built-in caching and memoization
- Memory-efficient plugin architecture

🔧 **Developer Experience**
- Fluent, chainable API design
- Auto-completion support (Bash, Zsh, PowerShell)
- Rich output formatting with colors and progress indicators
- Interactive wizards for complex workflows

🧩 **Extensible Architecture**
- Plugin system for unlimited extensibility
- Event-driven architecture with lifecycle hooks
- Dependency injection container
- Configuration layering (CLI args > env vars > config files)

🛡️ **Production Ready**
- Comprehensive testing with Jest
- Input validation and sanitization
- Structured logging with multiple formats
- Cross-platform compatibility

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Watch mode for development
npm run test:watch
```

## 📁 Project Structure

```
cli-toolkit-framework/
├── 📁 src/
│   ├── 📁 types/           # Core type definitions
│   │   ├── command.ts      # Command interfaces
│   │   ├── config.ts       # Configuration types
│   │   ├── errors.ts       # Error classes & events
│   │   └── index.ts        # Type exports
│   └── index.ts            # Main entry point
├── 📁 tests/
│   ├── 📁 helpers/         # Test utilities
│   └── 📁 types/           # Type definition tests
├── 📁 dist/                # Compiled output
└── 📋 Configuration files
```

## 🎯 Core Concepts

### Commands

Define powerful, type-safe commands with a fluent API:

```typescript
interface ICommand {
  name: string;
  description: string;
  arguments?: IArgument[];
  options?: IOption[];
  execute(context: ICommandContext): Promise<ICommandResult>;
}
```

### Type Safety

Every aspect is fully typed for maximum developer productivity:

```typescript
// Strongly typed command results
interface ICommandResult {
  success: boolean;
  exitCode: number;
  data?: any;
  message?: string;
  error?: Error;
}

// Rich execution context
interface ICommandContext {
  args: string[];
  options: Record<string, any>;
  rawArgs: string[];
  command: ICommand;
}
```

### Error Handling

Comprehensive error hierarchy for better debugging:

```typescript
// Custom error classes
export class ValidationError extends CliError
export class CommandNotFoundError extends CliError
export class CommandExecutionError extends CliError
export class ConfigurationError extends CliError
```

## 🧪 Testing

We believe in test-driven development:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Results ✅

```
Test Suites: 2 passed, 2 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        2.103s
```

## 🛠️ Development Tools

### Built-in Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Run in development mode |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Lint code with ESLint |
| `npm run format` | Format code with Prettier |

### Code Quality

- **ESLint** with TypeScript rules
- **Prettier** for consistent formatting
- **Jest** for comprehensive testing
- **TypeScript** strict mode enabled

## 🗺️ Roadmap

We're following a comprehensive 24-week development plan:

### Phase 1: Foundation ✅ (Current)
- [x] Project setup & TypeScript configuration
- [x] Testing infrastructure with Jest
- [x] Core type system & interfaces
- [x] ESLint & Prettier configuration

### Phase 2: Parsing Engine 🔄 (Next)
- [ ] Argument parsing & tokenization
- [ ] Option validation with Zod
- [ ] Environment variable integration

### Phase 3: Command System
- [ ] Command registry & discovery
- [ ] Fluent command builder API
- [ ] Async execution framework

### Phase 4: Advanced Features
- [ ] Plugin system & extensibility
- [ ] Interactive wizards
- [ ] Auto-completion scripts
- [ ] Rich output formatting

[View Full Roadmap →](./cli_toolkit_guidelines.md#%EF%B8%8F-cli-toolkit-framework-development-roadmap)

## 📊 Current Status

```
🏗️  Foundation:     ████████████████████ 100%
⚙️  Parsing Engine: ░░░░░░░░░░░░░░░░░░░░   0%
🎯  Command System: ░░░░░░░░░░░░░░░░░░░░   0%
🚀  Advanced:       ░░░░░░░░░░░░░░░░░░░░   0%
```

## 🔧 Technologies

- **TypeScript** - Type-safe development
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Node.js** - Runtime environment

## 📖 Documentation

- [Development Guidelines](./cli_toolkit_guidelines.md) - Comprehensive development principles
- [Roadmap](./cli_toolkit_guidelines.md#roadmap) - 24-week development plan
- [API Reference](./src/types/index.ts) - Type definitions and interfaces

## 🤝 Contributing

We welcome contributions! Please see our [development guidelines](./cli_toolkit_guidelines.md) for coding standards and architecture principles.

### Key Principles

- **Guard Clauses** for clean function logic
- **Single Responsibility Principle** 
- **Fluent Interfaces** for chainable APIs
- **Immutability** to avoid side effects
- **Test-Driven Development**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

<div align="center">

**Built with ❤️ and TypeScript**

[Report Bug](../../issues) · [Request Feature](../../issues) · [Discussions](../../discussions)

</div>

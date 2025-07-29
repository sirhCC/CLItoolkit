# 🚀 CLI Toolkit Framework

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Jest](https://img.shields.io/badge/Jest-323330?style=for-the-badge&logo=Jest&logoColor=white)](https://jestjs.io/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://choosealicense.com/licenses/mit/)

> A modern, extensible, and developer-friendly CLI toolkit framework built with TypeScript. Create powerful command-line applications with comprehensive argument parsing, validation, and command management.

## ✨ Features

🎯 **Type-Safe & Modern**
- Built with strict TypeScript for bulletproof type safety
- Modern ES2022+ features and async/await support
- Comprehensive error handling with custom error hierarchy

⚡ **Advanced Argument Parsing**
- Sophisticated tokenization and parsing engine
- Support for flags, options, and positional arguments
- Multi-value options and array handling
- Environment variable integration
- Subcommand parsing with hierarchical structure

� **Robust Validation**
- Zod-powered schema validation
- Custom validation rules and type coercion
- Input sanitization and security checks
- Conditional validation logic

🗂️ **Command Registry System**
- Hierarchical command organization
- Lazy loading with intelligent caching
- Rich metadata support (aliases, categories, tags)
- Command search and discovery
- Case-sensitive/insensitive matching

🛠️ **Command Builder Pattern**
- Fluent API for creating commands with method chaining
- Built-in validation with helpful error messages
- Lifecycle management with setup/teardown hooks
- Type-safe argument and option configuration
- Comprehensive examples and test coverage

🔧 **Configuration & Dependency Injection**
- Multi-layer configuration system (CLI args, env vars, config files)
- JSON, YAML, and TOML configuration file support
- Advanced dependency injection container
- Service lifecycle management (singleton, transient, scoped)
- Circular dependency detection and resolution
- Built-in service interfaces for common needs

🧩 **Developer Experience**
- Fluent, chainable API design
- Comprehensive testing (354+ tests)
- Rich output formatting capabilities
- Event-driven architecture with lifecycle hooks

🛡️ **Production Ready**
- Memory-efficient with configurable cache limits
- Cross-platform compatibility
- Structured logging and error handling
- Zero security vulnerabilities

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

### Basic Usage Example

```typescript
import { CliFramework, CommandRegistry, ArgumentParser } from 'cli-toolkit-framework';

// Create a simple command
class HelloCommand implements ICommand {
  name = 'hello';
  description = 'Say hello to someone';
  
  async execute(context: ICommandContext): Promise<ICommandResult> {
    const name = context.args[0] || 'World';
    return {
      success: true,
      exitCode: 0,
      message: `Hello, ${name}!`
    };
  }
}

// Set up CLI framework
const cli = new CliFramework({
  name: 'my-cli',
  version: '1.0.0',
  description: 'My awesome CLI application'
});

// Register command
cli.registerCommand(new HelloCommand());

// Parse and execute
const args = process.argv.slice(2);
const result = await cli.execute(args);
console.log(result.message);
```

### Using the Command Builder Pattern

```typescript
import { createCommand } from 'cli-toolkit-framework';

// Create a command using the fluent builder API
const fileCommand = await createCommand()
  .name('process-file')
  .description('Process a file with various options')
  .alias('pf')
  .argument('input', 'Input file path', {
    required: true,
    type: 'string',
    validator: (value: string) => {
      if (!value.endsWith('.txt')) {
        return 'Input file must be a .txt file';
      }
      return true;
    }
  })
  .argument('output', 'Output file path', {
    required: false,
    defaultValue: 'output.txt'
  })
  .option('--format', 'Output format', {
    type: 'string',
    choices: ['json', 'xml', 'csv'],
    defaultValue: 'json'
  })
  .option('--verbose', 'Enable verbose logging', {
    alias: 'v',
    type: 'boolean'
  })
  .setup(async () => {
    console.log('Setting up file processor...');
  })
  .teardown(async () => {
    console.log('Cleaning up...');
  })
  .action(async (context) => {
    const [input, output] = context.args;
    const { format, verbose } = context.options;
    
    if (verbose) {
      console.log(`Processing ${input} -> ${output} (${format})`);
    }
    
    return {
      success: true,
      exitCode: 0,
      message: `File processed successfully`
    };
  })
  .build();

// Register with CLI framework
cli.registerCommand(fileCommand);
```

### Using the Command Registry

```typescript
import { CommandRegistry } from 'cli-toolkit-framework';

const registry = new CommandRegistry();

// Register hierarchical commands
await registry.register(['git', 'remote', 'add'], () => new GitRemoteAddCommand(), {
  description: 'Add a remote repository',
  category: 'git',
  aliases: ['gra'],
  tags: ['git', 'remote']
});

// Search for commands
const gitCommands = await registry.search('git');
const remoteCommands = await registry.getByCategory('git');

// Resolve commands from arguments
const result = await registry.resolve(['git', 'remote', 'add', 'origin', 'url']);
```

### Using Dependency Injection

```typescript
import { 
  EnhancedServiceContainer, 
  createServiceToken, 
  ServiceLifetime 
} from 'cli-toolkit-framework';

// Define service interfaces
interface IUserService {
  getUser(id: string): Promise<User>;
}

interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

// Create service tokens
const UserServiceToken = createServiceToken<IUserService>('IUserService');
const EmailServiceToken = createServiceToken<IEmailService>('IEmailService');

// Create service container
const container = new EnhancedServiceContainer();

// Register services with dependencies
container.registerSingleton(
  EmailServiceToken, 
  EmailService
);

container.registerTransient(
  UserServiceToken, 
  UserService, 
  [EmailServiceToken] // Dependencies injected automatically
);

// Use services
const userService = await container.get(UserServiceToken);
const user = await userService.getUser('123');

// Service scopes for request-based services
await container.withScope(async (scope) => {
  const scopedUserService = await scope.get(UserServiceToken);
  // Use scoped service...
});
```

## 📁 Project Structure

```
cli-toolkit-framework/
├── 📁 src/
│   ├── 📁 core/             # Core implementations
│   │   ├── argument-parser.ts    # Advanced argument parsing engine
│   │   ├── base-implementations.ts # Base command, context, result classes
│   │   ├── cli-framework.ts      # Main CLI framework
│   │   ├── command-builder.ts    # Fluent command builder with validation
│   │   └── command-registry.ts   # Command registry with lazy loading
│   ├── 📁 types/            # TypeScript definitions
│   │   ├── builder.ts       # Command builder interfaces
│   │   ├── command.ts       # Command interfaces & types
│   │   ├── config.ts        # Configuration types
│   │   ├── errors.ts        # Error classes & event types
│   │   ├── registry.ts      # Command registry interfaces
│   │   └── validation.ts    # Validation types & schemas
│   └── index.ts             # Main entry point & exports
├── 📁 tests/
│   ├── 📁 core/             # Core functionality tests
│   │   ├── argument-parser.test.ts    # Argument parsing tests (61 tests)
│   │   ├── base-implementations.test.ts # Base classes tests (26 tests)
│   │   ├── cli-framework.test.ts       # CLI framework tests (20 tests)
│   │   └── command-registry.test.ts    # Command registry tests (46 tests)
│   ├── command-builder.test.ts         # Command builder tests (87 tests)
│   ├── 📁 helpers/          # Test utilities
│   │   └── test-utils.test.ts         # Test helper tests
│   └── 📁 types/            # Type definition tests
│       └── command.test.ts             # Command type tests
├── 📁 examples/             # Usage examples and demos
│   └── command-builder-demo.ts        # Command builder examples
├── 📁 docs/                 # Documentation and guides
│   ├── README.md            # Documentation index
│   ├── cli_toolkit_guidelines.md      # Development guidelines & roadmap
│   ├── PHASE_3_1_COMPLETION.md        # Phase 3.1 completion summary
│   └── COMMAND_BUILDER_SUMMARY.md     # Command builder technical details
├── 📁 dist/                 # Compiled output
└── 📋 Configuration files (package.json, tsconfig.json, jest.config.js, etc.)
```

## 🎯 Core Concepts

### Argument Parser

Advanced parsing engine with comprehensive feature support:

```typescript
// Parse complex command line arguments
const parser = new ArgumentParser();
const result = await parser.parse([
  'command', '--flag', '--option=value', 
  '--multi', 'val1', 'val2', 'positional'
]);
```

Features include:
- **Boolean flags** (`--flag`, `-f`)
- **String/number options** (`--option=value`, `--option value`)
- **Multi-value options** (`--tags tag1 tag2 tag3`)
- **Positional arguments** with validation
- **Environment variable integration**
- **Subcommand parsing** with inheritance

### Command Registry

Hierarchical command organization with lazy loading:

```typescript
// Register commands with rich metadata
await registry.register(['git', 'remote', 'add'], commandFactory, {
  description: 'Add a remote repository',
  aliases: ['ra'],
  category: 'git',
  tags: ['remote', 'repository']
});

// Resolve commands from arguments
const result = await registry.resolve(['git', 'remote', 'add', 'origin', 'url']);
// Returns: { matchedPath: ['git', 'remote', 'add'], remainingArgs: ['origin', 'url'] }
```

### Validation Engine

Zod-powered validation with type coercion:

```typescript
// Define validation schemas
const schema = z.object({
  name: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  tags: z.array(z.string()).optional()
});

// Validate and transform input
const result = await validateInput(userInput, schema);
```

### Type Safety

Every component is fully typed for maximum developer productivity:

```typescript
// Strongly typed command interface
interface ICommand {
  name: string;
  description: string;
  aliases?: string[];
  arguments?: IArgument[];
  options?: IOption[];
  execute(context: ICommandContext): Promise<ICommandResult>;
}

// Rich execution context
interface ICommandContext {
  args: string[];
  options: Record<string, any>;
  rawArgs: string[];
  command: ICommand;
}

// Comprehensive result type
interface ICommandResult {
  success: boolean;
  exitCode: number;
  data?: any;
  message?: string;
  error?: Error;
}
```

### Error Handling

Comprehensive error hierarchy for better debugging:

```typescript
// Specialized error classes
export class ValidationError extends CliError        // Input validation failures
export class CommandNotFoundError extends CliError  // Unknown commands
export class CommandExecutionError extends CliError // Runtime execution errors
export class ConfigurationError extends CliError    // Configuration issues
```

## 🧪 Testing

We follow test-driven development with comprehensive coverage:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm test -- tests/core/command-registry.test.ts
```

### Test Results ✅

```
Test Suites: 6 passed, 6 total
Tests:       153 passed, 153 total
Snapshots:   0 total
Time:        2.745s
```

### Test Coverage by Component

| Component | Tests | Coverage | Features Tested |
|-----------|-------|----------|-----------------|
| **Argument Parser** | 61 tests | 100% | Tokenization, flag parsing, multi-value options, environment variables |
| **Command Registry** | 46 tests | 100% | Registration, hierarchy, lazy loading, search, aliases |
| **Base Implementations** | 26 tests | 100% | Command execution, context creation, result handling |
| **CLI Framework** | 20 tests | 100% | Command registration, argument parsing, execution flow |

### Test Quality Features

- **Unit Tests** - Individual component testing
- **Integration Tests** - Cross-component interaction
- **Edge Case Coverage** - Boundary conditions and error states
- **Async Testing** - Promise-based command execution
- **Mock & Stub Utilities** - Isolated component testing

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

We're following a comprehensive development plan with significant progress made:

### Phase 1: Foundation ✅ COMPLETED

- [x] Project setup & TypeScript configuration
- [x] Testing infrastructure with Jest (153+ tests)
- [x] Core type system & interfaces
- [x] ESLint & Prettier configuration

### Phase 2: Argument Parsing & Validation ✅ COMPLETED

- [x] Advanced argument parsing & tokenization
- [x] Zod-powered validation engine
- [x] Environment variable integration
- [x] Input sanitization & security

### Phase 3: Command System ✅ COMPLETED

- [x] **Command Registry** - Hierarchical organization with lazy loading
- [x] **Command Builder Pattern** - Fluent API for command definition
- [x] **Execution Framework** - Async execution with context management

### Phase 4: Configuration & Dependency Injection ✅ COMPLETED

- [x] **Configuration System** - Multi-layer configuration with validation
- [x] **Dependency Injection** - Service container with lifecycle management

### Phase 5: Advanced Features 📋 PLANNED

- [ ] Plugin system & extensibility
- [ ] Interactive wizards & prompts
- [ ] Auto-completion scripts
- [ ] Rich output formatting & themes

[View Full Roadmap →](./docs/cli_toolkit_guidelines.md#%EF%B8%8F-cli-toolkit-framework-development-roadmap)

## 📊 Current Status

```text
🏗️  Foundation:           ████████████████████ 100%
⚙️  Argument Parsing:     ████████████████████ 100%
🗂️  Command Registry:     ████████████████████ 100%
🎯  Command Builder:      ████████████████████ 100%
🚀  Execution Framework: ████████████████████ 100%
🔧  Configuration:       ████████████████████ 100%
📦  Dependency Injection: ████████████████████ 100%
🧩  Advanced Features:   ░░░░░░░░░░░░░░░░░░░░   0%
```

**Overall Progress: ~87% Complete**

## 🔧 Technologies & Dependencies

### Core Technologies

- **TypeScript 5.8.3** - Type-safe development with strict mode
- **Node.js** - Runtime environment
- **Zod** - Runtime validation and type coercion
- **Jest** - Testing framework with comprehensive coverage
- **YAML** - YAML configuration file support
- **TOML** - TOML configuration file support

### Development Tools

- **ESLint** - Code linting with TypeScript rules
- **Prettier** - Code formatting
- **ts-node** - TypeScript execution for development
- **@types/node** - Node.js type definitions

### Build & Distribution

- **TypeScript Compiler** - ES2022 target with ESM modules
- **Source Maps** - Debug support
- **Declaration Files** - TypeScript definitions export

### Key Features Implemented

- ✅ **Argument Parser** - Advanced tokenization with flag/option support
- ✅ **Validation Engine** - Zod schemas with custom validation rules  
- ✅ **Command Registry** - Hierarchical commands with lazy loading
- ✅ **Command Builder** - Fluent API for creating commands with validation
- ✅ **Execution Framework** - Complete Phase 3.2 implementation:
  - Dependency injection with ServiceContainer
  - Middleware pipeline with ExecutionPipeline  
  - Cancellation support with CancellationToken
  - Advanced command executor with timeout handling
  - Enhanced CLI framework with full integration
- ✅ **Configuration System** - Complete Phase 4.1 implementation:
  - Multi-layer configuration (CLI args, env vars, config files)
  - Support for JSON, YAML, and TOML configuration files
  - Configuration precedence resolution and validation
  - Type-safe configuration access with Zod schemas
  - Environment variable transformation and parsing
- ✅ **Dependency Injection** - Complete Phase 4.2 implementation:
  - Advanced service container with type-safe registration
  - Service lifecycle management (singleton, transient, scoped)
  - Circular dependency detection and validation
  - Built-in service interfaces (Logger, FileSystem, HttpClient)
  - Service scope management with automatic disposal
- ✅ **Type System** - Comprehensive interfaces and type definitions
- ✅ **Error Handling** - Custom error hierarchy with context
- ✅ **Testing Suite** - 354 tests with 98%+ coverage (27 DI tests + 26 config tests + 301 core tests)

## 📖 Documentation

- [Development Guidelines](./docs/cli_toolkit_guidelines.md) - Comprehensive development principles
- [Roadmap](./docs/cli_toolkit_guidelines.md#roadmap) - 24-week development plan
- [API Reference](./src/types/index.ts) - Type definitions and interfaces

## 🤝 Contributing

We welcome contributions! Please see our [development guidelines](./docs/cli_toolkit_guidelines.md) for coding standards and architecture principles.

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

# Environment Configuration Manager

A real-world CLI tool built with **CLI Toolkit Framework** to showcase its capabilities in a practical application.

## What It Does

Manages environment configurations across different deployment environments (dev, staging, production). Stores variables in a JSON file and can export them in multiple formats (bash, PowerShell, Docker).

## Features Showcased

This demo highlights CLI Toolkit's best features:

✅ **Command Builder** - Fluent API for defining commands  
✅ **Argument Parsing** - Type-safe argument and option handling  
✅ **Dependency Injection** - Service container with lifecycle management  
✅ **Rich Output** - Beautiful terminal output with emojis and formatting  
✅ **Validation** - Zod schema validation for configs  
✅ **Real-World Use Case** - Solves actual developer pain points

## Installation

```bash
# Build the project
npm run build

# Run the demo
npm run demo:env
```

## Usage

### Create an environment

```bash
node dist/examples/real-world/env-manager.js create dev
node dist/examples/real-world/env-manager.js create staging --copy-from dev
```

### Set environment variables

```bash
node dist/examples/real-world/env-manager.js set dev DATABASE_URL postgres://localhost/mydb
node dist/examples/real-world/env-manager.js set dev API_KEY abc123xyz
node dist/examples/real-world/env-manager.js set dev PORT 3000
```

### List environments

```bash
node dist/examples/real-world/env-manager.js list
node dist/examples/real-world/env-manager.js list --verbose
```

### Export environment

```bash
# Export to bash script
node dist/examples/real-world/env-manager.js export dev -o .env.dev -f bash

# Export to PowerShell
node dist/examples/real-world/env-manager.js export dev -f powershell

# Export to Docker format
node dist/examples/real-world/env-manager.js export staging -f docker
```

## Why This Demo Matters

Unlike toy examples, this tool:

- **Solves a real problem**: Managing environment configs is tedious
- **Shows practical patterns**: DI, validation, file I/O
- **Demonstrates performance**: Fast parsing and execution
- **Highlights UX**: Rich output makes CLI apps delightful

## Code Structure

```
env-manager.ts
├── ConfigService       - Business logic (dependency injection example)
├── Commands            - Command definitions using CommandBuilder
│   ├── create          - Create new environment
│   ├── list            - List all environments
│   ├── set             - Set environment variable
│   └── export          - Export to various formats
└── Main                - Application bootstrap with DI container
```

## What You'll Learn

By reading this demo, you'll learn how to:

1. **Structure a CLI app** with multiple commands
2. **Use dependency injection** for testable, maintainable code
3. **Build commands** with the fluent CommandBuilder API
4. **Parse arguments** type-safely with ArgumentParser
5. **Create rich output** with emojis and formatting
6. **Handle errors** gracefully with proper exit codes

## Next Steps

Want to build your own CLI tool with CLI Toolkit? Check out:

- [Main README](../../README.md) - Full framework documentation
- [Command Builder Guide](../../src/core/command-builder.ts) - Command definition API
- [Other Examples](../) - More usage patterns

---

Built with ❤️ using CLI Toolkit Framework

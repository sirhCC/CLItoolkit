import { ICommand, ICommandResult, ICliConfig } from '@/types';
import { CommandResult, CommandContext } from '@/core/base-implementations';

/**
 * Basic command line interface framework
 */
export class CliFramework {
  private readonly commands = new Map<string, ICommand>();
  private readonly aliases = new Map<string, string>();
  private config: ICliConfig;

  constructor(config: Partial<ICliConfig>) {
    this.config = {
      name: 'cli',
      version: '1.0.0',
      description: 'Command line interface',
      showHelpWhenEmpty: true,
      exitOnComplete: true,
      strict: false,
      ...config
    };
  }

  /**
   * Register a command with the CLI
   */
  registerCommand(command: ICommand): this {
    // Guard clause: validate command
    if (!command.name) {
      throw new Error('Command must have a name');
    }

    if (this.commands.has(command.name)) {
      throw new Error(`Command '${command.name}' is already registered`);
    }

    // Register the command
    this.commands.set(command.name, command);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        if (this.aliases.has(alias) || this.commands.has(alias)) {
          throw new Error(`Alias '${alias}' conflicts with existing command or alias`);
        }
        this.aliases.set(alias, command.name);
      }
    }

    // Setup the command
    command.setup?.();

    return this;
  }

  /**
   * Get a command by name or alias
   */
  getCommand(name: string): ICommand | undefined {
    // Try direct command lookup
    const command = this.commands.get(name);
    if (command) {
      return command;
    }

    // Try alias lookup
    const aliasTarget = this.aliases.get(name);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }

    return undefined;
  }

  /**
   * Get all registered commands
   */
  getCommands(): ICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get all visible commands (not hidden)
   */
  getVisibleCommands(): ICommand[] {
    return this.getCommands().filter(cmd => !cmd.hidden);
  }

  /**
   * Parse command line arguments into structured data
   */
  parseArguments(args: string[]): { command: string; args: string[]; options: Record<string, any> } {
    if (args.length === 0) {
      return { command: '', args: [], options: {} };
    }

    // Handle global options that come before command
    if (args[0].startsWith('-')) {
      const options: Record<string, any> = {};
      let command = '';
      const positionalArgs: string[] = [];

      let i = 0;
      // Parse leading options
      while (i < args.length && args[i].startsWith('-')) {
        const arg = args[i];
        
        if (arg.startsWith('--')) {
          const optionText = arg.slice(2);
          if (optionText.includes('=')) {
            const [key, ...valueParts] = optionText.split('=');
            options[key] = valueParts.join('=');
          } else {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
              options[optionText] = nextArg;
              i++;
            } else {
              options[optionText] = true;
            }
          }
        } else if (arg.length > 1) {
          const optionText = arg.slice(1);
          if (optionText.length === 1) {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
              options[optionText] = nextArg;
              i++;
            } else {
              options[optionText] = true;
            }
          } else {
            for (const char of optionText) {
              options[char] = true;
            }
          }
        }
        i++;
      }

      // Get command if any remaining
      if (i < args.length) {
        command = args[i];
        positionalArgs.push(...args.slice(i + 1));
      }

      return { command, args: positionalArgs, options };
    }

    const command = args[0];
    const remaining = args.slice(1);
    const options: Record<string, any> = {};
    const positionalArgs: string[] = [];

    let i = 0;
    while (i < remaining.length) {
      const arg = remaining[i];

      // Long option (--option or --option=value)
      if (arg.startsWith('--')) {
        const optionText = arg.slice(2);
        
        if (optionText.includes('=')) {
          const [key, ...valueParts] = optionText.split('=');
          options[key] = valueParts.join('=');
        } else {
          const nextArg = remaining[i + 1];
          // Only consume next argument as option value if it doesn't start with '-'
          if (nextArg && !nextArg.startsWith('-')) {
            // Check if this looks like a boolean flag (common boolean flags)
            const booleanFlags = ['force', 'verbose', 'quiet', 'help', 'version', 'debug'];
            if (booleanFlags.includes(optionText)) {
              options[optionText] = true;
            } else {
              options[optionText] = nextArg;
              i++; // Skip next argument as it was consumed
            }
          } else {
            options[optionText] = true;
          }
        }
      }
      // Short option (-o)
      else if (arg.startsWith('-') && arg.length > 1) {
        const optionText = arg.slice(1);
        
        if (optionText.length === 1) {
          const nextArg = remaining[i + 1];
          // Only consume next argument as option value if it doesn't start with '-'
          if (nextArg && !nextArg.startsWith('-')) {
            // Common single-letter boolean flags
            const booleanFlags = ['f', 'v', 'q', 'h', 'd'];
            if (booleanFlags.includes(optionText)) {
              options[optionText] = true;
            } else {
              options[optionText] = nextArg;
              i++; // Skip next argument as it was consumed
            }
          } else {
            options[optionText] = true;
          }
        } else {
          // Multiple short options (-abc = -a -b -c)
          for (const char of optionText) {
            options[char] = true;
          }
        }
      }
      // Positional argument
      else {
        positionalArgs.push(arg);
      }

      i++;
    }

    return { command, args: positionalArgs, options };
  }

  /**
   * Execute a command with given arguments
   */
  async executeCommand(commandName: string, args: string[], options: Record<string, any>): Promise<ICommandResult> {
    // Guard clause: check if command exists
    const command = this.getCommand(commandName);
    if (!command) {
      return CommandResult.failure(
        1,
        `Command '${commandName}' not found. Use --help to see available commands.`
      );
    }

    try {
      // Create execution context
      const context = CommandContext.create(args, options, [], command);

      // Validate command
      if (command.validate) {
        await command.validate(context);
      }

      // Execute command
      const result = await command.execute(context);
      return result;

    } catch (error) {
      return CommandResult.fromError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Run the CLI with process arguments
   */
  async run(argv: string[] = process.argv.slice(2)): Promise<ICommandResult> {
    try {
      // Handle empty input
      if (argv.length === 0) {
        if (this.config.defaultCommand) {
          return this.executeCommand(this.config.defaultCommand, [], {});
        }
        
        if (this.config.showHelpWhenEmpty) {
          this.showHelp();
          return CommandResult.success();
        }
        
        return CommandResult.failure(1, 'No command specified');
      }

      // Parse arguments
      const parsed = this.parseArguments(argv);

      // Handle global help
      if (parsed.options.help || parsed.options.h) {
        this.showHelp();
        return CommandResult.success();
      }

      // Handle global version
      if (parsed.options.version || parsed.options.v) {
        console.log(`${this.config.name} v${this.config.version}`);
        return CommandResult.success();
      }

      // Handle case where first argument is an option (global help/version)
      if (!parsed.command || parsed.command.startsWith('-')) {
        if (this.config.showHelpWhenEmpty) {
          this.showHelp();
          return CommandResult.success();
        }
        return CommandResult.failure(1, 'No command specified');
      }

      // Execute the command
      const result = await this.executeCommand(parsed.command, parsed.args, parsed.options);

      // Exit with appropriate code if configured
      if (this.config.exitOnComplete && typeof process !== 'undefined') {
        process.exit(result.exitCode);
      }

      return result;

    } catch (error) {
      const result = CommandResult.fromError(
        error instanceof Error ? error : new Error(String(error))
      );

      // Exit with error code if configured
      if (this.config.exitOnComplete && typeof process !== 'undefined') {
        process.exit(result.exitCode);
      }

      return result;
    }
  }

  /**
   * Show help information
   */
  showHelp(): void {
    console.log(`${this.config.name} v${this.config.version}`);
    console.log(this.config.description);
    console.log();

    if (this.config.usage) {
      console.log(`Usage: ${this.config.usage}`);
      console.log();
    }

    const visibleCommands = this.getVisibleCommands();
    if (visibleCommands.length > 0) {
      console.log('Commands:');
      const maxNameLength = Math.max(...visibleCommands.map(cmd => cmd.name.length));
      
      for (const command of visibleCommands) {
        const padding = ' '.repeat(maxNameLength - command.name.length + 2);
        console.log(`  ${command.name}${padding}${command.description}`);
      }
      console.log();
    }

    if (this.config.globalOptions && this.config.globalOptions.length > 0) {
      console.log('Global Options:');
      for (const option of this.config.globalOptions) {
        const short = option.alias ? `-${option.alias}, ` : '    ';
        console.log(`  ${short}--${option.name}  ${option.description}`);
      }
      console.log();
    }

    console.log('Global Options:');
    console.log('  -h, --help     Show help information');
    console.log('  -v, --version  Show version information');
  }

  /**
   * Get framework configuration
   */
  getConfig(): ICliConfig {
    return { ...this.config };
  }

  /**
   * Update framework configuration
   */
  setConfig(config: Partial<ICliConfig>): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * Check if a command is registered
   */
  hasCommand(name: string): boolean {
    return this.commands.has(name) || this.aliases.has(name);
  }

  /**
   * Unregister a command
   */
  unregisterCommand(name: string): boolean {
    const command = this.commands.get(name);
    if (!command) {
      return false;
    }

    // Remove aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.delete(alias);
      }
    }

    // Cleanup command
    command.cleanup?.();

    // Remove command
    this.commands.delete(name);
    return true;
  }

  /**
   * Clear all registered commands
   */
  clear(): void {
    // Cleanup all commands
    for (const command of this.commands.values()) {
      command.cleanup?.();
    }

    this.commands.clear();
    this.aliases.clear();
  }
}

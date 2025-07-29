import { ICommand, ICommandContext, ICommandResult, IArgument, IOption } from '@/types';

/**
 * Base implementation of ICommandResult
 */
export class CommandResult implements ICommandResult {
  constructor(
    public readonly success: boolean,
    public readonly exitCode: number,
    public readonly data?: any,
    public readonly message: string | undefined = undefined,
    public readonly error?: Error
  ) {}

  /**
   * Create a successful result
   */
  static success(data?: any, message?: string): CommandResult {
    return new CommandResult(true, 0, data, message);
  }

  /**
   * Create a failure result
   */
  static failure(exitCode: number = 1, message?: string, error?: Error): CommandResult {
    return new CommandResult(false, exitCode, undefined, message, error);
  }

  /**
   * Create a result from an error
   */
  static fromError(error: Error, exitCode: number = 1): CommandResult {
    return new CommandResult(false, exitCode, undefined, error.message, error);
  }
}

/**
 * Base implementation of ICommandContext
 */
export class CommandContext implements ICommandContext {
  constructor(
    public readonly args: string[],
    public readonly options: Record<string, any>,
    public readonly rawArgs: string[],
    public readonly command: ICommand,
    public readonly parent: ICommandContext | undefined = undefined
  ) {}

  /**
   * Create a new context
   */
  static create(
    args: string[],
    options: Record<string, any>,
    rawArgs: string[],
    command: ICommand,
    parent?: ICommandContext
  ): CommandContext {
    return new CommandContext(args, options, rawArgs, command, parent);
  }

  /**
   * Get option value with default
   */
  getOption<T>(name: string, defaultValue?: T): T {
    return this.options[name] ?? defaultValue;
  }

  /**
   * Check if option exists and is truthy
   */
  hasOption(name: string): boolean {
    return Boolean(this.options[name]);
  }

  /**
   * Get positional argument by index
   */
  getArg(index: number): string | undefined {
    return this.args[index];
  }

  /**
   * Get all remaining args from index
   */
  getArgsFrom(index: number): string[] {
    return this.args.slice(index);
  }
}

/**
 * Base implementation of ICommand
 */
export abstract class BaseCommand implements ICommand {
  public arguments: IArgument[] | undefined = undefined;
  public options: IOption[] | undefined = undefined;
  public subcommands?: ICommand[];
  public aliases: string[] | undefined = undefined;
  public hidden: boolean | undefined = undefined;
  public usage?: string;
  public examples?: string[];

  constructor(
    public readonly name: string,
    public readonly description: string
  ) {}

  /**
   * Execute the command - must be implemented by subclasses
   */
  abstract execute(context: ICommandContext): Promise<ICommandResult>;

  /**
   * Validate command before execution
   * Default implementation validates required arguments and options
   */
  async validate(context: ICommandContext): Promise<boolean> {
    // Validate required arguments
    if (this.arguments) {
      const requiredArgs = this.arguments.filter(arg => arg.required);
      for (let i = 0; i < requiredArgs.length; i++) {
        const requiredArg = requiredArgs[i];
        if (!context.args[i] || !requiredArg) {
          throw new Error(`Missing required argument: ${requiredArg?.name || 'unknown'}`);
        }
      }
    }

    // Validate required options
    if (this.options) {
      const requiredOptions = this.options.filter(opt => opt.required);
      for (const option of requiredOptions) {
        if (!(option.name in context.options)) {
          throw new Error(`Missing required option: --${option.name}`);
        }
      }
    }

    return true;
  }

  /**
   * Setup command (called during registration)
   * Override in subclasses if needed
   */
  async setup(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Cleanup command (called on exit)
   * Override in subclasses if needed
   */
  async cleanup(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Add an argument to this command
   */
  addArgument(argument: IArgument): this {
    if (!this.arguments) {
      this.arguments = [];
    }
    this.arguments.push(argument);
    return this;
  }

  /**
   * Add an option to this command
   */
  addOption(option: IOption): this {
    if (!this.options) {
      this.options = [];
    }
    this.options.push(option);
    return this;
  }

  /**
   * Add a subcommand to this command
   */
  addSubcommand(command: ICommand): this {
    if (!this.subcommands) {
      this.subcommands = [];
    }
    this.subcommands.push(command);
    return this;
  }

  /**
   * Add an alias for this command
   */
  addAlias(alias: string): this {
    if (!this.aliases) {
      this.aliases = [];
    }
    this.aliases.push(alias);
    return this;
  }

  /**
   * Set usage string
   */
  setUsage(usage: string): this {
    this.usage = usage;
    return this;
  }

  /**
   * Add an example
   */
  addExample(example: string): this {
    if (!this.examples) {
      this.examples = [];
    }
    this.examples.push(example);
    return this;
  }

  /**
   * Hide this command from help output
   */
  hide(): this {
    this.hidden = true;
    return this;
  }
}

/**
 * Simple command implementation for quick command creation
 */
export class SimpleCommand extends BaseCommand {
  constructor(
    name: string,
    description: string,
    private readonly handler: (context: ICommandContext) => Promise<ICommandResult> | ICommandResult
  ) {
    super(name, description);
  }

  async execute(context: ICommandContext): Promise<ICommandResult> {
    try {
      const result = await this.handler(context);
      return result;
    } catch (error) {
      return CommandResult.fromError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create a simple command with a handler function
   */
  static create(
    name: string,
    description: string,
    handler: (context: ICommandContext) => Promise<ICommandResult> | ICommandResult
  ): SimpleCommand {
    return new SimpleCommand(name, description, handler);
  }
}

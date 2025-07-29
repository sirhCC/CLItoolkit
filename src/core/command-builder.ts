/**
 * @fileoverview Command Builder implementation for Phase 3.1 - Compatible with existing types
 */

import { ICommand, IArgument, IOption, ICommandContext, ICommandResult } from '../types/command';
import { ValidationError, ConfigurationError } from '../types/errors';

/**
 * Command action function type
 */
export type CommandAction = (context: ICommandContext) => Promise<ICommandResult> | ICommandResult;

/**
 * Command setup function type
 */
export type CommandSetup = () => Promise<void>;

/**
 * Command teardown function type
 */
export type CommandTeardown = () => Promise<void>;

/**
 * Configuration options for argument building
 */
export interface IArgumentBuilderOptions {
  required?: boolean;
  defaultValue?: any;
  type?: 'string' | 'number' | 'boolean';
  validator?: (value: any) => boolean | string;
}

/**
 * Configuration options for option building
 */
export interface IOptionBuilderOptions {
  alias?: string;
  required?: boolean;
  defaultValue?: any;
  type?: 'string' | 'number' | 'boolean' | 'array';
  validator?: (value: any) => boolean | string;
  choices?: string[];
}

/**
 * Command builder configuration options
 */
export interface ICommandBuilderConfig {
  validateOnBuild?: boolean;
  allowOverrides?: boolean;
}

/**
 * Builder validation result
 */
export interface IBuilderValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Command builder interface for fluent API
 */
export interface ICommandBuilder {
  name(name: string): ICommandBuilder;
  description(description: string): ICommandBuilder;
  alias(alias: string): ICommandBuilder;
  aliases(aliases: string[]): ICommandBuilder;
  argument(name: string, description?: string, options?: IArgumentBuilderOptions): ICommandBuilder;
  option(flag: string, description?: string, options?: IOptionBuilderOptions): ICommandBuilder;
  action(action: CommandAction): ICommandBuilder;
  setup(setup: CommandSetup): ICommandBuilder;
  teardown(teardown: CommandTeardown): ICommandBuilder;
  hidden(hidden?: boolean): ICommandBuilder;
  validate(): Promise<IBuilderValidationResult>;
  build(): Promise<ICommand>;
}

/**
 * Default configuration for command builder
 */
const DEFAULT_CONFIG: ICommandBuilderConfig = {
  validateOnBuild: true,
  allowOverrides: false
};

/**
 * Command Builder implementation with fluent API
 */
export class CommandBuilder implements ICommandBuilder {
  private _name?: string;
  private _description?: string;
  private _aliases: string[] = [];
  private _arguments: IArgument[] = [];
  private _options: IOption[] = [];
  private _action?: CommandAction;
  private _setup?: CommandSetup;
  private _teardown?: CommandTeardown;
  private _hidden = false;
  private readonly config: ICommandBuilderConfig;

  constructor(config: Partial<ICommandBuilderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the command name
   */
  name(name: string): ICommandBuilder {
    this.validateString(name, 'Command name');
    this._name = name.trim();
    return this;
  }

  /**
   * Set the command description
   */
  description(description: string): ICommandBuilder {
    this.validateString(description, 'Command description');
    this._description = description.trim();
    return this;
  }

  /**
   * Add an alias for the command
   */
  alias(alias: string): ICommandBuilder {
    this.validateString(alias, 'Alias');
    if (!this._aliases.includes(alias)) {
      this._aliases.push(alias.trim());
    }
    return this;
  }

  /**
   * Add multiple aliases for the command
   */
  aliases(aliases: string[]): ICommandBuilder {
    for (const alias of aliases) {
      this.alias(alias);
    }
    return this;
  }

  /**
   * Add a positional argument
   */
  argument(name: string, description = '', options: IArgumentBuilderOptions = {}): ICommandBuilder {
    this.validateString(name, 'Argument name');

    // Check for duplicate argument names
    if (this._arguments.some(arg => arg.name === name)) {
      if (!this.config.allowOverrides) {
        throw new ConfigurationError(`Argument '${name}' is already defined`);
      }
      // Remove existing argument if overrides are allowed
      this._arguments = this._arguments.filter(arg => arg.name !== name);
    }

    const argument: IArgument = {
      name: name.trim(),
      description: description.trim(),
      required: options.required ?? false,
      type: options.type ?? 'string',
      defaultValue: options.defaultValue,
      validator: options.validator
    };

    this._arguments.push(argument);
    return this;
  }

  /**
   * Add an option/flag
   */
  option(flag: string, description = '', options: IOptionBuilderOptions = {}): ICommandBuilder {
    this.validateString(flag, 'Option flag');

    // Parse flag format (--long or -s)
    const flagName = this.parseFlag(flag);
    
    // Check for duplicate option names
    if (this._options.some(opt => opt.name === flagName)) {
      if (!this.config.allowOverrides) {
        throw new ConfigurationError(`Option '${flagName}' is already defined`);
      }
      // Remove existing option if overrides are allowed
      this._options = this._options.filter(opt => opt.name !== flagName);
    }

    const option: IOption = {
      name: flagName,
      alias: options.alias,
      description: description.trim(),
      type: options.type ?? 'string',
      required: options.required ?? false,
      defaultValue: options.defaultValue,
      choices: options.choices,
      validator: options.validator
    };

    this._options.push(option);
    return this;
  }

  /**
   * Set the command action/execution function
   */
  action(action: CommandAction): ICommandBuilder {
    if (typeof action !== 'function') {
      throw new ValidationError('Action must be a function');
    }
    this._action = action;
    return this;
  }

  /**
   * Set a setup function to run before command execution
   */
  setup(setup: CommandSetup): ICommandBuilder {
    if (typeof setup !== 'function') {
      throw new ValidationError('Setup must be a function');
    }
    this._setup = setup;
    return this;
  }

  /**
   * Set a teardown function to run after command execution
   */
  teardown(teardown: CommandTeardown): ICommandBuilder {
    if (typeof teardown !== 'function') {
      throw new ValidationError('Teardown must be a function');
    }
    this._teardown = teardown;
    return this;
  }

  /**
   * Mark the command as hidden
   */
  hidden(hidden = true): ICommandBuilder {
    this._hidden = hidden;
    return this;
  }

  /**
   * Validate the current builder configuration
   */
  async validate(): Promise<IBuilderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!this._name) {
      errors.push('Command name is required');
    }

    if (!this._description) {
      warnings.push('Command description is recommended');
    }

    if (!this._action) {
      errors.push('Command action is required');
    }

    // Validate name format
    if (this._name && !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(this._name)) {
      errors.push('Command name must start with a letter and contain only letters, numbers, hyphens, and underscores');
    }

    // Validate aliases
    for (const alias of this._aliases) {
      if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(alias)) {
        errors.push(`Alias '${alias}' has invalid format`);
      }
    }

    // Validate arguments
    let lastWasOptional = false;

    for (const arg of this._arguments) {
      if (!arg.required && !lastWasOptional) {
        lastWasOptional = true;
      } else if (arg.required && lastWasOptional) {
        warnings.push('Required arguments should come before optional arguments');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Build the final command instance
   */
  async build(): Promise<ICommand> {
    // Validate if configured to do so
    if (this.config.validateOnBuild) {
      const validation = await this.validate();
      if (!validation.valid) {
        throw new ValidationError(`Command validation failed: ${validation.errors.join(', ')}`);
      }
    }

    if (!this._name) {
      throw new ValidationError('Command name is required');
    }

    if (!this._action) {
      throw new ValidationError('Command action is required');
    }

    const commandInstance = this;

    // Create the command object
    const command: ICommand = {
      name: this._name,
      description: this._description || `${this._name} command`,
      aliases: this._aliases.length > 0 ? this._aliases : undefined,
      arguments: this._arguments.length > 0 ? this._arguments : undefined,
      options: this._options.length > 0 ? this._options : undefined,
      hidden: this._hidden || undefined,
      
      async execute(context: ICommandContext): Promise<ICommandResult> {
        try {
          // Run setup if defined
          if (commandInstance._setup) {
            await commandInstance._setup();
          }

          // Execute the main action
          const result = await commandInstance._action!(context);

          // Run teardown if defined
          if (commandInstance._teardown) {
            await commandInstance._teardown();
          }

          return result;
        } catch (error) {
          // Run teardown even if action fails
          if (commandInstance._teardown) {
            try {
              await commandInstance._teardown();
            } catch (teardownError) {
              // Log teardown error but don't override the original error
              console.warn('Teardown failed:', teardownError);
            }
          }

          throw error;
        }
      },

      async setup(): Promise<void> {
        if (commandInstance._setup) {
          await commandInstance._setup();
        }
      },

      async cleanup(): Promise<void> {
        if (commandInstance._teardown) {
          await commandInstance._teardown();
        }
      }
    };

    return command;
  }

  /**
   * Validate string input
   */
  private validateString(value: string, fieldName: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError(`${fieldName} must be a non-empty string`);
    }
  }

  /**
   * Parse flag format and extract name
   */
  private parseFlag(flag: string): string {
    if (flag.startsWith('--')) {
      return flag.slice(2);
    } else if (flag.startsWith('-')) {
      return flag.slice(1);
    } else {
      return flag;
    }
  }
}

/**
 * Factory function to create a new command builder
 */
export function createCommand(config?: Partial<ICommandBuilderConfig>): ICommandBuilder {
  return new CommandBuilder(config);
}

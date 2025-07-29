/**
 * @fileoverview Command Builder interfaces and types for Phase 3.1
 */

import { ICommand, ICommandContext, ICommandResult } from './command';
import { z } from 'zod';

/**
 * Command action function type
 */
export type CommandAction = (context: ICommandContext) => Promise<ICommandResult> | ICommandResult;

/**
 * Command setup function type
 */
export type CommandSetup = () => void | Promise<void>;

/**
 * Command teardown function type
 */
export type CommandTeardown = () => void | Promise<void>;

/**
 * Command builder configuration options
 */
export interface ICommandBuilderConfig {
  /** Whether to validate arguments and options on build */
  validateOnBuild?: boolean;
  /** Whether to allow overriding existing properties */
  allowOverrides?: boolean;
  /** Default validation schema for arguments */
  defaultArgumentSchema?: z.ZodSchema;
  /** Default validation schema for options */
  defaultOptionSchema?: z.ZodSchema;
}

/**
 * Command builder interface for fluent API
 */
export interface ICommandBuilder {
  /**
   * Set the command name
   */
  name(name: string): ICommandBuilder;

  /**
   * Set the command description
   */
  description(description: string): ICommandBuilder;

  /**
   * Add an alias for the command
   */
  alias(alias: string): ICommandBuilder;

  /**
   * Add multiple aliases for the command
   */
  aliases(aliases: string[]): ICommandBuilder;

  /**
   * Add a positional argument
   */
  argument<T = any>(name: string, description?: string, options?: IArgumentBuilderOptions<T>): ICommandBuilder;

  /**
   * Add an option/flag
   */
  option<T = any>(flag: string, description?: string, options?: IOptionBuilderOptions<T>): ICommandBuilder;

  /**
   * Set the command action/execution function
   */
  action(action: CommandAction): ICommandBuilder;

  /**
   * Set a setup function to run before command execution
   */
  setup(setup: CommandSetup): ICommandBuilder;

  /**
   * Set a teardown function to run after command execution
   */
  teardown(teardown: CommandTeardown): ICommandBuilder;

  /**
   * Mark the command as hidden (won't appear in help)
   */
  hidden(hidden?: boolean): ICommandBuilder;

  /**
   * Set the command version
   */
  version(version: string): ICommandBuilder;

  /**
   * Set the command category for grouping
   */
  category(category: string): ICommandBuilder;

  /**
   * Add tags for searchability
   */
  tag(tag: string): ICommandBuilder;

  /**
   * Add multiple tags
   */
  tags(tags: string[]): ICommandBuilder;

  /**
   * Set example usage
   */
  example(usage: string, description?: string): ICommandBuilder;

  /**
   * Add multiple examples
   */
  examples(examples: ICommandExample[]): ICommandBuilder;

  /**
   * Inherit from another command (composition)
   */
  inherits(baseCommand: ICommand): ICommandBuilder;

  /**
   * Clone this builder to create a new one with the same configuration
   */
  clone(): ICommandBuilder;

  /**
   * Validate the current builder configuration
   */
  validate(): Promise<IBuilderValidationResult>;

  /**
   * Build the final command instance
   */
  build(): Promise<ICommand>;
}

/**
 * Argument builder options
 */
export interface IArgumentBuilderOptions<T = any> {
  /** Whether the argument is required */
  required?: boolean;
  /** Default value if not provided */
  defaultValue?: T;
  /** Validation schema */
  schema?: z.ZodSchema<T>;
  /** Custom validation function */
  validate?: (value: any) => Promise<T> | T;
  /** Array of allowed values */
  choices?: T[];
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Variadic argument (consumes remaining args) */
  variadic?: boolean;
}

/**
 * Option builder options
 */
export interface IOptionBuilderOptions<T = any> {
  /** Short flag (e.g., 'v' for -v) */
  short?: string;
  /** Whether the option is required */
  required?: boolean;
  /** Default value if not provided */
  defaultValue?: T;
  /** Validation schema */
  schema?: z.ZodSchema<T>;
  /** Custom validation function */
  validate?: (value: any) => Promise<T> | T;
  /** Array of allowed values */
  choices?: T[];
  /** Whether this is a boolean flag */
  boolean?: boolean;
  /** Whether this option can have multiple values */
  multiple?: boolean;
  /** Environment variable to read from */
  env?: string;
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
}

/**
 * Command example interface
 */
export interface ICommandExample {
  /** Example usage string */
  usage: string;
  /** Description of what the example does */
  description?: string;
}

/**
 * Builder validation result
 */
export interface IBuilderValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors if any */
  errors: string[];
  /** Validation warnings if any */
  warnings: string[];
}

/**
 * Command composition options
 */
export interface ICommandCompositionOptions {
  /** Whether to inherit arguments */
  inheritArguments?: boolean;
  /** Whether to inherit options */
  inheritOptions?: boolean;
  /** Whether to inherit examples */
  inheritExamples?: boolean;
  /** Whether to inherit metadata */
  inheritMetadata?: boolean;
  /** Whether to override conflicting properties */
  override?: boolean;
}

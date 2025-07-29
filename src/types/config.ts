/**
 * CLI configuration interface
 */
export interface ICliConfig {
  name: string;
  version: string;
  description: string;
  usage?: string;
  examples?: string[];
  
  // Global options available to all commands
  globalOptions?: IOption[];
  
  // Default command to run when none specified
  defaultCommand?: string;
  
  // Whether to show help when no command provided
  showHelpWhenEmpty?: boolean;
  
  // Exit process on command completion
  exitOnComplete?: boolean;
  
  // Enable strict mode (fail on unknown options)
  strict?: boolean;
  
  // Custom help formatter
  helpFormatter?: IHelpFormatter;
  
  // Error handler
  errorHandler?: IErrorHandler;
  
  // Logger configuration
  logger?: ILoggerConfig;
}

/**
 * Environment variable schema
 */
export interface IEnvironmentVariable {
  key: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: any;
  validator?: (value: any) => boolean | string;
}

/**
 * Configuration file schema
 */
export interface IConfigFileSchema {
  version: string;
  extends?: string;
  commands?: Record<string, any>;
  options?: Record<string, any>;
  environment?: Record<string, IEnvironmentVariable>;
}

/**
 * Help formatter interface
 */
export interface IHelpFormatter {
  formatCommand(command: ICommand): string;
  formatGlobalHelp(config: ICliConfig, commands: ICommand[]): string;
  formatUsage(command: ICommand): string;
  formatOptions(options: IOption[]): string;
  formatArguments(args: IArgument[]): string;
}

/**
 * Error handler interface
 */
export interface IErrorHandler {
  handle(error: Error, context?: ICommandContext): Promise<ICommandResult>;
  format(error: Error): string;
}

/**
 * Logger configuration
 */
export interface ILoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'text' | 'json';
  output: 'console' | 'file' | 'both';
  file?: string;
  timestamp?: boolean;
}

// Import command types for use in this file
import type { ICommand, ICommandContext, ICommandResult, IArgument, IOption } from './command';

// Re-export command types for convenience
export type { ICommand, ICommandContext, ICommandResult, IArgument, IOption } from './command';

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

/**
 * Configuration file schema
 */

/**
 * Help formatter interface
 */

/**
 * Error handler interface
 */

/**
 * Logger configuration
 */

// Import command types for use in this file
import type { ICommand, ICommandContext, ICommandResult, IArgument, IOption } from './command';

// Re-export command types for convenience
export type { ICommand, ICommandContext, ICommandResult, IArgument, IOption } from './command';

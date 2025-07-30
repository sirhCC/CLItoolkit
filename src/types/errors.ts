/**
 * Base error class for CLI toolkit
 */
export abstract class CliError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  
  constructor(message: string, public override readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintain proper stack trace for where our error was thrown
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Command validation error
 */
export class ValidationError extends CliError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  
  constructor(message: string, public readonly field?: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Command not found error
 */
export class CommandNotFoundError extends CliError {
  readonly code = 'COMMAND_NOT_FOUND';
  readonly statusCode = 404;
  
  constructor(commandName: string, cause?: Error) {
    super(`Command '${commandName}' not found`, cause);
  }
}

/**
 * Command execution error
 */
export class CommandExecutionError extends CliError {
  readonly code = 'COMMAND_EXECUTION_ERROR';
  readonly statusCode = 500;
  
  constructor(message: string, public readonly commandName?: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends CliError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly statusCode = 500;
  
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Plugin error
 */
export class PluginError extends CliError {
  readonly code = 'PLUGIN_ERROR';
  readonly statusCode = 500;
  
  constructor(message: string, public readonly pluginName?: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Event emitter type definitions
 */
export interface IEventEmitter<TEvents extends Record<string, any[]>> {
  on<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this;
  off<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this;
  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): boolean;
  once<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this;
  removeAllListeners<K extends keyof TEvents>(event?: K): this;
}

// Import types for events
import type { ICommandContext, ICommandResult } from './command';
import type { ICliConfig } from './config';

/**
 * CLI framework events
 */

/**
 * Event listener type
 */
export type EventListener<T extends any[]> = (...args: T) => void | Promise<void>;

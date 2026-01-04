/**
 * Enhanced error types for the CLI Toolkit Framework
 * Provides structured errors with codes and context for better error handling
 */

export enum ErrorCode {
  // Validation errors (1xxx)
  VALIDATION_FAILED = 1000,
  INVALID_ARGUMENT = 1001,
  INVALID_OPTION = 1002,
  MISSING_REQUIRED = 1003,
  INVALID_TYPE = 1004,

  // Configuration errors (2xxx)
  INVALID_CONFIGURATION = 2000,
  MISSING_CONFIGURATION = 2001,
  CONFIGURATION_CONFLICT = 2002,

  // Execution errors (3xxx)
  EXECUTION_FAILED = 3000,
  COMMAND_NOT_FOUND = 3001,
  EXECUTION_TIMEOUT = 3002,
  EXECUTION_CANCELLED = 3003,
  CONCURRENCY_LIMIT = 3004,

  // Service/DI errors (4xxx)
  SERVICE_NOT_FOUND = 4000,
  SERVICE_RESOLUTION_FAILED = 4001,
  CIRCULAR_DEPENDENCY = 4002,
  INVALID_LIFETIME = 4003,

  // Resource errors (5xxx)
  RESOURCE_EXHAUSTED = 5000,
  POOL_EXHAUSTED = 5001,
  MEMORY_LIMIT = 5002,

  // Internal errors (9xxx)
  INTERNAL_ERROR = 9000,
  NOT_IMPLEMENTED = 9001
}

export interface ErrorContext {
  code: ErrorCode;
  component?: string;
  operation?: string;
  [key: string]: any;
}

/**
 * Base error class for all CLI Toolkit errors
 */
export class CliError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;

  constructor(message: string, context: ErrorContext, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.code = context.code;
    this.context = context;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Preserve cause chain
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }

  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

/**
 * Validation errors (1xxx)
 */
export class ValidationError extends CliError {
  constructor(message: string, context: Omit<ErrorContext, 'code'> = {}, cause?: Error) {
    super(message, { code: ErrorCode.VALIDATION_FAILED, ...context }, cause);
  }
}

export class InvalidArgumentError extends ValidationError {
  constructor(argumentName: string, value: any, reason?: string, cause?: Error) {
    const message = `Invalid argument '${argumentName}': ${value}${reason ? ` (${reason})` : ''}`;
    super(message, { code: ErrorCode.INVALID_ARGUMENT, argumentName, value, reason }, cause);
  }
}

export class InvalidOptionError extends ValidationError {
  constructor(optionName: string, value: any, reason?: string, cause?: Error) {
    const message = `Invalid option '${optionName}': ${value}${reason ? ` (${reason})` : ''}`;
    super(message, { code: ErrorCode.INVALID_OPTION, optionName, value, reason }, cause);
  }
}

export class MissingRequiredError extends ValidationError {
  constructor(paramName: string, type: 'argument' | 'option', cause?: Error) {
    const message = `Missing required ${type}: '${paramName}'`;
    super(message, { code: ErrorCode.MISSING_REQUIRED, paramName, type }, cause);
  }
}

/**
 * Configuration errors (2xxx)
 */
export class ConfigurationError extends CliError {
  constructor(message: string, context: Omit<ErrorContext, 'code'> = {}, cause?: Error) {
    super(message, { code: ErrorCode.INVALID_CONFIGURATION, ...context }, cause);
  }
}

/**
 * Execution errors (3xxx)
 */
export class ExecutionError extends CliError {
  constructor(message: string, context: Omit<ErrorContext, 'code'> = {}, cause?: Error) {
    super(message, { code: ErrorCode.EXECUTION_FAILED, ...context }, cause);
  }
}

export class CommandNotFoundError extends ExecutionError {
  constructor(commandName: string, availableCommands?: string[], cause?: Error) {
    const message = `Command not found: '${commandName}'${
      availableCommands ? `\nAvailable commands: ${availableCommands.join(', ')}` : ''
    }`;
    super(message, { code: ErrorCode.COMMAND_NOT_FOUND, commandName, availableCommands }, cause);
  }
}

export class ExecutionTimeoutError extends ExecutionError {
  constructor(commandName: string, timeoutMs: number, cause?: Error) {
    const message = `Command '${commandName}' timed out after ${timeoutMs}ms`;
    super(message, { code: ErrorCode.EXECUTION_TIMEOUT, commandName, timeoutMs }, cause);
  }
}

export class ExecutionCancelledError extends ExecutionError {
  constructor(commandName: string, reason?: string, cause?: Error) {
    const message = `Command '${commandName}' was cancelled${reason ? `: ${reason}` : ''}`;
    super(message, { code: ErrorCode.EXECUTION_CANCELLED, commandName, reason }, cause);
  }
}

/**
 * Service/DI errors (4xxx)
 */
export class ServiceError extends CliError {
  constructor(message: string, context: Omit<ErrorContext, 'code'> = {}, cause?: Error) {
    super(message, { code: ErrorCode.SERVICE_RESOLUTION_FAILED, ...context }, cause);
  }
}

export class ServiceNotFoundError extends ServiceError {
  constructor(token: string | symbol, cause?: Error) {
    const tokenStr = typeof token === 'symbol' ? token.toString() : token;
    const message = `Service not found: '${tokenStr}'`;
    super(message, { code: ErrorCode.SERVICE_NOT_FOUND, token: tokenStr }, cause);
  }
}

export class CircularDependencyError extends ServiceError {
  constructor(dependencyChain: string[], cause?: Error) {
    const message = `Circular dependency detected: ${dependencyChain.join(' -> ')}`;
    super(message, { code: ErrorCode.CIRCULAR_DEPENDENCY, dependencyChain }, cause);
  }
}

/**
 * Resource errors (5xxx)
 */
export class ResourceError extends CliError {
  constructor(message: string, context: Omit<ErrorContext, 'code'> = {}, cause?: Error) {
    super(message, { code: ErrorCode.RESOURCE_EXHAUSTED, ...context }, cause);
  }
}

export class PoolExhaustedError extends ResourceError {
  constructor(poolName: string, maxSize: number, cause?: Error) {
    const message = `Pool '${poolName}' exhausted: maximum size of ${maxSize} reached`;
    super(message, { code: ErrorCode.POOL_EXHAUSTED, poolName, maxSize }, cause);
  }
}

/**
 * Internal errors (9xxx)
 */
export class InternalError extends CliError {
  constructor(message: string, context: Omit<ErrorContext, 'code'> = {}, cause?: Error) {
    super(message, { code: ErrorCode.INTERNAL_ERROR, ...context }, cause);
  }
}

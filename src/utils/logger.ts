/**
 * Structured logging abstraction for the CLI Toolkit Framework
 * Replaces raw console.log calls with proper logging infrastructure
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

export interface LogContext {
  component?: string;
  operation?: string;
  [key: string]: any;
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

/**
 * Console-based logger implementation
 */
export class ConsoleLogger implements ILogger {
  private level: LogLevel;
  private readonly enableColors: boolean;
  private readonly enableTimestamps: boolean;

  constructor(
    level: LogLevel = LogLevel.INFO,
    options: { enableColors?: boolean; enableTimestamps?: boolean } = {}
  ) {
    this.level = level;
    this.enableColors = options.enableColors ?? true;
    this.enableTimestamps = options.enableTimestamps ?? true;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  debug(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, context, console.warn);
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.level <= LogLevel.ERROR) {
      const errorContext = error
        ? { ...context, error: error.message, stack: error.stack }
        : context;
      this.log('ERROR', message, errorContext, console.error);
    }
  }

  private log(
    level: string,
    message: string,
    context?: LogContext,
    outputFn: (...args: any[]) => void = console.log
  ): void {
    const parts: string[] = [];

    // Timestamp
    if (this.enableTimestamps) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    // Level
    parts.push(`[${level}]`);

    // Component/Operation
    if (context?.component) {
      parts.push(`[${context.component}]`);
    }
    if (context?.operation) {
      parts.push(`[${context.operation}]`);
    }

    // Message
    parts.push(message);

    // Additional context
    if (context) {
      const { component, operation, error, stack, ...rest } = context;
      if (Object.keys(rest).length > 0) {
        parts.push(JSON.stringify(rest));
      }
    }

    outputFn(parts.join(' '));
  }
}

/**
 * No-op logger that discards all log messages
 */
export class NullLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  setLevel(): void {}
  getLevel(): LogLevel {
    return LogLevel.SILENT;
  }
}

/**
 * Global logger instance
 */
let globalLogger: ILogger = new ConsoleLogger(LogLevel.INFO);

/**
 * Get the global logger instance
 */
export function getLogger(): ILogger {
  return globalLogger;
}

/**
 * Set the global logger instance
 */
export function setLogger(logger: ILogger): void {
  globalLogger = logger;
}

/**
 * Create a logger with component context
 */
export function createLogger(component: string): ILogger {
  return {
    debug: (message: string, context?: LogContext) =>
      globalLogger.debug(message, { ...context, component }),
    info: (message: string, context?: LogContext) =>
      globalLogger.info(message, { ...context, component }),
    warn: (message: string, context?: LogContext) =>
      globalLogger.warn(message, { ...context, component }),
    error: (message: string, error?: Error, context?: LogContext) =>
      globalLogger.error(message, error, { ...context, component }),
    setLevel: (level: LogLevel) => globalLogger.setLevel(level),
    getLevel: () => globalLogger.getLevel()
  };
}

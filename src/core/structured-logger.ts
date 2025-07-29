/**
 * Structured Logging System for CLI Toolkit
 * Provides JSON log formatting, log level management, and custom transports
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error'
}

/**
 * Log level numeric values for comparison
 */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  [LogLevel.Debug]: 0,
  [LogLevel.Info]: 1,
  [LogLevel.Warn]: 2,
  [LogLevel.Error]: 3
};

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
  command?: string;
  source?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration?: number;
    memoryUsage?: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
  };
}

/**
 * Log transport interface
 */
export interface LogTransport {
  name: string;
  level: LogLevel;
  format: LogFormat;
  log(entry: LogEntry): Promise<void> | void;
  close?(): Promise<void> | void;
}

/**
 * Log formatting options
 */
export enum LogFormat {
  JSON = 'json',
  Text = 'text',
  Pretty = 'pretty'
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  transports: LogTransport[];
  enablePerformanceLogging: boolean;
  enableCorrelationIds: boolean;
  context?: Record<string, any>;
}

/**
 * Performance timer
 */
export interface PerformanceTimer {
  start: number;
  label: string;
  context?: Record<string, any>;
}

/**
 * Console transport for logging to stdout/stderr
 */
export class ConsoleTransport implements LogTransport {
  name = 'console';
  
  constructor(
    public level: LogLevel = LogLevel.Info,
    public format: LogFormat = LogFormat.Pretty
  ) {}

  log(entry: LogEntry): void {
    const output = this.formatEntry(entry);
    
    if (entry.level === LogLevel.Error) {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  private formatEntry(entry: LogEntry): string {
    switch (this.format) {
      case LogFormat.JSON:
        return JSON.stringify(entry);
      
      case LogFormat.Text:
        return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
      
      case LogFormat.Pretty:
      default:
        return this.formatPretty(entry);
    }
  }

  private formatPretty(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const level = this.colorizeLevel(entry.level);
    const source = entry.source ? ` [${entry.source}]` : '';
    const correlationId = entry.correlationId ? ` (${entry.correlationId})` : '';
    
    let output = `${timestamp} ${level}${source}${correlationId}: ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    if (entry.performance?.duration) {
      output += `\n  Duration: ${entry.performance.duration}ms`;
    }
    
    return output;
  }

  private colorizeLevel(level: LogLevel): string {
    // Simple colorization - could be enhanced with actual color codes
    switch (level) {
      case LogLevel.Debug:
        return 'DEBUG';
      case LogLevel.Info:
        return 'INFO ';
      case LogLevel.Warn:
        return 'WARN ';
      case LogLevel.Error:
        return 'ERROR';
    }
  }
}

/**
 * File transport for logging to files
 */
export class FileTransport implements LogTransport {
  name = 'file';
  private writeStream?: any; // Would be fs.WriteStream in actual implementation
  
  constructor(
    private filePath: string,
    public level: LogLevel = LogLevel.Info,
    public format: LogFormat = LogFormat.JSON
  ) {}

  async log(entry: LogEntry): Promise<void> {
    if (!this.writeStream) {
      await this.initializeStream();
    }

    const output = this.formatEntry(entry);
    
    // In actual implementation, would write to file
    // this.writeStream.write(output + '\n');
    console.log(`[FILE LOG to ${this.filePath}]: ${output}`);
  }

  private async initializeStream(): Promise<void> {
    // In actual implementation, would create file write stream
    // this.writeStream = fs.createWriteStream(this.filePath, { flags: 'a' });
  }

  private formatEntry(entry: LogEntry): string {
    switch (this.format) {
      case LogFormat.JSON:
        return JSON.stringify(entry);
      
      case LogFormat.Text:
        return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
      
      default:
        return JSON.stringify(entry);
    }
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      // this.writeStream.end();
      this.writeStream = undefined;
    }
  }
}

/**
 * Structured logger implementation
 */
export class StructuredLogger {
  private static instance: StructuredLogger;
  private config: LoggerConfig;
  private correlationIdCounter = 0;
  private performanceTimers = new Map<string, PerformanceTimer>();

  private constructor(config: LoggerConfig) {
    this.config = config;
  }

  static getInstance(config?: LoggerConfig): StructuredLogger {
    if (!StructuredLogger.instance && config) {
      StructuredLogger.instance = new StructuredLogger(config);
    } else if (!StructuredLogger.instance) {
      // Default configuration
      StructuredLogger.instance = new StructuredLogger({
        level: LogLevel.Info,
        transports: [new ConsoleTransport()],
        enablePerformanceLogging: false,
        enableCorrelationIds: true
      });
    }
    return StructuredLogger.instance;
  }

  /**
   * Configure logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add transport
   */
  addTransport(transport: LogTransport): void {
    this.config.transports.push(transport);
  }

  /**
   * Remove transport
   */
  removeTransport(transportName: string): void {
    this.config.transports = this.config.transports.filter(t => t.name !== transportName);
  }

  /**
   * Debug logging
   */
  debug(message: string, context?: Record<string, any>, source?: string): void {
    this.log(LogLevel.Debug, message, context, source);
  }

  /**
   * Info logging
   */
  info(message: string, context?: Record<string, any>, source?: string): void {
    this.log(LogLevel.Info, message, context, source);
  }

  /**
   * Warning logging
   */
  warn(message: string, context?: Record<string, any>, source?: string): void {
    this.log(LogLevel.Warn, message, context, source);
  }

  /**
   * Error logging
   */
  error(message: string, error?: Error, context?: Record<string, any>, source?: string): void {
    const errorContext = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    } : undefined;

    this.log(LogLevel.Error, message, context, source, errorContext);
  }

  /**
   * Start performance timer
   */
  startTimer(label: string, context?: Record<string, any>): string {
    if (!this.config.enablePerformanceLogging) {
      return '';
    }

    const timerId = `${label}_${Date.now()}_${++this.correlationIdCounter}`;
    this.performanceTimers.set(timerId, {
      start: performance.now(),
      label,
      context
    });

    return timerId;
  }

  /**
   * End performance timer and log duration
   */
  endTimer(timerId: string, message?: string): number {
    if (!this.config.enablePerformanceLogging || !timerId) {
      return 0;
    }

    const timer = this.performanceTimers.get(timerId);
    if (!timer) {
      this.warn(`Timer ${timerId} not found`);
      return 0;
    }

    const duration = performance.now() - timer.start;
    this.performanceTimers.delete(timerId);

    const logMessage = message || `${timer.label} completed`;
    const context = {
      ...timer.context,
      performance: {
        duration,
        memoryUsage: process.memoryUsage()
      }
    };

    this.info(logMessage, context, 'performance');
    return duration;
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>, source?: string): ChildLogger {
    return new ChildLogger(this, context, source);
  }

  /**
   * Generate correlation ID
   */
  generateCorrelationId(): string {
    if (!this.config.enableCorrelationIds) {
      return '';
    }
    return `cli-${Date.now()}-${++this.correlationIdCounter}`;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    source?: string,
    error?: any,
    performance?: any
  ): void {
    // Check if level is enabled
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.config.context, ...context },
      source
    };

    if (this.config.enableCorrelationIds) {
      entry.correlationId = this.generateCorrelationId();
    }

    if (error) {
      entry.error = error;
    }

    if (performance) {
      entry.performance = performance;
    }

    // Send to all applicable transports
    this.config.transports.forEach(transport => {
      if (LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[transport.level]) {
        try {
          transport.log(entry);
        } catch (transportError) {
          console.error('Transport error:', transportError);
        }
      }
    });
  }

  /**
   * Close all transports
   */
  async close(): Promise<void> {
    await Promise.all(
      this.config.transports
        .filter(transport => transport.close)
        .map(transport => transport.close!())
    );
  }
}

/**
 * Child logger with inherited context
 */
export class ChildLogger {
  constructor(
    private parent: StructuredLogger,
    private context: Record<string, any>,
    private source?: string
  ) {}

  debug(message: string, additionalContext?: Record<string, any>): void {
    this.parent.debug(message, { ...this.context, ...additionalContext }, this.source);
  }

  info(message: string, additionalContext?: Record<string, any>): void {
    this.parent.info(message, { ...this.context, ...additionalContext }, this.source);
  }

  warn(message: string, additionalContext?: Record<string, any>): void {
    this.parent.warn(message, { ...this.context, ...additionalContext }, this.source);
  }

  error(message: string, error?: Error, additionalContext?: Record<string, any>): void {
    this.parent.error(message, error, { ...this.context, ...additionalContext }, this.source);
  }

  startTimer(label: string, additionalContext?: Record<string, any>): string {
    return this.parent.startTimer(label, { ...this.context, ...additionalContext });
  }

  endTimer(timerId: string, message?: string): number {
    return this.parent.endTimer(timerId, message);
  }
}

/**
 * Default logger instance
 */
export const logger = StructuredLogger.getInstance();

/**
 * Create logger with configuration
 */
export function createLogger(config: LoggerConfig): StructuredLogger {
  return StructuredLogger.getInstance(config);
}

/**
 * Performance logging decorator
 */
export function LogPerformance(label?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logLabel = label || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const logger = StructuredLogger.getInstance();
      const timerId = logger.startTimer(logLabel, {
        method: propertyKey,
        class: target.constructor.name,
        arguments: args.length
      });

      try {
        const result = await originalMethod.apply(this, args);
        logger.endTimer(timerId, `${logLabel} completed successfully`);
        return result;
      } catch (error) {
        logger.endTimer(timerId, `${logLabel} failed`);
        logger.error(`${logLabel} failed`, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Logging middleware for command execution
 */
export function createLoggingMiddleware(loggerInstance?: StructuredLogger) {
  const logger = loggerInstance || StructuredLogger.getInstance();

  return {
    name: 'logging',
    execute: async (context: any, next: () => Promise<any>) => {
      const commandLogger = logger.child({
        command: context.command?.name,
        arguments: context.args,
        options: context.options
      }, 'command-execution');

      const timerId = commandLogger.startTimer('command-execution');
      
      try {
        commandLogger.info(`Executing command: ${context.command?.name}`);
        
        const result = await next();
        
        commandLogger.endTimer(timerId);
        commandLogger.info(`Command completed successfully: ${context.command?.name}`, {
          exitCode: result.exitCode,
          success: result.success
        });
        
        return result;
      } catch (error) {
        commandLogger.endTimer(timerId);
        commandLogger.error(`Command failed: ${context.command?.name}`, error as Error);
        throw error;
      }
    }
  };
}

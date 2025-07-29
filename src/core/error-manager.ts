/**
 * Centralized Error Management System for CLI Toolkit
 * Provides unified error handling, classification, and user-friendly formatting
 */

import { CliError, CommandExecutionError, ValidationError, ConfigurationError } from '../types/errors';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical'
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  Validation = 'validation',
  Configuration = 'configuration',
  Command = 'command',
  System = 'system',
  Network = 'network',
  FileSystem = 'filesystem',
  Authentication = 'authentication',
  Permission = 'permission'
}

/**
 * Error classification metadata
 */
export interface ErrorClassification {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  recoverable: boolean;
  userActionRequired: boolean;
  suggestedActions?: string[];
}

/**
 * Error context for enhanced debugging
 */
export interface ErrorContext {
  command?: string;
  arguments?: string[];
  options?: Record<string, unknown>;
  environment?: Record<string, string>;
  timestamp: Date;
  stackTrace?: string;
  correlationId?: string;
}

/**
 * Formatted error output
 */
export interface FormattedError {
  message: string;
  details?: string;
  suggestions?: string[];
  code: string;
  severity: ErrorSeverity;
  timestamp: string;
  context?: Partial<ErrorContext>;
}

/**
 * Error recovery strategy
 */
export interface RecoveryStrategy {
  canRecover(error: Error, context: ErrorContext): boolean;
  recover(error: Error, context: ErrorContext): Promise<boolean>;
  getSuggestions(error: Error, context: ErrorContext): string[];
}

/**
 * Global error handler for the CLI framework
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private classifications = new Map<string, ErrorClassification>();
  private recoveryStrategies: RecoveryStrategy[] = [];
  private errorHandlers: Array<(error: Error, context: ErrorContext) => void> = [];

  private constructor() {
    this.setupDefaultClassifications();
    this.setupDefaultRecoveryStrategies();
  }

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Register error classification
   */
  registerClassification(errorType: string, classification: ErrorClassification): void {
    this.classifications.set(errorType, classification);
  }

  /**
   * Register recovery strategy
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  /**
   * Register error handler
   */
  registerErrorHandler(handler: (error: Error, context: ErrorContext) => void): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Handle error with full context
   */
  async handleError(error: Error, context: Partial<ErrorContext> = {}): Promise<FormattedError> {
    const fullContext: ErrorContext = {
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
      ...context
    };

    // Add stack trace if available
    if (error.stack) {
      fullContext.stackTrace = error.stack;
    }

    // Notify registered handlers
    this.errorHandlers.forEach(handler => {
      try {
        handler(error, fullContext);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });

    // Classify error
    const classification = this.classifyError(error);

    // Format error for user
    const formattedError = this.formatError(error, classification, fullContext);

    // Attempt recovery if possible
    if (classification.recoverable) {
      await this.attemptRecovery(error, fullContext);
    }

    return formattedError;
  }

  /**
   * Classify error based on type and content
   */
  private classifyError(error: Error): ErrorClassification {
    // Check for custom error classifications by name first
    const customClassification = this.classifications.get(error.name);
    if (customClassification) {
      return customClassification;
    }

    // Check for specific error types
    if (error instanceof ValidationError) {
      return this.classifications.get('ValidationError') || this.getDefaultClassification();
    }
    
    if (error instanceof ConfigurationError) {
      return this.classifications.get('ConfigurationError') || this.getDefaultClassification();
    }
    
    if (error instanceof CommandExecutionError) {
      return this.classifications.get('CommandExecutionError') || this.getDefaultClassification();
    }

    // Check for system errors
    if (error.message.includes('ENOENT') || error.message.includes('file not found')) {
      return this.classifications.get('FileNotFound') || this.getDefaultClassification();
    }

    if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      return this.classifications.get('PermissionDenied') || this.getDefaultClassification();
    }

    if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
      return this.classifications.get('NetworkError') || this.getDefaultClassification();
    }

    // Default classification
    return this.getDefaultClassification();
  }

  /**
   * Format error for user-friendly display
   */
  private formatError(
    error: Error, 
    classification: ErrorClassification, 
    context: ErrorContext
  ): FormattedError {
    const suggestions = this.getSuggestions(error, classification, context);

    return {
      message: this.getUserFriendlyMessage(error, classification),
      details: this.getErrorDetails(error, classification),
      suggestions,
      code: classification.code,
      severity: classification.severity,
      timestamp: context.timestamp.toISOString(),
      context: this.sanitizeContext(context)
    };
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: Error, classification: ErrorClassification): string {
    switch (classification.category) {
      case ErrorCategory.Validation:
        return `Invalid input: ${error.message}`;
      
      case ErrorCategory.Configuration:
        return `Configuration error: ${error.message}`;
      
      case ErrorCategory.Command:
        return `Command failed: ${error.message}`;
      
      case ErrorCategory.FileSystem:
        return `File system error: ${error.message}`;
      
      case ErrorCategory.Network:
        return `Network error: ${error.message}`;
      
      case ErrorCategory.Permission:
        return `Permission denied: ${error.message}`;
      
      default:
        return error.message;
    }
  }

  /**
   * Get detailed error information
   */
  private getErrorDetails(error: Error, classification: ErrorClassification): string | undefined {
    if (classification.severity === ErrorSeverity.Low) {
      return undefined; // Don't show details for low severity errors
    }

    if (error instanceof CliError) {
      return `Error Code: ${error.code}`;
    }

    return error.stack ? 'Use --verbose flag for detailed error information.' : undefined;
  }

  /**
   * Get error suggestions
   */
  private getSuggestions(
    error: Error, 
    classification: ErrorClassification, 
    context: ErrorContext
  ): string[] {
    const suggestions: string[] = [];

    // Add classification suggestions
    if (classification.suggestedActions) {
      suggestions.push(...classification.suggestedActions);
    }

    // Add recovery strategy suggestions
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error, context)) {
        suggestions.push(...strategy.getSuggestions(error, context));
      }
    }

    return suggestions;
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(error: Error, context: ErrorContext): Promise<boolean> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error, context)) {
        try {
          const recovered = await strategy.recover(error, context);
          if (recovered) {
            return true;
          }
        } catch (recoveryError) {
          console.error('Recovery strategy failed:', recoveryError);
        }
      }
    }
    return false;
  }

  /**
   * Setup default error classifications
   */
  private setupDefaultClassifications(): void {
    this.classifications.set('ValidationError', {
      category: ErrorCategory.Validation,
      severity: ErrorSeverity.Medium,
      code: 'CLI_VALIDATION_ERROR',
      recoverable: false,
      userActionRequired: true,
      suggestedActions: [
        'Check your input parameters',
        'Use --help to see valid options',
        'Verify the command syntax'
      ]
    });

    this.classifications.set('ConfigurationError', {
      category: ErrorCategory.Configuration,
      severity: ErrorSeverity.High,
      code: 'CLI_CONFIG_ERROR',
      recoverable: true,
      userActionRequired: true,
      suggestedActions: [
        'Check your configuration file',
        'Verify environment variables',
        'Use default configuration'
      ]
    });

    this.classifications.set('CommandExecutionError', {
      category: ErrorCategory.Command,
      severity: ErrorSeverity.High,
      code: 'CLI_COMMAND_ERROR',
      recoverable: false,
      userActionRequired: true,
      suggestedActions: [
        'Check command arguments',
        'Verify required permissions',
        'Try running with --verbose for more details'
      ]
    });

    this.classifications.set('FileNotFound', {
      category: ErrorCategory.FileSystem,
      severity: ErrorSeverity.Medium,
      code: 'CLI_FILE_NOT_FOUND',
      recoverable: false,
      userActionRequired: true,
      suggestedActions: [
        'Check if the file path is correct',
        'Verify the file exists',
        'Check file permissions'
      ]
    });

    this.classifications.set('PermissionDenied', {
      category: ErrorCategory.Permission,
      severity: ErrorSeverity.High,
      code: 'CLI_PERMISSION_DENIED',
      recoverable: false,
      userActionRequired: true,
      suggestedActions: [
        'Run with appropriate permissions',
        'Check file/directory permissions',
        'Contact system administrator if needed'
      ]
    });

    this.classifications.set('NetworkError', {
      category: ErrorCategory.Network,
      severity: ErrorSeverity.Medium,
      code: 'CLI_NETWORK_ERROR',
      recoverable: true,
      userActionRequired: false,
      suggestedActions: [
        'Check your internet connection',
        'Verify the server is accessible',
        'Try again later'
      ]
    });
  }

  /**
   * Setup default recovery strategies
   */
  private setupDefaultRecoveryStrategies(): void {
    // Configuration fallback strategy
    this.recoveryStrategies.push({
      canRecover: (error: Error) => error instanceof ConfigurationError,
      recover: async () => {
        // Attempt to use default configuration
        return true;
      },
      getSuggestions: () => ['Using default configuration as fallback']
    });

    // Network retry strategy
    this.recoveryStrategies.push({
      canRecover: (error: Error) => 
        error.message.includes('ECONNREFUSED') || 
        error.message.includes('network') ||
        error.message.includes('timeout'),
      recover: async () => {
        // Could implement retry logic here
        return false;
      },
      getSuggestions: () => ['Network operation can be retried']
    });
  }

  /**
   * Get default error classification
   */
  private getDefaultClassification(): ErrorClassification {
    return {
      category: ErrorCategory.System,
      severity: ErrorSeverity.Medium,
      code: 'CLI_UNKNOWN_ERROR',
      recoverable: false,
      userActionRequired: true,
      suggestedActions: ['Check the error details and try again']
    };
  }

  /**
   * Generate correlation ID for error tracking
   */
  private generateCorrelationId(): string {
    return `cli-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize context for safe display
   */
  private sanitizeContext(context: ErrorContext): Partial<ErrorContext> {
    return {
      command: context.command,
      timestamp: context.timestamp,
      correlationId: context.correlationId,
      // Don't include sensitive information like environment variables
      // or full arguments that might contain secrets
    };
  }
}

/**
 * Convenience function to handle errors globally
 */
export function handleGlobalError(error: Error, context?: Partial<ErrorContext>): Promise<FormattedError> {
  return GlobalErrorHandler.getInstance().handleError(error, context);
}

/**
 * Decorator for automatic error handling
 */
export function HandleErrors(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      const formattedError = await handleGlobalError(error as Error, {
        command: propertyKey,
        arguments: args.map(arg => String(arg))
      });
      
      // Re-throw with formatted error information
      const enhancedError = new Error(formattedError.message);
      (enhancedError as any).formattedError = formattedError;
      throw enhancedError;
    }
  };

  return descriptor;
}

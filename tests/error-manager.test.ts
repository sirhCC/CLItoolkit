import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  GlobalErrorHandler,
  ErrorSeverity,
  ErrorCategory,
  ErrorClassification,
  ErrorContext,
  RecoveryStrategy,
  handleGlobalError
} from '../src/core/error-manager';
import {
  ValidationError,
  CommandExecutionError,
  ConfigurationError
} from '../src/types/errors';

describe('GlobalErrorHandler', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    // Reset singleton instance for each test
    (GlobalErrorHandler as any).instance = undefined;
    errorHandler = GlobalErrorHandler.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify ValidationError correctly', async () => {
      const error = new ValidationError('Invalid input', 'testField');
      const context: ErrorContext = {
        command: 'test',
        timestamp: new Date()
      };

      const result = await errorHandler.handleError(error, context);

      expect(result.code).toBe('CLI_VALIDATION_ERROR');
      expect(result.severity).toBe(ErrorSeverity.Medium);
      expect(result.message).toContain('Invalid input');
      expect(result.suggestions).toContain('Check your input parameters');
    });

    it('should classify ConfigurationError correctly', async () => {
      const error = new ConfigurationError('Invalid config');
      const result = await errorHandler.handleError(error);

      expect(result.code).toBe('CLI_CONFIG_ERROR');
      expect(result.severity).toBe(ErrorSeverity.High);
      expect(result.message).toContain('Configuration error');
    });

    it('should classify CommandExecutionError correctly', async () => {
      const error = new CommandExecutionError('Command failed', 'testCommand');
      const result = await errorHandler.handleError(error);

      expect(result.code).toBe('CLI_COMMAND_ERROR');
      expect(result.severity).toBe(ErrorSeverity.High);
      expect(result.message).toContain('Command failed');
    });

    it('should classify file not found errors', async () => {
      const error = new Error('ENOENT: file not found');
      const result = await errorHandler.handleError(error);

      expect(result.code).toBe('CLI_FILE_NOT_FOUND');
      expect(result.severity).toBe(ErrorSeverity.Medium);
      expect(result.suggestions).toContain('Check if the file path is correct');
    });

    it('should classify permission denied errors', async () => {
      const error = new Error('EACCES: permission denied');
      const result = await errorHandler.handleError(error);

      expect(result.code).toBe('CLI_PERMISSION_DENIED');
      expect(result.severity).toBe(ErrorSeverity.High);
      expect(result.suggestions).toContain('Run with appropriate permissions');
    });

    it('should classify network errors', async () => {
      const error = new Error('ECONNREFUSED: network error');
      const result = await errorHandler.handleError(error);

      expect(result.code).toBe('CLI_NETWORK_ERROR');
      expect(result.severity).toBe(ErrorSeverity.Medium);
      expect(result.suggestions).toContain('Check your internet connection');
    });

    it('should handle unknown errors with default classification', async () => {
      const error = new Error('Unknown error');
      const result = await errorHandler.handleError(error);

      expect(result.code).toBe('CLI_UNKNOWN_ERROR');
      expect(result.severity).toBe(ErrorSeverity.Medium);
    });
  });

  describe('Error Context', () => {
    it('should include context information in formatted error', async () => {
      const error = new Error('Test error');
      const context: Partial<ErrorContext> = {
        command: 'test-command',
        arguments: ['arg1', 'arg2'],
        options: { flag: true }
      };

      const result = await errorHandler.handleError(error, context);

      expect(result.context?.command).toBe('test-command');
      expect(result.context?.timestamp).toBeDefined();
      expect(result.context?.correlationId).toBeDefined();
    });

    it('should generate correlation IDs', async () => {
      const error = new Error('Test error');
      
      const result1 = await errorHandler.handleError(error);
      const result2 = await errorHandler.handleError(error);

      expect(result1.context?.correlationId).toBeDefined();
      expect(result2.context?.correlationId).toBeDefined();
      expect(result1.context?.correlationId).not.toBe(result2.context?.correlationId);
    });

    it('should include stack trace in context when available', async () => {
      const error = new Error('Test error with stack');
      const result = await errorHandler.handleError(error);

      // Should suggest verbose flag for stack trace
      expect(result.details).toContain('verbose');
    });
  });

  describe('Custom Classifications', () => {
    it('should allow registering custom error classifications', async () => {
      const customClassification: ErrorClassification = {
        category: ErrorCategory.System,
        severity: ErrorSeverity.Critical,
        code: 'CUSTOM_ERROR',
        recoverable: false,
        userActionRequired: true,
        suggestedActions: ['Custom action']
      };

      errorHandler.registerClassification('CustomError', customClassification);

      // This won't be triggered unless we have a CustomError class, 
      // but we can test the registration doesn't throw
      expect(() => {
        errorHandler.registerClassification('AnotherError', customClassification);
      }).not.toThrow();
    });
  });

  describe('Recovery Strategies', () => {
    it('should support custom recovery strategies', async () => {
      const mockStrategy: RecoveryStrategy = {
        canRecover: jest.fn<(error: Error, context: ErrorContext) => boolean>().mockReturnValue(true),
        recover: jest.fn<(error: Error, context: ErrorContext) => Promise<boolean>>().mockResolvedValue(true),
        getSuggestions: jest.fn<(error: Error, context: ErrorContext) => string[]>().mockReturnValue(['Custom suggestion'])
      };

      // Register a custom classification that is recoverable
      errorHandler.registerClassification('RecoverableError', {
        category: ErrorCategory.System,
        severity: ErrorSeverity.Medium,
        code: 'RECOVERABLE_ERROR',
        recoverable: true,
        userActionRequired: false,
        suggestedActions: ['Try again']
      });

      errorHandler.registerRecoveryStrategy(mockStrategy);

      // Create an error that matches our custom classification
      const error = new Error('Recoverable error');
      error.name = 'RecoverableError';
      
      const result = await errorHandler.handleError(error);

      expect(mockStrategy.canRecover).toHaveBeenCalled();
      expect(mockStrategy.recover).toHaveBeenCalled();
      expect(result.suggestions).toContain('Custom suggestion');
    });

    it('should handle recovery strategy failures gracefully', async () => {
      const mockStrategy: RecoveryStrategy = {
        canRecover: jest.fn<(error: Error, context: ErrorContext) => boolean>().mockReturnValue(true),
        recover: jest.fn<(error: Error, context: ErrorContext) => Promise<boolean>>().mockRejectedValue(new Error('Recovery failed')),
        getSuggestions: jest.fn<(error: Error, context: ErrorContext) => string[]>().mockReturnValue(['Recovery suggestion'])
      };

      errorHandler.registerRecoveryStrategy(mockStrategy);

      const error = new Error('Error to recover');
      
      // Should not throw even if recovery fails
      await expect(errorHandler.handleError(error)).resolves.toBeDefined();
    });
  });

  describe('Error Handlers', () => {
    it('should notify registered error handlers', async () => {
      const mockHandler = jest.fn();
      errorHandler.registerErrorHandler(mockHandler);

      const error = new Error('Test error');
      const context = { command: 'test' };

      await errorHandler.handleError(error, context);

      expect(mockHandler).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          command: 'test',
          timestamp: expect.any(Date),
          correlationId: expect.any(String)
        })
      );
    });

    it('should handle error handler failures gracefully', async () => {
      const failingHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler failed');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      errorHandler.registerErrorHandler(failingHandler);

      const error = new Error('Test error');
      
      // Should not throw even if handler fails
      await expect(errorHandler.handleError(error)).resolves.toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in error handler:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide appropriate messages for different error categories', async () => {
      const validationError = new ValidationError('Field required');
      const configError = new ConfigurationError('Config missing');
      const commandError = new CommandExecutionError('Command failed');

      const validationResult = await errorHandler.handleError(validationError);
      const configResult = await errorHandler.handleError(configError);
      const commandResult = await errorHandler.handleError(commandError);

      expect(validationResult.message).toMatch(/Invalid input:/);
      expect(configResult.message).toMatch(/Configuration error:/);
      expect(commandResult.message).toMatch(/Command failed:/);
    });

    it('should sanitize context to avoid exposing sensitive information', async () => {
      const error = new Error('Test error');
      const context: Partial<ErrorContext> = {
        command: 'sensitive-command',
        arguments: ['--password', 'secret123'],
        environment: {
          'API_KEY': 'secret-key',
          'PATH': '/usr/bin'
        }
      };

      const result = await errorHandler.handleError(error, context);

      // Should include command but not sensitive environment or arguments
      expect(result.context?.command).toBe('sensitive-command');
      expect(result.context).not.toHaveProperty('environment');
      expect(result.context).not.toHaveProperty('arguments');
    });
  });
});

describe('handleGlobalError function', () => {
  it('should be a convenience wrapper for GlobalErrorHandler', async () => {
    const error = new ValidationError('Test validation error');
    const context = { command: 'test-command' };

    const result = await handleGlobalError(error, context);

    expect(result).toBeDefined();
    expect(result.code).toBe('CLI_VALIDATION_ERROR');
    expect(result.message).toContain('Invalid input');
  });
});

describe('Error Classification System', () => {
  it('should support all error categories', () => {
    expect(Object.values(ErrorCategory)).toEqual([
      'validation',
      'configuration',
      'command',
      'system',
      'network',
      'filesystem',
      'authentication',
      'permission'
    ]);
  });

  it('should support all error severities', () => {
    expect(Object.values(ErrorSeverity)).toEqual([
      'low',
      'medium',
      'high',
      'critical'
    ]);
  });

  it('should handle error classification properties correctly', () => {
    const classification: ErrorClassification = {
      category: ErrorCategory.Validation,
      severity: ErrorSeverity.High,
      code: 'TEST_ERROR',
      recoverable: true,
      userActionRequired: false,
      suggestedActions: ['Test action']
    };

    expect(classification.category).toBe(ErrorCategory.Validation);
    expect(classification.severity).toBe(ErrorSeverity.High);
    expect(classification.recoverable).toBe(true);
    expect(classification.userActionRequired).toBe(false);
    expect(classification.suggestedActions).toContain('Test action');
  });
});

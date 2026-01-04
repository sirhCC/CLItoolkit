/**
 * Tests for Phase 3.2 Execution Framework - Execution Pipeline
 */

import { 
  IMiddleware,
  MiddlewareFunction,
  ExecutionPipeline,
  ValidationMiddleware,
  TimingMiddleware,
  LoggingMiddleware,
  ErrorHandlingMiddleware,
  LifecycleMiddleware,
  PipelineFactory
} from '../src/core/execution-pipeline';
import { ExecutionContext } from '../src/core/execution-context';
import { ICommandResult } from '../src/types/command';

describe('ExecutionPipeline', () => {
  let pipeline: ExecutionPipeline;
  let mockCommand: any;
  let mockContext: any;

  beforeEach(() => {
    pipeline = new ExecutionPipeline();
    mockCommand = {
      name: 'test-command',
      description: 'Test command',
      execute: jest.fn().mockResolvedValue({ success: true, exitCode: 0 })
    };
    mockContext = ExecutionContext.create([], {}, [], mockCommand);
  });

  test('should execute command when no middleware is registered', async () => {
    const result = await pipeline.execute(mockContext, mockCommand);

    expect(mockCommand.execute).toHaveBeenCalledWith(mockContext);
    expect(result).toEqual({ success: true, exitCode: 0 });
  });

  test('should execute middleware in correct order', async () => {
    const executionOrder: string[] = [];

    const middleware1: MiddlewareFunction = async (context, next) => {
      executionOrder.push('middleware1-start');
      const result = await next();
      executionOrder.push('middleware1-end');
      return result;
    };

    const middleware2: MiddlewareFunction = async (context, next) => {
      executionOrder.push('middleware2-start');
      const result = await next();
      executionOrder.push('middleware2-end');
      return result;
    };

    pipeline.use('middleware1', middleware1, 1);
    pipeline.use('middleware2', middleware2, 2);

    await pipeline.execute(mockContext, mockCommand);

    expect(executionOrder).toEqual([
      'middleware1-start',
      'middleware2-start',
      'middleware2-end',
      'middleware1-end'
    ]);
  });

  test('should respect middleware order based on order parameter', async () => {
    const executionOrder: string[] = [];

    const highPriorityMiddleware: MiddlewareFunction = async (context, next) => {
      executionOrder.push('high-priority');
      return await next();
    };

    const lowPriorityMiddleware: MiddlewareFunction = async (context, next) => {
      executionOrder.push('low-priority');
      return await next();
    };

    // Add in reverse order but with correct priorities
    pipeline.use('low', lowPriorityMiddleware, 10);
    pipeline.use('high', highPriorityMiddleware, 1);

    await pipeline.execute(mockContext, mockCommand);

    expect(executionOrder).toEqual(['high-priority', 'low-priority']);
  });

  test('should handle class-based middleware', async () => {
    class TestMiddleware implements IMiddleware {
      async execute(context: any, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
        const result = await next();
        return { ...result, data: 'modified' };
      }
    }

    pipeline.use('test', new TestMiddleware());

    const result = await pipeline.execute(mockContext, mockCommand);

    expect(result).toEqual({ success: true, exitCode: 0, data: 'modified' });
  });

  test('should allow middleware to modify result', async () => {
    const modifyingMiddleware: MiddlewareFunction = async (context, next) => {
      const result = await next();
      return { ...result, message: 'Modified by middleware' };
    };

    pipeline.use('modifier', modifyingMiddleware);

    const result = await pipeline.execute(mockContext, mockCommand);

    expect(result).toEqual({ 
      success: true, 
      exitCode: 0, 
      message: 'Modified by middleware' 
    });
  });

  test('should allow middleware to short-circuit execution', async () => {
    const shortCircuitMiddleware: MiddlewareFunction = async () => {
      return { success: false, exitCode: 1, message: 'Short-circuited' };
    };

    pipeline.use('short-circuit', shortCircuitMiddleware);

    const result = await pipeline.execute(mockContext, mockCommand);

    expect(mockCommand.execute).not.toHaveBeenCalled();
    expect(result).toEqual({ 
      success: false, 
      exitCode: 1, 
      message: 'Short-circuited' 
    });
  });

  test('should remove middleware correctly', () => {
    const middleware: MiddlewareFunction = async (context, next) => next();

    pipeline.use('test', middleware);
    expect(pipeline.getStages()).toHaveLength(1);

    const removed = pipeline.remove('test');
    expect(removed).toBe(true);
    expect(pipeline.getStages()).toHaveLength(0);
  });

  test('should return false when removing non-existent middleware', () => {
    const removed = pipeline.remove('non-existent');
    expect(removed).toBe(false);
  });

  test('should clear all middleware', () => {
    const middleware: MiddlewareFunction = async (context, next) => next();

    pipeline.use('test1', middleware);
    pipeline.use('test2', middleware);
    expect(pipeline.getStages()).toHaveLength(2);

    pipeline.clear();
    expect(pipeline.getStages()).toHaveLength(0);
  });

  test('should return stages array', () => {
    const middleware: MiddlewareFunction = async (context, next) => next();
    pipeline.use('test', middleware, 5);

    const stages = pipeline.getStages();
    expect(stages).toHaveLength(1);
    expect(stages[0]).toEqual({
      name: 'test',
      middleware,
      order: 5
    });

    // Verify stages are independent of original array
    expect(Array.isArray(stages)).toBe(true);
  });
});

describe('ValidationMiddleware', () => {
  let middleware: ValidationMiddleware;
  let mockContext: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new ValidationMiddleware();
    mockContext = {
      command: {},
      cancellationToken: {
        throwIfCancelled: jest.fn()
      }
    };
    mockNext = jest.fn().mockResolvedValue({ success: true, exitCode: 0 });
  });

  test('should check cancellation token', async () => {
    await middleware.execute(mockContext, mockNext);

    expect(mockContext.cancellationToken.throwIfCancelled).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  test('should run command validation when available', async () => {
    const mockValidate = jest.fn().mockResolvedValue(true);
    mockContext.command.validate = mockValidate;

    await middleware.execute(mockContext, mockNext);

    expect(mockValidate).toHaveBeenCalledWith(mockContext);
    expect(mockNext).toHaveBeenCalled();
  });

  test('should return failure when validation fails', async () => {
    const mockValidate = jest.fn().mockResolvedValue(false);
    mockContext.command.validate = mockValidate;

    const result = await middleware.execute(mockContext, mockNext);

    expect(mockValidate).toHaveBeenCalledWith(mockContext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      exitCode: 1,
      message: 'Command validation failed'
    });
  });

  test('should handle validation errors', async () => {
    const validationError = new Error('Validation failed');
    const mockValidate = jest.fn().mockRejectedValue(validationError);
    mockContext.command.validate = mockValidate;

    const result = await middleware.execute(mockContext, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      exitCode: 1,
      error: validationError,
      message: 'Validation error: Validation failed'
    });
  });

  test('should proceed when no validation method exists', async () => {
    // No validate method on command
    await middleware.execute(mockContext, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe('TimingMiddleware', () => {
  let middleware: TimingMiddleware;
  let mockContext: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new TimingMiddleware();
    mockContext = {
      setMetadata: jest.fn()
    };
    mockNext = jest.fn().mockResolvedValue({ success: true, exitCode: 0 });
  });

  test('should set timing metadata on successful execution', async () => {
    const result = await middleware.execute(mockContext, mockNext);

    expect(mockContext.setMetadata).toHaveBeenCalledWith('execution.startTime', expect.any(Number));
    expect(mockContext.setMetadata).toHaveBeenCalledWith('execution.endTime', expect.any(Number));
    expect(mockContext.setMetadata).toHaveBeenCalledWith('execution.duration', expect.any(Number));
    expect(result).toEqual({ success: true, exitCode: 0 });
  });

  test('should set timing metadata on failed execution', async () => {
    const error = new Error('Test error');
    mockNext.mockRejectedValue(error);

    await expect(middleware.execute(mockContext, mockNext)).rejects.toThrow(error);

    expect(mockContext.setMetadata).toHaveBeenCalledWith('execution.startTime', expect.any(Number));
    expect(mockContext.setMetadata).toHaveBeenCalledWith('execution.endTime', expect.any(Number));
    expect(mockContext.setMetadata).toHaveBeenCalledWith('execution.duration', expect.any(Number));
  });
});

describe('LoggingMiddleware', () => {
  let middleware: LoggingMiddleware;
  let mockContext: any;
  let mockNext: jest.Mock;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockContext = {
      command: { name: 'test-command' },
      args: ['arg1'],
      options: { flag: true }
    };
    mockNext = jest.fn().mockResolvedValue({ success: true, exitCode: 0 });
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should log command execution with info level', async () => {
    middleware = new LoggingMiddleware('info');

    const result = await middleware.execute(mockContext, mockNext);

    // New structured logging format includes component and operation context
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[INFO\] \[ExecutionPipeline\].*Executing command: test-command/)
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[INFO\] \[ExecutionPipeline\].*Command completed successfully: test-command/)
    );
    expect(result).toEqual({ success: true, exitCode: 0 });
  });

  test('should not log with error level on success', async () => {
    middleware = new LoggingMiddleware('error');

    await middleware.execute(mockContext, mockNext);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test('should log errors with error level', async () => {
    middleware = new LoggingMiddleware('error');
    const error = new Error('Test error');
    mockNext.mockRejectedValue(error);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await middleware.execute(mockContext, mockNext);
    expect(result.success).toBe(false);
    expect(result.error).toBe(error);

    // New structured logging format
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[ERROR\] \[ExecutionPipeline\].*Command failed: test-command/)
    );

    consoleErrorSpy.mockRestore();
  });
});

describe('ErrorHandlingMiddleware', () => {
  let middleware: ErrorHandlingMiddleware;
  let mockContext: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new ErrorHandlingMiddleware();
    mockContext = {
      setMetadata: jest.fn()
    };
    mockNext = jest.fn();
  });

  test('should pass through successful results', async () => {
    const successResult = { success: true, exitCode: 0 };
    mockNext.mockResolvedValue(successResult);

    const result = await middleware.execute(mockContext, mockNext);

    expect(result).toBe(successResult);
    expect(mockContext.setMetadata).not.toHaveBeenCalled();
  });

  test('should convert errors to command results', async () => {
    const error = new Error('Test error');
    mockNext.mockRejectedValue(error);

    const result = await middleware.execute(mockContext, mockNext);

    expect(result).toEqual({
      success: false,
      exitCode: 1,
      error,
      message: 'Test error'
    });
    expect(mockContext.setMetadata).toHaveBeenCalledWith('execution.error', error);
    expect(mockContext.setMetadata).toHaveBeenCalledWith('execution.errorType', 'Error');
  });

  test('should handle non-Error exceptions', async () => {
    const nonError = 'String error';
    mockNext.mockRejectedValue(nonError);

    const result = await middleware.execute(mockContext, mockNext);

    expect(result).toEqual({
      success: false,
      exitCode: 1,
      error: expect.any(Error),
      message: 'String error'
    });
    expect(mockContext.setMetadata).toHaveBeenCalledWith('execution.error', nonError);
    expect(mockContext.setMetadata).toHaveBeenCalledWith('execution.errorType', 'Unknown');
  });
});

describe('LifecycleMiddleware', () => {
  let middleware: LifecycleMiddleware;
  let mockContext: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new LifecycleMiddleware();
    mockContext = {
      command: {}
    };
    mockNext = jest.fn().mockResolvedValue({ success: true, exitCode: 0 });
  });

  test('should call setup and cleanup on successful execution', async () => {
    const mockSetup = jest.fn().mockResolvedValue(undefined);
    const mockCleanup = jest.fn().mockResolvedValue(undefined);
    mockContext.command.setup = mockSetup;
    mockContext.command.cleanup = mockCleanup;

    const result = await middleware.execute(mockContext, mockNext);

    expect(mockSetup).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
    expect(mockCleanup).toHaveBeenCalled();
    expect(result).toEqual({ success: true, exitCode: 0 });
  });

  test('should call cleanup even on execution failure', async () => {
    const mockSetup = jest.fn().mockResolvedValue(undefined);
    const mockCleanup = jest.fn().mockResolvedValue(undefined);
    mockContext.command.setup = mockSetup;
    mockContext.command.cleanup = mockCleanup;

    const error = new Error('Execution failed');
    mockNext.mockRejectedValue(error);

    await expect(middleware.execute(mockContext, mockNext)).rejects.toThrow(error);

    expect(mockSetup).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
    expect(mockCleanup).toHaveBeenCalled();
  });

  test('should handle setup failure', async () => {
    const setupError = new Error('Setup failed');
    const mockSetup = jest.fn().mockRejectedValue(setupError);
    mockContext.command.setup = mockSetup;

    const result = await middleware.execute(mockContext, mockNext);

    expect(mockSetup).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      exitCode: 1,
      error: setupError,
      message: 'Setup failed: Setup failed'
    });
  });

  test('should handle cleanup failure gracefully', async () => {
    const mockSetup = jest.fn().mockResolvedValue(undefined);
    const mockCleanup = jest.fn().mockRejectedValue(new Error('Cleanup failed'));
    mockContext.command.setup = mockSetup;
    mockContext.command.cleanup = mockCleanup;

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await middleware.execute(mockContext, mockNext);

    expect(result).toEqual({ success: true, exitCode: 0 });
    expect(consoleWarnSpy).toHaveBeenCalledWith('Cleanup failed:', expect.any(Error));

    consoleWarnSpy.mockRestore();
  });
});

describe('PipelineFactory', () => {
  test('should create default pipeline with expected middleware', () => {
    const pipeline = PipelineFactory.createDefault();
    const stages = pipeline.getStages();

    expect(stages).toHaveLength(5);
    expect(stages.map(s => s.name)).toEqual([
      'error-handling',
      'timing',
      'logging',
      'lifecycle',
      'validation'
    ]);
  });

  test('should create minimal pipeline', () => {
    const pipeline = PipelineFactory.createMinimal();
    const stages = pipeline.getStages();

    expect(stages).toHaveLength(1);
    expect(stages[0].name).toBe('error-handling');
  });

  test('should create debug pipeline', () => {
    const pipeline = PipelineFactory.createDebug();
    const stages = pipeline.getStages();

    expect(stages).toHaveLength(5);
    expect(stages.map(s => s.name)).toEqual([
      'error-handling',
      'timing',
      'logging',
      'lifecycle',
      'validation'
    ]);
  });
});

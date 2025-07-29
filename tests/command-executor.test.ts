/**
 * Tests for Phase 3.2 Execution Framework - Command Executor
 */

import { 
  CommandExecutor,
  globalExecutor
} from '../src/core/command-executor';
import { ExecutionPipeline } from '../src/core/execution-pipeline';
import { CancellationToken, ServiceContainer } from '../src/core/execution-context';
import { CommandExecutionError } from '../src/types/errors';

describe('CommandExecutor', () => {
  let executor: CommandExecutor;
  let mockCommand: any;

  beforeEach(() => {
    executor = new CommandExecutor(2); // Low concurrency for testing
    mockCommand = {
      name: 'test-command',
      description: 'Test command',
      execute: jest.fn().mockResolvedValue({ success: true, exitCode: 0 })
    };
  });

  afterEach(async () => {
    // Cleanup any running executions
    executor.cancelAllExecutions('Test cleanup');
    await executor.waitForAll();
  });

  test('should execute command asynchronously', async () => {
    const result = await executor.executeAsync(
      mockCommand,
      ['arg1'],
      { option: 'value' }
    );

    expect(mockCommand.execute).toHaveBeenCalled();
    expect(result).toEqual({ success: true, exitCode: 0 });
  });

  test('should update execution statistics', async () => {
    const initialStats = executor.getStats();
    expect(initialStats.totalExecutions).toBe(0);

    await executor.executeAsync(mockCommand, [], {});

    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
    expect(stats.failedExecutions).toBe(0);
    expect(stats.averageExecutionTime).toBeGreaterThan(0);
  });

  test('should track failed executions', async () => {
    mockCommand.execute.mockRejectedValue(new Error('Command failed'));

    try {
      await executor.executeAsync(mockCommand, [], {});
    } catch (error) {
      // Expected to throw
    }

    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successfulExecutions).toBe(0);
    expect(stats.failedExecutions).toBe(1);
  });

  test('should respect concurrency limits', async () => {
    // Create slow commands to fill up the executor
    const slowCommand = {
      name: 'slow-command',
      description: 'Slow command',
      execute: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, exitCode: 0 }), 100))
      )
    };

    // Start max concurrent executions
    const promises = [
      executor.executeAsync(slowCommand, [], {}),
      executor.executeAsync(slowCommand, [], {})
    ];

    // Try to execute another command - should hit concurrency limit
    await expect(
      executor.executeAsync(slowCommand, [], {})
    ).rejects.toThrow(CommandExecutionError);
    await expect(
      executor.executeAsync(slowCommand, [], {})
    ).rejects.toThrow('Maximum concurrent executions reached');

    // Wait for existing executions to complete
    await Promise.all(promises);
  });

  test('should handle execution timeout', async () => {
    const slowCommand = {
      name: 'slow-command',
      description: 'Slow command',
      execute: jest.fn().mockImplementation(async (context) => {
        // Check for cancellation during execution
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 20));
          context.cancellationToken.throwIfCancelled();
        }
        return { success: true, exitCode: 0 };
      })
    };

    const start = Date.now();
    
    const result = await executor.executeAsync(slowCommand, [], {}, [], { timeout: 50 });
    
    const elapsed = Date.now() - start;
    
    // Should be cancelled due to timeout
    expect(result.success).toBe(false);
    expect(result.message).toContain('Operation was cancelled');
    expect(elapsed).toBeLessThan(300); // Allow some buffer for test execution
  }, 1000);

  test('should execute multiple commands concurrently', async () => {
    const commands = [
      { command: mockCommand, args: ['1'], options: {} },
      { command: mockCommand, args: ['2'], options: {} }
    ];

    const results = await executor.executeConcurrent(commands);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ success: true, exitCode: 0 });
    expect(results[1]).toEqual({ success: true, exitCode: 0 });
    expect(mockCommand.execute).toHaveBeenCalledTimes(2);
  });

  test('should execute multiple commands sequentially', async () => {
    const executionOrder: string[] = [];
    
    const createCommand = (name: string) => ({
      name,
      description: `${name} command`,
      execute: jest.fn().mockImplementation(async () => {
        executionOrder.push(name);
        return { success: true, exitCode: 0 };
      })
    });

    const command1 = createCommand('command1');
    const command2 = createCommand('command2');

    const commands = [
      { command: command1, args: [], options: {} },
      { command: command2, args: [], options: {} }
    ];

    const results = await executor.executeSequential(commands);

    expect(results).toHaveLength(2);
    expect(executionOrder).toEqual(['command1', 'command2']);
  });

  test('should stop sequential execution on failure by default', async () => {
    const successCommand = {
      name: 'success',
      description: 'Success command',
      execute: jest.fn().mockResolvedValue({ success: true, exitCode: 0 })
    };

    const failCommand = {
      name: 'fail',
      description: 'Fail command',
      execute: jest.fn().mockResolvedValue({ success: false, exitCode: 1 })
    };

    const neverCalledCommand = {
      name: 'never',
      description: 'Never called command',
      execute: jest.fn().mockResolvedValue({ success: true, exitCode: 0 })
    };

    const commands = [
      { command: successCommand, args: [], options: {} },
      { command: failCommand, args: [], options: {} },
      { command: neverCalledCommand, args: [], options: {} }
    ];

    const results = await executor.executeSequential(commands);

    expect(results).toHaveLength(2);
    expect(successCommand.execute).toHaveBeenCalled();
    expect(failCommand.execute).toHaveBeenCalled();
    expect(neverCalledCommand.execute).not.toHaveBeenCalled();
  });

  test('should continue sequential execution when configured', async () => {
    const failCommand = {
      name: 'fail',
      description: 'Fail command',
      execute: jest.fn().mockResolvedValue({ success: false, exitCode: 1 })
    };

    const successCommand = {
      name: 'success',
      description: 'Success command',
      execute: jest.fn().mockResolvedValue({ success: true, exitCode: 0 })
    };

    const commands = [
      { 
        command: failCommand, 
        args: [], 
        options: {},
        executionOptions: { metadata: { continueOnError: true } }
      },
      { command: successCommand, args: [], options: {} }
    ];

    const results = await executor.executeSequential(commands);

    expect(results).toHaveLength(2);
    expect(failCommand.execute).toHaveBeenCalled();
    expect(successCommand.execute).toHaveBeenCalled();
  });

  test('should cancel specific execution', async () => {
    const slowCommand = {
      name: 'slow-command',
      description: 'Slow command',
      execute: jest.fn().mockImplementation(async (context) => {
        // Simulate work that checks for cancellation
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 10));
          context.cancellationToken.throwIfCancelled();
        }
        return { success: true, exitCode: 0 };
      })
    };

    const executionPromise = executor.executeAsync(slowCommand, [], {});
    
    // Get the execution ID
    const runningExecutions = executor.getRunningExecutions();
    expect(runningExecutions).toHaveLength(1);
    
    const executionId = runningExecutions[0].id;
    
    // Cancel the execution
    setTimeout(() => {
      executor.cancelExecution(executionId, 'Test cancellation');
    }, 20);

    const result = await executionPromise;
    expect(result.success).toBe(false);
    expect(result.message).toContain('Operation was cancelled');
  });

  test('should cancel all executions', async () => {
    const slowCommand = {
      name: 'slow-command',
      description: 'Slow command',
      execute: jest.fn().mockImplementation(async (context) => {
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 10));
          context.cancellationToken.throwIfCancelled();
        }
        return { success: true, exitCode: 0 };
      })
    };

    const promise1 = executor.executeAsync(slowCommand, [], {});
    const promise2 = executor.executeAsync(slowCommand, [], {});

    // Wait a bit then cancel all
    setTimeout(() => {
      const cancelledCount = executor.cancelAllExecutions('Test cancellation');
      expect(cancelledCount).toBe(2);
    }, 20);

    const result1 = await promise1;
    const result2 = await promise2;
    
    expect(result1.success).toBe(false);
    expect(result1.message).toContain('Operation was cancelled');
    expect(result2.success).toBe(false);
    expect(result2.message).toContain('Operation was cancelled');
  });

  test('should track running executions', async () => {
    const slowCommand = {
      name: 'slow-command',
      description: 'Slow command',
      execute: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, exitCode: 0 }), 100))
      )
    };

    const promise = executor.executeAsync(slowCommand, [], {});
    
    const runningExecutions = executor.getRunningExecutions();
    expect(runningExecutions).toHaveLength(1);
    expect(runningExecutions[0].commandName).toBe('slow-command');
    expect(runningExecutions[0].startTime).toBeGreaterThan(0);

    await promise;

    const finishedExecutions = executor.getRunningExecutions();
    expect(finishedExecutions).toHaveLength(0);
  });

  test('should use custom pipeline when provided', async () => {
    const customPipeline = new ExecutionPipeline();
    let middlewareCalled = false;

    customPipeline.use('custom', async (context, next) => {
      middlewareCalled = true;
      return await next();
    });

    await executor.executeAsync(
      mockCommand,
      [],
      {},
      [],
      { pipeline: customPipeline }
    );

    expect(middlewareCalled).toBe(true);
  });

  test('should use custom services when provided', async () => {
    const customServices = new ServiceContainer();
    customServices.register('test-service', { value: 'test' });

    const serviceAwareCommand = {
      name: 'service-aware',
      description: 'Service aware command',
      execute: jest.fn().mockImplementation((context) => {
        const service = context.services.resolve('test-service');
        expect(service.value).toBe('test');
        return { success: true, exitCode: 0 };
      })
    };

    await executor.executeAsync(
      serviceAwareCommand,
      [],
      {},
      [],
      { services: customServices }
    );

    expect(serviceAwareCommand.execute).toHaveBeenCalled();
  });

  test('should check if executor can accept more executions', () => {
    expect(executor.canExecute()).toBe(true);

    // Fill up the executor
    const slowCommand = {
      name: 'slow',
      description: 'Slow command',
      execute: () => new Promise<{ success: boolean; exitCode: number }>(resolve => 
        setTimeout(() => resolve({ success: true, exitCode: 0 }), 1000)
      )
    };

    // Start maximum number of executions
    executor.executeAsync(slowCommand, [], {});
    executor.executeAsync(slowCommand, [], {});

    expect(executor.canExecute()).toBe(false);

    // Clean up
    executor.cancelAllExecutions();
  });

  test('should reset statistics', async () => {
    // Execute some commands to build up stats first
    const fastCommand = {
      name: 'fast',
      description: 'Fast command',
      execute: jest.fn().mockResolvedValue({ success: true, exitCode: 0 })
    };

    await executor.executeAsync(fastCommand, [], {});
    await executor.executeAsync(fastCommand, [], {});

    const stats = executor.getStats();
    expect(stats.totalExecutions).toBeGreaterThan(0);

    executor.resetStats();

    const resetStats = executor.getStats();
    expect(resetStats.totalExecutions).toBe(0);
    expect(resetStats.successfulExecutions).toBe(0);
    expect(resetStats.failedExecutions).toBe(0);
    expect(resetStats.averageExecutionTime).toBe(0);
    expect(resetStats.maxConcurrentExecutions).toBe(0);
  });

  test('should return default pipeline', () => {
    const pipeline = executor.getDefaultPipeline();
    expect(pipeline).toBeInstanceOf(ExecutionPipeline);
  });

  test('should use custom cancellation token', async () => {
    const customToken = new CancellationToken();
    let tokenUsed = false;

    const tokenAwareCommand = {
      name: 'token-aware',
      description: 'Token aware command',
      execute: jest.fn().mockImplementation((context) => {
        if (context.cancellationToken === customToken) {
          tokenUsed = true;
        }
        return { success: true, exitCode: 0 };
      })
    };

    await executor.executeAsync(
      tokenAwareCommand,
      [],
      {},
      [],
      { cancellationToken: customToken }
    );

    expect(tokenUsed).toBe(true);
  });

  test('should handle metadata in execution options', async () => {
    const metadata = { userId: 'test-user', sessionId: 'test-session' };
    let metadataReceived = false;

    const metadataAwareCommand = {
      name: 'metadata-aware',
      description: 'Metadata aware command',
      execute: jest.fn().mockImplementation((context) => {
        if (context.getMetadata('userId') === 'test-user') {
          metadataReceived = true;
        }
        return { success: true, exitCode: 0 };
      })
    };

    await executor.executeAsync(
      metadataAwareCommand,
      [],
      {},
      [],
      { metadata }
    );

    expect(metadataReceived).toBe(true);
  });
});

describe('globalExecutor', () => {
  test('should provide a global executor instance', () => {
    expect(globalExecutor).toBeInstanceOf(CommandExecutor);
  });

  test('should be a singleton', () => {
    const { globalExecutor: globalExecutor2 } = require('../src/core/command-executor');
    expect(globalExecutor).toBe(globalExecutor2);
  });
});

/**
 * Tests for Phase 3.2 Execution Framework - Enhanced CLI Framework
 */

import { EnhancedCliFramework } from '../src/core/enhanced-cli-framework';
import { ExecutionPipeline, PipelineFactory } from '../src/core/execution-pipeline';
import { ServiceContainer } from '../src/core/execution-context';

describe('EnhancedCliFramework', () => {
  let framework: EnhancedCliFramework;
  let mockCommand: any;

  beforeEach(() => {
    framework = new EnhancedCliFramework({
      name: 'test-cli',
      version: '1.0.0',
      description: 'Test CLI'
    });

    mockCommand = {
      name: 'test',
      description: 'Test command',
      execute: jest.fn().mockResolvedValue({ success: true, exitCode: 0 })
    };
  });

  afterEach(async () => {
    await framework.cleanup();
  });

  test('should initialize with default configuration', () => {
    const defaultFramework = new EnhancedCliFramework();
    expect(defaultFramework.getServices()).toBeInstanceOf(ServiceContainer);
    expect(defaultFramework.getPipeline()).toBeInstanceOf(ExecutionPipeline);
  });

  test('should register and retrieve commands', () => {
    framework.registerCommand(mockCommand);

    const retrieved = framework.getCommand('test');
    expect(retrieved).toBe(mockCommand);
  });

  test('should register command aliases', () => {
    const commandWithAlias = {
      ...mockCommand,
      aliases: ['t', 'tst']
    };

    framework.registerCommand(commandWithAlias);

    expect(framework.getCommand('t')).toBe(commandWithAlias);
    expect(framework.getCommand('tst')).toBe(commandWithAlias);
    expect(framework.getCommand('test')).toBe(commandWithAlias);
  });

  test('should prevent duplicate command registration', () => {
    framework.registerCommand(mockCommand);

    expect(() => {
      framework.registerCommand(mockCommand);
    }).toThrow("Command 'test' is already registered");
  });

  test('should prevent alias conflicts', () => {
    const command1 = { ...mockCommand, name: 'command1', aliases: ['c'] };
    const command2 = { ...mockCommand, name: 'command2', aliases: ['c'] };

    framework.registerCommand(command1);

    expect(() => {
      framework.registerCommand(command2);
    }).toThrow("Alias 'c' conflicts with existing command or alias");
  });

  test('should unregister commands', () => {
    const commandWithAlias = {
      ...mockCommand,
      aliases: ['t']
    };

    framework.registerCommand(commandWithAlias);
    expect(framework.getCommand('test')).toBe(commandWithAlias);
    expect(framework.getCommand('t')).toBe(commandWithAlias);

    const unregistered = framework.unregisterCommand('test');
    expect(unregistered).toBe(true);
    expect(framework.getCommand('test')).toBeUndefined();
    expect(framework.getCommand('t')).toBeUndefined();
  });

  test('should return false when unregistering non-existent command', () => {
    const unregistered = framework.unregisterCommand('non-existent');
    expect(unregistered).toBe(false);
  });

  test('should execute commands with enhanced features', async () => {
    framework.registerCommand(mockCommand);

    const result = await framework.executeCommand('test', ['arg1'], { option: 'value' });

    expect(mockCommand.execute).toHaveBeenCalled();
    expect(result).toEqual({ success: true, exitCode: 0 });
  });

  test('should handle command not found', async () => {
    const result = await framework.executeCommand('non-existent');

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("Command 'non-existent' not found");
  });

  test('should execute multiple commands concurrently', async () => {
    framework.registerCommand(mockCommand);

    const commands = [
      { name: 'test', args: ['1'] },
      { name: 'test', args: ['2'] }
    ];

    const results = await framework.executeConcurrent(commands);

    expect(results).toHaveLength(2);
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

    const command1 = createCommand('cmd1');
    const command2 = createCommand('cmd2');

    framework.registerCommand(command1);
    framework.registerCommand(command2);

    const commands = [
      { name: 'cmd1' },
      { name: 'cmd2' }
    ];

    await framework.executeSequential(commands);

    expect(executionOrder).toEqual(['cmd1', 'cmd2']);
  });

  test('should parse command line arguments correctly', () => {
    const parsed = framework.parseArguments(['command', 'arg1', '--option', 'value', '-f']);

    expect(parsed).toEqual({
      command: 'command',
      args: ['arg1'],
      options: {
        option: 'value',
        f: true
      }
    });
  });

  test('should handle empty arguments', () => {
    const parsed = framework.parseArguments([]);

    expect(parsed).toEqual({
      command: null,
      args: [],
      options: {}
    });
  });

  test('should parse long options with equals sign', () => {
    const parsed = framework.parseArguments(['cmd', '--key=value']);

    expect(parsed.options).toEqual({ key: 'value' });
  });

  test('should parse multiple short options', () => {
    const parsed = framework.parseArguments(['cmd', '-abc']);

    expect(parsed.options).toEqual({ a: true, b: true, c: true });
  });

  test('should run CLI with help option', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await framework.run(['--help']);

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should run CLI with version option', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await framework.run(['--version']);

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith('test-cli version 1.0.0');

    consoleSpy.mockRestore();
  });

  test('should show command-specific help', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    framework.registerCommand(mockCommand);

    const result = await framework.run(['test', '--help']);

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should show help when no arguments provided', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await framework.run([]);

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should execute default command when no arguments provided', async () => {
    const defaultCommand = {
      name: 'default',
      description: 'Default command',
      execute: jest.fn().mockResolvedValue({ success: true, exitCode: 0 })
    };

    const frameworkWithDefault = new EnhancedCliFramework({
      defaultCommand: 'default',
      showHelpWhenEmpty: false
    });

    frameworkWithDefault.registerCommand(defaultCommand);

    const result = await frameworkWithDefault.run([]);

    expect(defaultCommand.execute).toHaveBeenCalled();
    expect(result.success).toBe(true);

    await frameworkWithDefault.cleanup();
  });

  test('should provide service container access', () => {
    const services = framework.getServices();
    expect(services).toBeInstanceOf(ServiceContainer);

    // Should be able to register services
    services.register('test-service', { value: 'test' });
    expect(services.resolve('test-service')).toEqual({ value: 'test' });
  });

  test('should provide executor access', () => {
    const executor = framework.getExecutor();
    expect(executor).toBeDefined();
    expect(typeof executor.executeAsync).toBe('function');
  });

  test('should provide pipeline access', () => {
    const pipeline = framework.getPipeline();
    expect(pipeline).toBeInstanceOf(ExecutionPipeline);
  });

  test('should track execution statistics', async () => {
    framework.registerCommand(mockCommand);

    await framework.executeCommand('test');

    const stats = framework.getExecutionStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
  });

  test('should get running executions', async () => {
    const slowCommand = {
      name: 'slow',
      description: 'Slow command',
      execute: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, exitCode: 0 }), 100))
      )
    };

    framework.registerCommand(slowCommand);

    const promise = framework.executeCommand('slow');

    const runningExecutions = framework.getRunningExecutions();
    expect(runningExecutions).toHaveLength(1);
    expect(runningExecutions[0].commandName).toBe('slow');

    await promise;
  });

  test('should cancel all executions', async () => {
    const slowCommand = {
      name: 'slow',
      description: 'Slow command',
      execute: jest.fn().mockImplementation(async (context) => {
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 10));
          context.cancellationToken.throwIfCancelled();
        }
        return { success: true, exitCode: 0 };
      })
    };

    framework.registerCommand(slowCommand);

    const promise = framework.executeCommand('slow');

    setTimeout(() => {
      const cancelled = framework.cancelAllExecutions('Test cleanup');
      expect(cancelled).toBeGreaterThan(0);
    }, 20);

    try {
      await promise;
    } catch (error) {
      // Expected to be cancelled
    }
  });

  test('should wait for completion', async () => {
    const slowCommand = {
      name: 'slow',
      description: 'Slow command',
      execute: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, exitCode: 0 }), 50))
      )
    };

    framework.registerCommand(slowCommand);

    // Start execution without awaiting
    framework.executeCommand('slow');

    // Wait for all executions to complete
    await framework.waitForCompletion();

    const runningExecutions = framework.getRunningExecutions();
    expect(runningExecutions).toHaveLength(0);
  });

  test('should handle command setup and cleanup lifecycle', async () => {
    const setupSpy = jest.fn().mockResolvedValue(undefined);
    const cleanupSpy = jest.fn().mockResolvedValue(undefined);

    const lifecycleCommand = {
      name: 'lifecycle',
      description: 'Lifecycle command',
      setup: setupSpy,
      cleanup: cleanupSpy,
      execute: jest.fn().mockResolvedValue({ success: true, exitCode: 0 })
    };

    framework.registerCommand(lifecycleCommand);

    // Setup should be called during registration
    expect(setupSpy).toHaveBeenCalled();

    const unregistered = framework.unregisterCommand('lifecycle');
    expect(unregistered).toBe(true);

    // Cleanup should be called during unregistration
    await new Promise(resolve => setTimeout(resolve, 10)); // Allow async cleanup
    expect(cleanupSpy).toHaveBeenCalled();
  });

  test('should use different pipeline types', () => {
    const minimalFramework = new EnhancedCliFramework({
      pipelineType: 'minimal'
    });

    const debugFramework = new EnhancedCliFramework({
      pipelineType: 'debug'
    });

    const customFramework = new EnhancedCliFramework({
      pipelineType: 'custom',
      customPipeline: () => PipelineFactory.createMinimal()
    });

    expect(minimalFramework.getPipeline()).toBeInstanceOf(ExecutionPipeline);
    expect(debugFramework.getPipeline()).toBeInstanceOf(ExecutionPipeline);
    expect(customFramework.getPipeline()).toBeInstanceOf(ExecutionPipeline);

    minimalFramework.cleanup();
    debugFramework.cleanup();
    customFramework.cleanup();
  });

  test('should register global services from configuration', () => {
    const globalServices = [
      {
        token: 'global-service',
        implementation: { value: 'global' },
        singleton: true
      }
    ];

    const frameworkWithServices = new EnhancedCliFramework({
      globalServices
    });

    const services = frameworkWithServices.getServices();
    expect(services.resolve('global-service')).toEqual({ value: 'global' });

    frameworkWithServices.cleanup();
  });

  test('should handle execution timeout configuration', async () => {
    const slowCommand = {
      name: 'slow',
      description: 'Slow command',
      execute: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, exitCode: 0 }), 200))
      )
    };

    const timeoutFramework = new EnhancedCliFramework({
      defaultTimeout: 50
    });

    timeoutFramework.registerCommand(slowCommand);

    const start = Date.now();
    try {
      await timeoutFramework.executeCommand('slow');
    } catch (error) {
      // Expected to timeout
    }
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(150); // Should timeout before command completes

    await timeoutFramework.cleanup();
  }, 1000);

  test('should cleanup framework resources', async () => {
    const cleanupSpy = jest.fn().mockResolvedValue(undefined);
    const commandWithCleanup = {
      name: 'cleanup-test',
      description: 'Cleanup test command',
      cleanup: cleanupSpy,
      execute: jest.fn().mockResolvedValue({ success: true, exitCode: 0 })
    };

    framework.registerCommand(commandWithCleanup);

    await framework.cleanup();

    expect(cleanupSpy).toHaveBeenCalled();
  });
});

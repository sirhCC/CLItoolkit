/**
 * Tests for Phase 3.2 Execution Framework - Execution Context
 */

import { 
  CancellationToken, 
  ServiceContainer, 
  ExecutionContext,
  ServiceTokens
} from '../src/core/execution-context';
import { CommandExecutionError } from '../src/types/errors';

describe('CancellationToken', () => {
  let token: CancellationToken;

  beforeEach(() => {
    token = new CancellationToken();
  });

  test('should not be cancelled initially', () => {
    expect(token.isCancelled).toBe(false);
    expect(token.reason).toBeUndefined();
  });

  test('should be cancellable with reason', () => {
    const reason = 'User requested cancellation';
    token.cancel(reason);

    expect(token.isCancelled).toBe(true);
    expect(token.reason).toBe(reason);
  });

  test('should call registered callbacks when cancelled', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    token.onCancelled(callback1);
    token.onCancelled(callback2);

    token.cancel('Test cancellation');

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  test('should call callback immediately if already cancelled', () => {
    const callback = jest.fn();
    token.cancel('Already cancelled');

    token.onCancelled(callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('should throw error when throwIfCancelled is called on cancelled token', () => {
    token.cancel('Test cancellation');

    expect(() => token.throwIfCancelled()).toThrow(CommandExecutionError);
    expect(() => token.throwIfCancelled()).toThrow('Operation was cancelled: Test cancellation');
  });

  test('should not throw when throwIfCancelled is called on active token', () => {
    expect(() => token.throwIfCancelled()).not.toThrow();
  });

  test('should ignore multiple cancel calls', () => {
    const callback = jest.fn();
    token.onCancelled(callback);

    token.cancel('First cancellation');
    token.cancel('Second cancellation');

    expect(token.reason).toBe('First cancellation');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('should handle callback errors gracefully', () => {
    const errorCallback = jest.fn(() => {
      throw new Error('Callback error');
    });
    const normalCallback = jest.fn();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    token.onCancelled(errorCallback);
    token.onCancelled(normalCallback);

    token.cancel('Test');

    expect(errorCallback).toHaveBeenCalled();
    expect(normalCallback).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Error in cancellation callback:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  test('should register and resolve services', () => {
    const service = { value: 'test' };
    container.register('test', service);

    const resolved = container.resolve('test');
    expect(resolved).toBe(service);
  });

  test('should register and resolve factory services', () => {
    const factory = () => ({ value: 'factory' });
    container.register('factory', factory);

    const resolved = container.resolve('factory');
    expect(resolved).toEqual({ value: 'factory' });
  });

  test('should handle singleton services correctly', () => {
    let instanceCount = 0;
    const factory = () => ({ id: ++instanceCount });

    container.register('singleton', factory, true);

    const instance1 = container.resolve('singleton');
    const instance2 = container.resolve('singleton');

    expect(instance1).toBe(instance2);
    expect(instanceCount).toBe(1);
  });

  test('should handle transient services correctly', () => {
    let instanceCount = 0;
    const factory = () => ({ id: ++instanceCount });

    container.register('transient', factory, false);

    const instance1 = container.resolve('transient');
    const instance2 = container.resolve('transient');

    expect(instance1).not.toBe(instance2);
    expect(instanceCount).toBe(2);
  });

  test('should throw error for unregistered services', () => {
    expect(() => container.resolve('unknown')).toThrow(CommandExecutionError);
    expect(() => container.resolve('unknown')).toThrow('Service not found: unknown');
  });

  test('should check service existence', () => {
    container.register('exists', {});

    expect(container.has('exists')).toBe(true);
    expect(container.has('doesNotExist')).toBe(false);
  });

  test('should work with symbol tokens', () => {
    const token = Symbol('test');
    const service = { value: 'symbol service' };

    container.register(token, service);

    expect(container.has(token)).toBe(true);
    expect(container.resolve(token)).toBe(service);
  });

  test('should create child containers', () => {
    const parentService = { type: 'parent' };
    const childService = { type: 'child' };

    container.register('parent', parentService);

    const child = container.createChild();
    child.register('child', childService);

    // Child should access parent services
    expect(child.resolve('parent')).toBe(parentService);
    expect(child.resolve('child')).toBe(childService);

    // Parent should not access child services
    expect(() => container.resolve('child')).toThrow();
  });

  test('should handle service override in child containers', () => {
    const parentService = { type: 'parent' };
    const childService = { type: 'child override' };

    container.register('service', parentService);

    const child = container.createChild();
    child.register('service', childService);

    expect(container.resolve('service')).toBe(parentService);
    expect(child.resolve('service')).toBe(childService);
  });
});

describe('ExecutionContext', () => {
  let mockCommand: any;

  beforeEach(() => {
    mockCommand = {
      name: 'test-command',
      description: 'Test command',
      execute: jest.fn()
    };
  });

  test('should create execution context with required properties', () => {
    const args = ['arg1', 'arg2'];
    const options = { flag: true };
    const rawArgs = ['test-command', 'arg1', 'arg2', '--flag'];

    const context = ExecutionContext.create(args, options, rawArgs, mockCommand);

    expect(context.args).toEqual(args);
    expect(context.options).toEqual(options);
    expect(context.rawArgs).toEqual(rawArgs);
    expect(context.command).toBe(mockCommand);
    expect(context.id).toMatch(/^exec_\d+_[a-z0-9]+$/);
    expect(context.startTime).toBeInstanceOf(Date);
    expect(context.services).toBeInstanceOf(ServiceContainer);
    expect(context.cancellationToken).toBeInstanceOf(CancellationToken);
  });

  test('should handle metadata operations', () => {
    const context = ExecutionContext.create([], {}, [], mockCommand);

    expect(context.getMetadata('nonexistent')).toBeUndefined();

    context.setMetadata('test', 'value');
    expect(context.getMetadata('test')).toBe('value');

    context.setMetadata('object', { prop: 'value' });
    expect(context.getMetadata('object')).toEqual({ prop: 'value' });
  });

  test('should create child contexts correctly', () => {
    const parentContext = ExecutionContext.create([], {}, [], mockCommand);
    parentContext.setMetadata('parent', 'data');

    const childCommand = { name: 'child', description: 'Child command', execute: jest.fn() };
    const childContext = parentContext.createChild(childCommand, ['child-arg'], { childOption: true });

    expect(childContext.parent).toBe(parentContext);
    expect(childContext.command).toBe(childCommand);
    expect(childContext.args).toEqual(['child-arg']);
    expect(childContext.options).toEqual({ childOption: true });
    expect(childContext.cancellationToken).toBe(parentContext.cancellationToken);
    expect(childContext.services).not.toBe(parentContext.services);
  });

  test('should use provided services and cancellation token', () => {
    const customServices = new ServiceContainer();
    const customToken = new CancellationToken();

    const context = ExecutionContext.create([], {}, [], mockCommand, undefined, customServices, customToken);

    expect(context.services).toBe(customServices);
    expect(context.cancellationToken).toBe(customToken);
  });

  test('should generate unique IDs', () => {
    const context1 = ExecutionContext.create([], {}, [], mockCommand);
    const context2 = ExecutionContext.create([], {}, [], mockCommand);

    expect(context1.id).not.toBe(context2.id);
  });
});

describe('ServiceTokens', () => {
  test('should provide standard service tokens', () => {
    expect(ServiceTokens.LOGGER).toBeDefined();
    expect(ServiceTokens.FILE_SYSTEM).toBeDefined();
    expect(ServiceTokens.HTTP_CLIENT).toBeDefined();
    expect(ServiceTokens.CONFIG).toBeDefined();
    expect(ServiceTokens.EVENT_EMITTER).toBeDefined();

    // All tokens should be symbols
    expect(typeof ServiceTokens.LOGGER).toBe('symbol');
    expect(typeof ServiceTokens.FILE_SYSTEM).toBe('symbol');
    expect(typeof ServiceTokens.HTTP_CLIENT).toBe('symbol');
    expect(typeof ServiceTokens.CONFIG).toBe('symbol');
    expect(typeof ServiceTokens.EVENT_EMITTER).toBe('symbol');
  });

  test('should have unique token values', () => {
    const tokens = Object.values(ServiceTokens);
    const uniqueTokens = new Set(tokens);

    expect(uniqueTokens.size).toBe(tokens.length);
  });
});

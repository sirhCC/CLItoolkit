/**
 * Enhanced execution context for command processing
 * Provides dependency injection, middleware support, and lifecycle management
 */

import { ICommand, ICommandContext } from '../types/command';
import { CommandExecutionError } from '../types/errors';

/**
 * Cancellation token for async command execution
 */
export class CancellationToken {
  private _isCancelled = false;
  private _reason?: string;
  private _callbacks: (() => void)[] = [];

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  get reason(): string | undefined {
    return this._reason;
  }

  /**
   * Cancel the operation with optional reason
   */
  cancel(reason?: string): void {
    if (this._isCancelled) return;
    
    this._isCancelled = true;
    this._reason = reason;
    
    // Notify all registered callbacks
    this._callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in cancellation callback:', error);
      }
    });
  }

  /**
   * Register a callback to be called when cancelled
   */
  onCancelled(callback: () => void): void {
    if (this._isCancelled) {
      callback();
    } else {
      this._callbacks.push(callback);
    }
  }

  /**
   * Throw an error if the operation is cancelled
   */
  throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new CommandExecutionError(`Operation was cancelled${this._reason ? `: ${this._reason}` : ''}`);
    }
  }
}

/**
 * Enhanced execution context interface
 */
export interface IExecutionContext extends ICommandContext {
  readonly id: string;
  readonly startTime: Date;
  readonly services: IServiceContainer;
  readonly cancellationToken: CancellationToken;
  readonly metadata: Map<string, any>;
  
  /**
   * Add metadata to the execution context
   */
  setMetadata(key: string, value: any): void;
  
  /**
   * Get metadata from the execution context
   */
  getMetadata<T = any>(key: string): T | undefined;
  
  /**
   * Create a child context for subcommand execution
   */
  createChild(command: ICommand, args: string[], options: Record<string, any>): IExecutionContext;
}

/**
 * Service container interface for dependency injection
 */
export interface IServiceContainer {
  /**
   * Register a service with the container
   */
  register<T>(token: string | symbol, implementation: T | (() => T), singleton?: boolean): void;
  
  /**
   * Resolve a service from the container
   */
  resolve<T>(token: string | symbol): T;
  
  /**
   * Check if a service is registered
   */
  has(token: string | symbol): boolean;
  
  /**
   * Create a child container that inherits from this one
   */
  createChild(): IServiceContainer;
}

/**
 * Simple dependency injection container implementation
 */
export class ServiceContainer implements IServiceContainer {
  private readonly services = new Map<string | symbol, any>();
  private readonly singletonInstances = new Map<string | symbol, any>();
  private readonly parent?: ServiceContainer;

  constructor(parent?: ServiceContainer) {
    this.parent = parent;
  }

  register<T>(token: string | symbol, implementation: T | (() => T), singleton = false): void {
    this.services.set(token, { implementation, singleton });
  }

  resolve<T>(token: string | symbol): T {
    // Check if we have a singleton instance
    if (this.singletonInstances.has(token)) {
      return this.singletonInstances.get(token);
    }

    // Try to find the service definition
    const serviceDefinition = this.services.get(token);
    
    // If not found locally, check parent container
    if (!serviceDefinition && this.parent) {
      return this.parent.resolve<T>(token);
    }

    if (!serviceDefinition) {
      throw new CommandExecutionError(`Service not found: ${String(token)}`);
    }

    const { implementation, singleton } = serviceDefinition;
    
    // Create instance
    const instance = typeof implementation === 'function' ? implementation() : implementation;
    
    // Cache singleton instance
    if (singleton) {
      this.singletonInstances.set(token, instance);
    }
    
    return instance;
  }

  has(token: string | symbol): boolean {
    return this.services.has(token) || (this.parent?.has(token) ?? false);
  }

  createChild(): IServiceContainer {
    return new ServiceContainer(this);
  }
}

/**
 * Enhanced execution context implementation
 */
export class ExecutionContext implements IExecutionContext {
  public readonly id: string;
  public readonly startTime: Date;
  public readonly services: IServiceContainer;
  public readonly cancellationToken: CancellationToken;
  public readonly metadata = new Map<string, any>();

  constructor(
    public readonly args: string[],
    public readonly options: Record<string, any>,
    public readonly rawArgs: string[],
    public readonly command: ICommand,
    public readonly parent?: ICommandContext,
    services?: IServiceContainer,
    cancellationToken?: CancellationToken
  ) {
    this.id = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = new Date();
    this.services = services || new ServiceContainer();
    this.cancellationToken = cancellationToken || new CancellationToken();
  }

  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }

  getMetadata<T = any>(key: string): T | undefined {
    return this.metadata.get(key);
  }

  createChild(command: ICommand, args: string[], options: Record<string, any>): IExecutionContext {
    return new ExecutionContext(
      args,
      options,
      this.rawArgs,
      command,
      this,
      this.services.createChild(),
      this.cancellationToken
    );
  }

  /**
   * Factory method to create an execution context
   */
  static create(
    args: string[],
    options: Record<string, any>,
    rawArgs: string[],
    command: ICommand,
    parent?: ICommandContext,
    services?: IServiceContainer,
    cancellationToken?: CancellationToken
  ): IExecutionContext {
    return new ExecutionContext(args, options, rawArgs, command, parent, services, cancellationToken);
  }
}

/**
 * Service tokens for common services
 */
export const ServiceTokens = {
  LOGGER: Symbol('logger'),
  FILE_SYSTEM: Symbol('fileSystem'),
  HTTP_CLIENT: Symbol('httpClient'),
  CONFIG: Symbol('config'),
  EVENT_EMITTER: Symbol('eventEmitter')
} as const;

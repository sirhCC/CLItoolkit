/**
 * Advanced command executor with async support, concurrency, and cancellation
 */

import { ICommand, ICommandResult } from '../types/command';
import { IExecutionContext, IServiceContainer, ExecutionContext, CancellationToken } from './execution-context';
import { ExecutionPipeline, PipelineFactory } from './execution-pipeline';
import { CommandExecutionError } from '../types/errors';

/**
 * Execution options for command execution
 */
export interface IExecutionOptions {
  timeout?: number;
  cancellationToken?: CancellationToken;
  services?: IServiceContainer;
  metadata?: Record<string, any>;
  pipeline?: ExecutionPipeline;
}

/**
 * Execution statistics
 */
export interface IExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  concurrentExecutions: number;
  maxConcurrentExecutions: number;
}

/**
 * Execution queue item
 */
interface IExecutionQueueItem {
  id: string;
  context: IExecutionContext;
  command: ICommand;
  pipeline: ExecutionPipeline;
  resolve: (result: ICommandResult) => void;
  reject: (error: Error) => void;
  promise: Promise<ICommandResult>;
  startTime?: number;
}

/**
 * Advanced command executor
 */
export class CommandExecutor {
  private readonly executionQueue = new Map<string, IExecutionQueueItem>();
  private readonly stats: IExecutionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    concurrentExecutions: 0,
    maxConcurrentExecutions: 0
  };
  private readonly defaultPipeline: ExecutionPipeline;
  private readonly maxConcurrentExecutions: number;
  private totalExecutionTime = 0;

  constructor(
    maxConcurrentExecutions = 10,
    defaultPipeline?: ExecutionPipeline
  ) {
    this.maxConcurrentExecutions = maxConcurrentExecutions;
    this.defaultPipeline = defaultPipeline || PipelineFactory.createDefault();
  }

  /**
   * Execute a single command asynchronously
   */
  async executeAsync(
    command: ICommand,
    args: string[],
    options: Record<string, any>,
    rawArgs: string[] = [],
    executionOptions: IExecutionOptions = {}
  ): Promise<ICommandResult> {
    // Create execution context
    const context = ExecutionContext.create(
      args,
      options,
      rawArgs,
      command,
      undefined,
      executionOptions.services,
      executionOptions.cancellationToken
    );

    // Add metadata if provided
    if (executionOptions.metadata) {
      Object.entries(executionOptions.metadata).forEach(([key, value]) => {
        context.setMetadata(key, value);
      });
    }

    // Choose pipeline
    const pipeline = executionOptions.pipeline || this.defaultPipeline;

    return this.executeWithContext(context, command, pipeline, executionOptions.timeout);
  }

  /**
   * Execute a command with the given execution context
   */
  async executeWithContext(
    context: IExecutionContext,
    command: ICommand,
    pipeline?: ExecutionPipeline,
    timeout?: number
  ): Promise<ICommandResult> {
    const usedPipeline = pipeline || this.defaultPipeline;
    const executionId = context.id;

    // Check concurrency limits
    if (this.stats.concurrentExecutions >= this.maxConcurrentExecutions) {
      throw new CommandExecutionError(
        `Maximum concurrent executions reached (${this.maxConcurrentExecutions})`
      );
    }

    // Create execution promise
    let resolve: (result: ICommandResult) => void;
    let reject: (error: Error) => void;
    
    const promise = new Promise<ICommandResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    // Create queue item
    const queueItem: IExecutionQueueItem = {
      id: executionId,
      context,
      command,
      pipeline: usedPipeline,
      resolve: resolve!,
      reject: reject!,
      promise
    };

    // Add to execution queue
    this.executionQueue.set(executionId, queueItem);

    // Update stats
    this.stats.totalExecutions++;
    this.stats.concurrentExecutions++;
    this.stats.maxConcurrentExecutions = Math.max(
      this.stats.maxConcurrentExecutions,
      this.stats.concurrentExecutions
    );

    try {
      // Execute the command through the pipeline with timeout
      queueItem.startTime = Date.now();
      let result: ICommandResult;

      if (timeout && timeout > 0) {
        // Race the execution against the timeout
        const executionPromise = usedPipeline.execute(context, command);
        const timeoutPromise = new Promise<ICommandResult>((_, reject) => {
          setTimeout(() => {
            context.cancellationToken.cancel(`Execution timeout after ${timeout}ms`);
            reject(new CommandExecutionError(`Operation was cancelled: Execution timeout after ${timeout}ms`));
          }, timeout);
        });

        try {
          result = await Promise.race([executionPromise, timeoutPromise]);
        } catch (error) {
          // Handle timeout error
          if (error instanceof CommandExecutionError && error.message.includes('timeout')) {
            result = {
              success: false,
              exitCode: 1,
              error: error,
              message: error.message
            };
          } else {
            throw error;
          }
        }
      } else {
        // No timeout, execute normally
        result = await usedPipeline.execute(context, command);
      }

      // Update stats
      const executionTime = queueItem.startTime ? Date.now() - queueItem.startTime : 0;
      this.totalExecutionTime += executionTime;
      this.stats.averageExecutionTime = this.totalExecutionTime / this.stats.totalExecutions;

      if (result.success) {
        this.stats.successfulExecutions++;
      } else {
        this.stats.failedExecutions++;
      }

      queueItem.resolve(result);
      return result;

    } catch (error) {
      // Update stats
      if (queueItem.startTime) {
        const executionTime = Date.now() - queueItem.startTime;
        this.totalExecutionTime += executionTime;
        this.stats.averageExecutionTime = this.totalExecutionTime / this.stats.totalExecutions;
      }
      
      this.stats.failedExecutions++;
      
      // Convert error to result instead of throwing
      const result: ICommandResult = {
        success: false,
        exitCode: 1,
        error: error instanceof Error ? error : new Error(String(error)),
        message: error instanceof Error ? error.message : String(error)
      };
      
      queueItem.resolve(result);
      return result;

    } finally {
      // Clean up
      this.executionQueue.delete(executionId);
      this.stats.concurrentExecutions--;
    }
  }

  /**
   * Execute multiple commands concurrently
   */
  async executeConcurrent(
    commands: Array<{
      command: ICommand;
      args: string[];
      options: Record<string, any>;
      rawArgs?: string[];
      executionOptions?: IExecutionOptions;
    }>
  ): Promise<ICommandResult[]> {
    const promises = commands.map(({ command, args, options, rawArgs = [], executionOptions = {} }) =>
      this.executeAsync(command, args, options, rawArgs, executionOptions)
    );

    return Promise.all(promises);
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeSequential(
    commands: Array<{
      command: ICommand;
      args: string[];
      options: Record<string, any>;
      rawArgs?: string[];
      executionOptions?: IExecutionOptions;
    }>
  ): Promise<ICommandResult[]> {
    const results: ICommandResult[] = [];

    for (const { command, args, options, rawArgs = [], executionOptions = {} } of commands) {
      const result = await this.executeAsync(command, args, options, rawArgs, executionOptions);
      results.push(result);
      
      // Stop execution if a command fails (unless explicitly configured to continue)
      if (!result.success && !executionOptions.metadata?.continueOnError) {
        break;
      }
    }

    return results;
  }

  /**
   * Cancel a running command execution
   */
  cancelExecution(executionId: string, reason?: string): boolean {
    const queueItem = this.executionQueue.get(executionId);
    if (queueItem) {
      queueItem.context.cancellationToken.cancel(reason);
      return true;
    }
    return false;
  }

  /**
   * Cancel all running executions
   */
  cancelAllExecutions(reason?: string): number {
    let cancelledCount = 0;
    for (const queueItem of this.executionQueue.values()) {
      queueItem.context.cancellationToken.cancel(reason);
      cancelledCount++;
    }
    return cancelledCount;
  }

  /**
   * Get currently running executions
   */
  getRunningExecutions(): Array<{
    id: string;
    commandName: string;
    startTime?: number;
    duration?: number;
  }> {
    const now = Date.now();
    return Array.from(this.executionQueue.values()).map(item => ({
      id: item.id,
      commandName: item.command.name,
      startTime: item.startTime,
      duration: item.startTime ? now - item.startTime : undefined
    }));
  }

  /**
   * Get execution statistics
   */
  getStats(): Readonly<IExecutionStats> {
    return { ...this.stats };
  }

  /**
   * Reset execution statistics
   */
  resetStats(): void {
    this.stats.totalExecutions = 0;
    this.stats.successfulExecutions = 0;
    this.stats.failedExecutions = 0;
    this.stats.averageExecutionTime = 0;
    this.stats.maxConcurrentExecutions = 0;
    this.totalExecutionTime = 0;
  }

  /**
   * Check if the executor can accept more executions
   */
  canExecute(): boolean {
    return this.stats.concurrentExecutions < this.maxConcurrentExecutions;
  }

  /**
   * Wait for all running executions to complete
   */
  async waitForAll(): Promise<void> {
    const promises = Array.from(this.executionQueue.values()).map(item => item.promise);
    await Promise.allSettled(promises);
  }

  /**
   * Get the default pipeline used by this executor
   */
  getDefaultPipeline(): ExecutionPipeline {
    return this.defaultPipeline;
  }
}

/**
 * Global command executor instance
 */
export const globalExecutor = new CommandExecutor();

/**
 * Command execution pipeline with middleware support
 * Provides a flexible way to intercept and modify command execution
 */

import { ICommand, ICommandResult } from '../types/command';
import { IExecutionContext } from './execution-context';

/**
 * Pipeline middleware function interface
 */
export interface IMiddleware {
    /**
     * Execute middleware logic
     * @param context Execution context
     * @param next Function to call next middleware in the chain
     * @returns Promise that resolves when middleware is complete
     */
    execute(context: IExecutionContext, next: () => Promise<ICommandResult>): Promise<ICommandResult>;
}

/**
 * Function-based middleware interface
 */
export type MiddlewareFunction = (
    context: IExecutionContext,
    next: () => Promise<ICommandResult>
) => Promise<ICommandResult>;

/**
 * Pipeline stage information
 */
export interface IPipelineStage {
    name: string;
    middleware: IMiddleware | MiddlewareFunction;
    order: number;
}

/**
 * Command execution pipeline
 */
export class ExecutionPipeline {
    private readonly middlewares: IPipelineStage[] = [];

    /**
     * Add middleware to the pipeline
     */
    use(name: string, middleware: IMiddleware | MiddlewareFunction, order = 0): void {
        this.middlewares.push({ name, middleware, order });
        // Sort by order to maintain execution sequence
        this.middlewares.sort((a, b) => a.order - b.order);
    }

    /**
     * Remove middleware from the pipeline
     */
    remove(name: string): boolean {
        const index = this.middlewares.findIndex(stage => stage.name === name);
        if (index !== -1) {
            this.middlewares.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Execute the pipeline with the given context and command
     */
    async execute(context: IExecutionContext, command: ICommand): Promise<ICommandResult> {
        let index = 0;

        const executeNext = async (): Promise<ICommandResult> => {
            // If we've reached the end of the middleware chain, execute the actual command
            if (index >= this.middlewares.length) {
                return await command.execute(context);
            }

            const stage = this.middlewares[index++];
            if (!stage) {
                throw new Error('No middleware stage found');
            }
            const middleware = stage.middleware;

            // Execute middleware
            if (typeof middleware === 'function') {
                return await middleware(context, executeNext);
            } else {
                return await middleware.execute(context, executeNext);
            }
        };

        return await executeNext();
    }

    /**
     * Get all registered middleware stages
     */
    getStages(): readonly IPipelineStage[] {
        return [...this.middlewares];
    }

    /**
     * Clear all middleware from the pipeline
     */
    clear(): void {
        this.middlewares.length = 0;
    }
}

/**
 * Built-in middleware implementations
 */

/**
 * Validation middleware - validates command context before execution
 */
export class ValidationMiddleware implements IMiddleware {
    async execute(context: IExecutionContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
        // Check for cancellation
        context.cancellationToken.throwIfCancelled();

        // Run command validation if available
        if (context.command.validate) {
            try {
                const isValid = await context.command.validate(context);
                if (!isValid) {
                    return {
                        success: false,
                        exitCode: 1,
                        message: 'Command validation failed'
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    exitCode: 1,
                    error: error instanceof Error ? error : new Error(String(error)),
                    message: `Validation error: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }

        return await next();
    }
}

/**
 * Timing middleware - tracks command execution time
 */
export class TimingMiddleware implements IMiddleware {
    async execute(context: IExecutionContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
        const startTime = Date.now();
        context.setMetadata('execution.startTime', startTime);

        try {
            const result = await next();

            const endTime = Date.now();
            const duration = endTime - startTime;

            context.setMetadata('execution.endTime', endTime);
            context.setMetadata('execution.duration', duration);

            return result;
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            context.setMetadata('execution.endTime', endTime);
            context.setMetadata('execution.duration', duration);

            throw error;
        }
    }
}

/**
 * Logging middleware - logs command execution
 */
export class LoggingMiddleware implements IMiddleware {
    constructor(private readonly logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') { }

    async execute(context: IExecutionContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
        if (this.logLevel === 'debug' || this.logLevel === 'info') {
            console.log(`[${new Date().toISOString()}] Executing command: ${context.command.name}`);
            console.log(`[${new Date().toISOString()}] Args: ${JSON.stringify(context.args)}`);
            console.log(`[${new Date().toISOString()}] Options: ${JSON.stringify(context.options)}`);
        }

        try {
            const result = await next();

            if (this.logLevel === 'debug' || this.logLevel === 'info') {
                console.log(`[${new Date().toISOString()}] Command completed successfully: ${context.command.name}`);
                console.log(`[${new Date().toISOString()}] Exit code: ${result.exitCode}`);
            }

            return result;
        } catch (error) {
            if (this.logLevel === 'debug' || this.logLevel === 'info' || this.logLevel === 'warn' || this.logLevel === 'error') {
                console.error(`[${new Date().toISOString()}] Command failed: ${context.command.name}`);
                console.error(`[${new Date().toISOString()}] Error:`, error);
            }
            // Return failed result instead of rethrowing
            return {
                success: false,
                exitCode: 1,
                error: error instanceof Error ? error : new Error(String(error)),
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

/**
 * Error handling middleware - catches and formats errors
 */
export class ErrorHandlingMiddleware implements IMiddleware {
    async execute(context: IExecutionContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
        try {
            return await next();
        } catch (error) {
            const errorResult: ICommandResult = {
                success: false,
                exitCode: 1,
                error: error instanceof Error ? error : new Error(String(error)),
                message: error instanceof Error ? error.message : String(error)
            };

            // Store error details in context metadata
            context.setMetadata('execution.error', error);
            context.setMetadata('execution.errorType', error instanceof Error ? error.constructor.name : 'Unknown');

            return errorResult;
        }
    }
}

/**
 * Setup/teardown middleware - handles command lifecycle
 */
export class LifecycleMiddleware implements IMiddleware {
    async execute(context: IExecutionContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
        // Setup phase
        if (context.command.setup) {
            try {
                await context.command.setup();
            } catch (error) {
                return {
                    success: false,
                    exitCode: 1,
                    error: error instanceof Error ? error : new Error(String(error)),
                    message: `Setup failed: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }

        try {
            // Execute the command
            const result = await next();

            // Cleanup phase (always run, even on success)
            if (context.command.cleanup) {
                try {
                    await context.command.cleanup();
                } catch (cleanupError) {
                    console.warn('Cleanup failed:', cleanupError);
                    // Don't fail the command if cleanup fails, just warn
                }
            }

            return result;
        } catch (error) {
            // Cleanup phase (run on error too)
            if (context.command.cleanup) {
                try {
                    await context.command.cleanup();
                } catch (cleanupError) {
                    console.warn('Cleanup failed during error handling:', cleanupError);
                }
            }

            throw error;
        }
    }
}

/**
 * Factory for creating pre-configured pipelines
 */
export class PipelineFactory {
    /**
     * Create a default pipeline with common middleware
     */
    static createDefault(): ExecutionPipeline {
        const pipeline = new ExecutionPipeline();

        // Order matters - earlier middleware runs first
        pipeline.use('error-handling', new ErrorHandlingMiddleware(), -100);
        pipeline.use('timing', new TimingMiddleware(), -50);
        pipeline.use('logging', new LoggingMiddleware(), -40);
        pipeline.use('lifecycle', new LifecycleMiddleware(), -30);
        pipeline.use('validation', new ValidationMiddleware(), -20);

        return pipeline;
    }

    /**
     * Create a minimal pipeline with just error handling
     */
    static createMinimal(): ExecutionPipeline {
        const pipeline = new ExecutionPipeline();
        pipeline.use('error-handling', new ErrorHandlingMiddleware(), -100);
        return pipeline;
    }

    /**
     * Create a debug pipeline with verbose logging
     */
    static createDebug(): ExecutionPipeline {
        const pipeline = new ExecutionPipeline();

        pipeline.use('error-handling', new ErrorHandlingMiddleware(), -100);
        pipeline.use('timing', new TimingMiddleware(), -50);
        pipeline.use('logging', new LoggingMiddleware('debug'), -40);
        pipeline.use('lifecycle', new LifecycleMiddleware(), -30);
        pipeline.use('validation', new ValidationMiddleware(), -20);

        return pipeline;
    }
}

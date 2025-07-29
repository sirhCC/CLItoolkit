/**
 * Core parsing and processing functionality
 */

export {
  CommandResult,
  CommandContext,
  BaseCommand,
  SimpleCommand
} from './base-implementations';

export {
  CliFramework
} from './cli-framework';

// Export enhanced CLI framework with Phase 3.2 capabilities
export {
  EnhancedCliFramework
} from './enhanced-cli-framework';

// Export Phase 3.2 Execution Framework components
export {
  CancellationToken,
  ServiceContainer,
  ExecutionContext,
  ServiceTokens
} from './execution-context';

export type {
  IExecutionContext,
  IServiceContainer
} from './execution-context';

export {
  ExecutionPipeline,
  ValidationMiddleware,
  TimingMiddleware,
  LoggingMiddleware,
  ErrorHandlingMiddleware,
  LifecycleMiddleware,
  PipelineFactory
} from './execution-pipeline';

export type {
  IMiddleware,
  MiddlewareFunction,
  IPipelineStage
} from './execution-pipeline';

export {
  CommandExecutor,
  globalExecutor
} from './command-executor';

export type {
  IExecutionOptions,
  IExecutionStats
} from './command-executor';

// Export argument parser
export * from './argument-parser';

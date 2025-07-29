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
  IExecutionContext,
  IServiceContainer,
  ServiceContainer,
  ExecutionContext,
  ServiceTokens
} from './execution-context';

export {
  IMiddleware,
  MiddlewareFunction,
  IPipelineStage,
  ExecutionPipeline,
  ValidationMiddleware,
  TimingMiddleware,
  LoggingMiddleware,
  ErrorHandlingMiddleware,
  LifecycleMiddleware,
  PipelineFactory
} from './execution-pipeline';

export {
  CommandExecutor,
  IExecutionOptions,
  IExecutionStats,
  globalExecutor
} from './command-executor';

// Export argument parser
export * from './argument-parser';

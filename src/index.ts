/**
 * @fileoverview Main entry point for CLI Toolkit Framework
 */

// Core components
export { CliFramework } from './core/cli-framework';
export { ArgumentParser } from './core/argument-parser';
export { CommandRegistry } from './core/command-registry';
export { CommandBuilder, createCommand } from './core/command-builder';

// Phase 3.2 Enhanced Framework and Execution Engine
export { EnhancedCliFramework } from './core/enhanced-cli-framework';
export { 
  CancellationToken,
  IExecutionContext,
  IServiceContainer,
  ServiceContainer,
  ExecutionContext,
  ServiceTokens
} from './core/execution-context';
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
} from './core/execution-pipeline';
export { 
  CommandExecutor,
  IExecutionOptions,
  IExecutionStats,
  globalExecutor
} from './core/command-executor';

// Base implementations
export { BaseCommand, CommandContext, CommandResult } from './core/base-implementations';

// Types
export type * from './types/command';
export type * from './types/config';
export type * from './types/errors';
export type * from './types/validation';
export type * from './types/registry';

// Error classes
export { 
  CliError, 
  ValidationError, 
  CommandNotFoundError, 
  CommandExecutionError, 
  ConfigurationError, 
  PluginError 
} from './types/errors';

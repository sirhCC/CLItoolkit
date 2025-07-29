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
  ServiceContainer,
  ExecutionContext,
  ServiceTokens
} from './core/execution-context';

export type {
  IExecutionContext,
  IServiceContainer
} from './core/execution-context';

export { 
  ExecutionPipeline,
  ValidationMiddleware,
  TimingMiddleware,
  LoggingMiddleware,
  ErrorHandlingMiddleware,
  LifecycleMiddleware,
  PipelineFactory
} from './core/execution-pipeline';

export type {
  IMiddleware,
  MiddlewareFunction,
  IPipelineStage
} from './core/execution-pipeline';

export { 
  CommandExecutor,
  globalExecutor
} from './core/command-executor';

export type {
  IExecutionOptions,
  IExecutionStats
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

// Performance Optimizations
export { PerformanceMonitor, monitor, monitorAsync } from './utils/performance';

// Phase 1+ Advanced Optimizations
export { globalOptimizationHub } from './utils/advanced-optimization-hub';

// Memory Management (Phase 1++ Enhancement)
export {
  globalMemoryManager,
  WeakReferenceCache,
  BufferPoolManager,
  SmartGarbageCollector,
  AdvancedMemoryManager,
  withBufferPooling,
  getOptimizedString,
  returnOptimizedString
} from './utils/memory-manager';

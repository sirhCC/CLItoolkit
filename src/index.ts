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

// Enhanced error types
export {
  ErrorCode,
  InvalidArgumentError,
  InvalidOptionError,
  MissingRequiredError,
  ExecutionTimeoutError,
  ExecutionCancelledError,
  ServiceNotFoundError,
  CircularDependencyError,
  PoolExhaustedError,
  InternalError
} from './types/enhanced-errors';

export type { ErrorContext } from './types/enhanced-errors';

// Pool types
export type { IObjectPool, PoolMetrics, PoolConfiguration } from './types/pool';

// Logging
export {
  LogLevel,
  ConsoleLogger,
  NullLogger,
  getLogger,
  setLogger,
  createLogger
} from './utils/logger';

export type { ILogger, LogContext } from './utils/logger';

// Validation guards
export {
  assertDefined,
  assertNonEmptyString,
  assertFunction,
  assertArray,
  assertObject,
  assertInRange,
  assertPositiveInteger,
  assertPattern,
  assertEnum,
  assertValidCommandName,
  assertValidConfiguration,
  coerceToType
} from './utils/validation-guards';

// Performance Optimizations
export { PerformanceMonitor, monitor, monitorAsync } from './utils/performance';

// Enhanced Performance Monitoring
export { EnhancedPerformanceMonitor } from './utils/enhanced-performance';

// Enterprise Analytics (Phase 1 - Performance Monitoring Upgrade)
export {
  EnterpriseAnalytics,
  globalEnterpriseAnalytics
} from './utils/enterprise-analytics';

export type {
  AnalyticsDataPoint,
  TrendAnalysis,
  EnterpriseAnalyticsConfig
} from './utils/enterprise-analytics';

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

// Phase 6: Output Formatting & UI
// NOTE: Phase 6 features exist but are not exported yet
// They need proper testing and validation before public release
// Files: output-formatter.ts, interactive-ui.ts, ui-components.ts,
//        rich-text-renderer.ts, template-engine.ts
// Status: In development, not production-ready

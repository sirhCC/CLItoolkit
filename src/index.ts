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

// Enhanced Performance Monitoring
export { EnhancedPerformanceMonitor } from './utils/enhanced-performance';

// Real-Time Performance Scoring (Phase 1 - Performance Monitoring Upgrade)
export {
  RealTimePerformanceScorer,
  globalPerformanceScorer
} from './utils/real-time-performance-scorer';

export type {
  PerformanceScore,
  PerformanceScoringCriteria
} from './utils/real-time-performance-scorer';

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
export {
  AdvancedOutputFormatter,
  globalOutputFormatter,
  formatters
} from './core/output-formatter';

export type {
  OutputFormatterConfig,
  ColorTheme,
  TableConfig,
  ColorConfig,
  FormattedOutput
} from './core/output-formatter';

export {
  InteractivePrompts,
  ProgressIndicator,
  prompts
} from './core/interactive-ui';

export type {
  Choice,
  PromptConfig,
  ProgressConfig,
  PromptType,
  ProgressType
} from './core/interactive-ui';

export {
  AdvancedTemplateEngine,
  globalTemplateEngine,
  templates
} from './core/template-engine';

export type {
  TemplateOptions,
  TemplateHelper,
  TemplateContext,
  CompiledTemplate
} from './core/template-engine';

export {
  AdvancedRichTextRenderer,
  globalRichTextRenderer,
  richText,
  SYNTAX_THEMES,
  LANGUAGE_DEFINITIONS
} from './core/rich-text-renderer';

export type {
  SyntaxTheme,
  MarkdownOptions,
  LanguageSupport
} from './core/rich-text-renderer';

export {
  AdvancedUIBuilder,
  globalUIBuilder,
  ui,
  TextComponent,
  BoxComponent,
  LayoutComponent,
  TableComponent,
  BOX_CHARS
} from './core/ui-components';

export type {
  BoxStyle,
  LayoutConfig,
  UIComponent
} from './core/ui-components';

/**
 * @fileoverview Main entry point for CLI Toolkit Framework
 */

// Core components
export { CliFramework } from './core/cli-framework';
export { ArgumentParser } from './core/argument-parser';
export { CommandRegistry } from './core/command-registry';

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

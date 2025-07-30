/**
 * @fileoverview Command Builder interfaces and types for Phase 3.1
 */

import { ICommand, ICommandContext, ICommandResult } from './command';
import { z } from 'zod';

/**
 * Command action function type
 */

/**
 * Command setup function type
 */

/**
 * Command teardown function type
 */

/**
 * Command builder configuration options
 */

/**
 * Command builder interface for fluent API
 */

/**
 * Argument builder options
 */
export interface IArgumentBuilderOptions<T = any> {
  /** Whether the argument is required */
  required?: boolean;
  /** Default value if not provided */
  defaultValue?: T;
  /** Validation schema */
  schema?: z.ZodSchema<T>;
  /** Custom validation function */
  validate?: (value: any) => Promise<T> | T;
  /** Array of allowed values */
  choices?: T[];
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Variadic argument (consumes remaining args) */
  variadic?: boolean;
}

/**
 * Option builder options
 */
export interface IOptionBuilderOptions<T = any> {
  /** Short flag (e.g., 'v' for -v) */
  short?: string;
  /** Whether the option is required */
  required?: boolean;
  /** Default value if not provided */
  defaultValue?: T;
  /** Validation schema */
  schema?: z.ZodSchema<T>;
  /** Custom validation function */
  validate?: (value: any) => Promise<T> | T;
  /** Array of allowed values */
  choices?: T[];
  /** Whether this is a boolean flag */
  boolean?: boolean;
  /** Whether this option can have multiple values */
  multiple?: boolean;
  /** Environment variable to read from */
  env?: string;
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
}

/**
 * Command example interface
 */

/**
 * Builder validation result
 */

/**
 * Command composition options
 */


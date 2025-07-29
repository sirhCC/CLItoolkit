/**
 * @fileoverview Validation types and interfaces for argument parsing and validation engine
 */

import { z } from 'zod';

/**
 * Schema validation configuration
 */
export interface IValidationConfig {
  /** Enable strict mode for validation */
  strict: boolean;
  /** Allow unknown properties */
  allowUnknown: boolean;
  /** Strip unknown properties */
  stripUnknown: boolean;
  /** Convert types when possible */
  coerce: boolean;
}

/**
 * Validation result for parsed arguments
 */
export interface IValidationResult<T = any> {
  /** Whether validation was successful */
  success: boolean;
  /** Validated and transformed data */
  data: T;
  /** Validation errors if any */
  errors: IValidationError[];
  /** Warnings during validation */
  warnings: string[];
}

/**
 * Detailed validation error information
 */
export interface IValidationError {
  /** Path to the invalid field */
  path: string[];
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
  /** Expected value or type */
  expected?: any;
  /** Actual received value */
  received?: any;
}

/**
 * Custom validation function signature
 */
export type IValidationFunction<T = any> = (value: any, context: IValidationContext) => IValidationResult<T> | Promise<IValidationResult<T>>;

/**
 * Validation context passed to custom validators
 */
export interface IValidationContext {
  /** Current field path */
  path: string[];
  /** Original raw input */
  rawInput: any;
  /** Parsed command arguments */
  parsedArgs: any;
  /** Command being executed */
  command?: string;
  /** Environment variables */
  env: Record<string, string | undefined>;
}

/**
 * Argument type definitions for enhanced parsing
 */
export enum ArgumentType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  FILE_PATH = 'file-path',
  DIRECTORY_PATH = 'directory-path',
  URL = 'url',
  EMAIL = 'email',
  JSON = 'json',
  ENUM = 'enum',
}

/**
 * Enhanced argument definition with validation
 */
export interface IValidatedArgument {
  /** Argument name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Argument type */
  type: ArgumentType;
  /** Whether the argument is required */
  required: boolean;
  /** Default value if not provided */
  defaultValue?: any;
  /** Validation schema (Zod schema) */
  schema?: z.ZodSchema;
  /** Custom validation function */
  validator?: IValidationFunction;
  /** Array of valid values (for enum type) */
  choices?: string[];
  /** Minimum value/length */
  min?: number;
  /** Maximum value/length */
  max?: number;
  /** Regular expression pattern */
  pattern?: RegExp;
  /** Whether to accept multiple values */
  multiple?: boolean;
  /** Environment variable name to read from */
  envVar?: string;
  /** Whether to coerce the type */
  coerce?: boolean;
}

/**
 * Enhanced option definition with validation
 */
export interface IValidatedOption {
  /** Option name (long form) */
  name: string;
  /** Short alias (single character) */
  alias?: string;
  /** Human-readable description */
  description: string;
  /** Option type */
  type: ArgumentType;
  /** Whether the option is required */
  required: boolean;
  /** Default value if not provided */
  defaultValue?: any;
  /** Validation schema (Zod schema) */
  schema?: z.ZodSchema;
  /** Custom validation function */
  validator?: IValidationFunction;
  /** Array of valid values (for enum type) */
  choices?: string[];
  /** Minimum value/length */
  min?: number;
  /** Maximum value/length */
  max?: number;
  /** Regular expression pattern */
  pattern?: RegExp;
  /** Whether to accept multiple values */
  multiple?: boolean;
  /** Environment variable name to read from */
  envVar?: string;
  /** Whether this is a boolean flag */
  flag?: boolean;
  /** Whether to coerce the type */
  coerce?: boolean;
  /** Option conflicts with these options */
  conflicts?: string[];
  /** Option requires these options */
  requires?: string[];
}

/**
 * Subcommand parsing configuration
 */
export interface ISubcommandConfig {
  /** Subcommand name */
  name: string;
  /** Subcommand aliases */
  aliases?: string[];
  /** Subcommand description */
  description: string;
  /** Arguments specific to this subcommand */
  arguments?: IValidatedArgument[];
  /** Options specific to this subcommand */
  options?: IValidatedOption[];
  /** Whether this subcommand is hidden */
  hidden?: boolean;
}

/**
 * Parsing options for the argument parser
 */
export interface IParsingOptions {
  /** Stop parsing at first non-option argument */
  stopAtPositional?: boolean;
  /** Allow interspersed options and arguments */
  allowInterspersed?: boolean;
  /** Automatically add help option */
  addHelp?: boolean;
  /** Automatically add version option */
  addVersion?: boolean;
  /** Case sensitivity for options */
  caseSensitive?: boolean;
  /** Parsing mode */
  mode?: 'strict' | 'permissive';
}

/**
 * Enhanced parsing result with validation
 */
export interface IEnhancedParseResult {
  /** Main command name */
  command: string;
  /** Subcommand name if any */
  subcommand?: string;
  /** Parsed and validated arguments */
  arguments: Record<string, any>;
  /** Parsed and validated options */
  options: Record<string, any>;
  /** Raw positional arguments */
  positional: string[];
  /** Unknown options (in permissive mode) */
  unknown: string[];
  /** Validation result */
  validation: IValidationResult;
  /** Whether help was requested */
  help: boolean;
  /** Whether version was requested */
  version: boolean;
}

/**
 * Type utility for creating strongly-typed parsers
 */
export type IInferArguments<T extends Record<string, IValidatedArgument>> = {
  [K in keyof T]: T[K]['type'] extends ArgumentType.STRING
    ? string
    : T[K]['type'] extends ArgumentType.NUMBER
    ? number
    : T[K]['type'] extends ArgumentType.BOOLEAN
    ? boolean
    : T[K]['type'] extends ArgumentType.ARRAY
    ? string[]
    : any;
};

export type IInferOptions<T extends Record<string, IValidatedOption>> = {
  [K in keyof T]: T[K]['type'] extends ArgumentType.STRING
    ? string
    : T[K]['type'] extends ArgumentType.NUMBER
    ? number
    : T[K]['type'] extends ArgumentType.BOOLEAN
    ? boolean
    : T[K]['type'] extends ArgumentType.ARRAY
    ? string[]
    : any;
};

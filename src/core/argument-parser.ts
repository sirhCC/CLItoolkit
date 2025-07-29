/**
 * @fileoverview Enhanced argument parser with validation and type coercion
 * Optimized with object pooling for high-performance parsing
 */

import { z } from 'zod';
import {
  ArgumentType,
  IValidatedArgument,
  IValidatedOption,
  IEnhancedParseResult,
  IValidationResult,
  IValidationError,
  IValidationContext,
  IParsingOptions,
  ISubcommandConfig,
} from '../types/validation';

// High-performance object pool for parse results
class ParseResultPool {
  private static readonly pool: IEnhancedParseResult[] = [];
  private static readonly maxPoolSize = 50;

  static acquire(): IEnhancedParseResult {
    const result = this.pool.pop();
    if (result) {
      // Reset the pooled object
      result.command = '';
      result.arguments = {};
      result.options = {};
      result.positional.length = 0;
      result.unknown.length = 0;
      result.validation = { success: true, data: {}, errors: [], warnings: [] };
      result.help = false;
      result.version = false;
      delete result.subcommand;
      return result;
    }

    // Create new if pool is empty
    return {
      command: '',
      arguments: {},
      options: {},
      positional: [],
      unknown: [],
      validation: { success: true, data: {}, errors: [], warnings: [] },
      help: false,
      version: false,
    };
  }

  static release(result: IEnhancedParseResult): void {
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(result);
    }
  }

  static getPoolStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.pool.length,
      maxSize: this.maxPoolSize,
      hitRate: this.pool.length / this.maxPoolSize
    };
  }
}

/**
 * Enhanced argument parser with validation and type coercion
 */
export class ArgumentParser {
  private arguments: IValidatedArgument[] = [];
  private options: IValidatedOption[] = [];
  private subcommands: Map<string, ISubcommandConfig> = new Map();
  private config: IParsingOptions;

  constructor(config: IParsingOptions = {}) {
    this.config = {
      stopAtPositional: false,
      allowInterspersed: true,
      addHelp: true,
      addVersion: false,
      caseSensitive: true,
      mode: 'strict',
      ...config,
    };

    if (this.config.addHelp) {
      this.addHelpOption();
    }

    if (this.config.addVersion) {
      this.addVersionOption();
    }
  }

  /**
   * Add an argument definition
   */
  addArgument(argument: IValidatedArgument): this {
    this.arguments.push(argument);
    return this;
  }

  /**
   * Add an option definition
   */
  addOption(option: IValidatedOption): this {
    this.options.push(option);
    return this;
  }

  /**
   * Add a subcommand
   */
  addSubcommand(subcommand: ISubcommandConfig): this {
    this.subcommands.set(subcommand.name, subcommand);
    
    // Add aliases
    if (subcommand.aliases) {
      for (const alias of subcommand.aliases) {
        this.subcommands.set(alias, subcommand);
      }
    }
    
    return this;
  }

  /**
   * Parse command line arguments with validation (optimized with object pooling)
   */
  async parse(args: string[]): Promise<IEnhancedParseResult> {
    // Use pooled object for better performance
    const result = ParseResultPool.acquire();

    try {
      if (args.length === 0) {
        // Still need to validate required arguments and apply defaults
        return this.parseWithConfig(args, result, this.arguments, this.options);
      }

      // Check for subcommands first
      const potentialSubcommand = args[0];
      if (!potentialSubcommand.startsWith('-') && this.subcommands.has(potentialSubcommand)) {
        result.command = potentialSubcommand;
        result.subcommand = potentialSubcommand;
        const subcommandConfig = this.subcommands.get(potentialSubcommand)!;
        
        // Parse with subcommand's arguments and options
        return this.parseWithConfig(args.slice(1), result, subcommandConfig.arguments || [], subcommandConfig.options || []);
      }

      // Only treat first argument as a command if there are subcommands defined
      // and this argument doesn't match any subcommand (for error handling)
      if (!potentialSubcommand.startsWith('-') && this.subcommands.size > 0) {
        result.command = potentialSubcommand;
        return this.parseWithConfig(args.slice(1), result, this.arguments, this.options);
      }

      // Parse without command (all arguments are positional/options)
      return this.parseWithConfig(args, result, this.arguments, this.options);
    } catch (error) {
      // Don't release on error - let caller handle cleanup
      throw error;
    }
  }

  /**
   * Release a parse result back to the pool (call this when done with the result)
   */
  static releaseResult(result: IEnhancedParseResult): void {
    ParseResultPool.release(result);
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): { poolStats: any } {
    return {
      poolStats: ParseResultPool.getPoolStats()
    };
  }

  /**
   * Parse arguments with specific configuration
   */
  private async parseWithConfig(
    args: string[],
    result: IEnhancedParseResult,
    argumentDefs: IValidatedArgument[],
    optionDefs: IValidatedOption[]
  ): Promise<IEnhancedParseResult> {
    // Parse options using original arguments to preserve order
    await this.parseOptions(args, result, optionDefs);
    
    // Check for help/version flags
    if (result.options.help || result.options.h) {
      result.help = true;
      return result;
    }
    
    if (result.options.version || result.options.v) {
      result.version = true;
      return result;
    }

    // Parse positional arguments (parseOptions already built result.positional correctly)
    await this.parseArguments(result.positional, result, argumentDefs);
    
    // Note: parseOptions already handles unknown options in permissive mode

    // Validate the complete result
    await this.validateResult(result, argumentDefs, optionDefs);

    return result;
  }

  /**
   * Tokenize arguments into options and positional arguments
   */
  private tokenize(args: string[]): { options: string[]; positional: string[]; unknown: string[] } {
    const options: string[] = [];
    const positional: string[] = [];
    const unknown: string[] = [];
    
    let inOptions = true;
    let i = 0;

    while (i < args.length) {
      const arg = args[i];

      // Handle end-of-options marker
      if (arg === '--') {
        inOptions = false;
        i++;
        continue;
      }

      // Handle options
      if (inOptions && arg.startsWith('-')) {
        // Long option with equals
        if (arg.startsWith('--') && arg.includes('=')) {
          options.push(arg);
        }
        // Long option without equals
        else if (arg.startsWith('--')) {
          options.push(arg);
          // Don't move values here - let parseOptions handle value association
        }
        // Short option(s)
        else if (arg.length > 1) {
          const shortOptions = arg.slice(1);
          
          // Handle combined short options (-abc)
          if (shortOptions.length > 1) {
            for (let j = 0; j < shortOptions.length; j++) {
              const shortOpt = shortOptions[j];
              options.push(`-${shortOpt}`);
              // Don't move values here - let parseOptions handle value association
            }
          } else {
            options.push(arg);
            // Don't move values here - let parseOptions handle value association
          }
        }
        
        // Stop at positional in strict mode
        if (this.config.stopAtPositional) {
          inOptions = false;
        }
      }
      // Handle positional arguments
      else {
        positional.push(arg);
        
        // Stop parsing options after first positional if configured
        if (this.config.stopAtPositional) {
          inOptions = false;
        }
      }

      i++;
    }

    return { options, positional, unknown };
  }

  /**
   * Parse options and their values from original arguments
   */
  private async parseOptions(
    args: string[],
    result: IEnhancedParseResult,
    optionDefs: IValidatedOption[]
  ): Promise<void> {
    const consumedIndices = new Set<number>();
    
    // First pass: process options and mark consumed indices
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      
      // Skip if already consumed
      if (consumedIndices.has(i)) {
        i++;
        continue;
      }

      // Skip non-options in first pass
      if (!arg.startsWith('-')) {
        i++;
        continue;
      }

      let optionName: string | undefined;
      let optionValue: string | undefined;
      let consumed = 1; // How many arguments this option consumes

      // Parse the option
      if (arg.startsWith('--') && arg.includes('=')) {
        // Long option with equals (--option=value)
        const [name, ...valueParts] = arg.slice(2).split('=');
        optionName = name;
        optionValue = valueParts.join('=');
      } else if (arg.startsWith('--')) {
        // Long option (--option)
        optionName = arg.slice(2);
        
        // Check if this option expects a value
        const optionDef = this.findOption(optionName);
        if (optionDef && !optionDef.flag) {
          const nextArg = args[i + 1];
          if (nextArg && !nextArg.startsWith('-')) {
            optionValue = nextArg;
            consumed = 2; // Consume both option and value
          }
        }
      } else if (arg.startsWith('-') && arg.length > 1) {
        // Short option(s)
        const shortOpts = arg.slice(1);
        
        if (shortOpts.length > 1) {
          // Handle combined short options (-abc)
          for (let j = 0; j < shortOpts.length; j++) {
            const shortOpt = shortOpts[j];
            const shortOptDef = optionDefs.find(opt => 
              opt.alias && (this.config.caseSensitive ? opt.alias === shortOpt : opt.alias.toLowerCase() === shortOpt.toLowerCase())
            );
            
            if (shortOptDef) {
              if (shortOptDef.flag) {
                result.options[shortOptDef.name] = true;
              } else if (j === shortOpts.length - 1) {
                // Last option in group can take a value
                const nextArg = args[i + 1];
                if (nextArg && !nextArg.startsWith('-')) {
                  result.options[shortOptDef.name] = nextArg;
                  consumed = 2;
                } else {
                  result.options[shortOptDef.name] = true;
                }
              } else {
                result.options[shortOptDef.name] = true;
              }
            }
          }
          
          // Mark consumed indices and continue
          for (let k = 0; k < consumed; k++) {
            consumedIndices.add(i + k);
          }
          i += consumed;
          continue;
        } else {
          // Single short option
          optionName = shortOpts;
          const optionDef = optionName ? optionDefs.find(opt => {
            if (!opt.alias || !optionName) return false;
            return this.config.caseSensitive ? opt.alias === optionName : opt.alias.toLowerCase() === optionName.toLowerCase();
          }) : undefined;
          
          if (optionDef && !optionDef.flag) {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
              optionValue = nextArg;
              consumed = 2;
            }
          }
        }
      }

      // Process the option (only if not handled in combined short options above)
      if (optionName) {
        // Search in local optionDefs for subcommand options
        const optionDef = optionDefs.find(opt => 
          (this.config.caseSensitive ? opt.name === optionName : opt.name.toLowerCase() === optionName.toLowerCase()) ||
          (opt.alias && (this.config.caseSensitive ? opt.alias === optionName : opt.alias.toLowerCase() === optionName.toLowerCase()))
        );
        
        if (optionDef) {
          if (optionDef.multiple) {
            if (!result.options[optionDef.name]) {
              result.options[optionDef.name] = [];
            }
            if (optionValue !== undefined) {
              result.options[optionDef.name].push(optionValue);
            } else {
              result.options[optionDef.name].push(true);
            }
          } else {
            result.options[optionDef.name] = optionValue !== undefined ? optionValue : true;
          }
        } else if (this.config.mode === 'strict') {
          result.validation.errors.push({
            path: ['options', optionName],
            message: `Unknown option: ${arg}`,
            code: 'unknown_option',
            received: arg,
          });
        } else {
          // Unknown option in permissive mode
          result.unknown.push(arg);
          
          // Check if next argument could be a value for this unknown option
          if (optionValue !== undefined) {
            // Value was provided with = syntax
            result.unknown.push(optionValue);
          } else if (consumed === 1 && i + 1 < args.length && !args[i + 1].startsWith('-')) {
            // Next argument could be a value
            result.unknown.push(args[i + 1]);
            consumed = 2;
          }
        }

        // Mark consumed indices
        for (let k = 0; k < consumed; k++) {
          consumedIndices.add(i + k);
        }
      }
      
      i += consumed;
    }
    
    // Second pass: build positional array from non-consumed arguments
    result.positional = [];
    for (let j = 0; j < args.length; j++) {
      if (!consumedIndices.has(j) && !args[j].startsWith('-')) {
        result.positional.push(args[j]);
      }
    }
  }

  /**
   * Parse positional arguments
   */
  private async parseArguments(
    positionalTokens: string[],
    result: IEnhancedParseResult,
    argumentDefs: IValidatedArgument[]
  ): Promise<void> {
    result.positional = [...positionalTokens];
    
    for (let i = 0; i < argumentDefs.length; i++) {
      const argDef = argumentDefs[i];
      
      if (argDef.multiple) {
        // Take all remaining arguments
        result.arguments[argDef.name] = positionalTokens.slice(i);
        break;
      } else if (i < positionalTokens.length) {
        result.arguments[argDef.name] = positionalTokens[i];
      }
      // Note: required validation and defaults are handled in validateResult
    }
  }

  /**
   * Validate and transform the complete parsing result
   */
  private async validateResult(
    result: IEnhancedParseResult,
    argumentDefs: IValidatedArgument[],
    optionDefs: IValidatedOption[]
  ): Promise<void> {
    const context: IValidationContext = {
      path: [],
      rawInput: result,
      parsedArgs: { ...result.arguments, ...result.options },
      command: result.command,
      env: process.env,
    };

    // Validate arguments
    for (const argDef of argumentDefs) {
      await this.validateField(result.arguments, argDef, context, result.validation);
    }

    // Validate options
    for (const optDef of optionDefs) {
      await this.validateField(result.options, optDef, context, result.validation);
    }

    // Check option conflicts and requirements
    this.validateOptionConstraints(result, optionDefs);

    result.validation.success = result.validation.errors.length === 0;
  }

  /**
   * Validate a single field (argument or option)
   */
  private async validateField(
    container: Record<string, any>,
    fieldDef: IValidatedArgument | IValidatedOption,
    context: IValidationContext,
    validation: IValidationResult
  ): Promise<void> {
    const fieldContext = {
      ...context,
      path: [...context.path, fieldDef.name],
    };

    let value = container[fieldDef.name];

    // Check environment variable
    if (value === undefined && fieldDef.envVar && process.env[fieldDef.envVar]) {
      value = process.env[fieldDef.envVar];
    }

    // Apply default value
    if (value === undefined && fieldDef.defaultValue !== undefined) {
      value = fieldDef.defaultValue;
    }

    // Check required fields
    if (value === undefined && fieldDef.required) {
      validation.errors.push({
        path: fieldContext.path,
        message: `Missing required ${fieldDef.name}`,
        code: 'required',
        expected: fieldDef.type,
      });
      return;
    }

    if (value === undefined) {
      return;
    }

    // Type coercion
    if (fieldDef.coerce !== false) {
      value = this.coerceType(value, fieldDef.type);
    }

    // Built-in validation
    const builtInResult = this.validateBuiltInType(value, fieldDef);
    if (!builtInResult.success) {
      validation.errors.push(...builtInResult.errors.map(err => ({
        ...err,
        path: fieldContext.path,
      })));
    }

    // Schema validation
    if (fieldDef.schema) {
      try {
        value = fieldDef.schema.parse(value);
      } catch (error) {
        if (error instanceof z.ZodError) {
          validation.errors.push(...error.issues.map(issue => ({
            path: [...fieldContext.path, ...issue.path.map(String)],
            message: issue.message,
            code: issue.code,
            expected: 'valid value',
            received: value,
          })));
        }
      }
    }

    // Custom validation
    if (fieldDef.validator) {
      const customResult = await fieldDef.validator(value, fieldContext);
      if (!customResult.success) {
        validation.errors.push(...customResult.errors);
      }
      validation.warnings.push(...customResult.warnings);
    }

    // Store validated value
    container[fieldDef.name] = value;
  }

  /**
   * Validate option constraints (conflicts and requirements)
   */
  private validateOptionConstraints(result: IEnhancedParseResult, optionDefs: IValidatedOption[]): void {
    for (const optDef of optionDefs) {
      if (result.options[optDef.name] === undefined) continue;

      // Check conflicts
      if (optDef.conflicts) {
        for (const conflictName of optDef.conflicts) {
          if (result.options[conflictName] !== undefined) {
            result.validation.errors.push({
              path: ['options', optDef.name],
              message: `Option --${optDef.name} conflicts with --${conflictName}`,
              code: 'option_conflict',
            });
          }
        }
      }

      // Check requirements
      if (optDef.requires) {
        for (const requiredName of optDef.requires) {
          if (result.options[requiredName] === undefined) {
            result.validation.errors.push({
              path: ['options', optDef.name],
              message: `Option --${optDef.name} requires --${requiredName}`,
              code: 'option_requirement',
            });
          }
        }
      }
    }
  }

  /**
   * Coerce value to specified type
   */
  private coerceType(value: any, type: ArgumentType): any {
    if (value === undefined || value === null) return value;

    switch (type) {
      case ArgumentType.NUMBER:
        const num = Number(value);
        return isNaN(num) ? value : num;
      
      case ArgumentType.BOOLEAN:
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on') return true;
          if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off') return false;
        }
        return Boolean(value);
      
      case ArgumentType.ARRAY:
        return Array.isArray(value) ? value : [value];
      
      case ArgumentType.JSON:
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      
      default:
        return String(value);
    }
  }

  /**
   * Validate built-in types
   */
  private validateBuiltInType(value: any, fieldDef: IValidatedArgument | IValidatedOption): IValidationResult {
    const errors: IValidationError[] = [];

    switch (fieldDef.type) {
      case ArgumentType.NUMBER:
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            path: [],
            message: 'Expected a number',
            code: 'invalid_type',
            expected: 'number',
            received: typeof value,
          });
        } else {
          if (fieldDef.min !== undefined && value < fieldDef.min) {
            errors.push({
              path: [],
              message: `Value must be at least ${fieldDef.min}`,
              code: 'too_small',
              expected: `>= ${fieldDef.min}`,
              received: value,
            });
          }
          if (fieldDef.max !== undefined && value > fieldDef.max) {
            errors.push({
              path: [],
              message: `Value must be at most ${fieldDef.max}`,
              code: 'too_big',
              expected: `<= ${fieldDef.max}`,
              received: value,
            });
          }
        }
        break;

      case ArgumentType.STRING:
        if (typeof value !== 'string') {
          errors.push({
            path: [],
            message: 'Expected a string',
            code: 'invalid_type',
            expected: 'string',
            received: typeof value,
          });
        } else {
          if (fieldDef.min !== undefined && value.length < fieldDef.min) {
            errors.push({
              path: [],
              message: `String must be at least ${fieldDef.min} characters`,
              code: 'too_small',
              expected: `length >= ${fieldDef.min}`,
              received: value.length,
            });
          }
          if (fieldDef.max !== undefined && value.length > fieldDef.max) {
            errors.push({
              path: [],
              message: `String must be at most ${fieldDef.max} characters`,
              code: 'too_big',
              expected: `length <= ${fieldDef.max}`,
              received: value.length,
            });
          }
          if (fieldDef.pattern && !fieldDef.pattern.test(value)) {
            errors.push({
              path: [],
              message: `String does not match required pattern`,
              code: 'invalid_string',
              expected: fieldDef.pattern.toString(),
              received: value,
            });
          }
        }
        break;

      case ArgumentType.ENUM:
        if (fieldDef.choices && !fieldDef.choices.includes(String(value))) {
          errors.push({
            path: [],
            message: `Value must be one of: ${fieldDef.choices.join(', ')}`,
            code: 'invalid_enum_value',
            expected: fieldDef.choices,
            received: value,
          });
        }
        break;

      case ArgumentType.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== 'string' || !emailRegex.test(value)) {
          errors.push({
            path: [],
            message: 'Invalid email address format',
            code: 'invalid_email',
            expected: 'valid email',
            received: value,
          });
        }
        break;

      case ArgumentType.URL:
        try {
          new URL(String(value));
        } catch {
          errors.push({
            path: [],
            message: 'Invalid URL format',
            code: 'invalid_url',
            expected: 'valid URL',
            received: value,
          });
        }
        break;
    }

    return {
      success: errors.length === 0,
      data: value,
      errors,
      warnings: [],
    };
  }

  /**
   * Find option by name
   */
  private findOption(name: string): IValidatedOption | undefined {
    return this.options.find(opt => 
      this.config.caseSensitive ? opt.name === name : opt.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Find option by alias
   */
  private findOptionByAlias(alias: string): IValidatedOption | undefined {
    return this.options.find(opt => 
      opt.alias && (this.config.caseSensitive ? opt.alias === alias : opt.alias.toLowerCase() === alias.toLowerCase())
    );
  }

  /**
   * Add built-in help option
   */
  private addHelpOption(): void {
    this.addOption({
      name: 'help',
      alias: 'h',
      description: 'Show help information',
      type: ArgumentType.BOOLEAN,
      required: false,
      flag: true,
    });
  }

  /**
   * Add built-in version option
   */
  private addVersionOption(): void {
    this.addOption({
      name: 'version',
      alias: 'v',
      description: 'Show version information',
      type: ArgumentType.BOOLEAN,
      required: false,
      flag: true,
    });
  }
}

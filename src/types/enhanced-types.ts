/**
 * Advanced type system with template literal types and branded types
 */

// Branded types for type safety

// Template literal types for command paths
export type CommandPath<T extends string = string> = T extends `${infer Parent}:${infer Child}`
  ? `${Parent}:${Child}`
  : T;

// Utility type for creating branded strings
export function createCommandName(value: string): CommandName {
  return value as CommandName;
}

export function createOptionName(value: string): OptionName {
  return value as OptionName;
}

export function createArgName(value: string): ArgName {
  return value as ArgName;
}

// Advanced option type with discriminated unions

  | { type: 'string'; value: string; choices?: readonly string[] }
  | { type: 'number'; value: number; min?: number; max?: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'array'; value: readonly string[]; itemType?: 'string' | 'number' }
  | { type: 'object'; value: Record<string, unknown>; schema?: unknown };

// Enhanced command interface with generics
export interface IEnhancedCommand<
  TArgs extends Record<string, any> = Record<string, any>,
  TOpts extends Record<string, any> = Record<string, any>,
  TResult = any
> {
  readonly name: CommandName;
  readonly description: string;
  readonly category?: string;
  readonly version?: string;
  readonly deprecated?: boolean | { since: string; alternative?: string };
  
  // Type-safe execution
  execute(context: ITypedCommandContext<TArgs, TOpts>): Promise<ITypedCommandResult<TResult>>;
  
  // Schema definitions for validation
  readonly argumentSchema?: ArgumentSchema<TArgs>;
  readonly optionSchema?: OptionSchema<TOpts>;
  
  // Advanced metadata
  readonly metadata?: CommandMetadata;
}

// Type-safe context
export interface ITypedCommandContext<
  TArgs extends Record<string, any> = Record<string, any>,
  TOpts extends Record<string, any> = Record<string, any>
> {
  readonly args: TArgs;
  readonly options: TOpts;
  readonly rawArgs: readonly string[];
  readonly command: IEnhancedCommand<TArgs, TOpts>;
  readonly parent?: ITypedCommandContext;
  readonly correlation: {
    readonly id: string;
    readonly timestamp: Date;
    readonly user?: string;
  };
}

// Enhanced result with discriminated union
export type ITypedCommandResult<T = any> = 
  | { readonly success: true; readonly data: T; readonly exitCode: 0 }
  | { readonly success: false; readonly error: Error; readonly exitCode: number; readonly data?: never };

// Schema types for validation
export type ArgumentSchema<T extends Record<string, any>> = {
  readonly [K in keyof T]: {
    readonly type: ArgumentTypeFromValue<T[K]>;
    readonly description: string;
    readonly required: boolean;
    readonly defaultValue?: T[K];
    readonly validator?: (value: T[K]) => boolean | string;
  };
};

export type OptionSchema<T extends Record<string, any>> = {
  readonly [K in keyof T]: {
    readonly type: OptionTypeFromValue<T[K]>;
    readonly description: string;
    readonly alias?: string;
    readonly required: boolean;
    readonly defaultValue?: T[K];
    readonly validator?: (value: T[K]) => boolean | string;
  };
};

// Type helpers
type ArgumentTypeFromValue<T> = 
  T extends string ? 'string' :
  T extends number ? 'number' :
  T extends boolean ? 'boolean' :
  T extends readonly any[] ? 'array' :
  'unknown';

type OptionTypeFromValue<T> = ArgumentTypeFromValue<T>;

// Command metadata with rich information
[];
  readonly author?: string;
  readonly license?: string;
  readonly homepage?: string;
  readonly repository?: string;
  readonly tags?: readonly string[];
  readonly since?: string;
  readonly experimental?: boolean;
  readonly internal?: boolean;
}

// Builder pattern with fluent interface and type inference
export class TypedCommandBuilder<
  TArgs extends Record<string, any> = {},
  TOpts extends Record<string, any> = {}
> {
  private config: {
    name?: CommandName;
    description?: string;
    argumentSchema?: any;
    optionSchema?: any;
  } = {};

  static create(): TypedCommandBuilder<{}, {}> {
    return new TypedCommandBuilder();
  }

  name<T extends string>(name: T): TypedCommandBuilder<TArgs, TOpts> {
    this.config.name = createCommandName(name);
    return this;
  }

  description(description: string): TypedCommandBuilder<TArgs, TOpts> {
    this.config.description = description;
    return this;
  }

  argument<K extends string, V>(
    _name: K,
    _config: {
      type: ArgumentTypeFromValue<V>;
      description: string;
      required: boolean;
      defaultValue?: V;
    }
  ): TypedCommandBuilder<TArgs & Record<K, V>, TOpts> {
    // Implementation would merge argument configs
    return this as any;
  }

  option<K extends string, V>(
    _name: K,
    _config: {
      type: OptionTypeFromValue<V>;
      description: string;
      alias?: string;
      required?: boolean;
      defaultValue?: V;
    }
  ): TypedCommandBuilder<TArgs, TOpts & Record<K, V>> {
    // Implementation would merge option configs
    return this as any;
  }

  action<TResult>(
    handler: (context: ITypedCommandContext<TArgs, TOpts>) => Promise<ITypedCommandResult<TResult>>
  ): IEnhancedCommand<TArgs, TOpts, TResult> {
    return {
      name: this.config.name!,
      description: this.config.description!,
      execute: handler,
    } as IEnhancedCommand<TArgs, TOpts, TResult>;
  }
}

// Usage example:
/*
const myCommand = TypedCommandBuilder
  .create()
  .name('deploy')
  .description('Deploy application')
  .argument('environment', {
    type: 'string',
    description: 'Target environment',
    required: true
  })
  .option('force', {
    type: 'boolean',
    description: 'Force deployment',
    defaultValue: false
  })
  .action(async ({ args, options }) => {
    // args.environment is string
    // options.force is boolean
    return { success: true, data: 'Deployed!', exitCode: 0 };
  });
*/

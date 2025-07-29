/**
 * Core command execution result types
 */
export interface ICommandResult {
  success: boolean;
  exitCode: number;
  data?: any;
  message: string | undefined;
  error?: Error;
}

/**
 * Command execution context interface
 */
export interface ICommandContext {
  args: string[];
  options: Record<string, any>;
  rawArgs: string[];
  command: ICommand;
  parent: ICommandContext | undefined;
}

/**
 * Command argument definition
 */
export interface IArgument {
  name: string;
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  defaultValue?: any;
  validator: ((value: any) => boolean | string) | undefined;
}

/**
 * Command option definition
 */
export interface IOption {
  name: string;
  alias: string | undefined;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  defaultValue?: any;
  choices: string[] | undefined;
  validator: ((value: any) => boolean | string) | undefined;
}

/**
 * Core command interface
 */
export interface ICommand {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
  arguments: IArgument[] | undefined;
  options: IOption[] | undefined;
  subcommands?: ICommand[];
  aliases: string[] | undefined;
  hidden: boolean | undefined;
  
  /**
   * Execute the command
   */
  execute(context: ICommandContext): Promise<ICommandResult>;
  
  /**
   * Validate command before execution
   */
  validate?(context: ICommandContext): Promise<boolean>;
  
  /**
   * Setup command (called during registration)
   */
  setup?(): Promise<void>;
  
  /**
   * Cleanup command (called on exit)
   */
  cleanup?(): Promise<void>;
}

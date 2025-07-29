/**
 * Core command execution result types
 */
export interface ICommandResult {
  success: boolean;
  exitCode: number;
  data?: any;
  message?: string;
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
  parent?: ICommandContext;
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
  validator?: (value: any) => boolean | string;
}

/**
 * Command option definition
 */
export interface IOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  defaultValue?: any;
  choices?: string[];
  validator?: (value: any) => boolean | string;
}

/**
 * Core command interface
 */
export interface ICommand {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
  arguments?: IArgument[];
  options?: IOption[];
  subcommands?: ICommand[];
  aliases?: string[];
  hidden?: boolean;
  
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

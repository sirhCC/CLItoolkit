/**
 * Enhanced CLI Framework with advanced execution capabilities
 * Integrates Phase 3.2 Execution Framework components
 */

import { ICommand, ICommandResult, ICliConfig } from '../types';
import { CommandResult } from './base-implementations';
import {
    IServiceContainer,
    ServiceContainer
} from './execution-context';
import { ExecutionPipeline, PipelineFactory } from './execution-pipeline';
import { CommandExecutor, IExecutionOptions } from './command-executor';

/**
 * Enhanced CLI configuration with execution options
 */
export interface IEnhancedCliConfig extends ICliConfig {
    /**
     * Maximum concurrent command executions
     */
    maxConcurrentExecutions?: number;

    /**
     * Default execution timeout in milliseconds
     */
    defaultTimeout?: number;

    /**
     * Pipeline configuration
     */
    pipelineType?: 'default' | 'minimal' | 'debug' | 'custom';

    /**
     * Custom pipeline factory
     */
    customPipeline?: () => ExecutionPipeline;

    /**
     * Global services to register with the DI container
     */
    globalServices?: Array<{
        token: string | symbol;
        implementation: any;
        singleton?: boolean;
    }>;
}

/**
 * Enhanced CLI Framework with advanced execution capabilities
 */
export class EnhancedCliFramework {
    private readonly commands = new Map<string, ICommand>();
    private readonly aliases = new Map<string, string>();
    private readonly config: Required<IEnhancedCliConfig>;
    private readonly serviceContainer: IServiceContainer;
    private readonly executor: CommandExecutor;
    private readonly pipeline: ExecutionPipeline;

    constructor(config: Partial<IEnhancedCliConfig> = {}) {
        // Set defaults
        this.config = {
            name: 'cli',
            version: '1.0.0',
            description: 'Enhanced command line interface',
            showHelpWhenEmpty: true,
            exitOnComplete: true,
            strict: false,
            maxConcurrentExecutions: 10,
            defaultTimeout: 30000, // 30 seconds
            pipelineType: 'default',
            globalServices: [],
            ...config
        } as Required<IEnhancedCliConfig>;

        // Initialize service container
        this.serviceContainer = new ServiceContainer();
        this.registerGlobalServices();

        // Initialize pipeline
        this.pipeline = this.createPipeline();

        // Initialize executor
        this.executor = new CommandExecutor(
            this.config.maxConcurrentExecutions,
            this.pipeline
        );
    }

    /**
     * Register global services with the DI container
     */
    private registerGlobalServices(): void {
        // Register framework services
        this.serviceContainer.register('cli.framework', this, true);
        this.serviceContainer.register('cli.config', this.config, true);

        // Register user-defined global services
        if (this.config.globalServices) {
            for (const service of this.config.globalServices) {
                this.serviceContainer.register(
                    service.token,
                    service.implementation,
                    service.singleton
                );
            }
        }
    }

    /**
     * Create the execution pipeline based on configuration
     */
    private createPipeline(): ExecutionPipeline {
        switch (this.config.pipelineType) {
            case 'minimal':
                return PipelineFactory.createMinimal();
            case 'debug':
                return PipelineFactory.createDebug();
            case 'custom':
                return this.config.customPipeline ? this.config.customPipeline() : PipelineFactory.createDefault();
            case 'default':
            default:
                return PipelineFactory.createDefault();
        }
    }

    /**
     * Register a command with the CLI
     */
    registerCommand(command: ICommand): this {
        // Validate command object
        if (!command) {
            throw new Error('Command cannot be null or undefined');
        }
        if (typeof command !== 'object') {
            throw new Error('Command must be an object');
        }

        // Guard clause: validate command name
        if (!command.name) {
            throw new Error('Command must have a name');
        }
        if (typeof command.name !== 'string') {
            throw new Error('Command name must be a string');
        }
        if (command.name.trim().length === 0) {
            throw new Error('Command name cannot be empty');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(command.name)) {
            throw new Error(`Invalid command name: '${command.name}' (must contain only alphanumeric characters, hyphens, and underscores)`);
        }

        if (this.commands.has(command.name)) {
            throw new Error(`Command '${command.name}' is already registered`);
        }

        // Register the command
        this.commands.set(command.name, command);

        // Register aliases
        if (command.aliases) {
            if (!Array.isArray(command.aliases)) {
                throw new Error(`Command '${command.name}' aliases must be an array`);
            }

            for (const alias of command.aliases) {
                if (!alias || typeof alias !== 'string' || alias.trim().length === 0) {
                    throw new Error(`Invalid alias for command '${command.name}': aliases must be non-empty strings`);
                }
                if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
                    throw new Error(`Invalid alias '${alias}' for command '${command.name}' (must contain only alphanumeric characters, hyphens, and underscores)`);
                }
                if (this.aliases.has(alias) || this.commands.has(alias)) {
                    throw new Error(`Alias '${alias}' conflicts with existing command or alias`);
                }
                this.aliases.set(alias, command.name);
            }
        }

        // Setup the command if it has a setup method
        if (command.setup) {
            command.setup().catch(error => {
                console.error(`Failed to setup command '${command.name}':`, error);
            });
        }

        return this;
    }

    /**
     * Unregister a command
     */
    unregisterCommand(commandName: string): boolean {
        if (!commandName || typeof commandName !== 'string') {
            throw new Error('Command name must be a non-empty string');
        }

        const command = this.commands.get(commandName);
        if (!command) {
            return false;
        }

        // Remove aliases
        if (command.aliases) {
            for (const alias of command.aliases) {
                this.aliases.delete(alias);
            }
        }

        // Remove command
        this.commands.delete(commandName);

        // Cleanup the command if it has a cleanup method
        if (command.cleanup) {
            command.cleanup().catch(error => {
                console.error(`Failed to cleanup command '${commandName}':`, error);
            });
        }

        return true;
    }

    /**if (!nameOrAlias || typeof nameOrAlias !== 'string') {
            throw new Error('Command name or alias must be a non-empty string');
        }

        
     * Get a command by name or alias
     */
    getCommand(nameOrAlias: string): ICommand | undefined {
        // First check direct command names
        const command = this.commands.get(nameOrAlias);
        if (command) {
            return command;
        }

        // Then check aliases
        const actualName = this.aliases.get(nameOrAlias);
        if (actualName) {
            return this.commands.get(actualName);
        }

        return undefined;
    }

    /**
     * Get all registered commands
     */
    getCommands(): Map<string, ICommand> {
        return new Map(this.commands);
    }

    /**
     * Get the service container
     */
    getServices(): IServiceContainer {
        return this.serviceContainer;
    }

    /**
     * Get the command executor
     */
    getExecutor(): CommandExecutor {
        return this.executor;
    }

    /**
     * Get the execution pipeline
     */
    getPipeline(): ExecutionPipeline {
        return this.pipeline;
    }

    /**
     * Parse command line arguments
     */
    parseArguments(argv: string[]): { command: string | null; args: string[]; options: Record<string, any> } {
        if (argv.length === 0) {
            return { command: null, args: [], options: {} };
        }

        let command: string | null = null;
        const positionalArgs: string[] = [];
        const options: Record<string, any> = {};

        let i = 0;
        while (i < argv.length) {
            const arg = argv[i];
            if (!arg) {
                i++;
                continue;
            }

            // Long option (--key=value or --key value)
            if (arg.startsWith('--')) {
                const optionText = arg.slice(2);
                const equalIndex = optionText.indexOf('=');

                if (equalIndex !== -1) {
                    // --key=value format
                    const key = optionText.slice(0, equalIndex);
                    const value = optionText.slice(equalIndex + 1);
                    options[key] = value;
                } else {
                    // --key value format or boolean flag
                    const key = optionText;

                    // Check if next argument is a value (doesn't start with -)
                    const nextArg = argv[i + 1];
                    if (i + 1 < argv.length && nextArg && !nextArg.startsWith('-')) {
                        options[key] = argv[i + 1];
                        i++; // Skip the value argument
                    } else {
                        // Boolean flag
                        options[key] = true;
                    }
                }
            }
            // Short option (-k value or -abc)
            else if (arg.startsWith('-') && arg.length > 1) {
                const optionText = arg.slice(1);

                if (optionText.length === 1) {
                    // Single short option (-k value or -k)
                    const key = optionText;

                    // Check if next argument is a value
                    const nextArg = argv[i + 1];
                    if (i + 1 < argv.length && nextArg && !nextArg.startsWith('-')) {
                        options[key] = nextArg;
                        i++; // Skip the value argument
                    } else {
                        // Boolean flag
                        options[key] = true;
                    }
                } else {
                    // Multiple short options (-abc = -a -b -c)
                    for (const char of optionText) {
                        options[char] = true;
                    }
                }
            }
            // Command or positional argument
            else {
                if (command === null) {
                    // First non-option argument is the command
                    command = arg;
                } else {
                    // Subsequent non-option arguments are positional
                    positionalArgs.push(arg);
                }
            }

            i++;
        }

        return { command, args: positionalArgs, options };
    }

    /**
     * Execute a command with enhanced execution features
     */
    async executeCommand(
        commandName: string,
        args: string[] = [],
        options: Record<string, any> = {},
        rawArgs: string[] = [],
        executionOptions: IExecutionOptions = {}
    ): Promise<ICommandResult> {
        // Validate inputs
        if (!commandName || typeof commandName !== 'string') {
            return CommandResult.failure(
                1,
                'Command name must be a non-empty string'
            );
        }
        if (!Array.isArray(args)) {
            return CommandResult.failure(
                1,
                'Arguments must be an array'
            );
        }
        if (!options || typeof options !== 'object') {
            return CommandResult.failure(
                1,
                'Options must be an object'
            );
        }

        // Guard clause: check if command exists
        const command = this.getCommand(commandName);
        if (!command) {
            return CommandResult.failure(
                1,
                `Command '${commandName}' not found. Use --help to see available commands.`
            );
        }

        try {
            // Set up execution options with defaults
            const finalExecutionOptions: IExecutionOptions = {
                timeout: this.config.defaultTimeout,
                services: this.serviceContainer.createChild(),
                ...executionOptions
            };

            // Execute using the enhanced executor
            return await this.executor.executeAsync(
                command,
                args,
                options,
                rawArgs,
                finalExecutionOptions
            );

        } catch (error) {
            return CommandResult.fromError(
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Execute multiple commands concurrently
     */
    async executeConcurrent(
        commands: Array<{
            name: string;
            args?: string[];
            options?: Record<string, any>;
            rawArgs?: string[];
            executionOptions?: IExecutionOptions;
        }>
    ): Promise<ICommandResult[]> {
        const executions = commands.map(({ name, args = [], options = {}, rawArgs = [], executionOptions = {} }) => {
            const command = this.getCommand(name);
            if (!command) {
                throw new Error(`Command '${name}' not found`);
            }

            return {
                command,
                args,
                options,
                rawArgs,
                executionOptions: {
                    timeout: this.config.defaultTimeout,
                    services: this.serviceContainer.createChild(),
                    ...executionOptions
                }
            };
        });

        return this.executor.executeConcurrent(executions);
    }

    /**
     * Execute multiple commands in sequence
     */
    async executeSequential(
        commands: Array<{
            name: string;
            args?: string[];
            options?: Record<string, any>;
            rawArgs?: string[];
            executionOptions?: IExecutionOptions;
        }>
    ): Promise<ICommandResult[]> {
        const executions = commands.map(({ name, args = [], options = {}, rawArgs = [], executionOptions = {} }) => {
            const command = this.getCommand(name);
            if (!command) {
                throw new Error(`Command '${name}' not found`);
            }

            return {
                command,
                args,
                options,
                rawArgs,
                executionOptions: {
                    timeout: this.config.defaultTimeout,
                    services: this.serviceContainer.createChild(),
                    ...executionOptions
                }
            };
        });

        return this.executor.executeSequential(executions);
    }

    /**
     * Run the CLI with process arguments
     */
    async run(argv: string[] = process.argv.slice(2)): Promise<ICommandResult> {
        try {
            // Handle empty input
            if (argv.length === 0) {
                if (this.config.defaultCommand) {
                    return this.executeCommand(this.config.defaultCommand, [], {});
                }

                if (this.config.showHelpWhenEmpty) {
                    this.showHelp();
                    return CommandResult.success();
                }

                return CommandResult.failure(1, 'No command specified');
            }

            // Parse arguments
            const parsed = this.parseArguments(argv);

            // Handle global help
            if (parsed.options.help || parsed.options.h) {
                if (parsed.command) {
                    this.showCommandHelp(parsed.command);
                } else {
                    this.showHelp();
                }
                return CommandResult.success();
            }

            // Handle version
            if (parsed.options.version || parsed.options.v) {
                console.log(`${this.config.name} version ${this.config.version}`);
                return CommandResult.success();
            }

            // Execute command
            if (parsed.command) {
                return this.executeCommand(parsed.command, parsed.args, parsed.options, argv);
            }

            return CommandResult.failure(1, 'No command specified');

        } catch (error) {
            return CommandResult.fromError(
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Show general help
     */
    showHelp(): void {
        console.log(`${this.config.name} v${this.config.version}`);
        console.log(this.config.description);
        console.log('');
        console.log('Usage:');
        console.log(`  ${this.config.name} <command> [options] [arguments]`);
        console.log('');
        console.log('Commands:');

        for (const [name, command] of this.commands) {
            if (!command.hidden) {
                console.log(`  ${name.padEnd(20)} ${command.description || ''}`);
            }
        }

        console.log('');
        console.log('Global Options:');
        console.log('  -h, --help        Show help');
        console.log('  -v, --version     Show version');
    }

    /**
     * Show help for a specific command
     */
    showCommandHelp(commandName: string): void {
        const command = this.getCommand(commandName);
        if (!command) {
            console.log(`Command '${commandName}' not found.`);
            return;
        }

        console.log(`${command.name} - ${command.description || 'No description available'}`);

        if (command.usage) {
            console.log(`\nUsage: ${command.usage}`);
        }

        if (command.arguments && command.arguments.length > 0) {
            console.log('\nArguments:');
            for (const arg of command.arguments) {
                const required = arg.required ? ' (required)' : ' (optional)';
                console.log(`  ${arg.name.padEnd(15)} ${arg.description}${required}`);
            }
        }

        if (command.options && command.options.length > 0) {
            console.log('\nOptions:');
            for (const option of command.options) {
                const name = option.alias ? `-${option.alias}, --${option.name}` : `--${option.name}`;
                const required = option.required ? ' (required)' : ' (optional)';
                console.log(`  ${name.padEnd(20)} ${option.description}${required}`);
            }
        }

        if (command.examples && command.examples.length > 0) {
            console.log('\nExamples:');
            for (const example of command.examples) {
                console.log(`  ${example}`);
            }
        }
    }

    /**
     * Get execution statistics
     */
    getExecutionStats() {
        return this.executor.getStats();
    }

    /**
     * Get currently running executions
     */
    getRunningExecutions() {
        return this.executor.getRunningExecutions();
    }

    /**
     * Cancel all running executions
     */
    cancelAllExecutions(reason?: string): number {
        return this.executor.cancelAllExecutions(reason);
    }

    /**
     * Wait for all running executions to complete
     */
    async waitForCompletion(): Promise<void> {
        return this.executor.waitForAll();
    }

    /**
     * Cleanup framework resources
     */
    async cleanup(): Promise<void> {
        // Cancel all running executions
        this.cancelAllExecutions('Framework cleanup');

        // Wait for executions to complete
        await this.waitForCompletion();

        // Cleanup all commands
        for (const command of this.commands.values()) {
            if (command.cleanup) {
                try {
                    await command.cleanup();
                } catch (error) {
                    console.error(`Failed to cleanup command '${command.name}':`, error);
                }
            }
        }
    }
}

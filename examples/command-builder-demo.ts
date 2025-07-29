/**
 * @fileoverview Command Builder usage examples and demonstrations
 */

import { createCommand, CommandBuilder } from '../src/core/command-builder';
import { ICommandContext } from '../src/types/command';

/**
 * Example 1: Simple Command
 */
export async function createSimpleCommand() {
  const command = await createCommand()
    .name('hello')
    .description('Say hello to someone')
    .argument('name', 'Name of the person to greet', {
      required: true,
      type: 'string'
    })
    .option('--loud', 'Use uppercase output', {
      type: 'boolean'
    })
    .action(async (context: ICommandContext) => {
      const name = context.args[0] || 'World';
      const loud = context.options.loud;
      const greeting = `Hello, ${name}!`;
      
      console.log(loud ? greeting.toUpperCase() : greeting);
      
      return {
        success: true,
        exitCode: 0,
        data: { greeting, name, loud }
      };
    })
    .build();

  return command;
}

/**
 * Example 2: Complex Command with Validation
 */
export async function createFileProcessorCommand() {
  const command = await createCommand()
    .name('process-file')
    .description('Process a file with various options')
    .alias('pf')
    .aliases(['proc', 'process'])
    .argument('input', 'Input file path', {
      required: true,
      type: 'string',
      validator: (value: string) => {
        if (!value.endsWith('.txt')) {
          return 'Input file must be a .txt file';
        }
        return true;
      }
    })
    .argument('output', 'Output file path', {
      required: false,
      type: 'string',
      defaultValue: 'output.txt'
    })
    .option('--format', 'Output format', {
      type: 'string',
      choices: ['json', 'xml', 'csv'],
      defaultValue: 'json'
    })
    .option('--verbose', 'Enable verbose logging', {
      alias: 'v',
      type: 'boolean'
    })
    .option('--max-size', 'Maximum file size in MB', {
      type: 'number',
      defaultValue: 10,
      validator: (value: number) => {
        if (value <= 0 || value > 100) {
          return 'Max size must be between 1 and 100 MB';
        }
        return true;
      }
    })
    .setup(async () => {
      console.log('Setting up file processor...');
      // Initialize resources, check permissions, etc.
    })
    .teardown(async () => {
      console.log('Cleaning up file processor...');
      // Close files, clean up resources, etc.
    })
    .action(async (context: ICommandContext) => {
      const [input, output] = context.args;
      const { format, verbose, maxSize } = context.options;
      
      if (verbose) {
        console.log(`Processing file: ${input}`);
        console.log(`Output file: ${output}`);
        console.log(`Format: ${format}`);
        console.log(`Max size: ${maxSize}MB`);
      }
      
      // Simulate file processing
      const result = {
        processed: true,
        inputFile: input,
        outputFile: output,
        format,
        size: Math.random() * maxSize
      };
      
      return {
        success: true,
        exitCode: 0,
        data: result,
        message: `File processed successfully: ${input} -> ${output}`
      };
    })
    .build();

  return command;
}

/**
 * Example 3: Command with Configuration
 */
export async function createConfigurableCommand() {
  // Create builder with custom configuration
  const builder = new CommandBuilder({
    validateOnBuild: true,
    allowOverrides: true
  });

  const command = await builder
    .name('deploy')
    .description('Deploy application to environment')
    .argument('environment', 'Target environment', {
      required: true,
      type: 'string',
      validator: (value: string) => {
        const validEnvs = ['dev', 'staging', 'prod'];
        if (!validEnvs.includes(value)) {
          return `Environment must be one of: ${validEnvs.join(', ')}`;
        }
        return true;
      }
    })
    .option('--dry-run', 'Perform a dry run without actual deployment', {
      type: 'boolean'
    })
    .option('--config', 'Configuration file path', {
      alias: 'c',
      type: 'string',
      defaultValue: './deploy.config.json'
    })
    .action(async (context: ICommandContext) => {
      const [environment] = context.args;
      const { dryRun, config } = context.options;
      
      console.log(`Deploying to ${environment}...`);
      console.log(`Config file: ${config}`);
      
      if (dryRun) {
        console.log('DRY RUN - No actual deployment performed');
        return {
          success: true,
          exitCode: 0,
          message: 'Dry run completed successfully'
        };
      }
      
      // Simulate deployment
      return {
        success: true,
        exitCode: 0,
        data: { environment, config, deployed: true },
        message: `Successfully deployed to ${environment}`
      };
    })
    .build();

  return command;
}

/**
 * Example 4: Hidden Command (for internal use)
 */
export async function createInternalCommand() {
  const command = await createCommand()
    .name('internal-debug')
    .description('Internal debugging command')
    .hidden() // Won't appear in help
    .option('--level', 'Debug level', {
      type: 'string',
      choices: ['trace', 'debug', 'info', 'warn', 'error'],
      defaultValue: 'debug'
    })
    .action(async (context: ICommandContext) => {
      const { level } = context.options;
      
      console.log(`Debug mode activated at level: ${level}`);
      
      return {
        success: true,
        exitCode: 0,
        data: { debugLevel: level, timestamp: new Date().toISOString() }
      };
    })
    .build();

  return command;
}

/**
 * Example 5: Command with Error Handling
 */
export async function createErrorProneCommand() {
  const command = await createCommand()
    .name('risky-operation')
    .description('A command that might fail')
    .option('--fail', 'Force the command to fail', {
      type: 'boolean'
    })
    .setup(async () => {
      console.log('Setting up risky operation...');
    })
    .teardown(async () => {
      console.log('Cleaning up after risky operation...');
    })
    .action(async (context: ICommandContext) => {
      const { fail } = context.options;
      
      if (fail) {
        throw new Error('Operation failed as requested');
      }
      
      return {
        success: true,
        exitCode: 0,
        message: 'Operation completed successfully'
      };
    })
    .build();

  return command;
}

/**
 * Demo function to showcase all examples
 */
export async function demonstrateCommandBuilder() {
  console.log('=== Command Builder Demo ===\n');
  
  try {
    // Create all example commands
    const simpleCmd = await createSimpleCommand();
    const fileCmd = await createFileProcessorCommand();
    const deployCmd = await createConfigurableCommand();
    const debugCmd = await createInternalCommand();
    const riskyCmd = await createErrorProneCommand();
    
    console.log('✅ All commands created successfully!');
    console.log(`Created commands: ${[simpleCmd, fileCmd, deployCmd, debugCmd, riskyCmd].map(cmd => cmd.name).join(', ')}`);
    
    // Test simple command
    console.log('\n--- Testing Simple Command ---');
    const simpleContext = {
      args: ['Alice'],
      options: { loud: true },
      rawArgs: ['Alice', '--loud'],
      command: simpleCmd
    };
    
    const simpleResult = await simpleCmd.execute(simpleContext);
    console.log('Result:', simpleResult);
    
    // Test file processor command
    console.log('\n--- Testing File Processor Command ---');
    const fileContext = {
      args: ['input.txt', 'output.txt'],
      options: { format: 'json', verbose: true, maxSize: 5 },
      rawArgs: ['input.txt', 'output.txt', '--format', 'json', '--verbose', '--max-size', '5'],
      command: fileCmd
    };
    
    const fileResult = await fileCmd.execute(fileContext);
    console.log('Result:', fileResult);
    
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// All functions are already exported above

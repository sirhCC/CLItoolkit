/**
 * Phase 5 Integration Example: Error Handling & Logging
 * 
 * This example demonstrates how to integrate the error handling and logging
 * systems from Phase 5 into a CLI application.
 */

import { EnhancedCliFramework } from '../src/core/enhanced-cli-framework';
import { CommandBuilder } from '../src/core/command-builder';
import { GlobalErrorHandler, ErrorCategory, ErrorSeverity } from '../src/core/error-manager';
import { StructuredLogger, LogLevel, LogFormat, ConsoleTransport } from '../src/core/structured-logger';
import { ValidationError, ConfigurationError, CommandExecutionError } from '../src/types/errors';

// Initialize logging system
const logger = StructuredLogger.getInstance({
  level: LogLevel.Info,
  transports: [
    new ConsoleTransport(LogLevel.Debug, LogFormat.Pretty)
  ],
  enablePerformanceLogging: true,
  enableCorrelationIds: true
});

// Initialize error handling system
const errorHandler = GlobalErrorHandler.getInstance();

// Register custom error classifications
errorHandler.registerClassification('DatabaseError', {
  category: ErrorCategory.System,
  severity: ErrorSeverity.High,
  code: 'CLI_DATABASE_ERROR',
  recoverable: true,
  userActionRequired: false,
  suggestedActions: [
    'Check database connection',
    'Verify database credentials',
    'Retry the operation'
  ]
});

// Register a recovery strategy
errorHandler.registerRecoveryStrategy({
  canRecover: (error: Error) => error.message.includes('database'),
  recover: async (_error: Error) => {
    logger.info('Attempting database reconnection...');
    // Simulate reconnection logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    return Math.random() > 0.5; // 50% chance of recovery
  },
  getSuggestions: (_error: Error) => [
    'Database connection was automatically restored',
    'Please retry your operation'
  ]
});

// Register global error handler
errorHandler.registerErrorHandler((error: Error, context) => {
  logger.error('Global error occurred', error, {
    correlationId: context.correlationId,
    timestamp: context.timestamp
  });
});

// Create CLI framework
const cli = new EnhancedCliFramework({
  name: 'phase5-demo',
  version: '1.0.0',
  description: 'Phase 5 Error Handling & Logging Demo'
});

// Example commands demonstrating different error scenarios

// Command that might have validation errors
const validateCommand = new CommandBuilder()
  .name('validate')
  .description('Validate input with potential errors')
  .argument('<input>', 'Input to validate')
  .option('--strict', 'Enable strict validation')
  .action(async (context) => {
    const input = context.args[0] as string;
    const strict = context.options.strict as boolean;

    logger.info('Validating input', { input, strict });

    if (!input || input.length < 3) {
      throw new ValidationError('Input must be at least 3 characters long');
    }

    if (strict && !/^[a-zA-Z]+$/.test(input)) {
      throw new ValidationError('In strict mode, input must contain only letters');
    }

    logger.info('Validation successful', { input });
    return { success: true, exitCode: 0 };
  });

// Command that might have configuration errors
const configCommand = new CommandBuilder()
  .name('config')
  .description('Configure application settings')
  .option('--database-url <url>', 'Database connection URL')
  .action(async (context) => {
    const dbUrl = context.options['database-url'] as string;

    logger.info('Configuring application', { dbUrl: dbUrl ? '[REDACTED]' : undefined });

    if (!dbUrl) {
      throw new ConfigurationError('Database URL is required for configuration');
    }

    if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('mysql://')) {
      throw new ConfigurationError('Database URL must start with postgresql:// or mysql://');
    }

    logger.info('Configuration updated successfully');
    return { success: true, exitCode: 0 };
  });

// Command that might have execution errors
const processCommand = new CommandBuilder()
  .name('process')
  .description('Process data with potential runtime errors')
  .argument('<data>', 'Data to process')
  .option('--simulate-error', 'Simulate random errors for testing')
  .action(async (context) => {
    const data = context.args[0] as string;
    const simulateError = context.options['simulate-error'] as boolean;

    const processingLogger = logger.child({ operation: 'data-processing' });
    
    const timerId = processingLogger.startTimer('data-processing');

    try {
      processingLogger.info('Starting data processing', { dataLength: data.length });

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));

      if (simulateError && Math.random() > 0.7) {
        throw new CommandExecutionError('Simulated processing failure');
      }

      if (data.includes('database')) {
        // Simulate database error that can be recovered
        const dbError = new Error('Connection to database lost');
        dbError.name = 'DatabaseError';
        throw dbError;
      }

      processingLogger.endTimer(timerId, 'Data processing completed');
      processingLogger.info('Processing successful', { result: 'processed' });

      return { success: true, exitCode: 0 };
    } catch (error) {
      processingLogger.endTimer(timerId, 'Data processing failed');
      
      // Handle error with global error handler
      const formattedError = await errorHandler.handleError(error as Error);

      processingLogger.error('Processing failed', error as Error, {
        formattedError,
        suggestions: formattedError.suggestions || []
      });

      throw error;
    }
  });

// Command to demonstrate logging levels
const logDemoCommand = new CommandBuilder()
  .name('log-demo')
  .description('Demonstrate different logging levels')
  .option('--level <level>', 'Log level to demonstrate')
  .action(async (context) => {
    const level = (context.options.level as string) || 'info';

    const demoLogger = logger.child({ demo: 'logging-levels' });

    switch (level.toLowerCase()) {
      case 'debug':
        demoLogger.debug('This is a debug message', { detailed: 'information' });
        break;
      case 'info':
        demoLogger.info('This is an info message', { status: 'normal' });
        break;
      case 'warn':
        demoLogger.warn('This is a warning message', { concern: 'minor' });
        break;
      case 'error':
        demoLogger.error('This is an error message', new Error('Demo error'), { severity: 'high' });
        break;
      default:
        throw new ValidationError(`Unknown log level: ${level}`);
    }

    return { success: true, exitCode: 0 };
  });

// Register commands
async function registerCommands() {
  cli.registerCommand(await validateCommand.build());
  cli.registerCommand(await configCommand.build());
  cli.registerCommand(await processCommand.build());
  cli.registerCommand(await logDemoCommand.build());
}

// Export the configured CLI for use
export { cli, logger, errorHandler, registerCommands };

// Example usage (if running directly)
if (require.main === module) {
  registerCommands().then(() => {
    return cli.run(process.argv);
  }).catch(async (error) => {
    // Final error handling
    const formattedError = await errorHandler.handleError(error);
    
    console.error('\nApplication Error:');
    console.error('Message:', formattedError.message);
    if (formattedError.details) {
      console.error('Details:', formattedError.details);
    }
    if (formattedError.suggestions && formattedError.suggestions.length > 0) {
      console.error('Suggestions:');
      formattedError.suggestions.forEach((suggestion, index) => {
        console.error(`  ${index + 1}. ${suggestion}`);
      });
    }
    
    process.exit(1);
  });
}

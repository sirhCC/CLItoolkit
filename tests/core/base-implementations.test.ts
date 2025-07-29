import { CommandResult, CommandContext, BaseCommand, SimpleCommand } from '@/core/base-implementations';
import { ICommandResult } from '../../src/types';

describe('CommandResult', () => {
  describe('constructor', () => {
    it('should create a result with all properties', () => {
      const result = new CommandResult(true, 0, { data: 'test' }, 'Success', undefined);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.data).toEqual({ data: 'test' });
      expect(result.message).toBe('Success');
      expect(result.error).toBeUndefined();
    });
  });

  describe('success', () => {
    it('should create a successful result', () => {
      const result = CommandResult.success({ output: 'done' }, 'Operation completed');

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.data).toEqual({ output: 'done' });
      expect(result.message).toBe('Operation completed');
    });

    it('should create a successful result without data or message', () => {
      const result = CommandResult.success();

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.data).toBeUndefined();
      expect(result.message).toBeUndefined();
    });
  });

  describe('failure', () => {
    it('should create a failure result with custom exit code', () => {
      const result = CommandResult.failure(2, 'Custom error');

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
      expect(result.message).toBe('Custom error');
    });

    it('should create a failure result with default exit code', () => {
      const result = CommandResult.failure();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('fromError', () => {
    it('should create a result from an error', () => {
      const error = new Error('Test error');
      const result = CommandResult.fromError(error, 3);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(3);
      expect(result.message).toBe('Test error');
      expect(result.error).toBe(error);
    });
  });
});

describe('CommandContext', () => {
  let mockCommand: any;

  beforeEach(() => {
    mockCommand = {
      name: 'test',
      description: 'Test command',
      execute: jest.fn()
    };
  });

  describe('create', () => {
    it('should create a context with all properties', () => {
      const context = CommandContext.create(
        ['arg1', 'arg2'],
        { verbose: true, count: 5 },
        ['test', 'arg1', 'arg2', '--verbose', '--count', '5'],
        mockCommand
      );

      expect(context.args).toEqual(['arg1', 'arg2']);
      expect(context.options).toEqual({ verbose: true, count: 5 });
      expect(context.rawArgs).toEqual(['test', 'arg1', 'arg2', '--verbose', '--count', '5']);
      expect(context.command).toBe(mockCommand);
    });
  });

  describe('getOption', () => {
    it('should get option value', () => {
      const context = CommandContext.create([], { verbose: true }, [], mockCommand);

      expect(context.getOption('verbose')).toBe(true);
      expect(context.getOption('missing')).toBeUndefined();
    });

    it('should return default value for missing option', () => {
      const context = CommandContext.create([], {}, [], mockCommand);

      expect(context.getOption('missing', 'default')).toBe('default');
    });
  });

  describe('hasOption', () => {
    it('should check if option exists and is truthy', () => {
      const context = CommandContext.create([], { verbose: true, quiet: false }, [], mockCommand);

      expect(context.hasOption('verbose')).toBe(true);
      expect(context.hasOption('quiet')).toBe(false);
      expect(context.hasOption('missing')).toBe(false);
    });
  });

  describe('getArg', () => {
    it('should get argument by index', () => {
      const context = CommandContext.create(['first', 'second'], {}, [], mockCommand);

      expect(context.getArg(0)).toBe('first');
      expect(context.getArg(1)).toBe('second');
      expect(context.getArg(2)).toBeUndefined();
    });
  });

  describe('getArgsFrom', () => {
    it('should get all args from index', () => {
      const context = CommandContext.create(['first', 'second', 'third'], {}, [], mockCommand);

      expect(context.getArgsFrom(1)).toEqual(['second', 'third']);
      expect(context.getArgsFrom(0)).toEqual(['first', 'second', 'third']);
      expect(context.getArgsFrom(5)).toEqual([]);
    });
  });
});

describe('BaseCommand', () => {
  class TestCommand extends BaseCommand {
    async execute(): Promise<ICommandResult> {
      return CommandResult.success();
    }
  }

  let command: TestCommand;

  beforeEach(() => {
    command = new TestCommand('test', 'Test command');
  });

  describe('constructor', () => {
    it('should create command with name and description', () => {
      expect(command.name).toBe('test');
      expect(command.description).toBe('Test command');
    });
  });

  describe('fluent API methods', () => {
    it('should add arguments', () => {
      const arg = { name: 'file', description: 'Input file', required: true, type: 'string' as const };
      command.addArgument(arg);

      expect(command.arguments).toEqual([arg]);
    });

    it('should add options', () => {
      const option = { name: 'verbose', description: 'Verbose output', type: 'boolean' as const, required: false };
      command.addOption(option);

      expect(command.options).toEqual([option]);
    });

    it('should add aliases', () => {
      command.addAlias('t');

      expect(command.aliases).toEqual(['t']);
    });

    it('should set usage', () => {
      command.setUsage('test [options] <file>');

      expect(command.usage).toBe('test [options] <file>');
    });

    it('should add examples', () => {
      command.addExample('test --verbose file.txt');

      expect(command.examples).toEqual(['test --verbose file.txt']);
    });

    it('should hide command', () => {
      command.hide();

      expect(command.hidden).toBe(true);
    });

    it('should chain method calls', () => {
      const result = command
        .addAlias('t')
        .setUsage('test [options]')
        .hide();

      expect(result).toBe(command);
      expect(command.aliases).toEqual(['t']);
      expect(command.usage).toBe('test [options]');
      expect(command.hidden).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate required arguments', async () => {
      command.addArgument({ name: 'file', description: 'Input file', required: true, type: 'string' });
      
      const context = CommandContext.create(['test.txt'], {}, [], command);
      await expect(command.validate(context)).resolves.toBe(true);
    });

    it('should throw error for missing required arguments', async () => {
      command.addArgument({ name: 'file', description: 'Input file', required: true, type: 'string' });
      
      const context = CommandContext.create([], {}, [], command);
      await expect(command.validate(context)).rejects.toThrow('Missing required argument: file');
    });

    it('should validate required options', async () => {
      command.addOption({ name: 'output', description: 'Output file', type: 'string', required: true });
      
      const context = CommandContext.create([], { output: 'out.txt' }, [], command);
      await expect(command.validate(context)).resolves.toBe(true);
    });

    it('should throw error for missing required options', async () => {
      command.addOption({ name: 'output', description: 'Output file', type: 'string', required: true });
      
      const context = CommandContext.create([], {}, [], command);
      await expect(command.validate(context)).rejects.toThrow('Missing required option: --output');
    });
  });
});

describe('SimpleCommand', () => {
  it('should create and execute a simple command', async () => {
    const handler = jest.fn().mockResolvedValue(CommandResult.success('done'));
    const command = SimpleCommand.create('hello', 'Say hello', handler);
    
    const context = CommandContext.create([], {}, [], command);
    const result = await command.execute(context);

    expect(handler).toHaveBeenCalledWith(context);
    expect(result.success).toBe(true);
    expect(result.data).toBe('done');
  });

  it('should handle errors in handler', async () => {
    const error = new Error('Handler failed');
    const handler = jest.fn().mockRejectedValue(error);
    const command = SimpleCommand.create('fail', 'Failing command', handler);
    
    const context = CommandContext.create([], {}, [], command);
    const result = await command.execute(context);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
    expect(result.message).toBe('Handler failed');
  });

  it('should handle synchronous handler', async () => {
    const handler = jest.fn().mockReturnValue(CommandResult.success('sync result'));
    const command = SimpleCommand.create('sync', 'Sync command', handler);
    
    const context = CommandContext.create([], {}, [], command);
    const result = await command.execute(context);

    expect(result.success).toBe(true);
    expect(result.data).toBe('sync result');
  });
});

import { ICommand, ICommandContext, ICommandResult } from '@/types';

describe('Command Types', () => {
  describe('ICommandResult', () => {
    it('should define a proper command result structure', () => {
      const result: ICommandResult = {
        success: true,
        exitCode: 0,
        data: { message: 'Hello World' },
        message: 'Command executed successfully'
      };

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.data).toEqual({ message: 'Hello World' });
      expect(result.message).toBe('Command executed successfully');
    });

    it('should handle error results', () => {
      const error = new Error('Test error');
      const result: ICommandResult = {
        success: false,
        exitCode: 1,
        error,
        message: 'Command failed'
      };

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toBe(error);
    });
  });

  describe('ICommandContext', () => {
    it('should contain all necessary context information', () => {
      const mockCommand: ICommand = {
        name: 'test',
        description: 'Test command',
        execute: jest.fn()
      };

      const context: ICommandContext = {
        args: ['arg1', 'arg2'],
        options: { verbose: true, count: 5 },
        rawArgs: ['test', 'arg1', 'arg2', '--verbose', '--count', '5'],
        command: mockCommand
      };

      expect(context.args).toEqual(['arg1', 'arg2']);
      expect(context.options.verbose).toBe(true);
      expect(context.options.count).toBe(5);
      expect(context.command.name).toBe('test');
    });
  });

  describe('ICommand', () => {
    it('should define a minimal command structure', () => {
      const command: ICommand = {
        name: 'hello',
        description: 'Say hello',
        execute: async () => ({
          success: true,
          exitCode: 0,
          message: 'Hello!'
        })
      };

      expect(command.name).toBe('hello');
      expect(command.description).toBe('Say hello');
      expect(typeof command.execute).toBe('function');
    });

    it('should support optional properties', () => {
      const command: ICommand = {
        name: 'complex',
        description: 'Complex command',
        usage: 'complex [options] <file>',
        examples: ['complex --verbose file.txt'],
        aliases: ['cx'],
        hidden: false,
        arguments: [{
          name: 'file',
          description: 'Input file',
          required: true,
          type: 'string'
        }],
        options: [{
          name: 'verbose',
          alias: 'v',
          description: 'Verbose output',
          type: 'boolean',
          required: false,
          defaultValue: false
        }],
        execute: async () => ({ success: true, exitCode: 0 })
      };

      expect(command.usage).toBe('complex [options] <file>');
      expect(command.examples).toHaveLength(1);
      expect(command.aliases).toContain('cx');
      expect(command.arguments).toHaveLength(1);
      expect(command.options).toHaveLength(1);
    });
  });
});

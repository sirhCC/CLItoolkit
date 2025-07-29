/**
 * @fileoverview Tests for Command Builder implementation
 */

import { CommandBuilder, createCommand } from '../src/core/command-builder';
import { ValidationError, ConfigurationError } from '../src/types/errors';
import { ICommandContext } from '../src/types/command';

describe('CommandBuilder', () => {
  describe('Basic Builder Functionality', () => {
    it('should create a new command builder', () => {
      const builder = new CommandBuilder();
      expect(builder).toBeInstanceOf(CommandBuilder);
    });

    it('should create a command builder using factory function', () => {
      const builder = createCommand();
      expect(builder).toBeInstanceOf(CommandBuilder);
    });

    it('should allow method chaining', () => {
      const builder = new CommandBuilder();
      const result = builder
        .name('test')
        .description('Test command')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      expect(result).toBe(builder);
    });
  });

  describe('Command Configuration', () => {
    it('should set command name', () => {
      const builder = createCommand()
        .name('mycommand');
      
      expect(builder).toBeDefined();
    });

    it('should throw error for invalid command name', () => {
      const builder = createCommand();
      
      expect(() => builder.name('')).toThrow(ValidationError);
      expect(() => builder.name('  ')).toThrow(ValidationError);
      expect(() => builder.name(123 as any)).toThrow(ValidationError);
    });

    it('should set command description', () => {
      const builder = createCommand()
        .name('test')
        .description('This is a test command');
      
      expect(builder).toBeDefined();
    });

    it('should set command aliases', () => {
      const builder = createCommand()
        .name('test')
        .alias('t')
        .aliases(['test-cmd', 'tcmd']);
      
      expect(builder).toBeDefined();
    });

    it('should not add duplicate aliases', () => {
      const builder = createCommand()
        .name('test')
        .alias('t')
        .alias('t'); // Should not add duplicate
      
      expect(builder).toBeDefined();
    });

    it('should mark command as hidden', () => {
      const builder = createCommand()
        .name('test')
        .hidden()
        .hidden(false);
      
      expect(builder).toBeDefined();
    });
  });

  describe('Arguments and Options', () => {
    it('should add positional arguments', () => {
      const builder = createCommand()
        .name('test')
        .argument('input', 'Input file', { required: true, type: 'string' })
        .argument('output', 'Output file', { required: false, defaultValue: 'out.txt' });
      
      expect(builder).toBeDefined();
    });

    it('should throw error for duplicate argument names', () => {
      const builder = createCommand()
        .name('test')
        .argument('input', 'Input file');
      
      expect(() => {
        builder.argument('input', 'Another input');
      }).toThrow(ConfigurationError);
    });

    it('should allow argument override with config', () => {
      const builder = new CommandBuilder({ allowOverrides: true })
        .name('test')
        .argument('input', 'First input')
        .argument('input', 'Second input'); // Should override
      
      expect(builder).toBeDefined();
    });

    it('should add options with different flags', () => {
      const builder = createCommand()
        .name('test')
        .option('--verbose', 'Enable verbose output', { type: 'boolean' })
        .option('-o', 'Output file', { alias: 'output', type: 'string' })
        .option('config', 'Config file', { required: true });
      
      expect(builder).toBeDefined();
    });

    it('should parse flag formats correctly', () => {
      const builder = createCommand()
        .name('test')
        .option('--long-flag', 'Long flag')
        .option('-s', 'Short flag')
        .option('bare', 'Bare flag');
      
      expect(builder).toBeDefined();
    });

    it('should throw error for duplicate option names', () => {
      const builder = createCommand()
        .name('test')
        .option('--verbose', 'Verbose mode');
      
      expect(() => {
        builder.option('--verbose', 'Another verbose');
      }).toThrow(ConfigurationError);
    });
  });

  describe('Command Actions and Lifecycle', () => {
    it('should set command action', async () => {
      const action = jest.fn().mockResolvedValue({ success: true, exitCode: 0 });
      
      const builder = createCommand()
        .name('test')
        .description('Test command')
        .action(action);
      
      const command = await builder.build();
      
      const context: ICommandContext = {
        args: [],
        options: {},
        rawArgs: [],
        command
      };
      
      const result = await command.execute(context);
      
      expect(action).toHaveBeenCalledWith(context);
      expect(result).toEqual({ success: true, exitCode: 0 });
    });

    it('should throw error for non-function action', () => {
      const builder = createCommand().name('test');
      
      expect(() => {
        builder.action('not a function' as any);
      }).toThrow(ValidationError);
    });

    it('should set setup and teardown functions', async () => {
      const setup = jest.fn().mockResolvedValue(undefined);
      const teardown = jest.fn().mockResolvedValue(undefined);
      const action = jest.fn().mockResolvedValue({ success: true, exitCode: 0 });
      
      const builder = createCommand()
        .name('test')
        .setup(setup)
        .teardown(teardown)
        .action(action);
      
      const command = await builder.build();
      
      const context: ICommandContext = {
        args: [],
        options: {},
        rawArgs: [],
        command
      };
      
      await command.execute(context);
      
      expect(setup).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(teardown).toHaveBeenCalled();
    });

    it('should call teardown even if action fails', async () => {
      const setup = jest.fn().mockResolvedValue(undefined);
      const teardown = jest.fn().mockResolvedValue(undefined);
      const action = jest.fn().mockRejectedValue(new Error('Action failed'));
      
      const builder = createCommand()
        .name('test')
        .setup(setup)
        .teardown(teardown)
        .action(action);
      
      const command = await builder.build();
      
      const context: ICommandContext = {
        args: [],
        options: {},
        rawArgs: [],
        command
      };
      
      await expect(command.execute(context)).rejects.toThrow('Action failed');
      
      expect(setup).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(teardown).toHaveBeenCalled();
    });

    it('should handle teardown errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const teardown = jest.fn().mockRejectedValue(new Error('Teardown failed'));
      const action = jest.fn().mockRejectedValue(new Error('Action failed'));
      
      const builder = createCommand()
        .name('test')
        .teardown(teardown)
        .action(action);
      
      const command = await builder.build();
      
      const context: ICommandContext = {
        args: [],
        options: {},
        rawArgs: [],
        command
      };
      
      await expect(command.execute(context)).rejects.toThrow('Action failed');
      
      expect(teardown).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Teardown failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should throw error for non-function setup/teardown', () => {
      const builder = createCommand().name('test');
      
      expect(() => {
        builder.setup('not a function' as any);
      }).toThrow(ValidationError);
      
      expect(() => {
        builder.teardown('not a function' as any);
      }).toThrow(ValidationError);
    });
  });

  describe('Validation', () => {
    it('should validate successfully with valid configuration', async () => {
      const builder = createCommand()
        .name('valid-command')
        .description('A valid command')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const result = await builder.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate command name requirement', async () => {
      const builder = createCommand()
        .description('Missing name')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const result = await builder.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Command name is required');
    });

    it('should validate action requirement', async () => {
      const builder = createCommand()
        .name('test')
        .description('Missing action');
      
      const result = await builder.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Command action is required');
    });

    it('should warn about missing description', async () => {
      const builder = createCommand()
        .name('test')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const result = await builder.validate();
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Command description is recommended');
    });

    it('should validate command name format', async () => {
      const builder = createCommand()
        .name('123-invalid')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const result = await builder.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Command name must start with a letter and contain only letters, numbers, hyphens, and underscores');
    });

    it('should validate alias formats', async () => {
      const builder = createCommand()
        .name('test')
        .alias('123-invalid')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const result = await builder.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Alias \'123-invalid\' has invalid format');
    });

    it('should warn about argument order', async () => {
      const builder = createCommand()
        .name('test')
        .argument('optional', 'Optional arg', { required: false })
        .argument('required', 'Required arg', { required: true })
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const result = await builder.validate();
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Required arguments should come before optional arguments');
    });
  });

  describe('Build Process', () => {
    it('should build a valid command', async () => {
      const action = jest.fn().mockResolvedValue({ success: true, exitCode: 0 });
      
      const builder = createCommand()
        .name('test-command')
        .description('Test command description')
        .alias('tc')
        .argument('input', 'Input file', { required: true })
        .option('--verbose', 'Verbose output', { type: 'boolean' })
        .action(action);
      
      const command = await builder.build();
      
      expect(command.name).toBe('test-command');
      expect(command.description).toBe('Test command description');
      expect(command.aliases).toEqual(['tc']);
      expect(command.arguments).toHaveLength(1);
      expect(command.options).toHaveLength(1);
      expect(typeof command.execute).toBe('function');
    });

    it('should fail to build without name', async () => {
      const builder = createCommand({ validateOnBuild: false })
        .description('Missing name')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      await expect(builder.build()).rejects.toThrow('Command name is required');
    });

    it('should fail to build without action', async () => {
      const builder = createCommand({ validateOnBuild: false })
        .name('test')
        .description('Missing action');
      
      await expect(builder.build()).rejects.toThrow('Command action is required');
    });

    it('should fail validation during build if configured', async () => {
      const builder = createCommand({ validateOnBuild: true })
        .description('Invalid command'); // Missing name and action
      
      await expect(builder.build()).rejects.toThrow('Command validation failed');
    });

    it('should build without validation if configured', async () => {
      const builder = createCommand({ validateOnBuild: false })
        .name('test')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const command = await builder.build();
      expect(command).toBeDefined();
    });

    it('should provide default description if none given', async () => {
      const builder = createCommand()
        .name('test')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const command = await builder.build();
      expect(command.description).toBe('test command');
    });

    it('should exclude empty arrays from built command', async () => {
      const builder = createCommand()
        .name('test')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const command = await builder.build();
      
      expect(command.aliases).toBeUndefined();
      expect(command.arguments).toBeUndefined();
      expect(command.options).toBeUndefined();
    });

    it('should include setup and cleanup methods in built command', async () => {
      const setup = jest.fn().mockResolvedValue(undefined);
      const teardown = jest.fn().mockResolvedValue(undefined);
      
      const builder = createCommand()
        .name('test')
        .setup(setup)
        .teardown(teardown)
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const command = await builder.build();
      
      expect(typeof command.setup).toBe('function');
      expect(typeof command.cleanup).toBe('function');
      
      await command.setup!();
      await command.cleanup!();
      
      expect(setup).toHaveBeenCalled();
      expect(teardown).toHaveBeenCalled();
    });
  });

  describe('Configuration Options', () => {
    it('should use default configuration', () => {
      const builder = new CommandBuilder();
      expect(builder).toBeDefined();
    });

    it('should merge provided configuration with defaults', () => {
      const builder = new CommandBuilder({
        validateOnBuild: false,
        allowOverrides: true
      });
      expect(builder).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings gracefully', () => {
      const builder = createCommand();
      
      expect(() => builder.name('')).toThrow(ValidationError);
      expect(() => builder.description('')).toThrow(ValidationError);
      expect(() => builder.alias('')).toThrow(ValidationError);
    });

    it('should trim whitespace from inputs', async () => {
      const builder = createCommand()
        .name('  test  ')
        .description('  Test command  ')
        .alias('  t  ')
        .action(async () => ({ success: true, exitCode: 0 }));
      
      const command = await builder.build();
      
      expect(command.name).toBe('test');
      expect(command.description).toBe('Test command');
      expect(command.aliases).toEqual(['t']);
    });

    it('should handle various flag formats', () => {
      const builder = createCommand()
        .name('test')
        .option('--long-flag', 'Long flag')
        .option('-s', 'Short flag')
        .option('bare', 'Bare flag');
      
      expect(builder).toBeDefined();
    });
  });
});

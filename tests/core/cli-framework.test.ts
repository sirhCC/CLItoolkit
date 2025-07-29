import { CliFramework } from '@/core/cli-framework';
import { SimpleCommand, CommandResult } from '@/core/base-implementations';
import { ICommand } from '@/types';

describe('CliFramework', () => {
  let cli: CliFramework;
  let mockCommand: ICommand;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    cli = new CliFramework({
      name: 'test-cli',
      version: '1.0.0',
      description: 'Test CLI framework'
    });

    mockCommand = SimpleCommand.create('test', 'Test command', async () => {
      return CommandResult.success('Command executed');
    });

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create CLI with default config', () => {
      const defaultCli = new CliFramework({});
      const config = defaultCli.getConfig();

      expect(config.name).toBe('cli');
      expect(config.version).toBe('1.0.0');
      expect(config.showHelpWhenEmpty).toBe(true);
      expect(config.exitOnComplete).toBe(true);
    });

    it('should merge provided config with defaults', () => {
      const config = cli.getConfig();

      expect(config.name).toBe('test-cli');
      expect(config.version).toBe('1.0.0');
      expect(config.description).toBe('Test CLI framework');
      expect(config.showHelpWhenEmpty).toBe(true); // Default value
    });
  });

  describe('registerCommand', () => {
    it('should register a command successfully', () => {
      cli.registerCommand(mockCommand);

      expect(cli.hasCommand('test')).toBe(true);
      expect(cli.getCommand('test')).toBe(mockCommand);
    });

    it('should register command aliases', () => {
      mockCommand.aliases = ['t', 'tst'];
      cli.registerCommand(mockCommand);

      expect(cli.hasCommand('t')).toBe(true);
      expect(cli.hasCommand('tst')).toBe(true);
      expect(cli.getCommand('t')).toBe(mockCommand);
      expect(cli.getCommand('tst')).toBe(mockCommand);
    });

    it('should throw error for duplicate command names', () => {
      cli.registerCommand(mockCommand);

      const duplicateCommand = SimpleCommand.create('test', 'Duplicate', async () => CommandResult.success());
      expect(() => cli.registerCommand(duplicateCommand)).toThrow("Command 'test' is already registered");
    });

    it('should throw error for conflicting aliases', () => {
      mockCommand.aliases = ['t'];
      cli.registerCommand(mockCommand);

      const conflictCommand = SimpleCommand.create('other', 'Other command', async () => CommandResult.success());
      conflictCommand.aliases = ['t'];
      expect(() => cli.registerCommand(conflictCommand)).toThrow("Alias 't' conflicts with existing command or alias");
    });

    it('should throw error for command without name', () => {
      const invalidCommand = { ...mockCommand, name: '' };
      expect(() => cli.registerCommand(invalidCommand)).toThrow('Command must have a name');
    });

    it('should call command setup method', () => {
      const setupSpy = jest.fn();
      mockCommand.setup = setupSpy;
      
      cli.registerCommand(mockCommand);
      
      expect(setupSpy).toHaveBeenCalled();
    });
  });

  describe('getCommand', () => {
    beforeEach(() => {
      mockCommand.aliases = ['t'];
      cli.registerCommand(mockCommand);
    });

    it('should get command by name', () => {
      expect(cli.getCommand('test')).toBe(mockCommand);
    });

    it('should get command by alias', () => {
      expect(cli.getCommand('t')).toBe(mockCommand);
    });

    it('should return undefined for non-existent command', () => {
      expect(cli.getCommand('nonexistent')).toBeUndefined();
    });
  });

  describe('getCommands and getVisibleCommands', () => {
    beforeEach(() => {
      const hiddenCommand = SimpleCommand.create('hidden', 'Hidden command', async () => CommandResult.success());
      hiddenCommand.hidden = true;

      cli.registerCommand(mockCommand);
      cli.registerCommand(hiddenCommand);
    });

    it('should return all commands', () => {
      const commands = cli.getCommands();
      expect(commands).toHaveLength(2);
      expect(commands.map(c => c.name)).toContain('test');
      expect(commands.map(c => c.name)).toContain('hidden');
    });

    it('should return only visible commands', () => {
      const visibleCommands = cli.getVisibleCommands();
      expect(visibleCommands).toHaveLength(1);
      expect(visibleCommands[0].name).toBe('test');
    });
  });

  describe('parseArguments', () => {
    it('should parse basic command with arguments', () => {
      const result = cli.parseArguments(['build', 'src', 'dest']);

      expect(result.command).toBe('build');
      expect(result.args).toEqual(['src', 'dest']);
      expect(result.options).toEqual({});
    });

    it('should parse long options', () => {
      const result = cli.parseArguments(['build', '--output', 'dist', '--verbose']);

      expect(result.command).toBe('build');
      expect(result.options.output).toBe('dist');
      expect(result.options.verbose).toBe(true);
    });

    it('should parse long options with equals syntax', () => {
      const result = cli.parseArguments(['build', '--output=dist/build']);

      expect(result.options.output).toBe('dist/build');
    });

    it('should parse short options', () => {
      const result = cli.parseArguments(['build', '-o', 'dist', '-v']);

      expect(result.options.o).toBe('dist');
      expect(result.options.v).toBe(true);
    });

    it('should parse multiple short options', () => {
      const result = cli.parseArguments(['build', '-abc']);

      expect(result.options.a).toBe(true);
      expect(result.options.b).toBe(true);
      expect(result.options.c).toBe(true);
    });

    it('should handle empty arguments', () => {
      const result = cli.parseArguments([]);

      expect(result.command).toBe('');
      expect(result.args).toEqual([]);
      expect(result.options).toEqual({});
    });

    it('should mix positional args and options', () => {
      const result = cli.parseArguments(['copy', 'file1.txt', '--force', 'file2.txt']);

      expect(result.command).toBe('copy');
      expect(result.args).toEqual(['file1.txt', 'file2.txt']);
      expect(result.options.force).toBe(true);
    });
  });

  describe('executeCommand', () => {
    beforeEach(() => {
      cli.registerCommand(mockCommand);
    });

    it('should execute a command successfully', async () => {
      const result = await cli.executeCommand('test', [], {});

      expect(result.success).toBe(true);
      expect(result.data).toBe('Command executed');
    });

    it('should return error for non-existent command', async () => {
      const result = await cli.executeCommand('nonexistent', [], {});

      expect(result.success).toBe(false);
      expect(result.message).toContain("Command 'nonexistent' not found");
    });

    it('should handle command execution errors', async () => {
      const errorCommand = SimpleCommand.create('error', 'Error command', async () => {
        throw new Error('Command failed');
      });
      cli.registerCommand(errorCommand);

      const result = await cli.executeCommand('error', [], {});

      expect(result.success).toBe(false);
      expect(result.message).toBe('Command failed');
    });

    it('should validate command before execution', async () => {
      const validateSpy = jest.fn().mockResolvedValue(true);
      mockCommand.validate = validateSpy;

      await cli.executeCommand('test', ['arg'], { option: 'value' });

      expect(validateSpy).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    beforeEach(() => {
      cli.registerCommand(mockCommand);
      cli.setConfig({ exitOnComplete: false }); // Prevent process.exit in tests
    });

    it('should run command successfully', async () => {
      const result = await cli.run(['test']);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Command executed');
    });

    it('should handle global help flag', async () => {
      const result = await cli.run(['--help']);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('test-cli v1.0.0');
    });

    it('should handle global version flag', async () => {
      const result = await cli.run(['--version']);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('test-cli v1.0.0');
    });

    it('should show help when no arguments and showHelpWhenEmpty is true', async () => {
      const result = await cli.run([]);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('test-cli v1.0.0');
    });

    it('should run default command when specified', async () => {
      cli.setConfig({ defaultCommand: 'test', showHelpWhenEmpty: false });
      const result = await cli.run([]);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Command executed');
    });

    it('should handle runtime errors', async () => {
      const result = await cli.run(['nonexistent']);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Command 'nonexistent' not found");
    });
  });

  describe('showHelp', () => {
    beforeEach(() => {
      cli.registerCommand(mockCommand);
    });

    it('should display help information', () => {
      cli.showHelp();

      expect(consoleSpy).toHaveBeenCalledWith('test-cli v1.0.0');
      expect(consoleSpy).toHaveBeenCalledWith('Test CLI framework');
      expect(consoleSpy).toHaveBeenCalledWith('Commands:');
    });

    it('should display global options', () => {
      cli.showHelp();

      expect(consoleSpy).toHaveBeenCalledWith('Global Options:');
      expect(consoleSpy).toHaveBeenCalledWith('  -h, --help     Show help information');
      expect(consoleSpy).toHaveBeenCalledWith('  -v, --version  Show version information');
    });
  });

  describe('configuration management', () => {
    it('should get configuration', () => {
      const config = cli.getConfig();

      expect(config.name).toBe('test-cli');
      expect(config.version).toBe('1.0.0');
    });

    it('should update configuration', () => {
      cli.setConfig({ strict: true, defaultCommand: 'test' });
      const config = cli.getConfig();

      expect(config.strict).toBe(true);
      expect(config.defaultCommand).toBe('test');
      expect(config.name).toBe('test-cli'); // Should preserve existing values
    });
  });

  describe('command lifecycle management', () => {
    it('should unregister a command', () => {
      cli.registerCommand(mockCommand);
      expect(cli.hasCommand('test')).toBe(true);

      const result = cli.unregisterCommand('test');

      expect(result).toBe(true);
      expect(cli.hasCommand('test')).toBe(false);
    });

    it('should return false when unregistering non-existent command', () => {
      const result = cli.unregisterCommand('nonexistent');

      expect(result).toBe(false);
    });

    it('should call cleanup when unregistering command', () => {
      const cleanupSpy = jest.fn();
      mockCommand.cleanup = cleanupSpy;
      
      cli.registerCommand(mockCommand);
      cli.unregisterCommand('test');

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should clear all commands', () => {
      const cleanupSpy = jest.fn();
      mockCommand.cleanup = cleanupSpy;
      
      cli.registerCommand(mockCommand);
      cli.clear();

      expect(cli.getCommands()).toHaveLength(0);
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});

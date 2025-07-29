/**
 * @fileoverview Tests for CommandRegistry implementation
 */

import { CommandRegistry } from '../../src/core/command-registry';
import { ICommand, ICommandContext, ICommandResult } from '../../src/types/command';
import { ICommandMetadata, CommandFactory } from '../../src/types/registry';
import { ValidationError, CommandExecutionError, ConfigurationError } from '../../src/types/errors';

// Mock command for testing
class MockCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly description: string = `${name} command`,
    public readonly aliases?: string[]
  ) {}

  async execute(context: ICommandContext): Promise<ICommandResult> {
    return {
      success: true,
      exitCode: 0,
      message: `${this.name} executed`,
      data: context.args
    };
  }
}

// Mock command factory
const createMockFactory = (name: string, description?: string, aliases?: string[]): CommandFactory => {
  return () => new MockCommand(name, description, aliases);
};

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('constructor', () => {
    it('should create registry with default config', () => {
      const reg = new CommandRegistry();
      expect(reg).toBeInstanceOf(CommandRegistry);
    });

    it('should create registry with custom config', () => {
      const config = {
        lazyLoading: false,
        cacheCommands: false,
        caseSensitive: true
      };
      const reg = new CommandRegistry(config);
      expect(reg).toBeInstanceOf(CommandRegistry);
    });
  });

  describe('register', () => {
    it('should register a simple command', async () => {
      const factory = createMockFactory('test');
      await registry.register('test', factory);

      const exists = await registry.exists('test');
      expect(exists).toBe(true);
    });

    it('should register a hierarchical command', async () => {
      const factory = createMockFactory('add');
      await registry.register(['git', 'remote', 'add'], factory);

      const exists = await registry.exists(['git', 'remote', 'add']);
      expect(exists).toBe(true);
    });

    it('should register command with metadata', async () => {
      const factory = createMockFactory('test');
      const metadata: Partial<ICommandMetadata> = {
        description: 'Test command',
        category: 'testing',
        tags: ['test', 'mock'],
        aliases: ['t']
      };
      
      await registry.register('test', factory, metadata);
      
      const commandMetadata = await registry.getMetadata('test');
      expect(commandMetadata).toMatchObject(metadata);
      expect(commandMetadata?.name).toBe('test');
    });

    it('should throw error when registering duplicate command', async () => {
      const factory = createMockFactory('test');
      await registry.register('test', factory);

      await expect(registry.register('test', factory))
        .rejects.toThrow(ConfigurationError);
    });

    it('should allow overwrite when configured', async () => {
      const regWithOverwrite = new CommandRegistry({ allowOverwrites: true });
      const factory1 = createMockFactory('test');
      const factory2 = createMockFactory('test');

      await regWithOverwrite.register('test', factory1, { description: 'First test' });
      await regWithOverwrite.register('test', factory2, { description: 'Second test' });

      const metadata = await regWithOverwrite.getMetadata('test');
      expect(metadata?.description).toBe('Second test');
    });

    it('should validate metadata when enabled', async () => {
      const factory = createMockFactory('test');
      const invalidMetadata = { name: '', description: 'Test' };

      await expect(registry.register('test', factory, invalidMetadata))
        .rejects.toThrow(ValidationError);
    });

    it('should handle string path input', async () => {
      const factory = createMockFactory('add');
      await registry.register('git remote add', factory);

      const exists = await registry.exists(['git', 'remote', 'add']);
      expect(exists).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister existing command', async () => {
      const factory = createMockFactory('test');
      await registry.register('test', factory);

      const result = await registry.unregister('test');
      expect(result).toBe(true);

      const exists = await registry.exists('test');
      expect(exists).toBe(false);
    });

    it('should return false for non-existent command', async () => {
      const result = await registry.unregister('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('find', () => {
    beforeEach(async () => {
      await registry.register('test', createMockFactory('test'));
      await registry.register(['git', 'remote', 'add'], createMockFactory('add'));
    });

    it('should find simple command', async () => {
      const result = await registry.find('test');
      expect(result).toBeTruthy();
      expect(result?.matchedPath).toEqual(['test']);
      expect(result?.remainingArgs).toEqual([]);
    });

    it('should find hierarchical command', async () => {
      const result = await registry.find(['git', 'remote', 'add']);
      expect(result).toBeTruthy();
      expect(result?.matchedPath).toEqual(['git', 'remote', 'add']);
    });

    it('should return null for non-existent command', async () => {
      const result = await registry.find('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('resolve', () => {
    beforeEach(async () => {
      await registry.register('test', createMockFactory('test'), { 
        description: 'Test command', 
        aliases: ['t'] 
      });
      await registry.register(['git', 'remote', 'add'], createMockFactory('add'));
      await registry.register(['git', 'remote'], createMockFactory('remote'));
    });

    it('should resolve simple command', async () => {
      const result = await registry.resolve(['test', 'arg1', 'arg2']);
      expect(result).toBeTruthy();
      expect(result?.matchedPath).toEqual(['test']);
      expect(result?.remainingArgs).toEqual(['arg1', 'arg2']);
    });

    it('should resolve hierarchical command (longest match)', async () => {
      const result = await registry.resolve(['git', 'remote', 'add', 'origin', 'url']);
      expect(result).toBeTruthy();
      expect(result?.matchedPath).toEqual(['git', 'remote', 'add']);
      expect(result?.remainingArgs).toEqual(['origin', 'url']);
    });

    it('should resolve partial hierarchical command', async () => {
      const result = await registry.resolve(['git', 'remote', 'list']);
      expect(result).toBeTruthy();
      expect(result?.matchedPath).toEqual(['git', 'remote']);
      expect(result?.remainingArgs).toEqual(['list']);
    });

    it('should resolve command by alias', async () => {
      const result = await registry.resolve(['t', 'arg1']);
      expect(result).toBeTruthy();
      expect(result?.matchedPath).toEqual(['t']);
      expect(result?.remainingArgs).toEqual(['arg1']);
    });

    it('should return null for no match', async () => {
      const result = await registry.resolve(['nonexistent']);
      expect(result).toBeNull();
    });

    it('should handle empty args', async () => {
      const result = await registry.resolve([]);
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return empty array for empty registry', async () => {
      const commands = await registry.getAll();
      expect(commands).toEqual([]);
    });

    it('should return all registered commands', async () => {
      await registry.register('test1', createMockFactory('test1'));
      await registry.register('test2', createMockFactory('test2'));

      const commands = await registry.getAll();
      expect(commands).toHaveLength(2);
      expect(commands.map(c => c.metadata.name)).toContain('test1');
      expect(commands.map(c => c.metadata.name)).toContain('test2');
    });
  });

  describe('getByCategory', () => {
    beforeEach(async () => {
      await registry.register('test1', createMockFactory('test1'), { category: 'testing' });
      await registry.register('test2', createMockFactory('test2'), { category: 'testing' });
      await registry.register('build', createMockFactory('build'), { category: 'build' });
    });

    it('should return commands by category', async () => {
      const testCommands = await registry.getByCategory('testing');
      expect(testCommands).toHaveLength(2);
      expect(testCommands.map(c => c.metadata.name)).toEqual(expect.arrayContaining(['test1', 'test2']));
    });

    it('should return empty array for non-existent category', async () => {
      const commands = await registry.getByCategory('nonexistent');
      expect(commands).toEqual([]);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await registry.register('test', createMockFactory('test'), {
        description: 'Test command',
        tags: ['testing', 'mock'],
        aliases: ['t']
      });
      await registry.register('build', createMockFactory('build'), {
        description: 'Build the project',
        tags: ['build', 'compile']
      });
    });

    it('should search by name', async () => {
      const results = await registry.search('test');
      expect(results).toHaveLength(1);
      expect(results[0].metadata.name).toBe('test');
    });

    it('should search by description', async () => {
      const results = await registry.search('project');
      expect(results).toHaveLength(1);
      expect(results[0].metadata.name).toBe('build');
    });

    it('should search by tags', async () => {
      const results = await registry.search('testing');
      expect(results).toHaveLength(1);
      expect(results[0].metadata.name).toBe('test');
    });

    it('should search by aliases', async () => {
      // Search for 'ta' which should only match the 't' alias, not the word "test"
      const results = await registry.search('ta');
      expect(results).toHaveLength(0); // 'ta' shouldn't match anything
      
      // Search for exact alias
      const aliasResults = await registry.search('t');
      const testCommand = aliasResults.find(r => r.metadata.name === 'test');
      expect(testCommand).toBeTruthy();
      expect(testCommand?.metadata.aliases).toContain('t');
    });

    it('should be case insensitive by default', async () => {
      const results = await registry.search('TEST');
      expect(results).toHaveLength(1);
      expect(results[0].metadata.name).toBe('test');
    });

    it('should respect case sensitivity when configured', async () => {
      const caseSensitiveRegistry = new CommandRegistry({ caseSensitive: true });
      await caseSensitiveRegistry.register('test', createMockFactory('test', 'Test command'));

      const results = await caseSensitiveRegistry.search('TEST');
      expect(results).toHaveLength(0);
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await registry.register('test', createMockFactory('test'));
    });

    it('should return true for existing command', async () => {
      const exists = await registry.exists('test');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent command', async () => {
      const exists = await registry.exists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('getMetadata', () => {
    beforeEach(async () => {
      const metadata = {
        description: 'Test command',
        category: 'testing',
        tags: ['test']
      };
      await registry.register('test', createMockFactory('test'), metadata);
    });

    it('should return metadata for existing command', async () => {
      const metadata = await registry.getMetadata('test');
      expect(metadata).toBeTruthy();
      expect(metadata?.name).toBe('test');
      expect(metadata?.description).toBe('Test command');
      expect(metadata?.category).toBe('testing');
    });

    it('should return null for non-existent command', async () => {
      const metadata = await registry.getMetadata('nonexistent');
      expect(metadata).toBeNull();
    });
  });

  describe('load', () => {
    it('should load command instance', async () => {
      const factory = createMockFactory('test');
      await registry.register('test', factory);

      const command = await registry.load('test');
      expect(command).toBeInstanceOf(MockCommand);
      expect(command?.name).toBe('test');
    });

    it('should cache loaded command by default', async () => {
      const factory = jest.fn(createMockFactory('test'));
      await registry.register('test', factory);

      const command1 = await registry.load('test');
      const command2 = await registry.load('test');

      expect(command1).toBe(command2); // Same instance
      expect(factory).toHaveBeenCalledTimes(1); // Factory called only once
    });

    it('should not cache when disabled', async () => {
      const noCacheRegistry = new CommandRegistry({ cacheCommands: false });
      const factory = jest.fn(createMockFactory('test'));
      await noCacheRegistry.register('test', factory);

      const command1 = await noCacheRegistry.load('test');
      const command2 = await noCacheRegistry.load('test');

      expect(command1).not.toBe(command2); // Different instances
      expect(factory).toHaveBeenCalledTimes(2); // Factory called twice
    });

    it('should handle async factory', async () => {
      const asyncFactory: CommandFactory = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return new MockCommand('async-test');
      };
      await registry.register('async-test', asyncFactory);

      const command = await registry.load('async-test');
      expect(command?.name).toBe('async-test');
    });

    it('should throw error for failed loading', async () => {
      const failingFactory: CommandFactory = () => {
        throw new Error('Factory failed');
      };
      await registry.register('failing', failingFactory);

      await expect(registry.load('failing'))
        .rejects.toThrow(CommandExecutionError);
    });

    it('should return null for non-existent command', async () => {
      const command = await registry.load('nonexistent');
      expect(command).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all registrations', async () => {
      await registry.register('test1', createMockFactory('test1'));
      await registry.register('test2', createMockFactory('test2'));

      await registry.clear();

      const commands = await registry.getAll();
      expect(commands).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await registry.register('test1', createMockFactory('test1'), { category: 'testing' });
      await registry.register('test2', createMockFactory('test2'), { category: 'testing' });
      await registry.register('build', createMockFactory('build'), { category: 'build' });
      
      // Load one command
      await registry.load('test1');
    });

    it('should return correct statistics', async () => {
      const stats = await registry.getStats();
      
      expect(stats.totalCommands).toBe(3);
      expect(stats.loadedCommands).toBe(1);
      expect(stats.categories).toEqual({
        testing: 2,
        build: 1
      });
    });

    it('should handle uncategorized commands', async () => {
      await registry.register('uncategorized', createMockFactory('uncategorized'));
      
      const stats = await registry.getStats();
      expect(stats.categories.uncategorized).toBe(1);
    });
  });

  describe('case sensitivity', () => {
    it('should handle case insensitive matching by default', async () => {
      await registry.register('Test', createMockFactory('Test'));

      const existsLower = await registry.exists('test');
      const existsUpper = await registry.exists('TEST');
      
      expect(existsLower).toBe(true);
      expect(existsUpper).toBe(true);
    });

    it('should handle case sensitive matching when configured', async () => {
      const caseSensitiveRegistry = new CommandRegistry({ caseSensitive: true });
      await caseSensitiveRegistry.register('Test', createMockFactory('Test'));

      const existsExact = await caseSensitiveRegistry.exists('Test');
      const existsLower = await caseSensitiveRegistry.exists('test');
      
      expect(existsExact).toBe(true);
      expect(existsLower).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should evict oldest cache when max size exceeded', async () => {
      const smallCacheRegistry = new CommandRegistry({ maxCacheSize: 2 });
      
      // Register and load 3 commands
      await smallCacheRegistry.register('cmd1', createMockFactory('cmd1'));
      await smallCacheRegistry.register('cmd2', createMockFactory('cmd2'));
      await smallCacheRegistry.register('cmd3', createMockFactory('cmd3'));
      
      await smallCacheRegistry.load('cmd1');
      await smallCacheRegistry.load('cmd2');
      await smallCacheRegistry.load('cmd3'); // Should trigger eviction
      
      const stats = await smallCacheRegistry.getStats();
      expect(stats.loadedCommands).toBeLessThanOrEqual(2);
    });
  });
});

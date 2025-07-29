import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { z } from 'zod';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import {
  ConfigurationManager,
  ConfigurationSource,
  CliArgumentsProvider,
  EnvironmentVariablesProvider,
  ConfigFileProvider,
  DefaultsProvider
} from '../src/core/configuration-manager';

describe('ConfigurationManager', () => {
  let manager: ConfigurationManager;
  let tempConfigFile: string;

  beforeEach(() => {
    manager = new ConfigurationManager();
    tempConfigFile = join(__dirname, 'temp-config.json');
  });

  afterEach(() => {
    if (existsSync(tempConfigFile)) {
      unlinkSync(tempConfigFile);
    }
  });

  describe('Provider Registration', () => {
    it('should add providers and sort by priority', async () => {
      const cliProvider = new CliArgumentsProvider({ test: 'cli' });
      const envProvider = new EnvironmentVariablesProvider('TEST_');
      
      manager.addProvider(cliProvider);
      manager.addProvider(envProvider);
      
      await manager.load();
      
      // CLI provider should have higher priority
      expect(cliProvider.priority).toBeGreaterThan(envProvider.priority);
    });

    it('should register schemas with default values', () => {
      const schema = {
        schema: z.string(),
        defaultValue: 'default-value',
        description: 'Test configuration'
      };

      manager.registerSchema('test.key', schema);
      
      // Should not throw
      expect(() => manager.registerSchema('test.key', schema)).not.toThrow();
    });
  });

  describe('CLI Arguments Provider', () => {
    it('should provide CLI argument values', async () => {
      const provider = new CliArgumentsProvider({
        verbose: true,
        output: 'json',
        count: 42
      });

      await provider.load();

      expect(provider.get('verbose')).toBe(true);
      expect(provider.get('output')).toBe('json');
      expect(provider.get('count')).toBe(42);
      expect(provider.has('verbose')).toBe(true);
      expect(provider.has('nonexistent')).toBe(false);
    });

    it('should allow setting values dynamically', async () => {
      const provider = new CliArgumentsProvider();
      
      provider.setValue('dynamic', 'value');
      await provider.load();
      
      expect(provider.get('dynamic')).toBe('value');
    });
  });

  describe('Environment Variables Provider', () => {
    it('should transform environment variable names', async () => {
      const mockEnv = {
        'CLI_TOOL_VERBOSE': 'true',
        'CLI_TOOL_OUTPUT_FORMAT': 'json',
        'CLI_TOOL_MAX_RETRIES': '5',
        'OTHER_VAR': 'ignored'
      };

      const provider = new EnvironmentVariablesProvider('CLI_TOOL_', mockEnv);
      await provider.load();

      expect(provider.get('verbose')).toBe(true);
      expect(provider.get('outputFormat')).toBe('json');
      expect(provider.get('maxRetries')).toBe(5);
      expect(provider.has('verbose')).toBe(true);
      expect(provider.has('otherVar')).toBe(false);
    });

    it('should parse different value types', async () => {
      const mockEnv = {
        'BOOL_TRUE': 'true',
        'BOOL_FALSE': 'false',
        'NUMBER_INT': '42',
        'NUMBER_FLOAT': '3.14',
        'JSON_ARRAY': '[1,2,3]',
        'JSON_OBJECT': '{"key":"value"}',
        'STRING': 'plain text'
      };

      const provider = new EnvironmentVariablesProvider('', mockEnv);
      await provider.load();

      expect(provider.get('boolTrue')).toBe(true);
      expect(provider.get('boolFalse')).toBe(false);
      expect(provider.get('numberInt')).toBe(42);
      expect(provider.get('numberFloat')).toBe(3.14);
      expect(provider.get('jsonArray')).toEqual([1, 2, 3]);
      expect(provider.get('jsonObject')).toEqual({ key: 'value' });
      expect(provider.get('string')).toBe('plain text');
    });

    it('should track original environment variable names', async () => {
      const mockEnv = {
        'APP_DEBUG_MODE': 'true'
      };

      const provider = new EnvironmentVariablesProvider('APP_', mockEnv);
      await provider.load();

      expect(provider.getOriginalKey('debugMode')).toBe('APP_DEBUG_MODE');
    });
  });

  describe('Config File Provider', () => {
    it('should load JSON configuration files', async () => {
      const config = {
        server: {
          port: 3000,
          host: 'localhost'
        },
        debug: true
      };

      writeFileSync(tempConfigFile, JSON.stringify(config, null, 2));
      
      const provider = new ConfigFileProvider(tempConfigFile);
      await provider.load();

      expect(provider.get('debug')).toBe(true);
      expect(provider.get('server.port')).toBe(3000);
      expect(provider.get('server.host')).toBe('localhost');
    });

    it('should handle nested object access', async () => {
      const config = {
        database: {
          connection: {
            host: 'db.example.com',
            port: 5432
          }
        }
      };

      writeFileSync(tempConfigFile, JSON.stringify(config));
      
      const provider = new ConfigFileProvider(tempConfigFile);
      await provider.load();

      expect(provider.get('database.connection.host')).toBe('db.example.com');
      expect(provider.get('database.connection.port')).toBe(5432);
      expect(provider.has('database.connection.host')).toBe(true);
      expect(provider.has('database.connection.invalid')).toBe(false);
    });

    it('should handle missing files gracefully', async () => {
      const provider = new ConfigFileProvider('/path/that/does/not/exist.json');
      
      await expect(provider.load()).resolves.not.toThrow();
      expect(provider.has('anything')).toBe(false);
    });

    it('should throw on invalid JSON', async () => {
      writeFileSync(tempConfigFile, '{ invalid json }');
      
      const provider = new ConfigFileProvider(tempConfigFile);
      
      await expect(provider.load()).rejects.toThrow('Failed to load configuration file');
    });
  });

  describe('Defaults Provider', () => {
    it('should provide default values', async () => {
      const defaults = {
        timeout: 30000,
        retries: 3,
        verbose: false
      };

      const provider = new DefaultsProvider(defaults);
      await provider.load();

      expect(provider.get('timeout')).toBe(30000);
      expect(provider.get('retries')).toBe(3);
      expect(provider.get('verbose')).toBe(false);
    });

    it('should allow setting defaults dynamically', () => {
      const provider = new DefaultsProvider();
      
      provider.setDefault('newDefault', 'value');
      
      expect(provider.get('newDefault')).toBe('value');
    });
  });

  describe('Configuration Manager Integration', () => {
    it('should respect configuration precedence', async () => {
      // Setup: defaults < config file < env vars < cli args
      const defaults = { setting: 'default' };
      const configData = { setting: 'config-file' };
      const envVars = { 'SETTING': 'environment' };
      const cliArgs = { setting: 'cli-argument' };

      writeFileSync(tempConfigFile, JSON.stringify(configData));

      manager.addProvider(new DefaultsProvider(defaults));
      manager.addProvider(new ConfigFileProvider(tempConfigFile));
      manager.addProvider(new EnvironmentVariablesProvider('', envVars));
      manager.addProvider(new CliArgumentsProvider(cliArgs));

      await manager.load();

      // CLI args should win
      expect(manager.get('setting')).toBe('cli-argument');
    });

    it('should validate configuration with schemas', async () => {
      const schema = {
        schema: z.number().min(1).max(100),
        defaultValue: 10
      };

      manager.registerSchema('port', schema);
      manager.addProvider(new CliArgumentsProvider({ port: 80 })); // Valid port
      
      await manager.load();

      expect(manager.get('port')).toBe(80);
    });

    it('should throw on schema validation failure', async () => {
      const schema = {
        schema: z.number().min(1).max(100)
      };

      manager.registerSchema('port', schema);
      manager.addProvider(new CliArgumentsProvider({ port: 'invalid' }));
      
      await manager.load();

      expect(() => manager.get('port')).toThrow('Configuration validation failed');
    });

    it('should provide configuration metadata', async () => {
      manager.addProvider(new CliArgumentsProvider({ test: 'value' }));
      await manager.load();

      const metadata = manager.getWithMetadata('test');
      
      expect(metadata).toBeDefined();
      expect(metadata!.value).toBe('value');
      expect(metadata!.source).toBe(ConfigurationSource.CliArguments);
      expect(metadata!.key).toBe('test');
    });

    it('should provide configuration summary', async () => {
      manager.addProvider(new CliArgumentsProvider({ cli: 'value1' }));
      manager.addProvider(new DefaultsProvider({ default: 'value2' }));
      
      await manager.load();
      
      // Access values to populate cache
      manager.get('cli');
      manager.get('default');
      
      const summary = manager.getSummary();
      
      expect(Object.keys(summary)).toContain('cli');
      expect(Object.keys(summary)).toContain('default');
      expect(summary.cli.source).toBe(ConfigurationSource.CliArguments);
      expect(summary.default.source).toBe(ConfigurationSource.Defaults);
    });

    it('should invalidate cache when providers are added', async () => {
      manager.addProvider(new DefaultsProvider({ test: 'initial' }));
      await manager.load();
      
      expect(manager.get('test')).toBe('initial');
      
      // Add higher priority provider
      manager.addProvider(new CliArgumentsProvider({ test: 'updated' }));
      await manager.load();
      
      expect(manager.get('test')).toBe('updated');
    });

    it('should throw when accessing configuration before loading', () => {
      expect(() => manager.get('anything')).toThrow('Configuration not loaded');
      expect(() => manager.has('anything')).toThrow('Configuration not loaded');
      expect(() => manager.getKeys()).toThrow('Configuration not loaded');
      expect(() => manager.getSummary()).toThrow('Configuration not loaded');
    });
  });

  describe('Configuration Manager Factory', () => {
    afterEach(() => {
      // Clean up any test config files
      const testFiles = [
        join(__dirname, 'test-config.json'),
        join(__dirname, 'test-config.yaml'),
        join(__dirname, 'test-config.toml')
      ];
      
      testFiles.forEach(file => {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      });
    });

    it('should create manager with all providers', async () => {
      const configPath = join(__dirname, 'test-config.json');
      writeFileSync(configPath, JSON.stringify({ fromFile: 'file-value' }));

      const mockEnv = { 'TEST_FROM_ENV': 'env-value' };
      
      // Mock process.env for this test
      const originalEnv = process.env;
      process.env = { ...originalEnv, ...mockEnv };

      try {
        const manager = await ConfigurationManager.create({
          configFilePath: configPath,
          envPrefix: 'TEST_',
          cliArgs: { fromCli: 'cli-value' }
        });

        expect(manager.get('fromFile')).toBe('file-value');
        expect(manager.get('fromEnv')).toBe('env-value');
        expect(manager.get('fromCli')).toBe('cli-value');
      } finally {
        process.env = originalEnv;
      }
    });

    it('should work with minimal options', async () => {
      const manager = await ConfigurationManager.create();
      
      expect(manager).toBeInstanceOf(ConfigurationManager);
      expect(() => manager.get('anything')).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined values gracefully', async () => {
      const provider = new CliArgumentsProvider({ defined: 'value' });
      await provider.load();

      expect(provider.get('undefined')).toBeUndefined();
      expect(provider.has('undefined')).toBe(false);
    });

    it('should handle empty configuration files', async () => {
      writeFileSync(tempConfigFile, '{}');
      
      const provider = new ConfigFileProvider(tempConfigFile);
      await provider.load();

      expect(provider.has('anything')).toBe(false);
    });

    it('should handle complex nested paths', async () => {
      const config = {
        deep: {
          nested: {
            object: {
              value: 'found'
            }
          }
        }
      };

      writeFileSync(tempConfigFile, JSON.stringify(config));
      
      const provider = new ConfigFileProvider(tempConfigFile);
      await provider.load();

      expect(provider.get('deep.nested.object.value')).toBe('found');
      expect(provider.get('deep.nested.object.missing')).toBeUndefined();
      expect(provider.get('deep.missing.path')).toBeUndefined();
    });

    it('should handle environment variables with undefined values', async () => {
      const mockEnv = {
        'DEFINED': 'value',
        'UNDEFINED': undefined
      };

      const provider = new EnvironmentVariablesProvider('', mockEnv);
      await provider.load();

      expect(provider.has('defined')).toBe(true);
      expect(provider.has('undefined')).toBe(false);
    });
  });
});

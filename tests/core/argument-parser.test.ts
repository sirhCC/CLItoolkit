/**
 * @fileoverview Tests for the enhanced argument parser with validation
 */

import { ArgumentParser } from '../../src/core/argument-parser';
import { ArgumentType } from '../../src/types/validation';
import { z } from 'zod';

describe('ArgumentParser', () => {
  let parser: ArgumentParser;

  beforeEach(() => {
    parser = new ArgumentParser();
  });

  describe('Basic Option Parsing', () => {
    beforeEach(() => {
      parser.addOption({
        name: 'output',
        alias: 'o',
        description: 'Output file',
        type: ArgumentType.STRING,
        required: false,
      });

      parser.addOption({
        name: 'verbose',
        alias: 'v',
        description: 'Verbose output',
        type: ArgumentType.BOOLEAN,
        required: false,
        flag: true,
      });

      parser.addOption({
        name: 'count',
        alias: 'c',
        description: 'Number of items',
        type: ArgumentType.NUMBER,
        required: false,
        coerce: true,
      });
    });

    it('should parse long options with values', async () => {
      const result = await parser.parse(['--output', 'file.txt']);
      
      expect(result.options.output).toBe('file.txt');
      expect(result.validation.success).toBe(true);
    });

    it('should parse long options with equals syntax', async () => {
      const result = await parser.parse(['--output=file.txt']);
      
      expect(result.options.output).toBe('file.txt');
      expect(result.validation.success).toBe(true);
    });

    it('should parse short options', async () => {
      const result = await parser.parse(['-o', 'file.txt']);
      
      expect(result.options.output).toBe('file.txt');
      expect(result.validation.success).toBe(true);
    });

    it('should parse boolean flags', async () => {
      const result = await parser.parse(['--verbose']);
      
      expect(result.options.verbose).toBe(true);
      expect(result.validation.success).toBe(true);
    });

    it('should parse short boolean flags', async () => {
      const result = await parser.parse(['-v']);
      
      expect(result.options.verbose).toBe(true);
      expect(result.validation.success).toBe(true);
    });

    it('should parse combined short options', async () => {
      const result = await parser.parse(['-vo', 'file.txt']);
      
      expect(result.options.verbose).toBe(true);
      expect(result.options.output).toBe('file.txt');
      expect(result.validation.success).toBe(true);
    });

    it('should coerce number types', async () => {
      const result = await parser.parse(['--count', '42']);
      
      expect(result.options.count).toBe(42);
      expect(typeof result.options.count).toBe('number');
      expect(result.validation.success).toBe(true);
    });
  });

  describe('Positional Arguments', () => {
    beforeEach(() => {
      parser.addArgument({
        name: 'input',
        description: 'Input file',
        type: ArgumentType.STRING,
        required: true,
      });

      parser.addArgument({
        name: 'output',
        description: 'Output file',
        type: ArgumentType.STRING,
        required: false,
        defaultValue: 'output.txt',
      });
    });

    it('should parse required positional arguments', async () => {
      const result = await parser.parse(['input.txt']);
      
      expect(result.arguments.input).toBe('input.txt');
      expect(result.arguments.output).toBe('output.txt'); // default value
      expect(result.validation.success).toBe(true);
    });

    it('should parse multiple positional arguments', async () => {
      const result = await parser.parse(['input.txt', 'custom-output.txt']);
      
      expect(result.arguments.input).toBe('input.txt');
      expect(result.arguments.output).toBe('custom-output.txt');
      expect(result.validation.success).toBe(true);
    });

    it('should fail when required argument is missing', async () => {
      const result = await parser.parse([]);
      
      expect(result.validation.success).toBe(false);
      expect(result.validation.errors).toHaveLength(1);
      expect(result.validation.errors[0].code).toBe('required');
      expect(result.validation.errors[0].path).toEqual(['input']);
    });
  });

  describe('Multiple Value Arguments', () => {
    beforeEach(() => {
      parser.addOption({
        name: 'include',
        alias: 'I',
        description: 'Include directories',
        type: ArgumentType.ARRAY,
        required: false,
        multiple: true,
      });

      parser.addArgument({
        name: 'files',
        description: 'Input files',
        type: ArgumentType.ARRAY,
        required: true,
        multiple: true,
      });
    });

    it('should handle multiple option values', async () => {
      const result = await parser.parse(['-I', 'dir1', '-I', 'dir2', 'file1.txt', 'file2.txt']);
      
      expect(result.options.include).toEqual(['dir1', 'dir2']);
      expect(result.arguments.files).toEqual(['file1.txt', 'file2.txt']);
      expect(result.validation.success).toBe(true);
    });
  });

  describe('Type Validation', () => {
    beforeEach(() => {
      parser.addOption({
        name: 'port',
        description: 'Port number',
        type: ArgumentType.NUMBER,
        required: false,
        min: 1,
        max: 65535,
        coerce: true,
      });

      parser.addOption({
        name: 'email',
        description: 'Email address',
        type: ArgumentType.EMAIL,
        required: false,
      });

      parser.addOption({
        name: 'url',
        description: 'Website URL',
        type: ArgumentType.URL,
        required: false,
      });

      parser.addOption({
        name: 'format',
        description: 'Output format',
        type: ArgumentType.ENUM,
        required: false,
        choices: ['json', 'xml', 'yaml'],
      });
    });

    it('should validate number ranges', async () => {
      const result = await parser.parse(['--port', '80']);
      
      expect(result.options.port).toBe(80);
      expect(result.validation.success).toBe(true);
    });

    it('should reject numbers out of range', async () => {
      const result = await parser.parse(['--port', '70000']);
      
      expect(result.validation.success).toBe(false);
      expect(result.validation.errors).toHaveLength(1);
      expect(result.validation.errors[0].code).toBe('too_big');
    });

    it('should validate email format', async () => {
      const validResult = await parser.parse(['--email', 'test@example.com']);
      expect(validResult.validation.success).toBe(true);

      const invalidResult = await parser.parse(['--email', 'invalid-email']);
      expect(invalidResult.validation.success).toBe(false);
      expect(invalidResult.validation.errors[0].code).toBe('invalid_email');
    });

    it('should validate URL format', async () => {
      const validResult = await parser.parse(['--url', 'https://example.com']);
      expect(validResult.validation.success).toBe(true);

      const invalidResult = await parser.parse(['--url', 'not-a-url']);
      expect(invalidResult.validation.success).toBe(false);
      expect(invalidResult.validation.errors[0].code).toBe('invalid_url');
    });

    it('should validate enum choices', async () => {
      const validResult = await parser.parse(['--format', 'json']);
      expect(validResult.validation.success).toBe(true);

      const invalidResult = await parser.parse(['--format', 'invalid']);
      expect(invalidResult.validation.success).toBe(false);
      expect(invalidResult.validation.errors[0].code).toBe('invalid_enum_value');
    });
  });

  describe('Schema Validation with Zod', () => {
    beforeEach(() => {
      parser.addOption({
        name: 'config',
        description: 'Configuration object',
        type: ArgumentType.JSON,
        required: false,
        schema: z.object({
          name: z.string(),
          version: z.string(),
          port: z.number().min(1).max(65535),
        }),
      });
    });

    it('should validate with Zod schema', async () => {
      const configJson = JSON.stringify({ name: 'test', version: '1.0.0', port: 3000 });
      const result = await parser.parse(['--config', configJson]);
      
      expect(result.validation.success).toBe(true);
      expect(result.options.config.name).toBe('test');
    });

    it('should reject invalid schema', async () => {
      const configJson = JSON.stringify({ name: 'test' }); // missing required fields
      const result = await parser.parse(['--config', configJson]);
      
      expect(result.validation.success).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Validation', () => {
    beforeEach(() => {
      parser.addOption({
        name: 'custom',
        description: 'Custom validated option',
        type: ArgumentType.STRING,
        required: false,
        validator: async (value, context) => {
          if (value === 'forbidden') {
            return {
              success: false,
              data: value,
              errors: [{
                path: context.path,
                message: 'Value "forbidden" is not allowed',
                code: 'custom_validation_failed',
                received: value,
              }],
              warnings: [],
            };
          }
          
          return {
            success: true,
            data: value,
            errors: [],
            warnings: value === 'warning' ? ['This value triggers a warning'] : [],
          };
        },
      });
    });

    it('should pass custom validation', async () => {
      const result = await parser.parse(['--custom', 'allowed']);
      
      expect(result.validation.success).toBe(true);
      expect(result.options.custom).toBe('allowed');
    });

    it('should fail custom validation', async () => {
      const result = await parser.parse(['--custom', 'forbidden']);
      
      expect(result.validation.success).toBe(false);
      expect(result.validation.errors[0].code).toBe('custom_validation_failed');
    });

    it('should capture validation warnings', async () => {
      const result = await parser.parse(['--custom', 'warning']);
      
      expect(result.validation.success).toBe(true);
      expect(result.validation.warnings).toContain('This value triggers a warning');
    });
  });

  describe('Environment Variable Integration', () => {
    beforeEach(() => {
      parser.addOption({
        name: 'apiKey',
        description: 'API key',
        type: ArgumentType.STRING,
        required: false,
        envVar: 'API_KEY',
      });
    });

    it('should read from environment variable', async () => {
      process.env.API_KEY = 'test-key';
      
      const result = await parser.parse([]);
      
      expect(result.options.apiKey).toBe('test-key');
      expect(result.validation.success).toBe(true);
      
      delete process.env.API_KEY;
    });

    it('should prefer command line over environment', async () => {
      process.env.API_KEY = 'env-key';
      
      const result = await parser.parse(['--apiKey', 'cli-key']);
      
      expect(result.options.apiKey).toBe('cli-key');
      expect(result.validation.success).toBe(true);
      
      delete process.env.API_KEY;
    });
  });

  describe('Option Constraints', () => {
    beforeEach(() => {
      parser.addOption({
        name: 'format',
        description: 'Output format',
        type: ArgumentType.STRING,
        required: false,
        conflicts: ['raw'],
      });

      parser.addOption({
        name: 'raw',
        description: 'Raw output',
        type: ArgumentType.BOOLEAN,
        required: false,
        flag: true,
      });

      parser.addOption({
        name: 'output',
        description: 'Output file',
        type: ArgumentType.STRING,
        required: false,
        requires: ['format'],
      });
    });

    it('should detect option conflicts', async () => {
      const result = await parser.parse(['--format', 'json', '--raw']);
      
      expect(result.validation.success).toBe(false);
      expect(result.validation.errors.some(err => err.code === 'option_conflict')).toBe(true);
    });

    it('should detect missing requirements', async () => {
      const result = await parser.parse(['--output', 'file.txt']);
      
      expect(result.validation.success).toBe(false);
      expect(result.validation.errors.some(err => err.code === 'option_requirement')).toBe(true);
    });
  });

  describe('Subcommands', () => {
    beforeEach(() => {
      parser.addSubcommand({
        name: 'build',
        description: 'Build the project',
        arguments: [
          {
            name: 'target',
            description: 'Build target',
            type: ArgumentType.STRING,
            required: true,
          },
        ],
        options: [
          {
            name: 'watch',
            alias: 'w',
            description: 'Watch for changes',
            type: ArgumentType.BOOLEAN,
            required: false,
            flag: true,
          },
        ],
      });

      parser.addSubcommand({
        name: 'test',
        aliases: ['t'],
        description: 'Run tests',
        options: [
          {
            name: 'coverage',
            description: 'Generate coverage report',
            type: ArgumentType.BOOLEAN,
            required: false,
            flag: true,
          },
        ],
      });
    });

    it('should parse subcommand with arguments', async () => {
      const result = await parser.parse(['build', 'production', '--watch']);
      
      expect(result.command).toBe('build');
      expect(result.subcommand).toBe('build');
      expect(result.arguments.target).toBe('production');
      expect(result.options.watch).toBe(true);
      expect(result.validation.success).toBe(true);
    });

    it('should parse subcommand aliases', async () => {
      const result = await parser.parse(['t', '--coverage']);
      
      expect(result.command).toBe('t');
      expect(result.subcommand).toBe('t');
      expect(result.options.coverage).toBe(true);
      expect(result.validation.success).toBe(true);
    });
  });

  describe('Help and Version', () => {
    it('should detect help flag', async () => {
      const result = await parser.parse(['--help']);
      
      expect(result.help).toBe(true);
      expect(result.validation.success).toBe(true);
    });

    it('should detect short help flag', async () => {
      const result = await parser.parse(['-h']);
      
      expect(result.help).toBe(true);
      expect(result.validation.success).toBe(true);
    });

    it('should detect version flag when enabled', async () => {
      const versionParser = new ArgumentParser({ addVersion: true });
      const result = await versionParser.parse(['--version']);
      
      expect(result.version).toBe(true);
      expect(result.validation.success).toBe(true);
    });
  });

  describe('Parsing Modes', () => {
    it('should handle strict mode (default)', async () => {
      const strictParser = new ArgumentParser({ mode: 'strict' });
      const result = await strictParser.parse(['--unknown', 'value']);
      
      expect(result.validation.success).toBe(false);
      expect(result.validation.errors.some(err => err.code === 'unknown_option')).toBe(true);
    });

    it('should handle permissive mode', async () => {
      const permissiveParser = new ArgumentParser({ mode: 'permissive' });
      const result = await permissiveParser.parse(['--unknown', 'value']);
      
      expect(result.validation.success).toBe(true);
      expect(result.unknown).toContain('--unknown');
      expect(result.unknown).toContain('value');
    });
  });

  describe('Complex Integration Scenarios', () => {
    beforeEach(() => {
      parser.addArgument({
        name: 'command',
        description: 'Command to run',
        type: ArgumentType.STRING,
        required: true,
      });

      parser.addArgument({
        name: 'files',
        description: 'Files to process',
        type: ArgumentType.ARRAY,
        required: false,
        multiple: true,
      });

      parser.addOption({
        name: 'output',
        alias: 'o',
        description: 'Output directory',
        type: ArgumentType.STRING,
        required: false,
        defaultValue: './output',
      });

      parser.addOption({
        name: 'verbose',
        alias: 'v',
        description: 'Verbose output',
        type: ArgumentType.BOOLEAN,
        required: false,
        flag: true,
      });

      parser.addOption({
        name: 'threads',
        alias: 't',
        description: 'Number of threads',
        type: ArgumentType.NUMBER,
        required: false,
        min: 1,
        max: 16,
        defaultValue: 4,
        coerce: true,
      });
    });

    it('should handle complex mixed arguments and options', async () => {
      const result = await parser.parse([
        'build',
        'file1.js',
        'file2.js',
        '--output',
        './dist',
        '-v',
        '--threads',
        '8',
      ]);
      
      expect(result.arguments.command).toBe('build');
      expect(result.arguments.files).toEqual(['file1.js', 'file2.js']);
      expect(result.options.output).toBe('./dist');
      expect(result.options.verbose).toBe(true);
      expect(result.options.threads).toBe(8);
      expect(result.validation.success).toBe(true);
    });

    it('should use default values when options not provided', async () => {
      const result = await parser.parse(['build']);
      
      expect(result.arguments.command).toBe('build');
      expect(result.options.output).toBe('./output');
      expect(result.options.threads).toBe(4);
      expect(result.validation.success).toBe(true);
    });
  });
});

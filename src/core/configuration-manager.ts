import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { parse as parseToml } from '@iarna/toml';

/**
 * Configuration source types in order of precedence (highest to lowest)
 */
export enum ConfigurationSource {
  CliArguments = 'cli-arguments',
  EnvironmentVariables = 'environment-variables',
  ConfigFile = 'config-file',
  Defaults = 'defaults'
}

/**
 * Configuration value with metadata about its source
 */
export interface ConfigurationValue<T = unknown> {
  value: T;
  source: ConfigurationSource;
  key: string;
  originalKey?: string; // For environment variables with transformed names
}

/**
 * Configuration schema definition
 */
export interface ConfigurationSchema<T = unknown> {
  schema: z.ZodSchema<T>;
  defaultValue?: T;
  environmentKey?: string;
  cliKey?: string;
  description?: string;
}

/**
 * Configuration provider interface
 */
export interface IConfigurationProvider {
  readonly source: ConfigurationSource;
  readonly priority: number;
  load(): Promise<Record<string, unknown>>;
  get<T>(key: string): T | undefined;
  has(key: string): boolean;
}

/**
 * CLI arguments configuration provider
 */
export class CliArgumentsProvider implements IConfigurationProvider {
  public readonly source = ConfigurationSource.CliArguments;
  public readonly priority = 4; // Highest priority
  
  private values: Record<string, unknown> = {};

  constructor(private args: Record<string, unknown> = {}) {
    this.values = { ...args };
  }

  async load(): Promise<Record<string, unknown>> {
    return this.values;
  }

  get<T>(key: string): T | undefined {
    return this.values[key] as T;
  }

  has(key: string): boolean {
    return key in this.values;
  }

  setValue(key: string, value: unknown): void {
    this.values[key] = value;
  }
}

/**
 * Environment variables configuration provider
 */
export class EnvironmentVariablesProvider implements IConfigurationProvider {
  public readonly source = ConfigurationSource.EnvironmentVariables;
  public readonly priority = 3;
  
  private values: Record<string, unknown> = {};
  private keyMappings: Map<string, string> = new Map();

  constructor(
    private prefix: string = '',
    private env: Record<string, string | undefined> = process.env
  ) {}

  async load(): Promise<Record<string, unknown>> {
    this.values = {};
    this.keyMappings.clear();

    for (const [envKey, envValue] of Object.entries(this.env)) {
      if (envValue === undefined) continue;
      
      // Transform environment key to configuration key
      const configKey = this.transformEnvKey(envKey);
      if (configKey) {
        this.values[configKey] = this.parseEnvValue(envValue);
        this.keyMappings.set(configKey, envKey);
      }
    }

    return this.values;
  }

  get<T>(key: string): T | undefined {
    return this.values[key] as T;
  }

  has(key: string): boolean {
    return key in this.values;
  }

  getOriginalKey(key: string): string | undefined {
    return this.keyMappings.get(key);
  }

  private transformEnvKey(envKey: string): string | null {
    // Remove prefix if present
    if (this.prefix && envKey.startsWith(this.prefix)) {
      envKey = envKey.slice(this.prefix.length);
    } else if (this.prefix) {
      // If we require a prefix but the key doesn't have it, ignore this key
      return null;
    }

    // Convert UPPER_SNAKE_CASE to camelCase
    return envKey
      .toLowerCase()
      .split('_')
      .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  private parseEnvValue(value: string): unknown {
    // Try to parse as JSON first
    if (value.startsWith('{') || value.startsWith('[') || value.startsWith('"')) {
      try {
        return JSON.parse(value);
      } catch {
        // Fall through to other parsing
      }
    }

    // Parse boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Parse numbers
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

    // Return as string
    return value;
  }
}

/**
 * Configuration file provider
 */
export class ConfigFileProvider implements IConfigurationProvider {
  public readonly source = ConfigurationSource.ConfigFile;
  public readonly priority = 2;
  
  private values: Record<string, unknown> = {};

  constructor(private filePath: string) {}

  async load(): Promise<Record<string, unknown>> {
    if (!existsSync(this.filePath)) {
      this.values = {};
      return this.values;
    }

    try {
      const content = readFileSync(this.filePath, 'utf-8');
      const ext = this.filePath.split('.').pop()?.toLowerCase();

      switch (ext) {
        case 'json':
          this.values = JSON.parse(content);
          break;
        case 'yaml':
        case 'yml':
          this.values = parseYaml(content);
          break;
        case 'toml':
          this.values = parseToml(content);
          break;
        default:
          throw new Error(`Unsupported configuration file format: ${ext}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load configuration file ${this.filePath}: ${errorMessage}`);
    }

    return this.values;
  }

  get<T>(key: string): T | undefined {
    return this.getNestedValue(this.values, key) as T;
  }

  has(key: string): boolean {
    return this.getNestedValue(this.values, key) !== undefined;
  }

  private getNestedValue(obj: Record<string, unknown>, key: string): unknown {
    const keys = key.split('.');
    let current = obj;

    for (const k of keys) {
      if (current === null || typeof current !== 'object' || !(k in current)) {
        return undefined;
      }
      current = current[k] as Record<string, unknown>;
    }

    return current;
  }
}

/**
 * Default values configuration provider
 */
export class DefaultsProvider implements IConfigurationProvider {
  public readonly source = ConfigurationSource.Defaults;
  public readonly priority = 1; // Lowest priority
  
  constructor(private defaults: Record<string, unknown> = {}) {}

  async load(): Promise<Record<string, unknown>> {
    return this.defaults;
  }

  get<T>(key: string): T | undefined {
    return this.defaults[key] as T;
  }

  has(key: string): boolean {
    return key in this.defaults;
  }

  setDefault(key: string, value: unknown): void {
    this.defaults[key] = value;
  }
}

/**
 * Configuration manager with multi-layer support and validation
 */
export class ConfigurationManager {
  private providers: IConfigurationProvider[] = [];
  private schemas: Map<string, ConfigurationSchema> = new Map();
  private cache: Map<string, ConfigurationValue> = new Map();
  private loaded = false;

  constructor() {
    // Initialize with default providers
    this.addProvider(new DefaultsProvider());
  }

  /**
   * Add a configuration provider
   */
  addProvider(provider: IConfigurationProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
    this.invalidateCache();
  }

  /**
   * Register a configuration schema
   */
  registerSchema<T>(key: string, schema: ConfigurationSchema<T>): void {
    this.schemas.set(key, schema);
    
    // Set default value if provided
    if (schema.defaultValue !== undefined) {
      const defaultsProvider = this.providers.find(p => p.source === ConfigurationSource.Defaults) as DefaultsProvider;
      if (defaultsProvider) {
        defaultsProvider.setDefault(key, schema.defaultValue);
      }
    }
  }

  /**
   * Load all configuration providers
   */
  async load(): Promise<void> {
    for (const provider of this.providers) {
      await provider.load();
    }
    this.loaded = true;
    this.invalidateCache();
  }

  /**
   * Get a configuration value with type validation
   */
  get<T>(key: string): T | undefined {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      return cached.value as T;
    }

    // Find value from providers (in priority order)
    for (const provider of this.providers) {
      if (provider.has(key)) {
        const value = provider.get<T>(key);
        const configValue: ConfigurationValue<T> = {
          value: value!,
          source: provider.source,
          key,
          originalKey: provider instanceof EnvironmentVariablesProvider 
            ? provider.getOriginalKey(key) 
            : undefined
        };

        // Validate against schema if available
        const schema = this.schemas.get(key);
        if (schema) {
          try {
            configValue.value = schema.schema.parse(value) as T;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Configuration validation failed for key '${key}': ${errorMessage}`);
          }
        }

        this.cache.set(key, configValue);
        return configValue.value;
      }
    }

    return undefined;
  }

  /**
   * Get configuration value with metadata
   */
  getWithMetadata<T>(key: string): ConfigurationValue<T> | undefined {
    const value = this.get<T>(key);
    return value !== undefined ? this.cache.get(key) as ConfigurationValue<T> : undefined;
  }

  /**
   * Check if a configuration key exists
   */
  has(key: string): boolean {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    return this.providers.some(provider => provider.has(key));
  }

  /**
   * Get all configuration keys
   */
  getKeys(): string[] {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    // Return cached keys for now
    // TODO: Enhance providers to expose their keys
    return Array.from(this.cache.keys());
  }

  /**
   * Get configuration summary for debugging
   */
  getSummary(): Record<string, ConfigurationValue> {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    const summary: Record<string, ConfigurationValue> = {};
    for (const [key, value] of this.cache) {
      summary[key] = value;
    }
    return summary;
  }

  /**
   * Invalidate the configuration cache
   */
  invalidateCache(): void {
    this.cache.clear();
  }

  /**
   * Create a configuration manager with common providers
   */
  static async create(options: {
    configFilePath?: string;
    envPrefix?: string;
    cliArgs?: Record<string, unknown>;
  } = {}): Promise<ConfigurationManager> {
    const manager = new ConfigurationManager();

    // Add providers in reverse priority order (defaults are already added)
    if (options.configFilePath) {
      manager.addProvider(new ConfigFileProvider(options.configFilePath));
    }

    manager.addProvider(new EnvironmentVariablesProvider(options.envPrefix));
    
    if (options.cliArgs) {
      manager.addProvider(new CliArgumentsProvider(options.cliArgs));
    }

    await manager.load();
    return manager;
  }
}

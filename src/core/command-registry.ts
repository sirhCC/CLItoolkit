/**
 * @fileoverview Command Registry implementation for Phase 3.1
 */

import {
  ICommandRegistry,
  ICommandRegistration,
  ICommandMetadata,
  ICommandLookupResult,
  ICommandRegistryConfig,
  CommandFactory
} from '../types/registry';
import { ICommand } from '../types/command';
import { ValidationError, CommandExecutionError, ConfigurationError } from '../types/errors';

/**
 * Default configuration for command registry
 */
const DEFAULT_CONFIG: ICommandRegistryConfig = {
  lazyLoading: true,
  cacheCommands: true,
  maxCacheSize: 100,
  validateMetadata: true,
  allowOverwrites: false,
  caseSensitive: false
};

/**
 * Command Registry implementation with hierarchical structure and lazy loading
 */
export class CommandRegistry implements ICommandRegistry {
  private readonly registrations = new Map<string, ICommandRegistration>();
  private readonly config: ICommandRegistryConfig;

  constructor(config: Partial<ICommandRegistryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a command with the registry
   */
  async register(
    path: string | string[],
    factory: CommandFactory,
    metadata?: Partial<ICommandMetadata>
  ): Promise<void> {
    const pathArray = this.normalizePath(path);
    const pathKey = this.getPathKey(pathArray);

    // Check for existing registration
    if (!this.config.allowOverwrites && this.registrations.has(pathKey)) {
      throw new ConfigurationError(
        `Command '${pathArray.join(' ')}' is already registered`
      );
    }

    // Create default metadata
    const commandName = pathArray[pathArray.length - 1];
    const defaultMetadata: ICommandMetadata = {
      name: commandName,
      description: metadata?.description || `${commandName} command`,
      ...metadata
    };

    // Validate metadata if enabled
    if (this.config.validateMetadata) {
      this.validateMetadata(defaultMetadata);
    }

    // Create registration
    const registration: ICommandRegistration = {
      metadata: defaultMetadata,
      factory,
      parentPath: pathArray.length > 1 ? pathArray.slice(0, -1) : undefined,
      isLoaded: false,
      registeredAt: new Date()
    };

    // Store registration
    this.registrations.set(pathKey, registration);
  }

  /**
   * Unregister a command from the registry
   */
  async unregister(path: string | string[]): Promise<boolean> {
    const pathArray = this.normalizePath(path);
    const pathKey = this.getPathKey(pathArray);

    return this.registrations.delete(pathKey);
  }

  /**
   * Find a command by path
   */
  async find(path: string | string[]): Promise<ICommandLookupResult | null> {
    const pathArray = this.normalizePath(path);
    const pathKey = this.getPathKey(pathArray);

    const registration = this.registrations.get(pathKey);
    if (!registration) {
      return null;
    }

    return {
      registration,
      remainingArgs: [],
      matchedPath: pathArray
    };
  }

  /**
   * Resolve command from arguments (supports hierarchical commands)
   */
  async resolve(args: string[]): Promise<ICommandLookupResult | null> {
    if (args.length === 0) {
      return null;
    }

    // Try to find the longest matching command path
    let bestMatch: ICommandLookupResult | null = null;

    for (let i = args.length; i > 0; i--) {
      const candidatePath = args.slice(0, i);
      const pathKey = this.getPathKey(candidatePath);
      const registration = this.registrations.get(pathKey);

      if (registration) {
        bestMatch = {
          registration,
          remainingArgs: args.slice(i),
          matchedPath: candidatePath
        };
        break;
      }
    }

    // Also check aliases
    if (!bestMatch) {
      for (const [, registration] of this.registrations) {
        if (registration.metadata.aliases) {
          for (const alias of registration.metadata.aliases) {
            if (this.matchesAlias(alias, args[0])) {
              return {
                registration,
                remainingArgs: args.slice(1),
                matchedPath: [args[0]]
              };
            }
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get all registered commands
   */
  async getAll(): Promise<ICommandRegistration[]> {
    return Array.from(this.registrations.values());
  }

  /**
   * Get commands by category
   */
  async getByCategory(category: string): Promise<ICommandRegistration[]> {
    const all = await this.getAll();
    return all.filter(reg => reg.metadata.category === category);
  }

  /**
   * Search commands by name, description, or tags
   */
  async search(query: string): Promise<ICommandRegistration[]> {
    const all = await this.getAll();
    const normalizedQuery = this.config.caseSensitive ? query : query.toLowerCase();

    return all.filter(reg => {
      const metadata = reg.metadata;
      const name = this.config.caseSensitive ? metadata.name : metadata.name.toLowerCase();
      const description = this.config.caseSensitive ? metadata.description : metadata.description.toLowerCase();

      // Search in name
      if (name.includes(normalizedQuery)) {
        return true;
      }

      // Search in description
      if (description.includes(normalizedQuery)) {
        return true;
      }

      // Search in tags
      if (metadata.tags) {
        for (const tag of metadata.tags) {
          const normalizedTag = this.config.caseSensitive ? tag : tag.toLowerCase();
          if (normalizedTag.includes(normalizedQuery)) {
            return true;
          }
        }
      }

      // Search in aliases
      if (metadata.aliases) {
        for (const alias of metadata.aliases) {
          const normalizedAlias = this.config.caseSensitive ? alias : alias.toLowerCase();
          if (normalizedAlias.includes(normalizedQuery)) {
            return true;
          }
        }
      }

      return false;
    });
  }

  /**
   * Check if a command exists
   */
  async exists(path: string | string[]): Promise<boolean> {
    const pathArray = this.normalizePath(path);
    const pathKey = this.getPathKey(pathArray);
    return this.registrations.has(pathKey);
  }

  /**
   * Get command metadata without loading the command
   */
  async getMetadata(path: string | string[]): Promise<ICommandMetadata | null> {
    const pathArray = this.normalizePath(path);
    const pathKey = this.getPathKey(pathArray);
    const registration = this.registrations.get(pathKey);
    return registration ? registration.metadata : null;
  }

  /**
   * Load a command instance (lazy loading)
   */
  async load(path: string | string[]): Promise<ICommand | null> {
    const pathArray = this.normalizePath(path);
    const pathKey = this.getPathKey(pathArray);
    const registration = this.registrations.get(pathKey);

    if (!registration) {
      return null;
    }

    // Return cached instance if available
    if (registration.instance && this.config.cacheCommands) {
      return registration.instance;
    }

    try {
      // Load command using factory
      const command = await registration.factory();
      
      // Cache the instance if caching is enabled
      if (this.config.cacheCommands) {
        // Check if we need to evict old cache entries before adding this one
        const currentLoadedCount = Array.from(this.registrations.values())
          .filter(reg => reg.isLoaded && reg.instance).length;
          
        if (currentLoadedCount >= this.config.maxCacheSize) {
          await this.evictOldestCache();
        }
        
        registration.instance = command;
      }
      
      registration.isLoaded = true;
      return command;
    } catch (error) {
      throw new CommandExecutionError(
        `Failed to load command '${pathArray.join(' ')}': ${error instanceof Error ? error.message : String(error)}`,
        pathArray.join(' '),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Clear all registered commands
   */
  async clear(): Promise<void> {
    this.registrations.clear();
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<{
    totalCommands: number;
    loadedCommands: number;
    categories: Record<string, number>;
  }> {
    const all = await this.getAll();
    const loadedCommands = all.filter(reg => reg.isLoaded).length;
    
    const categories: Record<string, number> = {};
    for (const registration of all) {
      const category = registration.metadata.category || 'uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    }

    return {
      totalCommands: all.length,
      loadedCommands,
      categories
    };
  }

  /**
   * Normalize path input to string array
   */
  private normalizePath(path: string | string[]): string[] {
    if (typeof path === 'string') {
      return path.split(' ').filter(p => p.length > 0);
    }
    return path.filter(p => p.length > 0);
  }

  /**
   * Generate a unique key for a command path
   */
  private getPathKey(pathArray: string[]): string {
    const normalized = this.config.caseSensitive 
      ? pathArray 
      : pathArray.map(p => p.toLowerCase());
    return normalized.join('.');
  }

  /**
   * Check if an alias matches a command name
   */
  private matchesAlias(alias: string, commandName: string): boolean {
    if (this.config.caseSensitive) {
      return alias === commandName;
    }
    return alias.toLowerCase() === commandName.toLowerCase();
  }

  /**
   * Validate command metadata
   */
  private validateMetadata(metadata: ICommandMetadata): void {
    if (!metadata.name || metadata.name.trim().length === 0) {
      throw new ValidationError(
        'Command name is required',
        'name'
      );
    }

    if (metadata.name.includes(' ')) {
      throw new ValidationError(
        'Command name cannot contain spaces',
        'name'
      );
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
      throw new ValidationError(
        'Command description is required',
        'description'
      );
    }
  }

  /**
   * Evict oldest cached command to maintain cache size limit
   */
  private async evictOldestCache(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestDate: Date | null = null;

    for (const [key, registration] of this.registrations) {
      if (registration.instance && (!oldestDate || registration.registeredAt < oldestDate)) {
        oldestKey = key;
        oldestDate = registration.registeredAt;
      }
    }

    if (oldestKey) {
      const registration = this.registrations.get(oldestKey);
      if (registration) {
        registration.instance = undefined;
        registration.isLoaded = false;
      }
    }
  }
}

/**
 * @fileoverview Command registry interfaces and types for Phase 3.1
 */

import { ICommand } from './command';

/**
 * Command factory function for lazy loading
 */
export type CommandFactory = () => Promise<ICommand> | ICommand;

/**
 * Command metadata for registry storage
 */
export interface ICommandMetadata {
  /** Command name */
  name: string;
  /** Command description */
  description: string;
  /** Command aliases */
  aliases?: string[];
  /** Command category for grouping */
  category?: string;
  /** Tags for searchability */
  tags?: string[];
  /** Whether command is hidden from help */
  hidden?: boolean;
  /** Command version */
  version?: string;
  /** Command author/maintainer */
  author?: string;
  /** Minimum CLI version required */
  minCliVersion?: string;
  /** Command priority for ordering */
  priority?: number;
  /** Whether command is deprecated */
  deprecated?: boolean;
  /** Deprecation message */
  deprecationMessage?: string;
}

/**
 * Command registration entry
 */
export interface ICommandRegistration {
  /** Command metadata */
  metadata: ICommandMetadata;
  /** Command factory for lazy loading */
  factory: CommandFactory;
  /** Parent command path (e.g., ['git', 'remote'] for 'git remote add') */
  parentPath?: string[];
  /** Command instance (lazy loaded) */
  instance?: ICommand;
  /** Whether command has been loaded */
  isLoaded: boolean;
  /** Registration timestamp */
  registeredAt: Date;
}

/**
 * Command lookup result
 */
export interface ICommandLookupResult {
  /** Found command registration */
  registration: ICommandRegistration;
  /** Remaining arguments after command resolution */
  remainingArgs: string[];
  /** Full command path that was matched */
  matchedPath: string[];
}

/**
 * Command registry interface
 */
export interface ICommandRegistry {
  /**
   * Register a command with the registry
   */
  register(
    path: string | string[],
    factory: CommandFactory,
    metadata?: Partial<ICommandMetadata>
  ): Promise<void>;

  /**
   * Unregister a command from the registry
   */
  unregister(path: string | string[]): Promise<boolean>;

  /**
   * Find a command by path
   */
  find(path: string | string[]): Promise<ICommandLookupResult | null>;

  /**
   * Resolve command from arguments
   */
  resolve(args: string[]): Promise<ICommandLookupResult | null>;

  /**
   * Get all registered commands
   */
  getAll(): Promise<ICommandRegistration[]>;

  /**
   * Get commands by category
   */
  getByCategory(category: string): Promise<ICommandRegistration[]>;

  /**
   * Search commands by name, description, or tags
   */
  search(query: string): Promise<ICommandRegistration[]>;

  /**
   * Check if a command exists
   */
  exists(path: string | string[]): Promise<boolean>;

  /**
   * Get command metadata without loading the command
   */
  getMetadata(path: string | string[]): Promise<ICommandMetadata | null>;

  /**
   * Load a command instance (lazy loading)
   */
  load(path: string | string[]): Promise<ICommand | null>;

  /**
   * Clear all registered commands
   */
  clear(): Promise<void>;

  /**
   * Get registry statistics
   */
  getStats(): Promise<{
    totalCommands: number;
    loadedCommands: number;
    categories: Record<string, number>;
  }>;
}

/**
 * Command registry configuration
 */
export interface ICommandRegistryConfig {
  /** Enable lazy loading (default: true) */
  lazyLoading: boolean;
  /** Cache loaded commands (default: true) */
  cacheCommands: boolean;
  /** Maximum cache size (default: 100) */
  maxCacheSize: number;
  /** Enable command metadata validation (default: true) */
  validateMetadata: boolean;
  /** Allow command overwrites (default: false) */
  allowOverwrites: boolean;
  /** Case sensitive command matching (default: false) */
  caseSensitive: boolean;
}

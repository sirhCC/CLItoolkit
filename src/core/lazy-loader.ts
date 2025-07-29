/**
 * Advanced lazy loading system with caching and dependency resolution
 */
export class LazyLoader<T> {
  private static cache = new WeakMap<object, any>();
  private static loadingPromises = new Map<string, Promise<any>>();
  
  constructor(
    private readonly id: string,
    private readonly loader: () => Promise<T>
  ) {}

  /**
   * Load with deduplication and caching
   */
  async load(): Promise<T> {
    // Check cache first
    const cached = LazyLoader.cache.get(this);
    if (cached) return cached;

    // Check if already loading
    const existingPromise = LazyLoader.loadingPromises.get(this.id);
    if (existingPromise) return existingPromise;

    // Create loading promise
    const loadingPromise = this.loader().then(result => {
      LazyLoader.cache.set(this, result);
      LazyLoader.loadingPromises.delete(this.id);
      return result;
    }).catch(error => {
      LazyLoader.loadingPromises.delete(this.id);
      throw error;
    });

    LazyLoader.loadingPromises.set(this.id, loadingPromise);
    return loadingPromise;
  }

  /**
   * Preload without waiting
   */
  preload(): void {
    this.load().catch(() => {}); // Silent preload
  }

  /**
   * Clear cache for this loader
   */
  invalidate(): void {
    LazyLoader.cache.delete(this);
    LazyLoader.loadingPromises.delete(this.id);
  }

  /**
   * Static method to clear all caches
   */
  static clearAll(): void {
    LazyLoader.loadingPromises.clear();
  }
}

/**
 * Advanced command registry with lazy loading
 */
export class LazyCommandRegistry {
  private readonly commands = new Map<string, LazyLoader<any>>();
  private readonly metadata = new Map<string, { name: string; description: string; }>();

  /**
   * Register command with lazy loading
   */
  registerLazy<T>(
    name: string, 
    loader: () => Promise<T>,
    metadata: { description: string; aliases?: string[] }
  ): void {
    const lazyLoader = new LazyLoader(`command:${name}`, loader);
    this.commands.set(name, lazyLoader);
    this.metadata.set(name, { name, description: metadata.description });

    // Register aliases
    if (metadata.aliases) {
      for (const alias of metadata.aliases) {
        this.commands.set(alias, lazyLoader);
      }
    }
  }

  /**
   * Get command with lazy loading
   */
  async getCommand(name: string): Promise<any> {
    const loader = this.commands.get(name);
    if (!loader) return undefined;
    return loader.load();
  }

  /**
   * Get command metadata without loading
   */
  getMetadata(name: string): { name: string; description: string; } | undefined {
    return this.metadata.get(name);
  }

  /**
   * Preload frequently used commands
   */
  preloadCommands(names: string[]): void {
    for (const name of names) {
      const loader = this.commands.get(name);
      if (loader) loader.preload();
    }
  }
}

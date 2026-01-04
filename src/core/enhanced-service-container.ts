/**
 * Service lifecycle management
 */
export enum ServiceLifetime {
  /** New instance created for each request */
  Transient = 'transient',
  /** Single instance shared across the application */
  Singleton = 'singleton',
  /** Single instance per scope/request */
  Scoped = 'scoped'
}

/**
 * Service registration metadata
 */
export interface ServiceRegistration<T = any> {
  /** Unique service identifier */
  token: ServiceToken<T>;
  /** Service implementation constructor or factory */
  implementation: ServiceImplementation<T>;
  /** Service lifetime management */
  lifetime: ServiceLifetime;
  /** Service dependencies */
  dependencies: ServiceToken<any>[] | undefined;
  /** Service metadata */
  metadata?: Record<string, any>;
}

/**
 * Interface for disposable resources
 */

/**
 * Service token for type-safe service identification
 */
export interface ServiceToken<T = any> {
  /** Unique token identifier */
  readonly id: string;
  /** Optional token description */
  readonly description: string | undefined;
  /** Token type information (for TypeScript inference) */
  readonly __type?: T;
}

/**
 * Service implementation types
 */
export type ServiceImplementation<T> =
  | ServiceConstructor<T>
  | ServiceFactory<T>
  | T; // Direct instance

// More flexible constructor type that allows specific parameters
export type ServiceConstructor<T> = new (...args: any[]) => T;
export type ServiceFactory<T> = (...args: any[]) => T | Promise<T>;

/**
 * Custom disposable interface for cleanup
 */

/**
 * Service scope for managing scoped services
 */
export interface ServiceScope extends IDisposable {
  /** Get service instance from this scope */
  get<T>(token: ServiceToken<T>): T | Promise<T>;
  /** Check if service is registered in this scope */
  has<T>(token: ServiceToken<T>): boolean;
  /** Create child scope */
  createChildScope(): ServiceScope;
}

/**
 * Resolution cache metadata
 */
interface ResolutionCache {
  /** Cached dependency resolution order */
  dependencyOrder: ServiceToken<any>[];
  /** Cached implementation type detection */
  implementationType: 'constructor' | 'factory' | 'instance';
  /** Cached dependency tokens for quick lookup */
  dependencyTokens: string[];
}

/**
 * Enhanced dependency injection container with lifecycle management
 */
export class EnhancedServiceContainer implements IDisposable {
  private registrations = new Map<string, ServiceRegistration>();
  private singletonInstances = new Map<string, any>();
  private scopedInstances = new Map<string, Map<string, any>>();
  private dependencyGraph = new Map<string, Set<string>>();
  private currentScopeId: string | undefined;
  private scopeCounter = 0;

  // Resolution caching
  private resolutionCache = new Map<string, ResolutionCache>();
  private constructorCache = new Map<Function, boolean>();
  private dependencyResolutionCache = new Map<string, any[]>();

  /**
   * Register a service with full configuration
   */
  register<T>(registration: ServiceRegistration<T>): this {
    if (!registration) {
      throw new Error('Registration cannot be null or undefined');
    }
    if (!registration.token?.id) {
      throw new Error('Service token must have an id');
    }
    if (!registration.implementation) {
      throw new Error('Service implementation cannot be null or undefined');
    }
    if (!Object.values(ServiceLifetime).includes(registration.lifetime)) {
      throw new Error(`Invalid service lifetime: ${registration.lifetime}`);
    }
    if (this.registrations.has(registration.token.id)) {
      throw new Error(`Service already registered: ${registration.token.id}`);
    }

    this.validateDependencies(registration);
    this.registrations.set(registration.token.id, registration);

    // Build resolution cache for this service
    this.buildResolutionCache(registration);

    return this;
  }

  /**
   * Register a transient service
   */
  registerTransient<T>(
    token: ServiceToken<T>,
    implementation: ServiceImplementation<T>,
    dependencies?: ServiceToken<any>[]
  ): this {
    return this.register({
      token,
      implementation,
      lifetime: ServiceLifetime.Transient,
      dependencies
    });
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    token: ServiceToken<T>,
    implementation: ServiceImplementation<T>,
    dependencies?: ServiceToken<any>[]
  ): this {
    return this.register({
      token,
      implementation,
      lifetime: ServiceLifetime.Singleton,
      dependencies
    });
  }

  /**
   * Register a scoped service
   */
  registerScoped<T>(
    token: ServiceToken<T>,
    implementation: ServiceImplementation<T>,
    dependencies?: ServiceToken<any>[]
  ): this {
    return this.register({
      token,
      implementation,
      lifetime: ServiceLifetime.Scoped,
      dependencies
    });
  }

  /**
   * Register an instance directly
   */
  registerInstance<T>(token: ServiceToken<T>, instance: T): this {
    return this.register({
      token,
      implementation: instance,
      lifetime: ServiceLifetime.Singleton,
      dependencies: undefined
    });
  }

  /**
   * Get service instance
   */
  async get<T>(token: ServiceToken<T>): Promise<T> {
    if (!token?.id) {
      throw new Error('Service token must have an id');
    }

    const registration = this.registrations.get(token.id);
    if (!registration) {
      throw new Error(`Service not registered: ${token.id}`);
    }

    return this.resolveService<T>(registration as ServiceRegistration<T>);
  }

  /**
   * Get service instance synchronously (throws if async factory)
   */
  getSync<T>(token: ServiceToken<T>): T {
    if (!token?.id) {
      throw new Error('Service token must have an id');
    }

    const registration = this.registrations.get(token.id);
    if (!registration) {
      throw new Error(`Service not registered: ${token.id}`);
    }

    const result = this.resolveServiceSync<T>(registration as ServiceRegistration<T>);
    if (result instanceof Promise) {
      throw new Error(`Service ${token.id} requires async resolution. Use get() instead.`);
    }

    return result;
  }

  /**
   * Check if service is registered
   */
  has<T>(token: ServiceToken<T>): boolean {
    return this.registrations.has(token.id);
  }

  /**
   * Create a new service scope
   */
  createScope(): ServiceScope {
    const scopeId = `scope_${++this.scopeCounter}`;
    this.scopedInstances.set(scopeId, new Map());

    return new ServiceScopeImpl(this, scopeId);
  }

  /**
   * Execute function within a service scope
   */
  async withScope<T>(fn: (scope: ServiceScope) => T | Promise<T>): Promise<T> {
    const scope = this.createScope();
    try {
      return await fn(scope);
    } finally {
      await scope.dispose();
    }
  }

  /**
   * Dispose all singleton instances and clear caches
   */
  async dispose(): Promise<void> {
    // Dispose singleton instances
    for (const instance of this.singletonInstances.values()) {
      await this.disposeInstance(instance);
    }
    this.singletonInstances.clear();

    // Dispose scoped instances
    for (const scopeInstances of this.scopedInstances.values()) {
      for (const instance of scopeInstances.values()) {
        await this.disposeInstance(instance);
      }
    }
    this.scopedInstances.clear();

    // Clear all data
    this.registrations.clear();
    this.dependencyGraph.clear();

    // Clear caches
    this.resolutionCache.clear();
    this.constructorCache.clear();
    this.dependencyResolutionCache.clear();
  }

  /**
   * Get registration information
   */
  getRegistration<T>(token: ServiceToken<T>): ServiceRegistration<T> | undefined {
    return this.registrations.get(token.id) as ServiceRegistration<T>;
  }

  /**
   * Get all registered service tokens
   */
  getRegisteredTokens(): ServiceToken<any>[] {
    return Array.from(this.registrations.values()).map(reg => reg.token);
  }

  /**
   * Validate service dependencies for circular references
   */
  private validateDependencies<T>(registration: ServiceRegistration<T>): void {
    if (!registration.dependencies) return;

    // Update the dependency graph first
    this.updateDependencyGraph(registration);

    // Check for circular dependencies in the entire graph
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const checkCircular = (tokenId: string): void => {
      if (visiting.has(tokenId)) {
        throw new Error(`Circular dependency detected involving service: ${tokenId}`);
      }
      if (visited.has(tokenId)) return;

      visiting.add(tokenId);

      const deps = this.dependencyGraph.get(tokenId);
      if (deps) {
        for (const depId of deps) {
          checkCircular(depId);
        }
      }

      visiting.delete(tokenId);
      visited.add(tokenId);
    };

    // Check all services for circular dependencies, starting with the new one
    checkCircular(registration.token.id);
  }

  /**
   * Update dependency graph for topological sorting
   */
  private updateDependencyGraph<T>(registration: ServiceRegistration<T>): void {
    const deps = new Set<string>();

    if (registration.dependencies) {
      for (const dep of registration.dependencies) {
        deps.add(dep.id);
      }
    }

    this.dependencyGraph.set(registration.token.id, deps);
  }

  /**
   * Resolve service with proper lifetime management
   */
  private async resolveService<T>(registration: ServiceRegistration<T>): Promise<T> {
    switch (registration.lifetime) {
      case ServiceLifetime.Singleton:
        return this.resolveSingleton<T>(registration);

      case ServiceLifetime.Scoped:
        return this.resolveScoped<T>(registration);

      case ServiceLifetime.Transient:
      default:
        return this.createInstance<T>(registration);
    }
  }

  /**
   * Resolve service synchronously
   */
  private resolveServiceSync<T>(registration: ServiceRegistration<T>): T | Promise<T> {
    switch (registration.lifetime) {
      case ServiceLifetime.Singleton:
        return this.resolveSingletonSync<T>(registration);

      case ServiceLifetime.Scoped:
        return this.resolveScopedSync<T>(registration);

      case ServiceLifetime.Transient:
      default:
        return this.createInstanceSync<T>(registration);
    }
  }

  /**
   * Resolve singleton service
   */
  private async resolveSingleton<T>(registration: ServiceRegistration<T>): Promise<T> {
    const existing = this.singletonInstances.get(registration.token.id);
    if (existing) {
      return existing as T;
    }

    const instance = await this.createInstance<T>(registration);
    this.singletonInstances.set(registration.token.id, instance);
    return instance;
  }

  /**
   * Resolve singleton service synchronously
   */
  private resolveSingletonSync<T>(registration: ServiceRegistration<T>): T | Promise<T> {
    const existing = this.singletonInstances.get(registration.token.id);
    if (existing) {
      return existing as T;
    }

    const instance = this.createInstanceSync<T>(registration);
    if (instance instanceof Promise) {
      return instance.then(resolved => {
        this.singletonInstances.set(registration.token.id, resolved);
        return resolved;
      });
    }

    this.singletonInstances.set(registration.token.id, instance);
    return instance;
  }

  /**
   * Resolve scoped service
   */
  private async resolveScoped<T>(registration: ServiceRegistration<T>): Promise<T> {
    if (!this.currentScopeId) {
      throw new Error(`Scoped service ${registration.token.id} requested outside of scope`);
    }

    const scopeInstances = this.scopedInstances.get(this.currentScopeId);
    if (!scopeInstances) {
      throw new Error(`Invalid scope: ${this.currentScopeId}`);
    }

    const existing = scopeInstances.get(registration.token.id);
    if (existing) {
      return existing as T;
    }

    const instance = await this.createInstance<T>(registration);
    scopeInstances.set(registration.token.id, instance);
    return instance;
  }

  /**
   * Resolve scoped service synchronously
   */
  private resolveScopedSync<T>(registration: ServiceRegistration<T>): T | Promise<T> {
    if (!this.currentScopeId) {
      throw new Error(`Scoped service ${registration.token.id} requested outside of scope`);
    }

    const scopeInstances = this.scopedInstances.get(this.currentScopeId);
    if (!scopeInstances) {
      throw new Error(`Invalid scope: ${this.currentScopeId}`);
    }

    const existing = scopeInstances.get(registration.token.id);
    if (existing) {
      return existing as T;
    }

    const instance = this.createInstanceSync<T>(registration);
    if (instance instanceof Promise) {
      return instance.then(resolved => {
        scopeInstances!.set(registration.token.id, resolved);
        return resolved;
      });
    }

    scopeInstances.set(registration.token.id, instance);
    return instance;
  }

  /**
   * Create new service instance (with caching)
   */
  private async createInstance<T>(registration: ServiceRegistration<T>): Promise<T> {
    // Get cached resolution metadata
    const cache = this.resolutionCache.get(registration.token.id);
    if (!cache) {
      throw new Error(`Resolution cache not found for service: ${registration.token.id}`);
    }

    // Resolve dependencies using cache
    const dependencies = await this.resolveDependenciesWithCache(cache.dependencyOrder);

    // Create instance based on cached implementation type
    switch (cache.implementationType) {
      case 'constructor':
        return new (registration.implementation as ServiceConstructor<T>)(...dependencies);

      case 'factory':
        const result = (registration.implementation as ServiceFactory<T>)(...dependencies);
        return result instanceof Promise ? await result : result;

      case 'instance':
      default:
        return registration.implementation as T;
    }
  }

  /**
   * Create new service instance synchronously (with caching)
   */
  private createInstanceSync<T>(registration: ServiceRegistration<T>): T | Promise<T> {
    // Get cached resolution metadata
    const cache = this.resolutionCache.get(registration.token.id);
    if (!cache) {
      throw new Error(`Resolution cache not found for service: ${registration.token.id}`);
    }

    // Resolve dependencies synchronously using cache
    const dependencies = this.resolveDependenciesSyncWithCache(cache.dependencyOrder);

    // If any dependency resolution is async, return promise
    if (dependencies instanceof Promise) {
      return dependencies.then(deps => {
        switch (cache.implementationType) {
          case 'constructor':
            return new (registration.implementation as ServiceConstructor<T>)(...deps);

          case 'factory':
            const result = (registration.implementation as ServiceFactory<T>)(...deps);
            return result instanceof Promise ? result : result;

          case 'instance':
          default:
            return registration.implementation as T;
        }
      });
    }

    // Create instance based on cached implementation type
    switch (cache.implementationType) {
      case 'constructor':
        return new (registration.implementation as ServiceConstructor<T>)(...dependencies);

      case 'factory':
        const result = (registration.implementation as ServiceFactory<T>)(...dependencies);
        return result instanceof Promise ? result : result;

      case 'instance':
      default:
        return registration.implementation as T;
    }
  }

  /**
   * Resolve service dependencies (with caching)
   */
  private async resolveDependenciesWithCache(dependencies: ServiceToken<any>[]): Promise<any[]> {
    const cacheKey = this.getDependencyCacheKey(dependencies);

    // Check if we have a cached result for this exact dependency pattern
    if (this.dependencyResolutionCache.has(cacheKey)) {
      // For cached results, we still need to resolve them fresh for transient services
      // but the resolution order and pattern is cached
      return this.resolveDependencies(dependencies);
    }

    // Resolve and cache the pattern (not the instances, just the resolution pattern)
    const resolved = await this.resolveDependencies(dependencies);
    this.dependencyResolutionCache.set(cacheKey, resolved);
    return resolved;
  }

  /**
   * Resolve service dependencies synchronously (with caching)
   */
  private resolveDependenciesSyncWithCache(dependencies: ServiceToken<any>[]): any[] | Promise<any[]> {
    const cacheKey = this.getDependencyCacheKey(dependencies);

    // Check if we have a cached result for this exact dependency pattern
    if (this.dependencyResolutionCache.has(cacheKey)) {
      // For cached patterns, use the standard sync resolution
      return this.resolveDependenciesSync(dependencies);
    }

    // Resolve and cache the pattern
    const resolved = this.resolveDependenciesSync(dependencies);
    if (!(resolved instanceof Promise)) {
      this.dependencyResolutionCache.set(cacheKey, resolved);
    }
    return resolved;
  }

  /**
   * Resolve service dependencies
   */
  private async resolveDependencies(dependencies: ServiceToken<any>[]): Promise<any[]> {
    const resolved: any[] = [];

    for (const dep of dependencies) {
      resolved.push(await this.get(dep));
    }

    return resolved;
  }

  /**
   * Resolve service dependencies synchronously
   */
  private resolveDependenciesSync(dependencies: ServiceToken<any>[]): any[] | Promise<any[]> {
    const resolved: (any | Promise<any>)[] = [];
    let hasAsync = false;

    for (const dep of dependencies) {
      const result = this.getSync(dep);
      resolved.push(result);
      if (result instanceof Promise) {
        hasAsync = true;
      }
    }

    if (hasAsync) {
      return Promise.all(resolved);
    }

    return resolved as any[];
  }

  /**
   * Check if function is a constructor (with caching)
   */
  private isConstructor(fn: Function): boolean {
    // Check cache first
    if (this.constructorCache.has(fn)) {
      return this.constructorCache.get(fn)!;
    }

    // Calculate and cache result
    const isConstructor = fn.prototype && fn.prototype.constructor === fn;
    this.constructorCache.set(fn, isConstructor);
    return isConstructor;
  }

  /**
   * Build resolution cache for a service registration
   */
  private buildResolutionCache<T>(registration: ServiceRegistration<T>): void {
    const cache: ResolutionCache = {
      dependencyOrder: registration.dependencies || [],
      implementationType: this.getImplementationType(registration.implementation),
      dependencyTokens: (registration.dependencies || []).map(dep => dep.id)
    };

    this.resolutionCache.set(registration.token.id, cache);
  }

  /**
   * Get implementation type for caching
   */
  private getImplementationType<T>(implementation: ServiceImplementation<T>): 'constructor' | 'factory' | 'instance' {
    if (typeof implementation === 'function') {
      return this.isConstructor(implementation) ? 'constructor' : 'factory';
    }
    return 'instance';
  }

  /**
   * Get cached dependency resolution key
   */
  private getDependencyCacheKey(dependencies: ServiceToken<any>[]): string {
    return dependencies.map(dep => dep.id).sort().join('|');
  }

  /**
   * Dispose service instance if it implements IDisposable
   */
  private async disposeInstance(instance: unknown): Promise<void> {
    if (instance && typeof instance === 'object' && 'dispose' in instance) {
      const disposable = instance as IDisposable;
      await disposable.dispose();
    }
  }

  /**
   * Set current scope for scoped service resolution
   */
  private setCurrentScope(scopeId: string | null): void {
    this.currentScopeId = scopeId || undefined;
  }

  /**
   * Dispose scope and its instances
   */
  private async disposeScope(scopeId: string): Promise<void> {
    const scopeInstances = this.scopedInstances.get(scopeId);
    if (scopeInstances) {
      for (const instance of scopeInstances.values()) {
        await this.disposeInstance(instance);
      }
      this.scopedInstances.delete(scopeId);
    }
  }
}

/**
 * Service scope implementation
 */
class ServiceScopeImpl implements ServiceScope {
  constructor(
    private container: EnhancedServiceContainer,
    private scopeId: string
  ) { }

  async get<T>(token: ServiceToken<T>): Promise<T> {
    const previousScope = (this.container as any).currentScopeId;
    (this.container as any).setCurrentScope(this.scopeId);

    try {
      return await this.container.get(token);
    } finally {
      (this.container as any).setCurrentScope(previousScope);
    }
  }

  has<T>(token: ServiceToken<T>): boolean {
    return this.container.has(token);
  }

  createChildScope(): ServiceScope {
    return this.container.createScope();
  }

  async dispose(): Promise<void> {
    await (this.container as any).disposeScope(this.scopeId);
  }
}

/**
 * Utility functions for creating service tokens
 */
export function createServiceToken<T>(id: string, description?: string): ServiceToken<T> {
  return {
    id,
    description,
    __type: undefined as unknown as T
  };
}

/**
 * Decorator for marking service dependencies (future enhancement)
 */
export function Injectable<T>(token?: ServiceToken<T>) {
  return function (target: any) {
    if (token) {
      target.__serviceToken = token;
    }
    return target;
  };
}

/**
 * Common service interfaces
 */

// Logger service interface
export interface ILogger {
  log(message: string): void;
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// File system service interface
export interface IFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
}

// HTTP client service interface
export interface IHttpClient {
  get(url: string): Promise<any>;
  post(url: string, data: any): Promise<any>;
  put(url: string, data: any): Promise<any>;
  delete(url: string): Promise<any>;
}

/**
 * Common service tokens
 */
export const LoggerToken = createServiceToken<ILogger>('logger', 'Logger service');
export const FileSystemToken = createServiceToken<IFileSystem>('fileSystem', 'File system service');
export const HttpClientToken = createServiceToken<IHttpClient>('httpClient', 'HTTP client service');

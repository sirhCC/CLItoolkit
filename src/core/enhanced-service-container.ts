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
 * Service scope for managing scoped services
 */
export interface ServiceScope extends Disposable {
  /** Get service instance from this scope */
  get<T>(token: ServiceToken<T>): T | Promise<T>;
  /** Check if service is registered in this scope */
  has<T>(token: ServiceToken<T>): boolean;
  /** Create child scope */
  createChildScope(): ServiceScope;
}

/**
 * Disposable interface for cleanup
 */

/**
 * Enhanced dependency injection container with lifecycle management
 */

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
   * Dispose all singleton instances
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

    this.registrations.clear();
    this.dependencyGraph.clear();
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
   * Create new service instance
   */
  private async createInstance<T>(registration: ServiceRegistration<T>): Promise<T> {
    // Resolve dependencies
    const dependencies = await this.resolveDependencies(registration.dependencies || []);

    // Create instance based on implementation type
    if (typeof registration.implementation === 'function') {
      if (this.isConstructor(registration.implementation)) {
        return new (registration.implementation as ServiceConstructor<T>)(...dependencies);
      } else {
        const result = (registration.implementation as ServiceFactory<T>)(...dependencies);
        return result instanceof Promise ? await result : result;
      }
    }

    // Direct instance
    return registration.implementation as T;
  }

  /**
   * Create new service instance synchronously
   */
  private createInstanceSync<T>(registration: ServiceRegistration<T>): T | Promise<T> {
    // Resolve dependencies synchronously
    const dependencies = this.resolveDependenciesSync(registration.dependencies || []);

    // If any dependency resolution is async, return promise
    if (dependencies instanceof Promise) {
      return dependencies.then(deps => {
        if (typeof registration.implementation === 'function') {
          if (this.isConstructor(registration.implementation)) {
            return new (registration.implementation as ServiceConstructor<T>)(...deps);
          } else {
            const result = (registration.implementation as ServiceFactory<T>)(...deps);
            return result instanceof Promise ? result : result;
          }
        }
        return registration.implementation as T;
      });
    }

    // Create instance based on implementation type
    if (typeof registration.implementation === 'function') {
      if (this.isConstructor(registration.implementation)) {
        return new (registration.implementation as ServiceConstructor<T>)(...dependencies);
      } else {
        const result = (registration.implementation as ServiceFactory<T>)(...dependencies);
        return result instanceof Promise ? result : result;
      }
    }

    // Direct instance
    return registration.implementation as T;
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
   * Check if function is a constructor
   */
  private isConstructor(fn: Function): boolean {
    return fn.prototype && fn.prototype.constructor === fn;
  }

  /**
   * Dispose service instance if it implements Disposable
   */
  private async disposeInstance(instance: unknown): Promise<void> {
    if (instance && typeof instance === 'object' && 'dispose' in instance) {
      const disposable = instance as Disposable;
      await disposable.dispose();
    }
  }

  /**
   * Set current scope for scoped service resolution
   */
  private setCurrentScope(scopeId: string | null): void {
    this.currentScopeId = scopeId;
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
  ) {}

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

// File system service interface

// HTTP client service interface


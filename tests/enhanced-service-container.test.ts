import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  EnhancedServiceContainer,
  ServiceLifetime,
  ServiceToken,
  createServiceToken,
  Disposable,
  ILogger,
  LoggerToken,
  IFileSystem,
  FileSystemToken
} from '../src/core/enhanced-service-container';

// Test service interfaces and implementations
interface ITestService {
  getValue(): string;
}

interface IDependentService {
  getTestValue(): string;
}

interface IAsyncService {
  getValueAsync(): Promise<string>;
}

// Test service implementations with proper signatures for DI
class TestService implements ITestService {
  constructor() {}
  
  getValue(): string {
    return 'test-value';
  }
}

class DependentService implements IDependentService {
  constructor(private testService: ITestService) {}
  
  getTestValue(): string {
    return `dependent-${this.testService.getValue()}`;
  }
}

class AsyncService implements IAsyncService {
  async getValueAsync(): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1));
    return 'async-value';
  }
}

class DisposableService implements ITestService, Disposable {
  public disposed = false;
  
  getValue(): string {
    return 'disposable-value';
  }
  
  async dispose(): Promise<void> {
    this.disposed = true;
  }
}

class CounterService implements ITestService {
  private static instanceCount = 0;
  public readonly instanceId: number;
  
  constructor() {
    this.instanceId = ++CounterService.instanceCount;
  }
  
  getValue(): string {
    return `counter-${this.instanceId}`;
  }
  
  static getInstanceCount(): number {
    return this.instanceCount;
  }
  
  static resetCount(): void {
    this.instanceCount = 0;
  }
}

// Service tokens
const TestServiceToken = createServiceToken<ITestService>('ITestService');
const DependentServiceToken = createServiceToken<IDependentService>('IDependentService');
const AsyncServiceToken = createServiceToken<IAsyncService>('IAsyncService');
const DisposableServiceToken = createServiceToken<ITestService>('IDisposableService');
const CounterServiceToken = createServiceToken<ITestService>('ICounterService');

describe('EnhancedServiceContainer', () => {
  let container: EnhancedServiceContainer;

  beforeEach(() => {
    container = new EnhancedServiceContainer();
    CounterService.resetCount();
  });

  afterEach(async () => {
    await container.dispose();
  });

  describe('Service Registration', () => {
    it('should register and resolve transient services', async () => {
      container.registerTransient(TestServiceToken, TestService);
      
      const service1 = await container.get(TestServiceToken);
      const service2 = await container.get(TestServiceToken);
      
      expect(service1).toBeInstanceOf(TestService);
      expect(service2).toBeInstanceOf(TestService);
      expect(service1).not.toBe(service2); // Different instances
    });

    it('should register and resolve singleton services', async () => {
      container.registerSingleton(TestServiceToken, TestService);
      
      const service1 = await container.get(TestServiceToken);
      const service2 = await container.get(TestServiceToken);
      
      expect(service1).toBeInstanceOf(TestService);
      expect(service2).toBeInstanceOf(TestService);
      expect(service1).toBe(service2); // Same instance
    });

    it('should register and resolve scoped services', async () => {
      container.registerScoped(CounterServiceToken, CounterService);
      
      await container.withScope(async (scope1) => {
        const service1a = await scope1.get(CounterServiceToken);
        const service1b = await scope1.get(CounterServiceToken);
        
        expect(service1a).toBe(service1b); // Same instance within scope
        
        await container.withScope(async (scope2) => {
          const service2 = await scope2.get(CounterServiceToken);
          
          expect(service2).not.toBe(service1a); // Different instance in different scope
        });
      });
    });

    it('should register direct instances', async () => {
      const instance = new TestService('direct-instance');
      container.registerInstance(TestServiceToken, instance);
      
      const service = await container.get(TestServiceToken);
      
      expect(service).toBe(instance);
    });

    it('should register services with factory functions', async () => {
      container.registerTransient(TestServiceToken, () => new TestService('factory-value'));
      
      const service = await container.get(TestServiceToken);
      
      expect(service.getValue()).toBe('factory-value');
    });

    it('should register services with async factory functions', async () => {
      container.registerTransient(AsyncServiceToken, async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return new AsyncService();
      });
      
      const service = await container.get(AsyncServiceToken);
      const value = await service.getValueAsync();
      
      expect(value).toBe('async-value');
    });
  });

  describe('Dependency Injection', () => {
    it('should resolve service dependencies', async () => {
      container.registerSingleton(TestServiceToken, TestService);
      container.registerTransient(DependentServiceToken, DependentService, [TestServiceToken]);
      
      const dependentService = await container.get(DependentServiceToken);
      
      expect(dependentService.getTestValue()).toBe('dependent-test-value');
    });

    it('should resolve complex dependency chains', async () => {
      interface IChainService {
        getChain(): string;
      }
      
      class ChainService implements IChainService {
        constructor(private dependent: IDependentService) {}
        
        getChain(): string {
          return `chain-${this.dependent.getTestValue()}`;
        }
      }
      
      const ChainServiceToken = createServiceToken<IChainService>('IChainService');
      
      container.registerSingleton(TestServiceToken, TestService);
      container.registerTransient(DependentServiceToken, DependentService, [TestServiceToken]);
      container.registerTransient(ChainServiceToken, ChainService, [DependentServiceToken]);
      
      const chainService = await container.get(ChainServiceToken);
      
      expect(chainService.getChain()).toBe('chain-dependent-test-value');
    });

    it('should detect circular dependencies', () => {
      interface IServiceA {
        getValue(): string;
      }
      
      interface IServiceB {
        getValue(): string;
      }
      
      const ServiceAToken = createServiceToken<IServiceA>('IServiceA');
      const ServiceBToken = createServiceToken<IServiceB>('IServiceB');
      
      class ServiceA implements IServiceA {
        constructor(private serviceB: IServiceB) {}
        getValue(): string { return this.serviceB.getValue(); }
      }
      
      class ServiceB implements IServiceB {
        constructor(private serviceA: IServiceA) {}
        getValue(): string { return this.serviceA.getValue(); }
      }
      
      container.registerTransient(ServiceAToken, ServiceA, [ServiceBToken]);
      
      expect(() => {
        container.registerTransient(ServiceBToken, ServiceB, [ServiceAToken]);
      }).toThrow('Circular dependency detected');
    });
  });

  describe('Service Lifetimes', () => {
    it('should create new instances for transient services', async () => {
      container.registerTransient(CounterServiceToken, CounterService);
      
      const service1 = await container.get(CounterServiceToken);
      const service2 = await container.get(CounterServiceToken);
      
      expect((service1 as CounterService).instanceId).toBe(1);
      expect((service2 as CounterService).instanceId).toBe(2);
    });

    it('should reuse instances for singleton services', async () => {
      container.registerSingleton(CounterServiceToken, CounterService);
      
      const service1 = await container.get(CounterServiceToken);
      const service2 = await container.get(CounterServiceToken);
      
      expect((service1 as CounterService).instanceId).toBe(1);
      expect((service2 as CounterService).instanceId).toBe(1);
      expect(service1).toBe(service2);
    });

    it('should manage scoped service lifetimes correctly', async () => {
      container.registerScoped(CounterServiceToken, CounterService);
      
      let scope1Service1: CounterService;
      let scope1Service2: CounterService;
      let scope2Service: CounterService;
      
      await container.withScope(async (scope1) => {
        scope1Service1 = await scope1.get(CounterServiceToken) as CounterService;
        scope1Service2 = await scope1.get(CounterServiceToken) as CounterService;
        
        expect(scope1Service1.instanceId).toBe(1);
        expect(scope1Service2.instanceId).toBe(1);
        expect(scope1Service1).toBe(scope1Service2);
      });
      
      await container.withScope(async (scope2) => {
        scope2Service = await scope2.get(CounterServiceToken) as CounterService;
        
        expect(scope2Service.instanceId).toBe(2);
        expect(scope2Service).not.toBe(scope1Service1!);
      });
    });
  });

  describe('Service Scopes', () => {
    it('should create and dispose service scopes', async () => {
      container.registerScoped(DisposableServiceToken, DisposableService);
      
      let service: DisposableService;
      
      await container.withScope(async (scope) => {
        service = await scope.get(DisposableServiceToken) as DisposableService;
        expect(service.disposed).toBe(false);
      });
      
      expect(service!.disposed).toBe(true);
    });

    it('should create child scopes', async () => {
      container.registerScoped(CounterServiceToken, CounterService);
      
      await container.withScope(async (parentScope) => {
        const parentService = await parentScope.get(CounterServiceToken) as CounterService;
        
        const childScope = parentScope.createChildScope();
        const childService = await childScope.get(CounterServiceToken) as CounterService;
        
        expect(parentService.instanceId).toBe(1);
        expect(childService.instanceId).toBe(2);
        expect(parentService).not.toBe(childService);
        
        await childScope.dispose();
      });
    });

    it('should throw when accessing scoped service outside scope', async () => {
      container.registerScoped(TestServiceToken, TestService);
      
      await expect(container.get(TestServiceToken)).rejects.toThrow('requested outside of scope');
    });
  });

  describe('Synchronous Resolution', () => {
    it('should resolve services synchronously when possible', () => {
      container.registerSingleton(TestServiceToken, TestService);
      
      const service = container.getSync(TestServiceToken);
      
      expect(service).toBeInstanceOf(TestService);
      expect(service.getValue()).toBe('test-value');
    });

    it('should throw when trying to resolve async service synchronously', () => {
      container.registerTransient(AsyncServiceToken, async () => new AsyncService());
      
      expect(() => container.getSync(AsyncServiceToken)).toThrow('requires async resolution');
    });
  });

  describe('Container Management', () => {
    it('should check if services are registered', () => {
      container.registerTransient(TestServiceToken, TestService);
      
      expect(container.has(TestServiceToken)).toBe(true);
      expect(container.has(DependentServiceToken)).toBe(false);
    });

    it('should get registration information', () => {
      container.registerSingleton(TestServiceToken, TestService, []);
      
      const registration = container.getRegistration(TestServiceToken);
      
      expect(registration).toBeDefined();
      expect(registration!.lifetime).toBe(ServiceLifetime.Singleton);
      expect(registration!.token).toBe(TestServiceToken);
    });

    it('should list all registered tokens', () => {
      container.registerTransient(TestServiceToken, TestService);
      container.registerSingleton(DependentServiceToken, DependentService, [TestServiceToken]);
      
      const tokens = container.getRegisteredTokens();
      
      expect(tokens).toHaveLength(2);
      expect(tokens).toContain(TestServiceToken);
      expect(tokens).toContain(DependentServiceToken);
    });

    it('should dispose singleton services on container disposal', async () => {
      container.registerSingleton(DisposableServiceToken, DisposableService);
      
      const service = await container.get(DisposableServiceToken) as DisposableService;
      expect(service.disposed).toBe(false);
      
      await container.dispose();
      expect(service.disposed).toBe(true);
    });

    it('should throw when getting unregistered service', async () => {
      await expect(container.get(TestServiceToken)).rejects.toThrow('Service not registered');
    });
  });

  describe('Built-in Service Interfaces', () => {
    it('should support logger service interface', async () => {
      class ConsoleLogger implements ILogger {
        debug(message: string): void { console.debug(message); }
        info(message: string): void { console.info(message); }
        warn(message: string): void { console.warn(message); }
        error(message: string): void { console.error(message); }
      }
      
      container.registerSingleton(LoggerToken, ConsoleLogger);
      
      const logger = await container.get(LoggerToken);
      
      expect(logger).toBeInstanceOf(ConsoleLogger);
      expect(typeof logger.info).toBe('function');
    });

    it('should support file system service interface', async () => {
      class MockFileSystem implements IFileSystem {
        async readFile(path: string): Promise<string> { return `content of ${path}`; }
        async writeFile(path: string, content: string): Promise<void> { /* mock */ }
        async exists(path: string): Promise<boolean> { return true; }
        async mkdir(path: string): Promise<void> { /* mock */ }
        async readDir(path: string): Promise<string[]> { return ['file1.txt', 'file2.txt']; }
      }
      
      container.registerSingleton(FileSystemToken, MockFileSystem);
      
      const fs = await container.get(FileSystemToken);
      const content = await fs.readFile('test.txt');
      
      expect(content).toBe('content of test.txt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle services with no dependencies', async () => {
      container.registerTransient(TestServiceToken, TestService, []);
      
      const service = await container.get(TestServiceToken);
      
      expect(service).toBeInstanceOf(TestService);
    });

    it('should handle factory functions with dependencies', async () => {
      container.registerSingleton(TestServiceToken, TestService);
      container.registerTransient(DependentServiceToken, (testService: ITestService) => {
        return new DependentService(testService);
      }, [TestServiceToken]);
      
      const service = await container.get(DependentServiceToken);
      
      expect(service.getTestValue()).toBe('dependent-test-value');
    });

    it('should handle async factory functions with dependencies', async () => {
      container.registerSingleton(TestServiceToken, TestService);
      container.registerTransient(DependentServiceToken, async (testService: ITestService) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return new DependentService(testService);
      }, [TestServiceToken]);
      
      const service = await container.get(DependentServiceToken);
      
      expect(service.getTestValue()).toBe('dependent-test-value');
    });
  });
});

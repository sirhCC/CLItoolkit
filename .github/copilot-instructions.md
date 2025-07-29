# GitHub Copilot Instructions - CLI Toolkit Framework

## 🚀 Project Overview
This is an enterprise-grade TypeScript CLI framework emphasizing **performance optimization**, **dependency injection**, and **zero-copy operations**.

## 🏗️ Architectural Patterns

### Dependency Injection (Primary Pattern)
- **Container**: `EnhancedServiceContainer` with lifecycle management
- **Lifetimes**: `Transient`, `Singleton`, `Scoped` 
- **Pattern**: Always register services before resolution, prefer constructor injection
- **Example**: `container.register(token, implementation, ServiceLifetime.Singleton)`

### Zero-Copy Performance Optimization
- **Core Principle**: Minimize memory allocations using string views and buffer reuse
- **Implementation**: `StringView` interface with slice operations instead of substring()
- **Pattern**: Use `PatternCache` for regex compilation, `EnhancedParsingPool` for object reuse
- **Performance Target**: 100K+ operations/second with >95% cache hit rates

### Memory Management Architecture
- **Object Pooling**: `AdvancedObjectPool<T>` with adaptive sizing (70-85% performance gains)
- **Buffer Pooling**: `BufferPoolManager` for string/ArrayBuffer reuse
- **Memory Optimization**: `AdvancedMemoryOptimizer` with leak detection
- **Global Manager**: `globalPoolManager` coordinates all pools with unified analytics

### Execution Pipeline Design
- **Middleware**: `ValidationMiddleware`, `TimingMiddleware`, `LoggingMiddleware`, `ErrorHandlingMiddleware`
- **Pipeline**: Request → Validation → Execution → Response with async/await patterns
- **Error Handling**: Comprehensive error boundary with performance metrics

## 🛠️ Key Integration Patterns

### CLI Framework Usage
```typescript
const framework = new EnhancedCliFramework({
  container: new EnhancedServiceContainer(),
  enableMetrics: true,
  enableObjectPooling: true
});

// Register services with proper lifecycle
framework.registerService(parserToken, OptimizedParser, ServiceLifetime.Singleton);
```

### Performance Monitoring Integration
```typescript
const monitor = new EnhancedPerformanceMonitor();
const benchmark = monitor.createBenchmark('operation-name');
// Automatically integrates with pool analytics and memory optimization
```

### Memory Optimization Patterns
```typescript
// Use object pools for high-frequency operations
const pool = globalPoolManager.getPool('parseResult');
const result = pool.acquire();
try {
  // Use result
} finally {
  pool.release(result);
}

// Leverage memory manager for buffer operations
const buffer = globalMemoryManager.getStringBuffer(1024);
```

## 🎯 Development Guidelines

### Performance-First Approach
- **Always** check if object pooling is beneficial for repeated operations
- Use `zero-copy` parsing patterns for string operations
- Monitor `pool hit rates` (target >90%) and `memory usage`
- Integrate with `AIPerformanceOptimizer` for automatic tuning

### Service Architecture
- **Register early**: Service registration should happen during bootstrap
- **Resolve late**: Service resolution at point of use
- **Lifecycle awareness**: Choose appropriate service lifetime based on usage patterns
- **Dependency mapping**: Explicit dependency declaration for circular detection

### Error Handling Standards
- Use structured error handling with the execution pipeline
- Include performance metrics in error reporting
- Leverage middleware for cross-cutting concerns (logging, timing, validation)

### Memory Management Best Practices
- Enable automatic memory optimization: `globalMemoryManager.optimizeMemory()`
- Use weak references for caches: `WeakReferenceCache`
- Monitor memory leaks: `AdvancedMemoryOptimizer.detectLeaks()`
- Apply buffer pooling for frequent string operations

## 🧪 Testing Patterns
- **Performance Tests**: Target >100K operations/second for parsing operations
- **Pool Analytics**: Verify >90% hit rates in object pools
- **Memory Leak Detection**: Use `AdvancedMemoryOptimizer` in test environments
- **Dependency Injection**: Test service resolution and lifecycle management

## 🔧 Configuration Conventions
- Pool configuration: `{ initialSize: 10, maxSize: 100, enableMetrics: true }`
- Memory thresholds: `{ warning: 512MB, critical: 1GB }`
- Performance targets: `124K+ parses/second` with `96%+ cache hit rates`

## 📊 Observability Integration
- Pool metrics automatically exposed via `globalPoolManager.getAnalytics()`
- Memory reports available through `globalMemoryManager.getMemoryReport()`
- Performance benchmarks integrated with `EnhancedPerformanceMonitor`
- AI-powered optimization via `AIPerformanceOptimizer` with machine learning insights

This framework prioritizes enterprise-grade performance through advanced memory management, sophisticated dependency injection, and comprehensive observability while maintaining developer ergonomics.

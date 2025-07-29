/**
 * Network Performance Optimizer for CLI Toolkit
 * Optimizes HTTP requests, API calls, and network operations
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import * as https from 'https';
import * as http from 'http';

export interface NetworkConfig {
    enableConnectionPooling: boolean;
    enableCompression: boolean;
    enableCaching: boolean;
    enableRetry: boolean;
    maxConnections: number;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    compressionThreshold: number; // bytes
    cacheTimeout: number; // ms
}

export interface NetworkStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    cacheHits: number;
    compressionSavings: number; // bytes saved
    connectionReuse: number;
    retryCount: number;
}

export interface RequestOptions {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    enableCache?: boolean;
    enableCompression?: boolean;
    enableRetry?: boolean;
    priority?: 'low' | 'normal' | 'high';
}

export interface NetworkResponse<T = any> {
    data: T;
    status: number;
    headers: Record<string, string>;
    responseTime: number;
    fromCache: boolean;
    compressed: boolean;
    connectionReused: boolean;
}

export class NetworkPerformanceOptimizer extends EventEmitter {
    private config: NetworkConfig = {
        enableConnectionPooling: true,
        enableCompression: true,
        enableCaching: true,
        enableRetry: true,
        maxConnections: 10,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        compressionThreshold: 1024,
        cacheTimeout: 300000 // 5 minutes
    };

    private stats: NetworkStats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        cacheHits: 0,
        compressionSavings: 0,
        connectionReuse: 0,
        retryCount: 0
    };

    private responseCache = new Map<string, { data: any; timestamp: number; compressed: boolean }>();
    private connectionPool = new Map<string, http.Agent | https.Agent>();
    private responseTimes: number[] = [];
    private requestQueue: Array<{ options: RequestOptions; resolve: Function; reject: Function }> = [];
    private activeRequests = 0;
    private maxConcurrentRequests = 5;

    constructor(config?: Partial<NetworkConfig>) {
        super();
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.initializeOptimizations();
    }

    /**
     * Initialize network optimizations
     */
    private initializeOptimizations(): void {
        console.log('🌐 Initializing Network Performance Optimizations');

        if (this.config.enableConnectionPooling) {
            this.initializeConnectionPooling();
        }

        // Set up request processing
        this.processRequestQueue();

        console.log('✅ Network optimizer initialized');
    }

    /**
     * Initialize connection pooling
     */
    private initializeConnectionPooling(): void {
        // Create HTTP and HTTPS agents with connection pooling
        const httpAgent = new http.Agent({
            keepAlive: true,
            maxSockets: this.config.maxConnections,
            maxFreeSockets: Math.floor(this.config.maxConnections / 2),
            timeout: this.config.timeout
        });

        const httpsAgent = new https.Agent({
            keepAlive: true,
            maxSockets: this.config.maxConnections,
            maxFreeSockets: Math.floor(this.config.maxConnections / 2),
            timeout: this.config.timeout
        });

        this.connectionPool.set('http:', httpAgent);
        this.connectionPool.set('https:', httpsAgent);

        console.log(`🔗 Connection pooling enabled (${this.config.maxConnections} max connections)`);
    }

    /**
     * Make optimized HTTP request
     */
    async request<T = any>(options: RequestOptions): Promise<NetworkResponse<T>> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ options, resolve, reject });
        });
    }

    /**
     * Process request queue with concurrency control
     */
    private async processRequestQueue(): Promise<void> {
        setInterval(async () => {
            while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
                const { options, resolve, reject } = this.requestQueue.shift()!;
                this.activeRequests++;
                
                try {
                    const response = await this.executeRequest(options);
                    resolve(response);
                } catch (error) {
                    reject(error);
                } finally {
                    this.activeRequests--;
                }
            }
        }, 10);
    }

    /**
     * Execute HTTP request with all optimizations
     */
    private async executeRequest<T>(options: RequestOptions): Promise<NetworkResponse<T>> {
        const startTime = performance.now();
        this.stats.totalRequests++;

        try {
            // Check cache first
            if (this.shouldUseCache(options)) {
                const cachedResponse = this.getCachedResponse<T>(options);
                if (cachedResponse) {
                    this.stats.cacheHits++;
                    this.recordResponseTime(performance.now() - startTime);
                    this.emit('network:cache-hit', { url: options.url });
                    return cachedResponse;
                }
            }

            // Execute request with retries
            const response = await this.executeWithRetry(options);
            
            // Cache successful responses
            if (this.shouldCacheResponse(options, response)) {
                this.cacheResponse(options, response);
            }

            this.stats.successfulRequests++;
            this.recordResponseTime(response.responseTime);
            this.emit('network:success', { url: options.url, responseTime: response.responseTime });

            return response;

        } catch (error) {
            this.stats.failedRequests++;
            this.emit('network:error', { url: options.url, error });
            throw error;
        }
    }

    /**
     * Execute request with retry logic
     */
    private async executeWithRetry<T>(options: RequestOptions): Promise<NetworkResponse<T>> {
        const maxAttempts = (options.enableRetry ?? this.config.enableRetry) ? 
                           this.config.retryAttempts : 1;
        
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await this.executeHttpRequest<T>(options);
            } catch (error) {
                lastError = error as Error;
                
                if (attempt < maxAttempts) {
                    this.stats.retryCount++;
                    const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    await this.delay(delay);
                    this.emit('network:retry', { url: options.url, attempt, delay });
                }
            }
        }

        throw lastError;
    }

    /**
     * Execute actual HTTP request
     */
    private async executeHttpRequest<T>(options: RequestOptions): Promise<NetworkResponse<T>> {
        const startTime = performance.now();
        
        return new Promise((resolve, reject) => {
            const url = new URL(options.url);
            const isHttps = url.protocol === 'https:';
            const agent = this.connectionPool.get(url.protocol);
            
            // Prepare request options
            const requestOptions: any = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: { ...options.headers },
                timeout: options.timeout || this.config.timeout,
                agent: this.config.enableConnectionPooling ? agent : undefined
            };

            // Add compression headers
            if (this.shouldUseCompression(options)) {
                requestOptions.headers['Accept-Encoding'] = 'gzip, deflate, br';
            }

            // Add standard headers
            if (!requestOptions.headers['User-Agent']) {
                requestOptions.headers['User-Agent'] = 'CLI-Toolkit-Optimizer/1.0';
            }

            const moduleToUse = isHttps ? https : http;
            const req = moduleToUse.request(requestOptions, (res) => {
                let data = Buffer.alloc(0);
                let compressed = false;

                // Handle compression
                let stream = res;
                if (res.headers['content-encoding']) {
                    const encoding = res.headers['content-encoding'];
                    compressed = true;
                    
                    if (encoding === 'gzip') {
                        const zlib = require('zlib');
                        stream = res.pipe(zlib.createGunzip());
                    } else if (encoding === 'deflate') {
                        const zlib = require('zlib');
                        stream = res.pipe(zlib.createInflate());
                    } else if (encoding === 'br') {
                        const zlib = require('zlib');
                        stream = res.pipe(zlib.createBrotliDecompress());
                    }
                }

                stream.on('data', (chunk: Buffer) => {
                    data = Buffer.concat([data, chunk]);
                });

                stream.on('end', () => {
                    const endTime = performance.now();
                    const responseTime = endTime - startTime;

                    // Track compression savings
                    if (compressed && res.headers['content-length']) {
                        const originalSize = parseInt(res.headers['content-length'], 10);
                        const decompressedSize = data.length;
                        this.stats.compressionSavings += Math.max(0, originalSize - decompressedSize);
                    }

                    // Track connection reuse
                    if (res.headers.connection === 'keep-alive') {
                        this.stats.connectionReuse++;
                    }

                    let parsedData: T;
                    try {
                        const contentType = res.headers['content-type'] || '';
                        if (contentType.includes('application/json')) {
                            parsedData = JSON.parse(data.toString());
                        } else {
                            parsedData = data.toString() as any;
                        }
                    } catch {
                        parsedData = data.toString() as any;
                    }

                    const response: NetworkResponse<T> = {
                        data: parsedData,
                        status: res.statusCode || 0,
                        headers: res.headers as Record<string, string>,
                        responseTime,
                        fromCache: false,
                        compressed,
                        connectionReused: res.headers.connection === 'keep-alive'
                    };

                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(response);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });

                stream.on('error', reject);
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            // Send request body if present
            if (options.body) {
                const body = typeof options.body === 'string' ? 
                           options.body : JSON.stringify(options.body);
                
                if (!requestOptions.headers['Content-Type']) {
                    requestOptions.headers['Content-Type'] = 'application/json';
                }
                
                req.write(body);
            }

            req.end();
        });
    }

    /**
     * Check if request should use cache
     */
    private shouldUseCache(options: RequestOptions): boolean {
        return (options.enableCache ?? this.config.enableCaching) &&
               (options.method === 'GET' || !options.method);
    }

    /**
     * Get cached response
     */
    private getCachedResponse<T>(options: RequestOptions): NetworkResponse<T> | null {
        const cacheKey = this.getCacheKey(options);
        const cached = this.responseCache.get(cacheKey);
        
        if (!cached) return null;
        
        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
            this.responseCache.delete(cacheKey);
            return null;
        }

        return {
            data: cached.data,
            status: 200,
            headers: {},
            responseTime: 0,
            fromCache: true,
            compressed: cached.compressed,
            connectionReused: false
        };
    }

    /**
     * Check if response should be cached
     */
    private shouldCacheResponse<T>(options: RequestOptions, response: NetworkResponse<T>): boolean {
        return this.shouldUseCache(options) &&
               response.status >= 200 && response.status < 300 &&
               (options.method === 'GET' || !options.method);
    }

    /**
     * Cache response
     */
    private cacheResponse<T>(options: RequestOptions, response: NetworkResponse<T>): void {
        const cacheKey = this.getCacheKey(options);
        this.responseCache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now(),
            compressed: response.compressed
        });

        // Cleanup old cache entries
        this.cleanupCache();
    }

    /**
     * Generate cache key
     */
    private getCacheKey(options: RequestOptions): string {
        const url = options.url;
        const method = options.method || 'GET';
        const headers = JSON.stringify(options.headers || {});
        return `${method}:${url}:${headers}`;
    }

    /**
     * Cleanup expired cache entries
     */
    private cleanupCache(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];
        
        for (const [key, cached] of this.responseCache.entries()) {
            if (now - cached.timestamp > this.config.cacheTimeout) {
                expiredKeys.push(key);
            }
        }
        
        for (const key of expiredKeys) {
            this.responseCache.delete(key);
        }
    }

    /**
     * Check if compression should be used
     */
    private shouldUseCompression(options: RequestOptions): boolean {
        return options.enableCompression ?? this.config.enableCompression;
    }

    /**
     * Record response time for statistics
     */
    private recordResponseTime(time: number): void {
        this.responseTimes.push(time);
        
        // Keep only recent response times
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
        
        this.stats.averageResponseTime = 
            this.responseTimes.reduce((sum, t) => sum + t, 0) / this.responseTimes.length;
    }

    /**
     * Delay utility for retries
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Batch multiple requests for efficiency
     */
    async batchRequests<T>(requests: RequestOptions[]): Promise<NetworkResponse<T>[]> {
        console.log(`🚀 Executing batch of ${requests.length} requests`);
        
        // Group requests by priority
        const highPriority = requests.filter(r => r.priority === 'high');
        const normalPriority = requests.filter(r => r.priority === 'normal' || !r.priority);
        const lowPriority = requests.filter(r => r.priority === 'low');
        
        const results: NetworkResponse<T>[] = [];
        
        // Execute high priority first
        for (const group of [highPriority, normalPriority, lowPriority]) {
            if (group.length === 0) continue;
            
            const batchResults = await Promise.allSettled(
                group.map(request => this.request<T>(request))
            );
            
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    // Create error response
                    results.push({
                        data: null as any,
                        status: 0,
                        headers: {},
                        responseTime: 0,
                        fromCache: false,
                        compressed: false,
                        connectionReused: false
                    });
                }
            }
        }
        
        return results;
    }

    /**
     * Prefetch resources for performance
     */
    async prefetch(urls: string[]): Promise<void> {
        console.log(`🔄 Prefetching ${urls.length} resources`);
        
        const prefetchOptions: RequestOptions[] = urls.map(url => ({
            url,
            method: 'GET',
            priority: 'low',
            enableCache: true
        }));
        
        // Execute prefetch requests without waiting
        this.batchRequests(prefetchOptions).catch(error => {
            console.warn('Prefetch failed:', error);
        });
    }

    /**
     * Get network statistics
     */
    getStats(): NetworkStats {
        return { ...this.stats };
    }

    /**
     * Get comprehensive network performance report
     */
    getNetworkReport(): string {
        const successRate = this.stats.totalRequests > 0 ? 
                          (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0;
        const cacheHitRate = this.stats.totalRequests > 0 ? 
                           (this.stats.cacheHits / this.stats.totalRequests) * 100 : 0;
        const connectionReuseRate = this.stats.successfulRequests > 0 ? 
                                  (this.stats.connectionReuse / this.stats.successfulRequests) * 100 : 0;
        
        return `
🌐 NETWORK PERFORMANCE OPTIMIZATION REPORT
==========================================

📊 Configuration:
• Connection Pooling: ${this.config.enableConnectionPooling ? 'Enabled' : 'Disabled'} (${this.config.maxConnections} max)
• Compression: ${this.config.enableCompression ? 'Enabled' : 'Disabled'} (>${this.config.compressionThreshold} bytes)
• Caching: ${this.config.enableCaching ? 'Enabled' : 'Disabled'} (${this.config.cacheTimeout / 1000}s TTL)
• Retry Logic: ${this.config.enableRetry ? 'Enabled' : 'Disabled'} (${this.config.retryAttempts} attempts)
• Request Timeout: ${this.config.timeout / 1000}s

📈 Performance Metrics:
• Total Requests: ${this.stats.totalRequests}
• Success Rate: ${successRate.toFixed(1)}%
• Average Response Time: ${this.stats.averageResponseTime.toFixed(2)}ms
• Cache Hit Rate: ${cacheHitRate.toFixed(1)}%
• Connection Reuse Rate: ${connectionReuseRate.toFixed(1)}%
• Retry Count: ${this.stats.retryCount}

💾 Optimization Results:
• Cache Hits: ${this.stats.cacheHits}
• Compression Savings: ${(this.stats.compressionSavings / 1024).toFixed(1)}KB
• Connections Reused: ${this.stats.connectionReuse}
• Failed Requests: ${this.stats.failedRequests}

🎯 Performance Insights:
• Active Requests: ${this.activeRequests}/${this.maxConcurrentRequests}
• Queued Requests: ${this.requestQueue.length}
• Cache Entries: ${this.responseCache.size}
• Response Time Samples: ${this.responseTimes.length}

🏆 Recommendations:
${this.generateNetworkRecommendations()}
        `.trim();
    }

    /**
     * Generate network performance recommendations
     */
    private generateNetworkRecommendations(): string {
        const recommendations: string[] = [];
        const successRate = this.stats.totalRequests > 0 ? 
                          (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0;
        const cacheHitRate = this.stats.totalRequests > 0 ? 
                           (this.stats.cacheHits / this.stats.totalRequests) * 100 : 0;
        
        if (successRate < 95) {
            recommendations.push('• Consider increasing retry attempts or timeout values');
        }
        
        if (cacheHitRate < 30 && this.stats.totalRequests > 10) {
            recommendations.push('• Enable caching or increase cache timeout for better performance');
        }
        
        if (this.stats.averageResponseTime > 1000) {
            recommendations.push('• Consider enabling compression or connection pooling');
        }
        
        if (this.stats.connectionReuse < this.stats.successfulRequests * 0.5) {
            recommendations.push('• Enable or optimize connection pooling');
        }
        
        if (this.requestQueue.length > 10) {
            recommendations.push('• Consider increasing maxConcurrentRequests for better throughput');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('• Network performance is optimal! 🎉');
        }
        
        return recommendations.join('\n');
    }

    /**
     * Update network configuration
     */
    updateConfig(newConfig: Partial<NetworkConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // Reinitialize if connection pooling settings changed
        if (newConfig.enableConnectionPooling !== undefined || newConfig.maxConnections !== undefined) {
            this.initializeConnectionPooling();
        }
        
        console.log('⚙️ Network optimizer configuration updated');
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.responseCache.clear();
        console.log('🧹 Network cache cleared');
    }

    /**
     * Cleanup and shutdown
     */
    destroy(): void {
        // Close all connection pools
        for (const agent of this.connectionPool.values()) {
            if (agent.destroy) {
                agent.destroy();
            }
        }
        
        this.connectionPool.clear();
        this.responseCache.clear();
        this.requestQueue = [];
        this.removeAllListeners();
        
        console.log('🧹 Network Performance Optimizer destroyed');
    }
}

// Export global instance
export const globalNetworkOptimizer = new NetworkPerformanceOptimizer();

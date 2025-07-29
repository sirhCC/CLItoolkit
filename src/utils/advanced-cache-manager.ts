/**
 * Advanced Caching Layer for CLI Toolkit
 * Multi-tier caching with intelligent eviction and persistence
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheConfig {
    enableMemoryCache: boolean;
    enableDiskCache: boolean;
    enableDistributedCache: boolean;
    memoryCacheSize: number; // in MB
    diskCacheSize: number; // in MB
    cacheDirectory: string;
    ttl: number; // time to live in milliseconds
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
}

export interface CacheEntry<T = any> {
    key: string;
    value: T;
    createdAt: number;
    lastAccessed: number;
    accessCount: number;
    size: number; // in bytes
    ttl: number;
    compressed: boolean;
    encrypted: boolean;
    version: string;
    metadata?: Record<string, any>;
}

export interface CacheStats {
    memoryHits: number;
    memoryMisses: number;
    diskHits: number;
    diskMisses: number;
    totalSize: number;
    entryCount: number;
    hitRatio: number;
    averageAccessTime: number;
    evictionCount: number;
}

export class AdvancedCacheManager extends EventEmitter {
    private config: CacheConfig = {
        enableMemoryCache: true,
        enableDiskCache: true,
        enableDistributedCache: false,
        memoryCacheSize: 128, // 128 MB
        diskCacheSize: 1024, // 1 GB
        cacheDirectory: './cache',
        ttl: 3600000, // 1 hour
        compressionEnabled: true,
        encryptionEnabled: false
    };

    private memoryCache = new Map<string, CacheEntry>();
    private accessQueue: string[] = []; // LRU tracking
    private stats: CacheStats = {
        memoryHits: 0,
        memoryMisses: 0,
        diskHits: 0,
        diskMisses: 0,
        totalSize: 0,
        entryCount: 0,
        hitRatio: 0,
        averageAccessTime: 0,
        evictionCount: 0
    };

    private accessTimes: number[] = [];
    private isInitialized = false;
    private encryptionKey?: Buffer;

    constructor(config?: Partial<CacheConfig>) {
        super();
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }

    /**
     * Initialize the cache system
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log('🚀 Initializing Advanced Cache Manager');

        try {
            if (this.config.enableDiskCache) {
                await this.initializeDiskCache();
            }

            if (this.config.encryptionEnabled) {
                await this.initializeEncryption();
            }

            // Load existing cache from disk
            if (this.config.enableDiskCache) {
                await this.loadCacheFromDisk();
            }

            this.isInitialized = true;
            console.log('✅ Advanced Cache Manager initialized');
            
            this.emit('cache:initialized', {
                memoryEnabled: this.config.enableMemoryCache,
                diskEnabled: this.config.enableDiskCache,
                encryptionEnabled: this.config.encryptionEnabled
            });

        } catch (error) {
            console.error('❌ Failed to initialize cache:', error);
            throw error;
        }
    }

    /**
     * Initialize disk cache directory
     */
    private async initializeDiskCache(): Promise<void> {
        try {
            await fs.mkdir(this.config.cacheDirectory, { recursive: true });
            
            // Create subdirectories for organization
            await fs.mkdir(path.join(this.config.cacheDirectory, 'data'), { recursive: true });
            await fs.mkdir(path.join(this.config.cacheDirectory, 'metadata'), { recursive: true });
            
            console.log(`📁 Disk cache initialized at: ${this.config.cacheDirectory}`);
        } catch (error) {
            console.error('Failed to initialize disk cache:', error);
            throw error;
        }
    }

    /**
     * Initialize encryption for sensitive cache data
     */
    private async initializeEncryption(): Promise<void> {
        // Generate or load encryption key
        const keyPath = path.join(this.config.cacheDirectory, '.cache-key');
        
        try {
            const existingKey = await fs.readFile(keyPath);
            this.encryptionKey = existingKey;
        } catch {
            // Generate new key
            this.encryptionKey = crypto.randomBytes(32);
            await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
        }
        
        console.log('🔐 Cache encryption initialized');
    }

    /**
     * Get value from cache with intelligent fallback
     */
    async get<T>(key: string): Promise<T | null> {
        const startTime = performance.now();

        try {
            // Try memory cache first
            if (this.config.enableMemoryCache) {
                const memoryResult = await this.getFromMemory<T>(key);
                if (memoryResult !== null) {
                    this.recordAccessTime(performance.now() - startTime);
                    this.stats.memoryHits++;
                    this.updateHitRatio();
                    this.emit('cache:hit', { key, source: 'memory' });
                    return memoryResult;
                }
                this.stats.memoryMisses++;
            }

            // Try disk cache
            if (this.config.enableDiskCache) {
                const diskResult = await this.getFromDisk<T>(key);
                if (diskResult !== null) {
                    // Promote to memory cache
                    if (this.config.enableMemoryCache) {
                        await this.setInMemory(key, diskResult);
                    }
                    
                    this.recordAccessTime(performance.now() - startTime);
                    this.stats.diskHits++;
                    this.updateHitRatio();
                    this.emit('cache:hit', { key, source: 'disk' });
                    return diskResult;
                }
                this.stats.diskMisses++;
            }

            // Cache miss
            this.updateHitRatio();
            this.emit('cache:miss', { key });
            return null;

        } catch (error) {
            console.error(`Cache get error for key ${key}:`, error);
            this.emit('cache:error', { key, operation: 'get', error });
            return null;
        }
    }

    /**
     * Set value in cache with intelligent distribution
     */
    async set<T>(
        key: string, 
        value: T, 
        options?: { ttl?: number; metadata?: Record<string, any> }
    ): Promise<void> {
        try {
            const entry: CacheEntry<T> = {
                key,
                value,
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                accessCount: 0,
                size: this.calculateSize(value),
                ttl: options?.ttl || this.config.ttl,
                compressed: false,
                encrypted: false,
                version: '1.0.0',
                metadata: options?.metadata
            };

            // Store in memory cache if enabled
            if (this.config.enableMemoryCache) {
                await this.setInMemory(key, value, entry);
            }

            // Store in disk cache if enabled
            if (this.config.enableDiskCache) {
                await this.setOnDisk(key, value, entry);
            }

            this.stats.entryCount++;
            this.emit('cache:set', { key, size: entry.size });

        } catch (error) {
            console.error(`Cache set error for key ${key}:`, error);
            this.emit('cache:error', { key, operation: 'set', error });
            throw error;
        }
    }

    /**
     * Get from memory cache
     */
    private async getFromMemory<T>(key: string): Promise<T | null> {
        const entry = this.memoryCache.get(key);
        
        if (!entry) {
            return null;
        }

        // Check TTL
        if (this.isExpired(entry)) {
            this.memoryCache.delete(key);
            this.removeFromAccessQueue(key);
            return null;
        }

        // Update access information
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        this.updateAccessQueue(key);

        return entry.value as T;
    }

    /**
     * Set in memory cache with LRU eviction
     */
    private async setInMemory<T>(key: string, value: T, entry?: CacheEntry<T>): Promise<void> {
        if (!entry) {
            entry = {
                key,
                value,
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                accessCount: 1,
                size: this.calculateSize(value),
                ttl: this.config.ttl,
                compressed: false,
                encrypted: false,
                version: '1.0.0'
            };
        }

        // Check memory limit and evict if necessary
        const currentMemoryUsage = this.calculateMemoryUsage();
        const maxMemoryBytes = this.config.memoryCacheSize * 1024 * 1024;

        if (currentMemoryUsage + entry.size > maxMemoryBytes) {
            await this.evictLRUEntries(entry.size);
        }

        this.memoryCache.set(key, entry);
        this.updateAccessQueue(key);
        this.stats.totalSize += entry.size;
    }

    /**
     * Get from disk cache
     */
    private async getFromDisk<T>(key: string): Promise<T | null> {
        try {
            const metadataPath = path.join(this.config.cacheDirectory, 'metadata', `${this.hashKey(key)}.json`);
            const dataPath = path.join(this.config.cacheDirectory, 'data', `${this.hashKey(key)}.cache`);

            // Read metadata
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const metadata: CacheEntry = JSON.parse(metadataContent);

            // Check TTL
            if (this.isExpired(metadata)) {
                await this.deleteDiskEntry(key);
                return null;
            }

            // Read data
            let data = await fs.readFile(dataPath);

            // Decrypt if necessary
            if (metadata.encrypted && this.encryptionKey) {
                data = this.decrypt(data);
            }

            // Decompress if necessary
            if (metadata.compressed) {
                data = await this.decompress(data);
            }

            const value = JSON.parse(data.toString());

            // Update access information
            metadata.lastAccessed = Date.now();
            metadata.accessCount++;
            await fs.writeFile(metadataPath, JSON.stringify(metadata));

            return value as T;

        } catch (error) {
            // File not found or corrupted
            return null;
        }
    }

    /**
     * Set on disk cache
     */
    private async setOnDisk<T>(key: string, value: T, entry: CacheEntry<T>): Promise<void> {
        try {
            const hashedKey = this.hashKey(key);
            const metadataPath = path.join(this.config.cacheDirectory, 'metadata', `${hashedKey}.json`);
            const dataPath = path.join(this.config.cacheDirectory, 'data', `${hashedKey}.cache`);

            let data = Buffer.from(JSON.stringify(value));

            // Compress if enabled
            if (this.config.compressionEnabled) {
                data = await this.compress(data);
                entry.compressed = true;
            }

            // Encrypt if enabled
            if (this.config.encryptionEnabled && this.encryptionKey) {
                data = this.encrypt(data);
                entry.encrypted = true;
            }

            // Write data and metadata
            await fs.writeFile(dataPath, data);
            await fs.writeFile(metadataPath, JSON.stringify(entry));

        } catch (error) {
            console.error(`Failed to write disk cache for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Check if cache entry is expired
     */
    private isExpired(entry: CacheEntry): boolean {
        return Date.now() - entry.createdAt > entry.ttl;
    }

    /**
     * Hash cache key for filename safety
     */
    private hashKey(key: string): string {
        return crypto.createHash('sha256').update(key).digest('hex');
    }

    /**
     * Calculate size of value in bytes
     */
    private calculateSize(value: any): number {
        return Buffer.byteLength(JSON.stringify(value), 'utf8');
    }

    /**
     * Calculate current memory usage
     */
    private calculateMemoryUsage(): number {
        return Array.from(this.memoryCache.values())
            .reduce((total, entry) => total + entry.size, 0);
    }

    /**
     * Update access queue for LRU tracking
     */
    private updateAccessQueue(key: string): void {
        this.removeFromAccessQueue(key);
        this.accessQueue.push(key);
    }

    /**
     * Remove key from access queue
     */
    private removeFromAccessQueue(key: string): void {
        const index = this.accessQueue.indexOf(key);
        if (index > -1) {
            this.accessQueue.splice(index, 1);
        }
    }

    /**
     * Evict LRU entries to make space
     */
    private async evictLRUEntries(requiredSpace: number): Promise<void> {
        let freedSpace = 0;
        
        while (freedSpace < requiredSpace && this.accessQueue.length > 0) {
            const keyToEvict = this.accessQueue.shift();
            if (keyToEvict && this.memoryCache.has(keyToEvict)) {
                const entry = this.memoryCache.get(keyToEvict);
                if (entry) {
                    freedSpace += entry.size;
                    this.stats.totalSize -= entry.size;
                    this.stats.evictionCount++;
                }
                this.memoryCache.delete(keyToEvict);
                this.emit('cache:eviction', { key: keyToEvict, reason: 'lru' });
            }
        }
    }

    /**
     * Compress data using built-in compression
     */
    private async compress(data: Buffer): Promise<Buffer> {
        const zlib = await import('zlib');
        return new Promise((resolve, reject) => {
            zlib.gzip(data, (err, compressed) => {
                if (err) reject(err);
                else resolve(compressed);
            });
        });
    }

    /**
     * Decompress data
     */
    private async decompress(data: Buffer): Promise<Buffer> {
        const zlib = await import('zlib');
        return new Promise((resolve, reject) => {
            zlib.gunzip(data, (err, decompressed) => {
                if (err) reject(err);
                else resolve(decompressed);
            });
        });
    }

    /**
     * Encrypt data
     */
    private encrypt(data: Buffer): Buffer {
        if (!this.encryptionKey) throw new Error('Encryption key not initialized');
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        
        return Buffer.concat([iv, encrypted]);
    }

    /**
     * Decrypt data
     */
    private decrypt(data: Buffer): Buffer {
        if (!this.encryptionKey) throw new Error('Encryption key not initialized');
        
        const iv = data.slice(0, 16);
        const encrypted = data.slice(16);
        const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
        
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }

    /**
     * Delete disk entry
     */
    private async deleteDiskEntry(key: string): Promise<void> {
        try {
            const hashedKey = this.hashKey(key);
            const metadataPath = path.join(this.config.cacheDirectory, 'metadata', `${hashedKey}.json`);
            const dataPath = path.join(this.config.cacheDirectory, 'data', `${hashedKey}.cache`);
            
            await Promise.all([
                fs.unlink(metadataPath).catch(() => {}),
                fs.unlink(dataPath).catch(() => {})
            ]);
        } catch (error) {
            // Ignore deletion errors
        }
    }

    /**
     * Load existing cache from disk
     */
    private async loadCacheFromDisk(): Promise<void> {
        try {
            const metadataDir = path.join(this.config.cacheDirectory, 'metadata');
            const files = await fs.readdir(metadataDir);
            
            let loadedCount = 0;
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const metadataPath = path.join(metadataDir, file);
                        const content = await fs.readFile(metadataPath, 'utf-8');
                        const metadata: CacheEntry = JSON.parse(content);
                        
                        // Check if still valid
                        if (!this.isExpired(metadata)) {
                            // Only load frequently accessed items to memory
                            if (metadata.accessCount >= 3) {
                                const value = await this.getFromDisk(metadata.key);
                                if (value !== null) {
                                    await this.setInMemory(metadata.key, value, metadata);
                                    loadedCount++;
                                }
                            }
                        } else {
                            // Clean up expired entries
                            await this.deleteDiskEntry(metadata.key);
                        }
                    } catch (error) {
                        // Skip corrupted entries
                        console.warn(`Skipping corrupted cache entry: ${file}`);
                    }
                }
            }
            
            console.log(`📥 Loaded ${loadedCount} cache entries from disk`);
        } catch (error) {
            console.warn('Failed to load cache from disk:', error);
        }
    }

    /**
     * Record access time for performance tracking
     */
    private recordAccessTime(time: number): void {
        this.accessTimes.push(time);
        
        // Keep only recent access times (last 1000)
        if (this.accessTimes.length > 1000) {
            this.accessTimes = this.accessTimes.slice(-1000);
        }
        
        this.stats.averageAccessTime = 
            this.accessTimes.reduce((sum, t) => sum + t, 0) / this.accessTimes.length;
    }

    /**
     * Update hit ratio statistics
     */
    private updateHitRatio(): void {
        const totalRequests = this.stats.memoryHits + this.stats.memoryMisses + 
                            this.stats.diskHits + this.stats.diskMisses;
        const totalHits = this.stats.memoryHits + this.stats.diskHits;
        
        this.stats.hitRatio = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    }

    /**
     * Delete entry from cache
     */
    async delete(key: string): Promise<boolean> {
        let deleted = false;
        
        // Delete from memory
        if (this.memoryCache.has(key)) {
            const entry = this.memoryCache.get(key);
            if (entry) {
                this.stats.totalSize -= entry.size;
                this.stats.entryCount--;
            }
            this.memoryCache.delete(key);
            this.removeFromAccessQueue(key);
            deleted = true;
        }
        
        // Delete from disk
        if (this.config.enableDiskCache) {
            await this.deleteDiskEntry(key);
            deleted = true;
        }
        
        if (deleted) {
            this.emit('cache:delete', { key });
        }
        
        return deleted;
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        // Clear memory cache
        this.memoryCache.clear();
        this.accessQueue = [];
        
        // Clear disk cache
        if (this.config.enableDiskCache) {
            try {
                const dataDir = path.join(this.config.cacheDirectory, 'data');
                const metadataDir = path.join(this.config.cacheDirectory, 'metadata');
                
                const [dataFiles, metadataFiles] = await Promise.all([
                    fs.readdir(dataDir).catch(() => []),
                    fs.readdir(metadataDir).catch(() => [])
                ]);
                
                await Promise.all([
                    ...dataFiles.map(file => fs.unlink(path.join(dataDir, file)).catch(() => {})),
                    ...metadataFiles.map(file => fs.unlink(path.join(metadataDir, file)).catch(() => {}))
                ]);
            } catch (error) {
                console.warn('Failed to clear disk cache:', error);
            }
        }
        
        // Reset stats
        this.stats = {
            memoryHits: 0,
            memoryMisses: 0,
            diskHits: 0,
            diskMisses: 0,
            totalSize: 0,
            entryCount: 0,
            hitRatio: 0,
            averageAccessTime: 0,
            evictionCount: 0
        };
        
        this.emit('cache:cleared');
        console.log('🧹 Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Get comprehensive cache report
     */
    getCacheReport(): string {
        const memoryUsageMB = this.calculateMemoryUsage() / (1024 * 1024);
        const maxMemoryMB = this.config.memoryCacheSize;
        const memoryUtilization = (memoryUsageMB / maxMemoryMB) * 100;
        
        return `
🚀 ADVANCED CACHE PERFORMANCE REPORT
===================================

📊 Configuration:
• Memory Cache: ${this.config.enableMemoryCache ? 'Enabled' : 'Disabled'} (${this.config.memoryCacheSize}MB limit)
• Disk Cache: ${this.config.enableDiskCache ? 'Enabled' : 'Disabled'} (${this.config.diskCacheSize}MB limit)
• Compression: ${this.config.compressionEnabled ? 'Enabled' : 'Disabled'}
• Encryption: ${this.config.encryptionEnabled ? 'Enabled' : 'Disabled'}
• Default TTL: ${this.config.ttl / 1000}s

📈 Performance Metrics:
• Hit Ratio: ${this.stats.hitRatio.toFixed(1)}%
• Memory Hits: ${this.stats.memoryHits}
• Disk Hits: ${this.stats.diskHits}
• Total Misses: ${this.stats.memoryMisses + this.stats.diskMisses}
• Average Access Time: ${this.stats.averageAccessTime.toFixed(2)}ms
• Evictions: ${this.stats.evictionCount}

💾 Storage Information:
• Total Entries: ${this.stats.entryCount}
• Memory Usage: ${memoryUsageMB.toFixed(1)}MB (${memoryUtilization.toFixed(1)}% of limit)
• Memory Entries: ${this.memoryCache.size}
• LRU Queue Length: ${this.accessQueue.length}

🎯 Cache Efficiency:
• Memory Hit Rate: ${this.stats.memoryHits > 0 ? ((this.stats.memoryHits / (this.stats.memoryHits + this.stats.memoryMisses)) * 100).toFixed(1) : 0}%
• Disk Hit Rate: ${this.stats.diskHits > 0 ? ((this.stats.diskHits / (this.stats.diskHits + this.stats.diskMisses)) * 100).toFixed(1) : 0}%
• Eviction Rate: ${this.stats.entryCount > 0 ? ((this.stats.evictionCount / this.stats.entryCount) * 100).toFixed(1) : 0}%

🏆 Recommendations:
${this.generateRecommendations()}
        `.trim();
    }

    /**
     * Generate performance recommendations
     */
    private generateRecommendations(): string {
        const recommendations: string[] = [];
        
        if (this.stats.hitRatio < 70) {
            recommendations.push('• Consider increasing cache size or TTL');
        }
        
        if (this.stats.evictionCount > this.stats.entryCount * 0.3) {
            recommendations.push('• Memory cache may be too small for workload');
        }
        
        if (this.stats.averageAccessTime > 50) {
            recommendations.push('• Consider enabling compression or disk optimization');
        }
        
        if (this.stats.diskHits > this.stats.memoryHits * 2) {
            recommendations.push('• Consider increasing memory cache size');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('• Cache performance is optimal! 🎉');
        }
        
        return recommendations.join('\n');
    }

    /**
     * Update cache configuration
     */
    updateConfig(newConfig: Partial<CacheConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Cache configuration updated');
    }

    /**
     * Cleanup and shutdown
     */
    async destroy(): Promise<void> {
        // Persist important cache entries to disk
        if (this.config.enableDiskCache && this.memoryCache.size > 0) {
            console.log('💾 Persisting cache entries to disk...');
            
            const promises = Array.from(this.memoryCache.entries()).map(async ([key, entry]) => {
                if (entry.accessCount >= 2) { // Only persist frequently used entries
                    try {
                        await this.setOnDisk(key, entry.value, entry);
                    } catch (error) {
                        console.warn(`Failed to persist cache entry ${key}:`, error);
                    }
                }
            });
            
            await Promise.all(promises);
        }
        
        this.removeAllListeners();
        console.log('🧹 Advanced Cache Manager destroyed');
    }
}

// Export global instance
export const globalCacheManager = new AdvancedCacheManager();

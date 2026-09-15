/* =========================================================================
 * In-Memory TTL Cache Service (cacheService.js)
 * 
 * Provides high-speed, zero-dependency caching for hot search queries,
 * taxonomy feeds, and metadata lookups. Automatically evicts stale entries.
 * ========================================================================= */

class MemoryCache {
    constructor(defaultTtlMs = 10 * 60 * 1000) { // 10 minutes default TTL
        this.cache = new Map();
        this.defaultTtlMs = defaultTtlMs;
        this.maxSize = 1000; // prevent memory bloat
    }

    /**
     * Get a value from the cache
     * @param {string} key
     * @returns {*} cached value or null if expired/missing
     */
    get(key) {
        if (!this.cache.has(key)) return null;

        const record = this.cache.get(key);
        if (Date.now() > record.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return record.data;
    }

    /**
     * Set a value in the cache with optional TTL
     * @param {string} key
     * @param {*} data
     * @param {number} [ttlMs]
     */
    set(key, data, ttlMs = this.defaultTtlMs) {
        // Enforce max size with simple FIFO eviction
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttlMs
        });
    }

    /**
     * Delete a key from cache
     * @param {string} key
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all cached data
     */
    clear() {
        this.cache.clear();
    }
}

const searchCache = new MemoryCache(10 * 60 * 1000); // 10 mins for search
const papersCache = new MemoryCache(5 * 60 * 1000);  // 5 mins for feed

module.exports = {
    searchCache,
    papersCache,
    MemoryCache
};

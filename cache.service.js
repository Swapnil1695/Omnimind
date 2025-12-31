const redis = require('../config/redis');
const { logger } = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = redis;
    this.defaultTTL = 3600; // 1 hour in seconds
  }

  // Get cached data
  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Set cache with TTL
  async set(key, value, ttl = this.defaultTTL) {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  // Delete cache
  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // Get or set cache (cache-aside pattern)
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Fetch fresh data
      const freshData = await fetchFn();
      
      // Cache the fresh data
      await this.set(key, freshData, ttl);
      
      return freshData;
    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      // If cache fails, try to fetch directly
      try {
        return await fetchFn();
      } catch (fetchError) {
        throw fetchError;
      }
    }
  }

  // Invalidate cache by pattern
  async invalidate(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return keys.length;
    } catch (error) {
      logger.error('Cache invalidate error:', error);
      return 0;
    }
  }

  // Get multiple cache keys
  async mget(keys) {
    try {
      const values = await this.client.mGet(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  // Set multiple cache keys
  async mset(keyValuePairs, ttl = this.defaultTTL) {
    try {
      const pipeline = this.client.multi();
      
      keyValuePairs.forEach(([key, value]) => {
        pipeline.setEx(key, ttl, JSON.stringify(value));
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  // Increment counter
  async incr(key, amount = 1) {
    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      logger.error('Cache incr error:', error);
      return null;
    }
  }

  // Decrement counter
  async decr(key, amount = 1) {
    try {
      return await this.client.decrBy(key, amount);
    } catch (error) {
      logger.error('Cache decr error:', error);
      return null;
    }
  }

  // Add to sorted set
  async zadd(key, score, member) {
    try {
      return await this.client.zAdd(key, { score, value: member });
    } catch (error) {
      logger.error('Cache zadd error:', error);
      return 0;
    }
  }

  // Get range from sorted set
  async zrange(key, start, stop, withScores = false) {
    try {
      const options = withScores ? { REV: true, WITHSCORES: true } : { REV: true };
      return await this.client.zRange(key, start, stop, options);
    } catch (error) {
      logger.error('Cache zrange error:', error);
      return [];
    }
  }

  // Set cache with custom logic
  async setWithCondition(key, value, conditionFn, ttl = this.defaultTTL) {
    try {
      const existing = await this.get(key);
      
      if (existing === null || conditionFn(existing)) {
        await this.set(key, value, ttl);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Cache setWithCondition error:', error);
      return false;
    }
  }

  // Cache user-specific data
  async cacheUserData(userId, dataKey, data, ttl = 1800) {
    const key = `user:${userId}:${dataKey}`;
    return await this.set(key, data, ttl);
  }

  // Get user-specific cached data
  async getUserCachedData(userId, dataKey) {
    const key = `user:${userId}:${dataKey}`;
    return await this.get(key);
  }

  // Cache API responses
  async cacheApiResponse(endpoint, params, data, ttl = 300) {
    const key = this.generateCacheKey('api', endpoint, params);
    return await this.set(key, data, ttl);
  }

  // Get cached API response
  async getCachedApiResponse(endpoint, params) {
    const key = this.generateCacheKey('api', endpoint, params);
    return await this.get(key);
  }

  // Generate cache key
  generateCacheKey(prefix, ...parts) {
    const stringifiedParts = parts.map(part => {
      if (typeof part === 'object') {
        return JSON.stringify(part);
      }
      return String(part);
    });
    
    return `${prefix}:${stringifiedParts.join(':')}`;
  }

  // Get cache stats
  async getStats() {
    try {
      const info = await this.client.info();
      const keys = await this.client.keys('*');
      
      return {
        totalKeys: keys.length,
        memory: info.split('\r\n').find(line => line.startsWith('used_memory_human')),
        connectedClients: info.split('\r\n').find(line => line.startsWith('connected_clients')),
        hits: info.split('\r\n').find(line => line.startsWith('keyspace_hits')),
        misses: info.split('\r\n').find(line => line.startsWith('keyspace_misses'))
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }

  // Clear all cache (use with caution)
  async flushAll() {
    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Cache flushAll error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();
import Redis from 'ioredis';
import { logger } from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  logger.warn('REDIS_URL not found in environment variables. Redis features will be disabled.');
}

export const redis = redisUrl ? new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);
    return delay;
  }
}) : null;

if (redis) {
  redis.on('connect', () => logger.info('✅ Connected to Upstash Redis'));
  redis.on('error', (err) => logger.error('❌ Redis Connection Error:', err));
}

/**
 * High IQ Caching Utility
 */
export const cache = {
  /**
   * Get a value from cache
   */
  get: async (key) => {
    if (!redis) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error(`Cache Get Error [${key}]:`, err);
      return null;
    }
  },

  /**
   * Set a value in cache with TTL (seconds)
   */
  set: async (key, value, ttl = 300) => {
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      logger.error(`Cache Set Error [${key}]:`, err);
    }
  },

  /**
   * Delete a key from cache
   */
  del: async (key) => {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (err) {
      logger.error(`Cache Del Error [${key}]:`, err);
    }
  }
};

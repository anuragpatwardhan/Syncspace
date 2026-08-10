import Redis from 'ioredis';
import { env } from './env.js';

let redis: Redis | null = null;
let redisAvailable = false;

export function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    redis.on('ready', () => {
      redisAvailable = true;
      console.log('[redis] connected');
    });
    redis.on('error', (err) => {
      if (redisAvailable) console.warn('[redis] error', err.message);
      redisAvailable = false;
    });
    redis.connect().catch(() => {
      console.warn('[redis] unavailable — running without pub/sub (single-node mode)');
    });
    return redis;
  } catch {
    return null;
  }
}

export function isRedisReady() {
  return redisAvailable;
}

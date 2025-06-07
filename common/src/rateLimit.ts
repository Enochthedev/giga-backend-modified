import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

export function basicRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false
  });
}

export function redisRateLimit() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
  client.connect().catch(() => {});
  return rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({ sendCommand: (...args: string[]) => client.sendCommand(args as any) })
  });
}

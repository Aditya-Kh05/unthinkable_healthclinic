import IORedis from 'ioredis';

// Allow fallback to standard local redis if REDIS_URL not present.
// Upstash URLs start with rediss://
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export default connection;

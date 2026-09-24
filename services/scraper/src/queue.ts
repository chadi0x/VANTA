import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableReadyCheck: false
});

export const SCRAPER_QUEUE_NAME = 'vanta-macro-scraper';

export let scraperQueue: Queue | null = null;

export async function initQueue(): Promise<Queue | null> {
  try {
    await redisConnection.connect();
    console.log('[Queue] Connected to Redis for BullMQ task management.');
    
    scraperQueue = new Queue(SCRAPER_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: 200
      }
    });

    return scraperQueue;
  } catch (err: any) {
    console.warn(`[Queue WARNING] Redis connection unavailable (${err.message}). BullMQ queue switching to in-process scheduler fallback.`);
    return null;
  }
}

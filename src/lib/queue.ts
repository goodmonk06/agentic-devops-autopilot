import { Queue } from 'bullmq';
import { redis } from './redis';

// インシデント処理キュー
export const incidentQueue = new Queue('incident-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // 最新100件のみ保持
    },
    removeOnFail: {
      count: 500, // 失敗したジョブは500件保持
    },
  },
});

console.log('✓ BullMQ queue initialized');

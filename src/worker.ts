import { createIncidentWorker } from './workers/incident.worker';

// ワーカープロセス起動
console.log('Starting DevOps Autopilot Worker...');

const worker = createIncidentWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await worker.close();
  process.exit(0);
});

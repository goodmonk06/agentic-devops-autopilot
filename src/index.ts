import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { env } from './config/env';
import { webhookRoutes } from './routes/webhook';
import { repoConfigRoutes } from './routes/repo-config';
import { incidentRoutes } from './routes/incident';

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

async function start() {
  try {
    // CORS設定
    await fastify.register(cors, {
      origin: true,
    });

    // 静的ファイル配信（ダッシュボード用）
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../public'),
      prefix: '/',
    });

    // ルート登録
    await fastify.register(webhookRoutes);
    await fastify.register(repoConfigRoutes);
    await fastify.register(incidentRoutes);

    // ヘルスチェック
    fastify.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
      };
    });

    // サーバー起動
    await fastify.listen({
      port: env.PORT,
      host: env.HOST,
    });

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🤖 Agentic DevOps Autopilot                            ║
║                                                           ║
║   Server running at: http://${env.HOST}:${env.PORT}              ║
║   Environment: ${env.NODE_ENV.padEnd(10)}                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await fastify.close();
  process.exit(0);
});

start();

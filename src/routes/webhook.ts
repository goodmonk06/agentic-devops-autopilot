import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { incidentService } from '../services/incident.service';
import type { GitHubWebhookPayload, RailwayWebhookPayload } from '../types';

export async function webhookRoutes(fastify: FastifyInstance) {
  /**
   * GitHub Webhook エンドポイント
   * GitHub Actions の失敗イベントを受信
   */
  fastify.post('/webhook/github', async (request, reply) => {
    try {
      const payload = request.body as GitHubWebhookPayload;
      const event = request.headers['x-github-event'] as string;

      console.log(`Received GitHub webhook: ${event}`);

      // リポジトリ設定を取得
      const repoConfig = await prisma.repoConfig.findUnique({
        where: {
          githubOwner_githubRepo: {
            githubOwner: payload.repository.owner.login,
            githubRepo: payload.repository.name,
          },
        },
      });

      if (!repoConfig) {
        console.warn(`Repository not configured: ${payload.repository.owner.login}/${payload.repository.name}`);
        return reply.status(200).send({ message: 'Repository not configured, ignoring' });
      }

      if (!repoConfig.isActive) {
        return reply.status(200).send({ message: 'Repository monitoring disabled' });
      }

      // workflow_run イベント（ビルド失敗）
      if (event === 'workflow_run' && payload.workflow_run) {
        const { workflow_run } = payload;

        if (workflow_run.conclusion === 'failure') {
          await incidentService.createIncident({
            repoId: repoConfig.id,
            type: 'BUILD_FAILURE',
            source: 'GITHUB_ACTIONS',
            title: `Build failed: ${workflow_run.name}`,
            description: `Workflow "${workflow_run.name}" failed on branch ${workflow_run.head_branch}`,
            payloadJson: payload,
            severity: 'high',
            commitSha: workflow_run.head_sha,
            branch: workflow_run.head_branch,
          });
        }
      }

      // workflow_job イベント（ジョブ失敗）
      if (event === 'workflow_job' && payload.workflow_job) {
        const { workflow_job } = payload;

        if (workflow_job.conclusion === 'failure') {
          await incidentService.createIncident({
            repoId: repoConfig.id,
            type: 'TEST_FAILURE',
            source: 'GITHUB_ACTIONS',
            title: `Job failed: ${workflow_job.name}`,
            description: `Job "${workflow_job.name}" failed`,
            payloadJson: payload,
            severity: 'high',
          });
        }
      }

      // check_run イベント（チェック失敗）
      if (event === 'check_run' && (payload as any).check_run) {
        const checkRun = (payload as any).check_run;

        if (checkRun.conclusion === 'failure') {
          await incidentService.createIncident({
            repoId: repoConfig.id,
            type: 'TEST_FAILURE',
            source: 'GITHUB_ACTIONS',
            title: `Check failed: ${checkRun.name}`,
            description: checkRun.output?.summary || 'Check run failed',
            payloadJson: payload,
            severity: 'medium',
            commitSha: checkRun.head_sha,
          });
        }
      }

      return reply.status(200).send({ success: true });
    } catch (error) {
      console.error('Error processing GitHub webhook:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Railway Webhook エンドポイント
   * Railway のデプロイ/エラー通知を受信
   */
  fastify.post('/webhook/railway', async (request, reply) => {
    try {
      const payload = request.body as RailwayWebhookPayload;

      console.log(`Received Railway webhook: ${payload.type}`);

      // Railway サービスIDからリポジトリ設定を取得
      const repoConfig = await prisma.repoConfig.findFirst({
        where: {
          railwayServiceId: payload.service?.id,
          isActive: true,
        },
      });

      if (!repoConfig) {
        console.warn(`Railway service not configured: ${payload.service?.id}`);
        return reply.status(200).send({ message: 'Service not configured, ignoring' });
      }

      // デプロイ失敗
      if (payload.type === 'DEPLOY_FAILED' || payload.deployment?.status === 'FAILED') {
        await incidentService.createIncident({
          repoId: repoConfig.id,
          type: 'DEPLOY_FAILURE',
          source: 'RAILWAY',
          title: `Railway deployment failed: ${payload.service?.name}`,
          description: payload.error?.message || 'Deployment failed',
          payloadJson: payload,
          severity: 'critical',
          commitSha: payload.deployment?.meta?.commitSha,
          branch: payload.deployment?.meta?.branch,
        });
      }

      // ランタイムエラー
      if (payload.type === 'RUNTIME_ERROR' || payload.type === 'CRASH') {
        await incidentService.createIncident({
          repoId: repoConfig.id,
          type: 'RUNTIME_ERROR',
          source: 'RAILWAY',
          title: `Railway runtime error: ${payload.service?.name}`,
          description: payload.error?.message || 'Runtime error occurred',
          payloadJson: payload,
          severity: 'critical',
        });
      }

      return reply.status(200).send({ success: true });
    } catch (error) {
      console.error('Error processing Railway webhook:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Webhook ヘルスチェック
   */
  fastify.get('/webhook/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}

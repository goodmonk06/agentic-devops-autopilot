import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

// バリデーションスキーマ
const createRepoConfigSchema = z.object({
  githubOwner: z.string().min(1),
  githubRepo: z.string().min(1),
  defaultBranch: z.string().default('main'),
  railwayServiceId: z.string().optional(),
  railwayProjectId: z.string().optional(),
  alertWebhookUrl: z.string().url().optional(),
});

const updateRepoConfigSchema = createRepoConfigSchema.partial();

export async function repoConfigRoutes(fastify: FastifyInstance) {
  /**
   * リポジトリ設定一覧
   */
  fastify.get('/api/repo-configs', async (request, reply) => {
    const configs = await prisma.repoConfig.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { incidents: true },
        },
      },
    });

    return { data: configs };
  });

  /**
   * リポジトリ設定詳細
   */
  fastify.get<{ Params: { id: string } }>('/api/repo-configs/:id', async (request, reply) => {
    const config = await prisma.repoConfig.findUnique({
      where: { id: request.params.id },
      include: {
        incidents: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!config) {
      return reply.status(404).send({ error: 'Config not found' });
    }

    return { data: config };
  });

  /**
   * リポジトリ設定作成
   */
  fastify.post('/api/repo-configs', async (request, reply) => {
    try {
      const body = createRepoConfigSchema.parse(request.body);

      const config = await prisma.repoConfig.create({
        data: body,
      });

      return reply.status(201).send({ data: config });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  /**
   * リポジトリ設定更新
   */
  fastify.patch<{ Params: { id: string } }>('/api/repo-configs/:id', async (request, reply) => {
    try {
      const body = updateRepoConfigSchema.parse(request.body);

      const config = await prisma.repoConfig.update({
        where: { id: request.params.id },
        data: body,
      });

      return { data: config };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  /**
   * リポジトリ設定削除
   */
  fastify.delete<{ Params: { id: string } }>('/api/repo-configs/:id', async (request, reply) => {
    await prisma.repoConfig.delete({
      where: { id: request.params.id },
    });

    return { success: true };
  });

  /**
   * リポジトリ有効/無効切り替え
   */
  fastify.post<{ Params: { id: string } }>('/api/repo-configs/:id/toggle', async (request, reply) => {
    const config = await prisma.repoConfig.findUnique({
      where: { id: request.params.id },
    });

    if (!config) {
      return reply.status(404).send({ error: 'Config not found' });
    }

    const updated = await prisma.repoConfig.update({
      where: { id: request.params.id },
      data: { isActive: !config.isActive },
    });

    return { data: updated };
  });
}

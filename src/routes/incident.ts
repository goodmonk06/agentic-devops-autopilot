import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { incidentService } from '../services/incident.service';
import { IncidentStatus } from '@prisma/client';

const updateIncidentSchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
});

export async function incidentRoutes(fastify: FastifyInstance) {
  /**
   * インシデント一覧
   */
  fastify.get('/api/incidents', async (request, reply) => {
    const query = request.query as any;

    const incidents = await incidentService.listIncidents({
      repoId: query.repoId,
      status: query.status,
      limit: query.limit ? parseInt(query.limit) : 50,
    });

    return { data: incidents };
  });

  /**
   * インシデント詳細
   */
  fastify.get<{ Params: { id: string } }>('/api/incidents/:id', async (request, reply) => {
    const incident = await incidentService.getIncident(request.params.id);

    if (!incident) {
      return reply.status(404).send({ error: 'Incident not found' });
    }

    return { data: incident };
  });

  /**
   * インシデント状態更新
   */
  fastify.patch<{ Params: { id: string } }>('/api/incidents/:id', async (request, reply) => {
    try {
      const body = updateIncidentSchema.parse(request.body);

      if (!body.status) {
        return reply.status(400).send({ error: 'Status is required' });
      }

      const incident = await incidentService.updateIncidentStatus(
        request.params.id,
        body.status
      );

      return { data: incident };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  /**
   * インシデント統計
   */
  fastify.get('/api/incidents/stats/summary', async (request, reply) => {
    const { prisma } = await import('../lib/prisma');

    const [total, open, resolved, byType, bySeverity] = await Promise.all([
      prisma.incident.count(),
      prisma.incident.count({ where: { status: { in: ['OPEN', 'ANALYZING', 'IN_PROGRESS'] } } }),
      prisma.incident.count({ where: { status: 'RESOLVED' } }),
      prisma.incident.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.incident.groupBy({
        by: ['severity'],
        _count: true,
      }),
    ]);

    return {
      data: {
        total,
        open,
        resolved,
        byType,
        bySeverity,
      },
    };
  });
}

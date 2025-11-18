import { prisma } from '../lib/prisma';
import { incidentQueue } from '../lib/queue';
import type { CreateIncidentParams } from '../types';
import type { Incident, IncidentStatus } from '@prisma/client';

export class IncidentService {
  /**
   * インシデントを作成してキューに投入
   */
  async createIncident(params: CreateIncidentParams): Promise<Incident> {
    const incident = await prisma.incident.create({
      data: {
        repoId: params.repoId,
        type: params.type,
        source: params.source,
        title: params.title,
        description: params.description,
        payloadJson: params.payloadJson,
        severity: params.severity ?? 'medium',
        prNumber: params.prNumber,
        commitSha: params.commitSha,
        branch: params.branch,
      },
      include: {
        repo: true,
      },
    });

    // BullMQキューにジョブ追加
    await incidentQueue.add('process-incident', {
      incidentId: incident.id,
    });

    console.log(`✓ Incident created: ${incident.id} (${incident.type})`);
    return incident;
  }

  /**
   * インシデント一覧取得
   */
  async listIncidents(options?: {
    repoId?: string;
    status?: IncidentStatus;
    limit?: number;
  }) {
    return prisma.incident.findMany({
      where: {
        ...(options?.repoId && { repoId: options.repoId }),
        ...(options?.status && { status: options.status }),
      },
      include: {
        repo: true,
        actions: true,
        agentRuns: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit ?? 50,
    });
  }

  /**
   * インシデント詳細取得
   */
  async getIncident(id: string) {
    return prisma.incident.findUnique({
      where: { id },
      include: {
        repo: true,
        actions: {
          orderBy: { createdAt: 'desc' },
        },
        agentRuns: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * インシデント状態更新
   */
  async updateIncidentStatus(id: string, status: IncidentStatus) {
    return prisma.incident.update({
      where: { id },
      data: {
        status,
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
    });
  }
}

export const incidentService = new IncidentService();

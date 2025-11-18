import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncidentService } from '../incident.service';
import type { CreateIncidentParams } from '../../types';

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    incident: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock Queue
vi.mock('../../lib/queue', () => ({
  incidentQueue: {
    add: vi.fn(),
  },
}));

describe('IncidentService', () => {
  let service: IncidentService;

  beforeEach(() => {
    service = new IncidentService();
    vi.clearAllMocks();
  });

  describe('createIncident', () => {
    it('should create an incident with required fields', async () => {
      const { prisma } = await import('../../lib/prisma');
      const { incidentQueue } = await import('../../lib/queue');

      const mockIncident = {
        id: 'incident-1',
        repoId: 'repo-1',
        type: 'BUILD_FAILURE',
        source: 'GITHUB_ACTIONS',
        title: 'Build failed',
        status: 'OPEN',
        severity: 'high',
        payloadJson: {},
        createdAt: new Date(),
        repo: {
          id: 'repo-1',
          githubOwner: 'test',
          githubRepo: 'repo',
        },
      };

      (prisma.incident.create as any).mockResolvedValue(mockIncident);
      (incidentQueue.add as any).mockResolvedValue({});

      const params: CreateIncidentParams = {
        repoId: 'repo-1',
        type: 'BUILD_FAILURE',
        source: 'GITHUB_ACTIONS',
        title: 'Build failed',
        payloadJson: {},
      };

      const result = await service.createIncident(params);

      expect(result).toEqual(mockIncident);
      expect(prisma.incident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          repoId: 'repo-1',
          type: 'BUILD_FAILURE',
          source: 'GITHUB_ACTIONS',
          title: 'Build failed',
        }),
        include: { repo: true },
      });
      expect(incidentQueue.add).toHaveBeenCalledWith('process-incident', {
        incidentId: 'incident-1',
      });
    });

    it('should apply default severity when not provided', async () => {
      const { prisma } = await import('../../lib/prisma');

      const params: CreateIncidentParams = {
        repoId: 'repo-1',
        type: 'TEST_FAILURE',
        source: 'GITHUB_ACTIONS',
        title: 'Test failed',
        payloadJson: {},
      };

      await service.createIncident(params);

      expect(prisma.incident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'medium',
        }),
        include: { repo: true },
      });
    });
  });

  describe('listIncidents', () => {
    it('should return incidents with default limit', async () => {
      const { prisma } = await import('../../lib/prisma');

      const mockIncidents = [
        { id: '1', title: 'Incident 1' },
        { id: '2', title: 'Incident 2' },
      ];

      (prisma.incident.findMany as any).mockResolvedValue(mockIncidents);

      const result = await service.listIncidents();

      expect(result).toEqual(mockIncidents);
      expect(prisma.incident.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          repo: true,
          actions: true,
          agentRuns: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should filter by repoId when provided', async () => {
      const { prisma } = await import('../../lib/prisma');

      await service.listIncidents({ repoId: 'repo-1' });

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { repoId: 'repo-1' },
        })
      );
    });

    it('should filter by status when provided', async () => {
      const { prisma } = await import('../../lib/prisma');

      await service.listIncidents({ status: 'RESOLVED' });

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'RESOLVED' },
        })
      );
    });

    it('should respect custom limit', async () => {
      const { prisma } = await import('../../lib/prisma');

      await service.listIncidents({ limit: 10 });

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });

  describe('updateIncidentStatus', () => {
    it('should update status to RESOLVED and set resolvedAt', async () => {
      const { prisma } = await import('../../lib/prisma');

      const mockUpdated = {
        id: 'incident-1',
        status: 'RESOLVED',
        resolvedAt: expect.any(Date),
      };

      (prisma.incident.update as any).mockResolvedValue(mockUpdated);

      const result = await service.updateIncidentStatus('incident-1', 'RESOLVED');

      expect(prisma.incident.update).toHaveBeenCalledWith({
        where: { id: 'incident-1' },
        data: {
          status: 'RESOLVED',
          resolvedAt: expect.any(Date),
        },
      });
    });

    it('should update status without setting resolvedAt for non-RESOLVED status', async () => {
      const { prisma } = await import('../../lib/prisma');

      await service.updateIncidentStatus('incident-1', 'IN_PROGRESS');

      expect(prisma.incident.update).toHaveBeenCalledWith({
        where: { id: 'incident-1' },
        data: {
          status: 'IN_PROGRESS',
        },
      });
    });
  });
});

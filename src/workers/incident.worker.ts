import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { openaiService } from '../services/openai.service';
import { githubService } from '../services/github.service';

interface IncidentJobData {
  incidentId: string;
}

/**
 * インシデント処理ワーカー
 * OpenAIで解析→GitHub/Railwayにアクション実行
 */
async function processIncident(job: Job<IncidentJobData>) {
  const { incidentId } = job.data;

  console.log(`Processing incident: ${incidentId}`);

  // インシデント情報取得
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: { repo: true },
  });

  if (!incident) {
    throw new Error(`Incident not found: ${incidentId}`);
  }

  // 状態を「解析中」に更新
  await prisma.incident.update({
    where: { id: incidentId },
    data: { status: 'ANALYZING' },
  });

  try {
    const startTime = Date.now();

    // OpenAIで解析
    const analysis = await openaiService.analyzeIncident({
      type: incident.type,
      title: incident.title,
      description: incident.description || undefined,
      payloadJson: incident.payloadJson,
      source: incident.source,
    });

    const duration = Date.now() - startTime;

    // AgentRun記録
    await prisma.agentRun.create({
      data: {
        incidentId: incident.id,
        analysis: analysis as any,
        duration,
        success: true,
      },
    });

    console.log(`✓ AI analysis completed for incident ${incidentId}`);

    // 推奨アクションを実行
    for (const action of analysis.suggestedActions) {
      try {
        await executeAction(incident, action, analysis);
      } catch (error) {
        console.error(`Failed to execute action:`, error);
        // アクション失敗を記録
        await prisma.incidentAction.create({
          data: {
            incidentId: incident.id,
            actionType: action.type as any,
            description: action.description,
            success: false,
            errorMsg: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    // 状態を「アクション可能」に更新
    await prisma.incident.update({
      where: { id: incidentId },
      data: { status: 'ACTIONABLE' },
    });

    console.log(`✓ Incident processing completed: ${incidentId}`);
  } catch (error) {
    console.error(`Error processing incident ${incidentId}:`, error);

    // AgentRun失敗記録
    await prisma.agentRun.create({
      data: {
        incidentId: incident.id,
        success: false,
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    // 状態を戻す
    await prisma.incident.update({
      where: { id: incidentId },
      data: { status: 'OPEN' },
    });

    throw error;
  }
}

/**
 * アクションを実行
 */
async function executeAction(
  incident: any,
  action: { type: string; description: string; priority: string },
  analysis: any
) {
  const { repo } = incident;

  switch (action.type) {
    case 'COMMENT_PR':
      if (incident.prNumber) {
        const message = await openaiService.generateCommentMessage(analysis);
        await githubService.commentOnPR(
          repo.githubOwner,
          repo.githubRepo,
          incident.prNumber,
          message
        );

        await prisma.incidentAction.create({
          data: {
            incidentId: incident.id,
            actionType: 'COMMENT_PR',
            description: `Commented on PR #${incident.prNumber}`,
            resultJson: { prNumber: incident.prNumber },
            success: true,
          },
        });
      }
      break;

    case 'CREATE_ISSUE':
      const issueBody = await openaiService.generateCommentMessage(analysis);
      const issueNumber = await githubService.createIssue(
        repo.githubOwner,
        repo.githubRepo,
        `[AutoPilot] ${incident.title}`,
        issueBody,
        ['incident', 'autopilot']
      );

      await prisma.incidentAction.create({
        data: {
          incidentId: incident.id,
          actionType: 'CREATE_ISSUE',
          description: `Created issue #${issueNumber}`,
          resultJson: { issueNumber },
          success: true,
        },
      });
      break;

    case 'NOTIFY_SLACK':
      if (repo.alertWebhookUrl) {
        await fetch(repo.alertWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Incident: ${incident.title}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${incident.title}*\n${analysis.summary}`,
                },
              },
            ],
          }),
        });

        await prisma.incidentAction.create({
          data: {
            incidentId: incident.id,
            actionType: 'NOTIFY_SLACK',
            description: 'Sent Slack notification',
            success: true,
          },
        });
      }
      break;

    default:
      console.log(`Skipping unsupported action type: ${action.type}`);
  }
}

export function createIncidentWorker() {
  const worker = new Worker<IncidentJobData>('incident-processing', processIncident, {
    connection: redis,
    concurrency: 3, // 並列実行数
  });

  worker.on('completed', (job) => {
    console.log(`✓ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`✗ Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('✓ Incident worker started');

  return worker;
}

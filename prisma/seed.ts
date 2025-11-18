import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.agentRun.deleteMany();
  await prisma.incidentAction.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.repoConfig.deleteMany();

  console.log('✓ Cleaned existing data');

  // Create demo repositories
  const demoRepo = await prisma.repoConfig.create({
    data: {
      githubOwner: 'demo-org',
      githubRepo: 'web-app',
      defaultBranch: 'main',
      railwayServiceId: 'srv-demo-123',
      railwayProjectId: 'prj-demo-456',
      isActive: true,
    },
  });

  const apiRepo = await prisma.repoConfig.create({
    data: {
      githubOwner: 'demo-org',
      githubRepo: 'api-service',
      defaultBranch: 'main',
      railwayServiceId: 'srv-api-789',
      alertWebhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX',
      isActive: true,
    },
  });

  const legacyRepo = await prisma.repoConfig.create({
    data: {
      githubOwner: 'demo-org',
      githubRepo: 'legacy-app',
      defaultBranch: 'master',
      isActive: false,
    },
  });

  console.log('✓ Created 3 repository configs');

  // Create demo incidents
  const buildFailure = await prisma.incident.create({
    data: {
      repoId: demoRepo.id,
      type: 'BUILD_FAILURE',
      source: 'GITHUB_ACTIONS',
      title: 'Build failed on main branch',
      description: 'TypeScript compilation errors in src/utils/validation.ts',
      status: 'RESOLVED',
      severity: 'high',
      branch: 'main',
      commitSha: 'a1b2c3d4e5f6',
      payloadJson: {
        workflow_run: {
          id: 123456,
          name: 'CI/CD Pipeline',
          conclusion: 'failure',
          html_url: 'https://github.com/demo-org/web-app/actions/runs/123456',
        },
      },
      resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  });

  const testFailure = await prisma.incident.create({
    data: {
      repoId: demoRepo.id,
      type: 'TEST_FAILURE',
      source: 'GITHUB_ACTIONS',
      title: 'Unit tests failing in authentication module',
      description: '3 tests failing in AuthService.test.ts',
      status: 'IN_PROGRESS',
      severity: 'medium',
      branch: 'feature/oauth',
      commitSha: 'f6e5d4c3b2a1',
      prNumber: 42,
      payloadJson: {
        workflow_job: {
          id: 789012,
          name: 'Test',
          conclusion: 'failure',
        },
      },
    },
  });

  const deployFailure = await prisma.incident.create({
    data: {
      repoId: apiRepo.id,
      type: 'DEPLOY_FAILURE',
      source: 'RAILWAY',
      title: 'Railway deployment failed: api-service',
      description: 'Database migration failed - column "user_id" already exists',
      status: 'ANALYZING',
      severity: 'critical',
      branch: 'main',
      commitSha: 'abc123def456',
      payloadJson: {
        deployment: {
          id: 'dep-xyz',
          status: 'FAILED',
        },
        error: {
          message: 'Migration failed',
        },
      },
    },
  });

  const runtimeError = await prisma.incident.create({
    data: {
      repoId: apiRepo.id,
      type: 'RUNTIME_ERROR',
      source: 'RAILWAY',
      title: 'Railway runtime error: api-service',
      description: 'Uncaught exception: Cannot read property "id" of undefined',
      status: 'OPEN',
      severity: 'high',
      payloadJson: {
        error: {
          message: 'Uncaught exception',
          stack: 'Error: Cannot read property "id" of undefined\n  at UserController...',
        },
      },
    },
  });

  console.log('✓ Created 4 demo incidents');

  // Create incident actions
  await prisma.incidentAction.create({
    data: {
      incidentId: buildFailure.id,
      actionType: 'CREATE_ISSUE',
      description: 'Created GitHub issue #123',
      success: true,
      resultJson: {
        issueNumber: 123,
        url: 'https://github.com/demo-org/web-app/issues/123',
      },
    },
  });

  await prisma.incidentAction.create({
    data: {
      incidentId: testFailure.id,
      actionType: 'COMMENT_PR',
      description: 'Commented on PR #42 with analysis',
      success: true,
      resultJson: {
        prNumber: 42,
        commentId: 987654,
      },
    },
  });

  await prisma.incidentAction.create({
    data: {
      incidentId: deployFailure.id,
      actionType: 'NOTIFY_SLACK',
      description: 'Sent notification to #alerts channel',
      success: true,
      resultJson: {
        channel: '#alerts',
        timestamp: '1234567890.123456',
      },
    },
  });

  console.log('✓ Created 3 incident actions');

  // Create agent runs
  await prisma.agentRun.create({
    data: {
      incidentId: buildFailure.id,
      model: 'gpt-4-turbo-preview',
      promptTokens: 1250,
      completionTokens: 380,
      totalTokens: 1630,
      duration: 3200,
      success: true,
      analysis: {
        hypothesis:
          'TypeScript compilation error due to incorrect type definition in validation utility',
        reproduction_steps: [
          'Clone the repository',
          'Check out commit a1b2c3d4e5f6',
          'Run npm install',
          'Run npm run build',
          'Observe compilation error in src/utils/validation.ts',
        ],
        suggested_actions: [
          {
            type: 'CREATE_ISSUE',
            description: 'Create a GitHub issue to track the TypeScript compilation error',
            priority: 'high',
          },
          {
            type: 'COMMENT_PR',
            description: 'If this is related to a PR, comment with the error details',
            priority: 'medium',
          },
        ],
        summary:
          'Build failure caused by TypeScript type mismatch in validation utilities. Recommend fixing type definitions and adding stricter type checks.',
      },
    },
  });

  await prisma.agentRun.create({
    data: {
      incidentId: testFailure.id,
      model: 'gpt-4-turbo-preview',
      promptTokens: 980,
      completionTokens: 420,
      totalTokens: 1400,
      duration: 2800,
      success: true,
      analysis: {
        hypothesis:
          'OAuth implementation tests failing due to mock data mismatch with new API contract',
        reproduction_steps: [
          'Check out feature/oauth branch',
          'Run npm test -- AuthService.test.ts',
          'Observe 3 failing tests related to token validation',
        ],
        suggested_actions: [
          {
            type: 'COMMENT_PR',
            description: 'Comment on PR #42 with test failure analysis and suggested fixes',
            priority: 'high',
          },
        ],
        summary:
          'Test failures in OAuth module due to updated API contract. Mock data needs to be updated to match new token structure.',
      },
    },
  });

  console.log('✓ Created 2 agent runs');

  // Summary
  const repoCount = await prisma.repoConfig.count();
  const incidentCount = await prisma.incident.count();
  const actionCount = await prisma.incidentAction.count();
  const agentRunCount = await prisma.agentRun.count();

  console.log('\n📊 Seed Summary:');
  console.log(`  - Repositories: ${repoCount}`);
  console.log(`  - Incidents: ${incidentCount}`);
  console.log(`  - Actions: ${actionCount}`);
  console.log(`  - Agent Runs: ${agentRunCount}`);
  console.log('\n✅ Seed completed successfully!\n');

  console.log('🎯 Demo Data:');
  console.log('  Repository: demo-org/web-app');
  console.log('  Repository: demo-org/api-service');
  console.log('  Repository: demo-org/legacy-app (inactive)');
  console.log('\n  Incidents:');
  console.log('    - Build failure (RESOLVED)');
  console.log('    - Test failure (IN_PROGRESS, PR #42)');
  console.log('    - Deploy failure (ANALYZING)');
  console.log('    - Runtime error (OPEN)');
  console.log('\n  Access dashboard at: http://localhost:3000\n');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

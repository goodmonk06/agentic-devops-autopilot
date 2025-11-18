# 🤖 Agentic DevOps Autopilot

**AI-powered DevOps automation platform for 24/7 incident monitoring and response**

Automatically detects GitHub Actions and Railway deployment failures, analyzes root causes with AI, and executes remediation actions - all while your team sleeps.

## Overview

Agentic DevOps Autopilot functions as an **AI-driven Site Reliability Engineer (SRE)** that:

- 🔍 **Monitors** GitHub Actions and Railway deployments 24/7
- 🧠 **Analyzes** incidents using OpenAI GPT-4 to identify root causes
- ⚡ **Responds** automatically with PR comments, issue creation, and alerts
- 📊 **Tracks** all incidents through an intuitive dashboard

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ / TypeScript |
| **API Framework** | Fastify |
| **Database** | PostgreSQL 15 + Prisma ORM |
| **Queue** | BullMQ + Redis |
| **AI** | OpenAI GPT-4 Turbo |
| **External APIs** | GitHub REST API, Railway GraphQL API |
| **Testing** | Vitest |
| **Container** | Docker + Docker Compose |

## Domain Model

### Core Entities

**RepoConfig** - Repository monitoring configuration
- GitHub repository identification (owner/repo)
- Railway service connection
- Alert webhook URLs
- Active/inactive status

**Incident** - Detected failure or error event
- Type: BUILD_FAILURE, TEST_FAILURE, DEPLOY_FAILURE, RUNTIME_ERROR, etc.
- Source: GITHUB_ACTIONS, RAILWAY, MANUAL
- Status: OPEN → ANALYZING → ACTIONABLE → IN_PROGRESS → RESOLVED
- Severity: low, medium, high, critical
- Linked to PR, commit, and branch

**IncidentAction** - Automated response action
- Type: COMMENT_PR, CREATE_ISSUE, NOTIFY_SLACK, ROLLBACK, etc.
- Execution result and success status

**AgentRun** - AI analysis log
- Model used and token consumption
- Analysis results (hypothesis, reproduction steps, suggested actions)
- Execution duration

### Entity Relationships

```
RepoConfig (1) ─── (N) Incident
Incident (1) ─── (N) IncidentAction
Incident (1) ─── (N) AgentRun
```

## Getting Started

### Requirements

- **Node.js** 18 or higher
- **Docker** and Docker Compose (for databases)
- **GitHub Personal Access Token** (optional, for GitHub integration)
- **OpenAI API Key** (optional, for AI analysis)
- **Railway API Token** (optional, for Railway integration)

### Quick Setup

The fastest way to get started:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/agentic-devops-autopilot.git
cd agentic-devops-autopilot

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env

# 4. Start PostgreSQL and Redis
make docker-dev

# 5. Setup database and seed demo data
make db-setup

# 6. Start the API server (terminal 1)
npm run dev

# 7. Start the worker (terminal 2)
npm run dev:worker

# 8. Open the dashboard
open http://localhost:3000
```

### Environment Variables

Edit `.env` with your configuration:

```env
# Required
DATABASE_URL="postgresql://devops:devops123@localhost:5432/devops_autopilot?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
PORT=3000

# Optional - for full functionality
GITHUB_TOKEN="ghp_your_token_here"
GITHUB_WEBHOOK_SECRET="your_webhook_secret"
RAILWAY_API_TOKEN="your_railway_token"
OPENAI_API_KEY="sk-your_openai_key"
```

**Note:** The application works without API keys - you can explore the UI with demo data. External integrations require valid tokens.

### Development Commands

```bash
# Development
npm run dev              # Start API server with hot reload
npm run dev:worker       # Start worker with hot reload

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed demo data
npm run db:reset         # Reset database (deletes all data)

# Docker
make docker-dev          # Start PostgreSQL + Redis only
make docker-up           # Start full stack in Docker
make docker-down         # Stop containers

# Utilities
npm run lint             # Check code style
npm run typecheck        # Check TypeScript types
make help                # Show all available commands
```

## Example Workflow

This implementation provides a complete vertical slice demonstrating the core functionality:

### 1. Repository Management

**Configure a repository to monitor:**

```bash
curl -X POST http://localhost:3000/api/repo-configs \
  -H "Content-Type: application/json" \
  -d '{
    "githubOwner": "myorg",
    "githubRepo": "myapp",
    "defaultBranch": "main",
    "railwayServiceId": "srv-abc123"
  }'
```

Or use the dashboard at http://localhost:3000 → Repositories tab → Add Repository

### 2. Incident Creation

**Via webhook (production):**
GitHub/Railway sends failure events to `/webhook/github` or `/webhook/railway`

**Manual creation (testing):**
```bash
curl -X POST http://localhost:3000/webhook/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: workflow_run" \
  -d @test/fixtures/github-workflow-failure.json
```

### 3. Automatic Processing

The worker automatically:
1. Picks up the incident from the queue
2. Analyzes with OpenAI (if configured)
3. Executes suggested actions:
   - Comments on PR with analysis
   - Creates GitHub issue
   - Sends Slack notification
4. Updates incident status

### 4. Dashboard Monitoring

Visit http://localhost:3000 to:
- View all incidents and their status
- See AI analysis results
- Manage repository configurations
- View statistics

### Demo Data

The seed script creates realistic demo data:

**Repositories:**
- `demo-org/web-app` - Active monitoring
- `demo-org/api-service` - Active with Slack alerts
- `demo-org/legacy-app` - Inactive

**Incidents:**
- Build failure on main branch (RESOLVED)
- Test failure in feature branch with PR #42 (IN_PROGRESS)
- Railway deployment failure (ANALYZING)
- Runtime error (OPEN)

Each incident includes AI analysis results and executed actions.

## API Endpoints

### Webhooks
- `POST /webhook/github` - Receive GitHub webhooks
- `POST /webhook/railway` - Receive Railway webhooks
- `GET /webhook/health` - Webhook health check

### Repository Config
- `GET /api/repo-configs` - List all repositories
- `GET /api/repo-configs/:id` - Get repository details
- `POST /api/repo-configs` - Add new repository
- `PATCH /api/repo-configs/:id` - Update repository
- `DELETE /api/repo-configs/:id` - Remove repository
- `POST /api/repo-configs/:id/toggle` - Toggle active status

### Incidents
- `GET /api/incidents` - List incidents (supports filtering)
- `GET /api/incidents/:id` - Get incident details
- `PATCH /api/incidents/:id` - Update incident status
- `GET /api/incidents/stats/summary` - Get statistics

### Health
- `GET /health` - Application health check

## Production Deployment

### Using Docker Compose

```bash
# 1. Configure environment variables
cp .env.example .env
# Edit .env with production values

# 2. Build and start all services
docker compose up -d

# 3. Run migrations
docker compose exec api npx prisma migrate deploy

# 4. Check status
docker compose ps
docker compose logs -f
```

The stack includes:
- API server (port 3000)
- Worker process
- PostgreSQL database
- Redis queue

### Railway Deployment

This application is optimized for Railway:

1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy!

Railway will automatically:
- Detect the Dockerfile
- Set up PostgreSQL and Redis services
- Run migrations on deploy

## Testing

The project includes comprehensive tests:

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run specific test file
npm test src/services/__tests__/incident.service.test.ts
```

**Test Coverage:**
- Error handling utilities
- Incident service business logic
- API validation
- (More tests can be added as needed)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
│  GitHub Actions │ Railway │ Slack │ OpenAI GPT-4           │
└────────┬────────┴─────────┴───────┴──────────────┬──────────┘
         │ Webhooks                    AI Analysis │
         ▼                                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Fastify API Server                         │
│  ┌──────────┬──────────┬──────────┬──────────────┐         │
│  │ Webhooks │ RepoAPI  │ Incident │  Dashboard   │         │
│  │  Routes  │  Routes  │  Routes  │   (Static)   │         │
│  └──────────┴──────────┴──────────┴──────────────┘         │
└────────┬────────────────────────────────────────────────────┘
         │ Create Incident
         ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL + Prisma ORM                        │
│  RepoConfig │ Incident │ IncidentAction │ AgentRun         │
└────────┬────────────────────────────────────────────────────┘
         │ Enqueue Job
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   BullMQ + Redis                            │
└────────┬────────────────────────────────────────────────────┘
         │ Process Job
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Worker Process                             │
│  1. Fetch Incident                                          │
│  2. AI Analysis (OpenAI GPT-4)                              │
│  3. Execute Actions (GitHub, Railway, Slack)                │
│  4. Record Results                                          │
└─────────────────────────────────────────────────────────────┘
```

## Future Extensions

### Phase 2: Auto-Remediation (Current Phase)
- ✅ Vertical slice implementation
- ✅ End-to-end testing
- ✅ Seed data and demo flow
- ✅ Production-ready Docker setup

### Phase 3: Intelligent PR Creation
- AI generates fix code
- Creates PR with automated tests
- Self-healing retry logic
- Auto-assign reviewers

### Phase 4: Predictive Maintenance
- Learn from historical incident patterns
- Predict failures before they occur
- Proactive health checks
- Automated optimization suggestions

### Phase 5: Multi-Cloud Support
- AWS (CloudWatch, CodePipeline)
- GCP (Cloud Build, Cloud Run)
- Azure (DevOps, App Service)

### Phase 6: Team Collaboration
- Smart escalation to on-call engineers
- PagerDuty/Opsgenie integration
- Automated incident post-mortems
- Knowledge base generation

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details

---

**Built with ❤️ for DevOps teams who value sleep**

Need help? [Open an issue](https://github.com/yourusername/agentic-devops-autopilot/issues)

# 🤖 Agentic DevOps Autopilot

**24時間稼働するAI-powered DevOps自動化プラットフォーム**

GitHub ActionsやRailwayのデプロイ失敗を検知し、AIが原因分析から対応策の提案・実行まで自動で行います。人間のSREが眠っている間も、AIエージェントがインシデント対応を継続します。

## 🎯 コンセプト

Agentic DevOps Autopilotは、**AI駆動のSite Reliability Engineer（SRE）**として機能します。

- **24/7 監視**: GitHub ActionsとRailwayのイベントをリアルタイムで監視
- **自動分析**: OpenAI GPT-4を使用してインシデントの根本原因を分析
- **自動対応**: PRへのコメント、Issue作成、Slack通知などを自動実行
- **学習と改善**: インシデントの履歴を蓄積し、将来的な予測と予防に活用

## ✨ 主な機能

### 1. Webhook受信
- **GitHub Actions**: ビルド失敗、テスト失敗、チェック失敗を検知
- **Railway**: デプロイ失敗、ランタイムエラーを検知

### 2. AI解析エンジン
- OpenAI GPT-4による根本原因の仮説生成
- 再現手順の自動生成
- 優先度付きアクションプランの提案

### 3. 自動アクション実行
- PRへの詳細な分析結果コメント
- GitHubのIssue自動作成
- Slack/Discord通知
- （将来）自動修正PRの作成

### 4. ダッシュボード
- インシデント一覧とステータス管理
- リポジトリ設定の管理
- 統計情報の可視化

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      External Services                       │
├───────────────┬──────────────────┬─────────────────┬────────┤
│ GitHub Actions│    Railway       │   Slack/Discord │ OpenAI │
└───────┬───────┴────────┬─────────┴────────┬────────┴───┬────┘
        │                │                  │            │
        │ Webhooks       │ Webhooks         │ Notify     │ Analyze
        ▼                ▼                  ▼            ▼
┌───────────────────────────────────────────────────────────────┐
│                    Fastify API Server                         │
├───────────────────────────────────────────────────────────────┤
│  /webhook/github  │  /webhook/railway  │  /api/*  │  /       │
│                   │                    │          │ Dashboard │
└────────┬──────────┴────────────────────┴──────────┴──────┬────┘
         │                                                  │
         │ Create Incident                                 │ Query
         ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL + Prisma                      │
│  RepoConfig │ Incident │ IncidentAction │ AgentRun          │
└────────┬────────────────────────────────────────────────────┘
         │
         │ Enqueue Job
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BullMQ + Redis                            │
└────────┬────────────────────────────────────────────────────┘
         │
         │ Process Job
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Worker Process                            │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch Incident                                           │
│  2. AI Analysis (OpenAI)                                     │
│  3. Execute Actions (GitHub API, Railway API, Webhook)      │
│  4. Record Results                                           │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ 技術スタック

- **Runtime**: Node.js 18+ / TypeScript
- **Web Framework**: Fastify
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: BullMQ + Redis
- **AI**: OpenAI GPT-4 Turbo
- **APIs**: GitHub REST API, Railway GraphQL API
- **Containerization**: Docker + Docker Compose

## 🚀 クイックスタート

### 前提条件

- Node.js 18以上
- PostgreSQL 15以上
- Redis 7以上
- GitHub Personal Access Token
- OpenAI API Key
- （オプション）Railway API Token

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/agentic-devops-autopilot.git
cd agentic-devops-autopilot
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して必要な値を設定:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/devops_autopilot"
REDIS_HOST="localhost"
REDIS_PORT=6379

GITHUB_TOKEN="ghp_your_token_here"
GITHUB_WEBHOOK_SECRET="your_webhook_secret"
RAILWAY_API_TOKEN="your_railway_token"
OPENAI_API_KEY="sk-your_openai_key"
```

### 4. データベースのセットアップ

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. 開発サーバーの起動

**ターミナル1: APIサーバー**
```bash
npm run dev
```

**ターミナル2: ワーカー**
```bash
npm run worker
```

### 6. ダッシュボードにアクセス

http://localhost:3000 でダッシュボードが開きます。

## 🐳 Docker Composeで起動

最も簡単な方法はDocker Composeを使用することです:

```bash
# .envファイルを設定
cp .env.example .env
# 必要な環境変数を編集

# コンテナ起動
docker-compose up -d

# ログ確認
docker-compose logs -f
```

これで以下のサービスが起動します:
- API Server (http://localhost:3000)
- Worker
- PostgreSQL
- Redis

## 📖 使い方

### 1. リポジトリの登録

ダッシュボードの「Repositories」タブで監視したいリポジトリを登録します。

### 2. GitHub Webhookの設定

GitHubリポジトリの Settings > Webhooks > Add webhook:

- **Payload URL**: `https://your-domain.com/webhook/github`
- **Content type**: `application/json`
- **Secret**: `.env`の`GITHUB_WEBHOOK_SECRET`と同じ値
- **Events**:
  - Workflow runs
  - Workflow jobs
  - Check runs

### 3. Railway Webhookの設定（オプション）

Railwayプロジェクトの設定でWebhookを追加:

- **URL**: `https://your-domain.com/webhook/railway`
- **Events**: Deployment events, Runtime errors

### 4. インシデント監視

これで、ビルド失敗やデプロイエラーが発生すると:

1. Webhookでインシデントが作成される
2. AIがログを解析して原因を特定
3. 自動でPRにコメントまたはIssue作成
4. ダッシュボードで状況を確認可能

## 📊 データモデル

### RepoConfig
リポジトリの設定情報

```typescript
{
  githubOwner: string
  githubRepo: string
  defaultBranch: string
  railwayServiceId?: string
  alertWebhookUrl?: string
  isActive: boolean
}
```

### Incident
インシデント情報

```typescript
{
  type: 'BUILD_FAILURE' | 'TEST_FAILURE' | 'DEPLOY_FAILURE' | ...
  source: 'GITHUB_ACTIONS' | 'RAILWAY' | 'MANUAL'
  status: 'OPEN' | 'ANALYZING' | 'ACTIONABLE' | 'IN_PROGRESS' | 'RESOLVED'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  payloadJson: object
}
```

### IncidentAction
インシデントに対して実行したアクション

```typescript
{
  actionType: 'COMMENT_PR' | 'CREATE_ISSUE' | 'NOTIFY_SLACK' | ...
  description: string
  resultJson: object
  success: boolean
}
```

### AgentRun
AI解析の実行ログ

```typescript
{
  model: string
  analysis: {
    hypothesis: string
    reproductionSteps: string[]
    suggestedActions: Array<{type, description, priority}>
  }
  promptTokens: number
  completionTokens: number
}
```

## 🔌 API エンドポイント

### Webhooks
- `POST /webhook/github` - GitHub webhookを受信
- `POST /webhook/railway` - Railway webhookを受信

### Repository Config
- `GET /api/repo-configs` - リポジトリ一覧
- `POST /api/repo-configs` - リポジトリ登録
- `PATCH /api/repo-configs/:id` - リポジトリ更新
- `DELETE /api/repo-configs/:id` - リポジトリ削除
- `POST /api/repo-configs/:id/toggle` - 有効/無効切り替え

### Incidents
- `GET /api/incidents` - インシデント一覧
- `GET /api/incidents/:id` - インシデント詳細
- `PATCH /api/incidents/:id` - ステータス更新
- `GET /api/incidents/stats/summary` - 統計情報

## 🔮 将来の構想

### Phase 2: 自動修正PR作成
- AIが修正コードを生成してPRを自動作成
- テストが通るまで自動リトライ
- レビュアーへの自動アサイン

### Phase 3: 予測的メンテナンス
- 過去のインシデントパターンを学習
- 問題が発生する前に警告
- 定期的なヘルスチェックと改善提案

### Phase 4: マルチクラウド対応
- AWS (CloudWatch, CodePipeline)
- GCP (Cloud Build, Cloud Run)
- Azure (DevOps, App Service)

### Phase 5: チーム協調
- チームメンバーへの自動エスカレーション
- オンコール管理との統合
- インシデントポストモーテムの自動生成

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずIssueを開いて変更内容を議論してください。

## 📄 ライセンス

MIT License

## 🙏 謝辞

このプロジェクトは以下のオープンソースプロジェクトに支えられています:
- Fastify
- Prisma
- BullMQ
- OpenAI
- Octokit

---

**Built with ❤️ by AI-powered DevOps Engineers**

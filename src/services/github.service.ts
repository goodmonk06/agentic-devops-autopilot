import { Octokit } from '@octokit/rest';
import { env } from '../config/env';

export class GitHubService {
  private octokit: Octokit | null = null;

  constructor() {
    if (env.GITHUB_TOKEN) {
      this.octokit = new Octokit({
        auth: env.GITHUB_TOKEN,
      });
    }
  }

  /**
   * PRにコメントを追加
   */
  async commentOnPR(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHub token not configured');
    }

    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });

    console.log(`✓ Commented on PR #${prNumber} in ${owner}/${repo}`);
  }

  /**
   * Issueを作成
   */
  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    labels?: string[]
  ): Promise<number> {
    if (!this.octokit) {
      throw new Error('GitHub token not configured');
    }

    const response = await this.octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });

    console.log(`✓ Created issue #${response.data.number} in ${owner}/${repo}`);
    return response.data.number;
  }

  /**
   * コミット情報を取得
   */
  async getCommit(owner: string, repo: string, sha: string) {
    if (!this.octokit) {
      throw new Error('GitHub token not configured');
    }

    const response = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    return response.data;
  }

  /**
   * ワークフロー実行ログを取得
   */
  async getWorkflowRunLogs(owner: string, repo: string, runId: number) {
    if (!this.octokit) {
      throw new Error('GitHub token not configured');
    }

    const response = await this.octokit.actions.downloadWorkflowRunLogs({
      owner,
      repo,
      run_id: runId,
    });

    return response.data;
  }
}

export const githubService = new GitHubService();

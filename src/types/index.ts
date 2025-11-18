import type { IncidentType, IncidentSource, IncidentStatus } from '@prisma/client';

// インシデント作成パラメータ
export interface CreateIncidentParams {
  repoId: string;
  type: IncidentType;
  source: IncidentSource;
  title: string;
  description?: string;
  payloadJson: any;
  severity?: string;
  prNumber?: number;
  commitSha?: string;
  branch?: string;
}

// Webhookペイロード型定義
export interface GitHubWebhookPayload {
  action?: string;
  workflow_run?: {
    id: number;
    name: string;
    head_branch: string;
    head_sha: string;
    conclusion: string | null;
    html_url: string;
  };
  workflow_job?: {
    id: number;
    run_id: number;
    status: string;
    conclusion: string | null;
    name: string;
    html_url: string;
  };
  repository: {
    owner: {
      login: string;
    };
    name: string;
  };
  pull_request?: {
    number: number;
    head: {
      sha: string;
      ref: string;
    };
  };
}

export interface RailwayWebhookPayload {
  type: string;
  project: {
    id: string;
    name: string;
  };
  service?: {
    id: string;
    name: string;
  };
  deployment?: {
    id: string;
    status: string;
    meta?: {
      branch?: string;
      commitSha?: string;
    };
  };
  error?: {
    message: string;
    stack?: string;
  };
}

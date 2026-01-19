// GitHub関連の型定義
export interface GitHubRepository {
  owner: string;
  name: string;
  fullName: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  author: string;
  repository: string;
}

export interface GitHubDeployment {
  id: number;
  environment: string;
  createdAt: string;
  status: "success" | "failure" | "pending";
  repository: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
  repository: string;
}

// Notion関連の型定義
export interface NotionTask {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  assignee: string | null;
}

// DevOps指標の型定義（DORA metrics）
export interface DevOpsMetrics {
  date: string;
  repository: string;
  deploymentCount: number;
  deploymentFrequency: "daily" | "weekly" | "monthly" | "yearly";
  leadTimeForChangesHours: number;
  totalDeployments: number;
  failedDeployments: number;
  changeFailureRate: number;
  meanTimeToRecoveryHours: number | null;
}

export interface AggregatedMetrics {
  period: string;
  repositories: string[];
  metrics: DevOpsMetrics[];
  summary: MetricsSummary;
}

export interface MetricsSummary {
  avgDeploymentFrequency: number;
  avgLeadTimeHours: number;
  avgChangeFailureRate: number;
  avgMttrHours: number | null;
}

// 設定の型定義
export interface Config {
  github: {
    token: string;
    repositories: GitHubRepository[];
  };
  notion: {
    token: string;
    databaseId: string;
  };
  spreadsheet: {
    id: string;
    sheetName: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

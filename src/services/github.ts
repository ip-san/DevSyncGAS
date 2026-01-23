import type { GitHubPullRequest, GitHubWorkflowRun, GitHubDeployment, GitHubRepository, ApiResponse } from "../types";
import { getContainer } from "../container";

const GITHUB_API_BASE = "https://api.github.com";

/** ページネーションのデフォルト最大ページ数 */
const DEFAULT_MAX_PAGES = 5;

/** 1ページあたりの取得件数（GitHub API最大値） */
const PER_PAGE = 100;

/** ステータス取得時の警告閾値（この件数を超えると警告ログ） */
const STATUS_FETCH_WARNING_THRESHOLD = 50;

/**
 * 期間フィルタ
 */
export interface DateRange {
  /** 開始日（この日以降を取得） */
  since?: Date;
  /** 終了日（この日以前を取得） */
  until?: Date;
}

/**
 * GitHub REST APIを呼び出すヘルパー関数
 *
 * @param endpoint - APIエンドポイント（例: "/repos/owner/repo/pulls"）
 * @param token - GitHub Personal Access Token
 * @returns APIレスポンス
 */
function fetchGitHub<T>(endpoint: string, token: string): ApiResponse<T> {
  const { httpClient } = getContainer();
  const url = `${GITHUB_API_BASE}${endpoint}`;

  try {
    const response = httpClient.fetch<T>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevSyncGAS",
      },
      muteHttpExceptions: true,
    });

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return { success: true, data: response.data };
    }
    return { success: false, error: `GitHub API error: ${response.statusCode} - ${response.content}` };
  } catch (error) {
    return { success: false, error: `Request failed: ${error}` };
  }
}

/**
 * リポジトリのプルリクエスト一覧を取得
 *
 * @param repo - 対象リポジトリ
 * @param token - GitHub Personal Access Token
 * @param state - 取得するPRの状態（デフォルト: "all"）
 * @param dateRange - 期間フィルタ（オプション）
 * @param maxPages - 最大取得ページ数（デフォルト: 5）
 * @returns PRの配列
 */
export function getPullRequests(
  repo: GitHubRepository,
  token: string,
  state: "open" | "closed" | "all" = "all",
  dateRange?: DateRange,
  maxPages = DEFAULT_MAX_PAGES
): ApiResponse<GitHubPullRequest[]> {
  const allPRs: GitHubPullRequest[] = [];
  let page = 1;

  while (page <= maxPages) {
    let endpoint = `/repos/${repo.fullName}/pulls?state=${state}&per_page=${PER_PAGE}&page=${page}&sort=updated&direction=desc`;

    const response = fetchGitHub<any[]>(endpoint, token);

    if (!response.success || !response.data) {
      if (page === 1) {
        return response as ApiResponse<GitHubPullRequest[]>;
      }
      break;
    }

    if (response.data.length === 0) {
      break;
    }

    for (const pr of response.data) {
      const createdAt = new Date(pr.created_at);

      // 期間フィルタリング
      if (dateRange?.until && createdAt > dateRange.until) {
        continue;
      }
      if (dateRange?.since && createdAt < dateRange.since) {
        // 古い順にソートされていないので、ここで終了しない
        continue;
      }

      allPRs.push({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        createdAt: pr.created_at,
        mergedAt: pr.merged_at,
        closedAt: pr.closed_at,
        author: pr.user?.login ?? "unknown",
        repository: repo.fullName,
      });
    }

    page++;
  }

  return { success: true, data: allPRs };
}

/**
 * リポジトリのワークフロー実行履歴を取得
 *
 * @param repo - 対象リポジトリ
 * @param token - GitHub Personal Access Token
 * @param dateRange - 期間フィルタ（オプション）
 * @param maxPages - 最大取得ページ数（デフォルト: 5）
 * @returns ワークフロー実行の配列
 */
export function getWorkflowRuns(
  repo: GitHubRepository,
  token: string,
  dateRange?: DateRange,
  maxPages = DEFAULT_MAX_PAGES
): ApiResponse<GitHubWorkflowRun[]> {
  const allRuns: GitHubWorkflowRun[] = [];
  let page = 1;

  while (page <= maxPages) {
    let endpoint = `/repos/${repo.fullName}/actions/runs?per_page=${PER_PAGE}&page=${page}`;

    // GitHub Actions APIは created パラメータで日付フィルタ可能
    if (dateRange?.since) {
      const sinceStr = dateRange.since.toISOString().split("T")[0];
      endpoint += `&created=${encodeURIComponent(">=" + sinceStr)}`;
    }

    const response = fetchGitHub<{ workflow_runs: any[] }>(endpoint, token);

    if (!response.success || !response.data) {
      if (page === 1) {
        return response as ApiResponse<GitHubWorkflowRun[]>;
      }
      break;
    }

    if (!response.data.workflow_runs || response.data.workflow_runs.length === 0) {
      break;
    }

    for (const run of response.data.workflow_runs) {
      const createdAt = new Date(run.created_at);

      // 期間フィルタリング
      if (dateRange?.until && createdAt > dateRange.until) {
        continue;
      }
      if (dateRange?.since && createdAt < dateRange.since) {
        continue;
      }

      allRuns.push({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        repository: repo.fullName,
      });
    }

    page++;
  }

  return { success: true, data: allRuns };
}

export interface GetDeploymentsOptions {
  environment?: string;
  dateRange?: DateRange;
  maxPages?: number;
  /**
   * ステータス取得をスキップしてAPI呼び出しを削減
   * true: ステータスをnullのまま返す（高速）
   * false: 各デプロイメントのステータスを個別に取得（N+1クエリ）
   *
   * ⚠️ 注意: trueに設定するとすべてのdeployment.statusがnullになり、
   * DORA metricsの計算（Deployment Frequency, Change Failure Rate, MTTR）が
   * ワークフローベースのフォールバックを使用するようになります。
   * メトリクス計算が目的の場合はfalse（デフォルト）を推奨します。
   */
  skipStatusFetch?: boolean;
}

/**
 * リポジトリのデプロイメント一覧を取得
 *
 * @param repo - 対象リポジトリ
 * @param token - GitHub Personal Access Token
 * @param options - 取得オプション（環境、期間、ステータス取得有無）
 * @returns デプロイメントの配列
 */
export function getDeployments(
  repo: GitHubRepository,
  token: string,
  options: GetDeploymentsOptions = {}
): ApiResponse<GitHubDeployment[]> {
  const { environment, dateRange, maxPages = DEFAULT_MAX_PAGES, skipStatusFetch = false } = options;
  const allDeployments: GitHubDeployment[] = [];
  let page = 1;

  // Phase 1: デプロイメント一覧を取得
  while (page <= maxPages) {
    let endpoint = `/repos/${repo.fullName}/deployments?per_page=${PER_PAGE}&page=${page}`;
    if (environment) {
      endpoint += `&environment=${encodeURIComponent(environment)}`;
    }

    const response = fetchGitHub<any[]>(endpoint, token);

    if (!response.success || !response.data) {
      if (page === 1) {
        return response as ApiResponse<GitHubDeployment[]>;
      }
      break;
    }

    if (response.data.length === 0) {
      break;
    }

    for (const deployment of response.data) {
      const createdAt = new Date(deployment.created_at);

      if (dateRange?.until && createdAt > dateRange.until) {
        continue;
      }
      if (dateRange?.since && createdAt < dateRange.since) {
        continue;
      }

      allDeployments.push({
        id: deployment.id,
        sha: deployment.sha,
        environment: deployment.environment,
        createdAt: deployment.created_at,
        updatedAt: deployment.updated_at,
        status: null, // Phase 2で取得
        repository: repo.fullName,
      });
    }

    page++;
  }

  // Phase 2: ステータスを取得（オプション）
  // 注意: GASは並行リクエストをサポートしないためN+1クエリになる
  // 大量のデプロイメントがある場合はskipStatusFetch=trueを推奨
  if (!skipStatusFetch && allDeployments.length > 0) {
    const { logger } = getContainer();
    if (allDeployments.length > STATUS_FETCH_WARNING_THRESHOLD) {
      logger.log(`  ⚠️ Fetching status for ${allDeployments.length} deployments (may be slow)`);
    }

    for (const deployment of allDeployments) {
      const statusResponse = fetchGitHub<any[]>(
        `/repos/${repo.fullName}/deployments/${deployment.id}/statuses?per_page=1`,
        token
      );
      if (statusResponse.success && statusResponse.data?.[0]) {
        deployment.status = statusResponse.data[0].state;
      }
    }
  }

  return { success: true, data: allDeployments };
}

/**
 * 複数リポジトリからデータを一括取得する際のオプション
 */
export interface GetAllRepositoriesDataOptions {
  /** 期間フィルタ */
  dateRange?: DateRange;
  /**
   * デプロイメント環境名（デフォルト: "production"）
   * 例: "production", "prod", "live", "main"
   */
  deploymentEnvironment?: string;
}

/**
 * 複数リポジトリのGitHubデータを一括取得
 *
 * @param repositories - 対象リポジトリの配列
 * @param token - GitHub Personal Access Token
 * @param options - 取得オプション
 * @returns PR、ワークフロー実行、デプロイメントの集約データ
 */
export function getAllRepositoriesData(
  repositories: GitHubRepository[],
  token: string,
  options: GetAllRepositoriesDataOptions = {}
): { pullRequests: GitHubPullRequest[]; workflowRuns: GitHubWorkflowRun[]; deployments: GitHubDeployment[] } {
  const { dateRange, deploymentEnvironment = "production" } = options;
  const { logger } = getContainer();
  const allPRs: GitHubPullRequest[] = [];
  const allRuns: GitHubWorkflowRun[] = [];
  const allDeployments: GitHubDeployment[] = [];

  for (const repo of repositories) {
    logger.log(`📡 Fetching data for ${repo.fullName}...`);

    const prsResult = getPullRequests(repo, token, "all", dateRange);
    if (prsResult.success && prsResult.data) {
      allPRs.push(...prsResult.data);
      logger.log(`  PRs: ${prsResult.data.length}`);
    } else {
      logger.log(`  ⚠️ PR fetch failed: ${prsResult.error}`);
    }

    const runsResult = getWorkflowRuns(repo, token, dateRange);
    if (runsResult.success && runsResult.data) {
      allRuns.push(...runsResult.data);
      logger.log(`  Workflow runs: ${runsResult.data.length}`);
    } else {
      logger.log(`  ⚠️ Workflow fetch failed: ${runsResult.error}`);
    }

    // Fetch deployments
    const deploymentsResult = getDeployments(repo, token, {
      environment: deploymentEnvironment,
      dateRange,
    });
    if (deploymentsResult.success && deploymentsResult.data) {
      allDeployments.push(...deploymentsResult.data);
      logger.log(`  Deployments: ${deploymentsResult.data.length}`);
    } else {
      logger.log(`  ⚠️ Deployments fetch failed: ${deploymentsResult.error}`);
    }
  }

  return { pullRequests: allPRs, workflowRuns: allRuns, deployments: allDeployments };
}

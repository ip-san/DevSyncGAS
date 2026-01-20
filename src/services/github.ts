import type { GitHubPullRequest, GitHubWorkflowRun, GitHubRepository, ApiResponse } from "../types";

const GITHUB_API_BASE = "https://api.github.com";

export interface DateRange {
  since?: Date;
  until?: Date;
}

function formatDateForGitHub(date: Date): string {
  return date.toISOString();
}

function fetchGitHub<T>(endpoint: string, token: string): ApiResponse<T> {
  const url = `${GITHUB_API_BASE}${endpoint}`;

  try {
    const response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevSyncGAS",
      },
      muteHttpExceptions: true,
    });

    const statusCode = response.getResponseCode();
    const content = response.getContentText();

    if (statusCode >= 200 && statusCode < 300) {
      return { success: true, data: JSON.parse(content) as T };
    }
    return { success: false, error: `GitHub API error: ${statusCode} - ${content}` };
  } catch (error) {
    return { success: false, error: `Request failed: ${error}` };
  }
}

export function getPullRequests(
  repo: GitHubRepository,
  token: string,
  state: "open" | "closed" | "all" = "all",
  dateRange?: DateRange,
  maxPages = 5
): ApiResponse<GitHubPullRequest[]> {
  const allPRs: GitHubPullRequest[] = [];
  let page = 1;

  while (page <= maxPages) {
    let endpoint = `/repos/${repo.fullName}/pulls?state=${state}&per_page=100&page=${page}&sort=updated&direction=desc`;

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

export function getWorkflowRuns(
  repo: GitHubRepository,
  token: string,
  dateRange?: DateRange,
  maxPages = 5
): ApiResponse<GitHubWorkflowRun[]> {
  const allRuns: GitHubWorkflowRun[] = [];
  let page = 1;

  while (page <= maxPages) {
    let endpoint = `/repos/${repo.fullName}/actions/runs?per_page=100&page=${page}`;

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

export function getAllRepositoriesData(
  repositories: GitHubRepository[],
  token: string,
  dateRange?: DateRange
): { pullRequests: GitHubPullRequest[]; workflowRuns: GitHubWorkflowRun[] } {
  const allPRs: GitHubPullRequest[] = [];
  const allRuns: GitHubWorkflowRun[] = [];

  for (const repo of repositories) {
    Logger.log(`📡 Fetching data for ${repo.fullName}...`);

    const prsResult = getPullRequests(repo, token, "all", dateRange);
    if (prsResult.success && prsResult.data) {
      allPRs.push(...prsResult.data);
      Logger.log(`  PRs: ${prsResult.data.length}`);
    } else {
      Logger.log(`  ⚠️ PR fetch failed: ${prsResult.error}`);
    }

    const runsResult = getWorkflowRuns(repo, token, dateRange);
    if (runsResult.success && runsResult.data) {
      allRuns.push(...runsResult.data);
      Logger.log(`  Workflow runs: ${runsResult.data.length}`);
    } else {
      Logger.log(`  ⚠️ Workflow fetch failed: ${runsResult.error}`);
    }
  }

  return { pullRequests: allPRs, workflowRuns: allRuns };
}

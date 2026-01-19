import type { GitHubPullRequest, GitHubWorkflowRun, GitHubRepository, ApiResponse } from "../types";

const GITHUB_API_BASE = "https://api.github.com";

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
  perPage = 100
): ApiResponse<GitHubPullRequest[]> {
  const endpoint = `/repos/${repo.fullName}/pulls?state=${state}&per_page=${perPage}&sort=updated&direction=desc`;
  const response = fetchGitHub<any[]>(endpoint, token);

  if (!response.success || !response.data) {
    return response as ApiResponse<GitHubPullRequest[]>;
  }

  const pullRequests: GitHubPullRequest[] = response.data.map((pr) => ({
    id: pr.id,
    number: pr.number,
    title: pr.title,
    state: pr.state,
    createdAt: pr.created_at,
    mergedAt: pr.merged_at,
    closedAt: pr.closed_at,
    author: pr.user?.login ?? "unknown",
    repository: repo.fullName,
  }));

  return { success: true, data: pullRequests };
}

export function getWorkflowRuns(
  repo: GitHubRepository,
  token: string,
  perPage = 100
): ApiResponse<GitHubWorkflowRun[]> {
  const endpoint = `/repos/${repo.fullName}/actions/runs?per_page=${perPage}`;
  const response = fetchGitHub<{ workflow_runs: any[] }>(endpoint, token);

  if (!response.success || !response.data) {
    return response as ApiResponse<GitHubWorkflowRun[]>;
  }

  const runs: GitHubWorkflowRun[] = response.data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    repository: repo.fullName,
  }));

  return { success: true, data: runs };
}

export function getAllRepositoriesData(
  repositories: GitHubRepository[],
  token: string
): { pullRequests: GitHubPullRequest[]; workflowRuns: GitHubWorkflowRun[] } {
  const allPRs: GitHubPullRequest[] = [];
  const allRuns: GitHubWorkflowRun[] = [];

  for (const repo of repositories) {
    const prsResult = getPullRequests(repo, token, "all");
    if (prsResult.success && prsResult.data) {
      allPRs.push(...prsResult.data);
    }

    const runsResult = getWorkflowRuns(repo, token);
    if (runsResult.success && runsResult.data) {
      allRuns.push(...runsResult.data);
    }
  }

  return { pullRequests: allPRs, workflowRuns: allRuns };
}

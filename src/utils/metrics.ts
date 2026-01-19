import type { GitHubPullRequest, GitHubWorkflowRun, DevOpsMetrics } from "../types";

export function calculateLeadTime(prs: GitHubPullRequest[]): number {
  const mergedPRs = prs.filter((pr) => pr.mergedAt !== null);
  if (mergedPRs.length === 0) return 0;

  const totalHours = mergedPRs.reduce((sum, pr) => {
    const created = new Date(pr.createdAt).getTime();
    const merged = new Date(pr.mergedAt!).getTime();
    const diffHours = (merged - created) / (1000 * 60 * 60);
    return sum + diffHours;
  }, 0);

  return Math.round((totalHours / mergedPRs.length) * 10) / 10;
}

export function calculateDeploymentFrequency(
  runs: GitHubWorkflowRun[],
  periodDays: number
): { count: number; frequency: DevOpsMetrics["deploymentFrequency"] } {
  const successfulDeployments = runs.filter(
    (run) => run.conclusion === "success" && run.name.toLowerCase().includes("deploy")
  );

  const count = successfulDeployments.length;
  const avgPerDay = count / periodDays;

  let frequency: DevOpsMetrics["deploymentFrequency"];
  if (avgPerDay >= 1) frequency = "daily";
  else if (avgPerDay >= 1 / 7) frequency = "weekly";
  else if (avgPerDay >= 1 / 30) frequency = "monthly";
  else frequency = "yearly";

  return { count, frequency };
}

export function calculateChangeFailureRate(runs: GitHubWorkflowRun[]): {
  total: number;
  failed: number;
  rate: number;
} {
  const deploymentRuns = runs.filter((run) =>
    run.name.toLowerCase().includes("deploy")
  );

  const total = deploymentRuns.length;
  const failed = deploymentRuns.filter((run) => run.conclusion === "failure").length;
  const rate = total > 0 ? Math.round((failed / total) * 100 * 10) / 10 : 0;

  return { total, failed, rate };
}

export function calculateMTTR(runs: GitHubWorkflowRun[]): number | null {
  const deploymentRuns = runs
    .filter((run) => run.name.toLowerCase().includes("deploy"))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const recoveryTimes: number[] = [];
  let lastFailure: GitHubWorkflowRun | null = null;

  for (const run of deploymentRuns) {
    if (run.conclusion === "failure") {
      lastFailure = run;
    } else if (run.conclusion === "success" && lastFailure) {
      const failureTime = new Date(lastFailure.createdAt).getTime();
      const recoveryTime = new Date(run.createdAt).getTime();
      const diffHours = (recoveryTime - failureTime) / (1000 * 60 * 60);
      recoveryTimes.push(diffHours);
      lastFailure = null;
    }
  }

  if (recoveryTimes.length === 0) return null;

  const avgMTTR = recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
  return Math.round(avgMTTR * 10) / 10;
}

export function calculateMetricsForRepository(
  repository: string,
  prs: GitHubPullRequest[],
  runs: GitHubWorkflowRun[],
  periodDays = 30
): DevOpsMetrics {
  const repoPRs = prs.filter((pr) => pr.repository === repository);
  const repoRuns = runs.filter((run) => run.repository === repository);

  const { count, frequency } = calculateDeploymentFrequency(repoRuns, periodDays);
  const { total, failed, rate } = calculateChangeFailureRate(repoRuns);

  return {
    date: new Date().toISOString().split("T")[0],
    repository,
    deploymentCount: count,
    deploymentFrequency: frequency,
    leadTimeForChangesHours: calculateLeadTime(repoPRs),
    totalDeployments: total,
    failedDeployments: failed,
    changeFailureRate: rate,
    meanTimeToRecoveryHours: calculateMTTR(repoRuns),
  };
}

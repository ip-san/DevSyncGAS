import type { GitHubPullRequest, GitHubWorkflowRun, GitHubDeployment, DevOpsMetrics } from "../types";

/**
 * DORA Metrics: Lead Time for Changes
 *
 * 定義: コードがコミットされてから本番環境にデプロイされるまでの時間
 *
 * 計算方法:
 * 1. マージされたPRと成功したデプロイメントを関連付け（SHA経由）
 * 2. PRマージ時間からデプロイ完了時間までの差を計算
 * 3. 関連付けできない場合は、PRマージ時間から最も近いデプロイ時間を使用
 *
 * フォールバック: デプロイメントデータがない場合はPRのマージまでの時間を使用
 */
export function calculateLeadTime(
  prs: GitHubPullRequest[],
  deployments: GitHubDeployment[] = []
): number {
  const mergedPRs = prs.filter((pr) => pr.mergedAt !== null);
  if (mergedPRs.length === 0) return 0;

  const successfulDeployments = deployments
    .filter((d) => d.status === "success")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const leadTimes: number[] = [];

  for (const pr of mergedPRs) {
    const mergedAt = new Date(pr.mergedAt!).getTime();

    // デプロイメントデータがある場合: マージ後の最初のデプロイを探す
    if (successfulDeployments.length > 0) {
      const deploymentAfterMerge = successfulDeployments.find(
        (d) => new Date(d.createdAt).getTime() >= mergedAt
      );

      if (deploymentAfterMerge) {
        const deployedAt = new Date(deploymentAfterMerge.createdAt).getTime();
        const diffHours = (deployedAt - mergedAt) / (1000 * 60 * 60);
        // マージ後24時間以内のデプロイのみを関連付ける
        if (diffHours <= 24) {
          leadTimes.push(diffHours);
          continue;
        }
      }
    }

    // フォールバック: PR作成からマージまでの時間
    const created = new Date(pr.createdAt).getTime();
    const diffHours = (mergedAt - created) / (1000 * 60 * 60);
    leadTimes.push(diffHours);
  }

  if (leadTimes.length === 0) return 0;

  const totalHours = leadTimes.reduce((sum, hours) => sum + hours, 0);
  return Math.round((totalHours / leadTimes.length) * 10) / 10;
}

/**
 * DORA Metrics: Deployment Frequency
 *
 * 定義: 本番環境へのデプロイ頻度
 *
 * 計算方法:
 * 1. GitHub Deployments API から production 環境への成功デプロイをカウント
 * 2. フォールバック: "deploy" を含むワークフローの成功数を使用
 *
 * 分類基準 (DORA):
 * - Elite: 1日1回以上 (daily)
 * - High: 週1回以上 (weekly)
 * - Medium: 月1回以上 (monthly)
 * - Low: 月1回未満 (yearly)
 */
export function calculateDeploymentFrequency(
  deployments: GitHubDeployment[],
  runs: GitHubWorkflowRun[],
  periodDays: number
): { count: number; frequency: DevOpsMetrics["deploymentFrequency"] } {
  // 優先: GitHub Deployments API のデータ（production環境、成功のみ）
  let successfulDeployments = deployments.filter(
    (d) => d.status === "success" && d.environment.toLowerCase() === "production"
  );

  // フォールバック: ワークフロー実行（"deploy"を含む成功したもの）
  if (successfulDeployments.length === 0) {
    const workflowDeployments = runs.filter(
      (run) => run.conclusion === "success" && run.name.toLowerCase().includes("deploy")
    );
    successfulDeployments = workflowDeployments as unknown as GitHubDeployment[];
  }

  const count = successfulDeployments.length;
  const avgPerDay = count / periodDays;

  let frequency: DevOpsMetrics["deploymentFrequency"];
  if (avgPerDay >= 1) frequency = "daily";
  else if (avgPerDay >= 1 / 7) frequency = "weekly";
  else if (avgPerDay >= 1 / 30) frequency = "monthly";
  else frequency = "yearly";

  return { count, frequency };
}

/**
 * DORA Metrics: Change Failure Rate
 *
 * 定義: 本番環境でインシデントを引き起こしたデプロイの割合
 *
 * 注意: 真のDORA定義ではインシデント管理システムとの連携が必要
 * 現在の実装はCI/CDパイプラインの失敗率を測定（近似値）
 *
 * 計算方法:
 * 1. GitHub Deployments: 失敗ステータスのデプロイ / 全デプロイ
 * 2. フォールバック: ワークフロー失敗数 / 全ワークフロー実行数
 *
 * 分類基準 (DORA):
 * - Elite: 0-15%
 * - High: 16-30%
 * - Medium: 31-45%
 * - Low: 46%+
 */
export function calculateChangeFailureRate(
  deployments: GitHubDeployment[],
  runs: GitHubWorkflowRun[]
): {
  total: number;
  failed: number;
  rate: number;
} {
  // 優先: GitHub Deployments API
  const productionDeployments = deployments.filter(
    (d) => d.environment.toLowerCase() === "production"
  );

  if (productionDeployments.length > 0) {
    const total = productionDeployments.length;
    const failed = productionDeployments.filter(
      (d) => d.status === "failure" || d.status === "error"
    ).length;
    const rate = total > 0 ? Math.round((failed / total) * 100 * 10) / 10 : 0;
    return { total, failed, rate };
  }

  // フォールバック: ワークフロー実行
  const deploymentRuns = runs.filter((run) =>
    run.name.toLowerCase().includes("deploy")
  );

  const total = deploymentRuns.length;
  const failed = deploymentRuns.filter((run) => run.conclusion === "failure").length;
  const rate = total > 0 ? Math.round((failed / total) * 100 * 10) / 10 : 0;

  return { total, failed, rate };
}

/**
 * DORA Metrics: Mean Time to Recovery (MTTR) / Failed Deployment Recovery Time
 *
 * 定義: 本番環境の障害から復旧するまでの時間
 *
 * 注意: 真のDORA定義ではインシデント管理システムとの連携が必要
 * 現在の実装はデプロイ失敗から次の成功デプロイまでの時間を測定（近似値）
 *
 * 計算方法:
 * 1. 失敗したデプロイメントを時系列で追跡
 * 2. 次の成功デプロイメントまでの時間を計算
 * 3. 平均値を算出
 *
 * 分類基準 (DORA):
 * - Elite: < 1時間
 * - High: 1-24時間
 * - Medium: 1-7日
 * - Low: > 7日
 */
export function calculateMTTR(
  deployments: GitHubDeployment[],
  runs: GitHubWorkflowRun[]
): number | null {
  // 優先: GitHub Deployments API
  const productionDeployments = deployments
    .filter((d) => d.environment.toLowerCase() === "production")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (productionDeployments.length > 0) {
    return calculateRecoveryTime(
      productionDeployments.map((d) => ({
        createdAt: d.createdAt,
        isFailure: d.status === "failure" || d.status === "error",
        isSuccess: d.status === "success",
      }))
    );
  }

  // フォールバック: ワークフロー実行
  const deploymentRuns = runs
    .filter((run) => run.name.toLowerCase().includes("deploy"))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return calculateRecoveryTime(
    deploymentRuns.map((run) => ({
      createdAt: run.createdAt,
      isFailure: run.conclusion === "failure",
      isSuccess: run.conclusion === "success",
    }))
  );
}

function calculateRecoveryTime(
  events: Array<{ createdAt: string; isFailure: boolean; isSuccess: boolean }>
): number | null {
  const recoveryTimes: number[] = [];
  let lastFailure: { createdAt: string } | null = null;

  for (const event of events) {
    if (event.isFailure) {
      lastFailure = event;
    } else if (event.isSuccess && lastFailure) {
      const failureTime = new Date(lastFailure.createdAt).getTime();
      const recoveryTime = new Date(event.createdAt).getTime();
      const diffHours = (recoveryTime - failureTime) / (1000 * 60 * 60);
      recoveryTimes.push(diffHours);
      lastFailure = null;
    }
  }

  if (recoveryTimes.length === 0) return null;

  const avgMTTR = recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
  return Math.round(avgMTTR * 10) / 10;
}

/**
 * リポジトリ単位でDORA metricsを計算する
 */
export function calculateMetricsForRepository(
  repository: string,
  prs: GitHubPullRequest[],
  runs: GitHubWorkflowRun[],
  deployments: GitHubDeployment[] = [],
  periodDays = 30
): DevOpsMetrics {
  const repoPRs = prs.filter((pr) => pr.repository === repository);
  const repoRuns = runs.filter((run) => run.repository === repository);
  const repoDeployments = deployments.filter((d) => d.repository === repository);

  const { count, frequency } = calculateDeploymentFrequency(repoDeployments, repoRuns, periodDays);
  const { total, failed, rate } = calculateChangeFailureRate(repoDeployments, repoRuns);

  return {
    date: new Date().toISOString().split("T")[0],
    repository,
    deploymentCount: count,
    deploymentFrequency: frequency,
    leadTimeForChangesHours: calculateLeadTime(repoPRs, repoDeployments),
    totalDeployments: total,
    failedDeployments: failed,
    changeFailureRate: rate,
    meanTimeToRecoveryHours: calculateMTTR(repoDeployments, repoRuns),
  };
}

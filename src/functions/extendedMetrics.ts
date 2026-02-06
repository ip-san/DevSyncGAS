/**
 * 拡張指標同期関数モジュール
 *
 * サイクルタイム、コーディング時間、手戻り率、レビュー効率、PRサイズの
 * 拡張指標をGitHub APIから取得し、スプレッドシートに書き出す。
 *
 * GASエディタから直接実行可能な関数を提供。
 */

import { getConfig, getGitHubToken } from '../config/settings';
import {
  getCycleTimeDataGraphQL,
  getCodingTimeDataGraphQL,
  getReworkDataForPRsGraphQL,
  getReviewEfficiencyDataForPRsGraphQL,
  getPRSizeDataForPRsGraphQL,
  getPullRequestsGraphQL,
  type DateRange,
} from '../services/github';
import {
  writeCycleTimeToSheet,
  writeCodingTimeToSheet,
  writeReworkRateToSheet,
  writeReviewEfficiencyToSheet,
  writePRSizeToSheet,
} from '../services/spreadsheet';
import {
  calculateCycleTime,
  calculateCodingTime,
  calculateReworkRate,
  calculateReviewEfficiency,
  calculatePRSize,
} from '../utils/metrics';
import { ensureContainerInitialized } from './helpers';
import type { GitHubPullRequest } from '../types';

// =============================================================================
// サイクルタイム同期
// =============================================================================

/**
 * サイクルタイムを収集してスプレッドシートに書き出す
 *
 * Issue作成からProductionマージまでの時間を計測。
 *
 * @param days - 過去何日分のデータを取得するか（デフォルト: 30日）
 */
export function syncCycleTime(days = 30): void {
  ensureContainerInitialized();
  const config = getConfig();
  const token = getGitHubToken();

  Logger.log(`🔄 Syncing Cycle Time (past ${days} days)`);
  Logger.log(`   Repositories: ${config.github.repositories.length}`);

  const since = new Date();
  since.setDate(since.getDate() - days);

  // GitHub APIからサイクルタイムデータを取得
  const cycleTimeResult = getCycleTimeDataGraphQL(config.github.repositories, token, {
    dateRange: { start: since.toISOString() },
  });

  if (!cycleTimeResult.success || !cycleTimeResult.data) {
    Logger.log(`❌ Failed to fetch cycle time data: ${cycleTimeResult.error}`);
    return;
  }

  Logger.log(`📥 Fetched ${cycleTimeResult.data.length} cycle time records`);

  // メトリクス計算
  const period = `過去${days}日`;
  const metrics = calculateCycleTime(cycleTimeResult.data, period);

  Logger.log(
    `📈 Calculated cycle time: ${metrics.completedTaskCount} issues, avg ${metrics.avgCycleTimeHours?.toFixed(1) ?? 'N/A'}h`
  );

  // スプレッドシートに書き込み
  writeCycleTimeToSheet(config.spreadsheet.id, metrics);

  Logger.log(`✅ Cycle Time synced successfully`);
}

// =============================================================================
// コーディング時間同期
// =============================================================================

/**
 * コーディング時間を収集してスプレッドシートに書き出す
 *
 * Issue作成からPR作成までの時間を計測。
 *
 * @param days - 過去何日分のデータを取得するか（デフォルト: 30日）
 */
export function syncCodingTime(days = 30): void {
  ensureContainerInitialized();
  const config = getConfig();
  const token = getGitHubToken();

  Logger.log(`🔄 Syncing Coding Time (past ${days} days)`);
  Logger.log(`   Repositories: ${config.github.repositories.length}`);

  const since = new Date();
  since.setDate(since.getDate() - days);

  // GitHub APIからコーディング時間データを取得
  const codingTimeResult = getCodingTimeDataGraphQL(config.github.repositories, token, {
    dateRange: { start: since.toISOString() },
  });

  if (!codingTimeResult.success || !codingTimeResult.data) {
    Logger.log(`❌ Failed to fetch coding time data: ${codingTimeResult.error}`);
    return;
  }

  Logger.log(`📥 Fetched ${codingTimeResult.data.length} coding time records`);

  // メトリクス計算
  const period = `過去${days}日`;
  const metrics = calculateCodingTime(codingTimeResult.data, period);

  Logger.log(
    `📈 Calculated coding time: ${metrics.issueCount} issues, avg ${metrics.avgCodingTimeHours?.toFixed(1) ?? 'N/A'}h`
  );

  // スプレッドシートに書き込み
  writeCodingTimeToSheet(config.spreadsheet.id, metrics);

  Logger.log(`✅ Coding Time synced successfully`);
}

// =============================================================================
// 手戻り率同期
// =============================================================================

/**
 * 手戻り率を収集してスプレッドシートに書き出す
 *
 * PRマージ後の追加コミット・Force Pushの回数を計測。
 *
 * @param days - 過去何日分のデータを取得するか（デフォルト: 30日）
 */
export function syncReworkRate(days = 30): void {
  ensureContainerInitialized();
  const config = getConfig();
  const token = getGitHubToken();

  Logger.log(`🔄 Syncing Rework Rate (past ${days} days)`);
  Logger.log(`   Repositories: ${config.github.repositories.length}`);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const dateRange: DateRange = { since };

  // まずPRを取得（各リポジトリごとに）
  const allPRs: GitHubPullRequest[] = [];
  for (const repo of config.github.repositories) {
    const prsResult = getPullRequestsGraphQL({ repo, token, state: 'all', dateRange });
    if (prsResult.success && prsResult.data) {
      allPRs.push(...prsResult.data);
    } else {
      Logger.log(`  ⚠️ Failed to fetch PRs for ${repo.fullName}: ${prsResult.error}`);
    }
  }
  Logger.log(`📥 Fetched ${allPRs.length} PRs`);

  // 手戻り率データを取得
  const reworkData = getReworkDataForPRsGraphQL(allPRs, token);
  Logger.log(`📥 Fetched rework data for ${reworkData.length} PRs`);

  // メトリクス計算
  const period = `過去${days}日`;
  const metrics = calculateReworkRate(reworkData, period);

  Logger.log(
    `📈 Calculated rework rate: ${metrics.prCount} PRs, avg ${metrics.additionalCommits.avgPerPr?.toFixed(1) ?? 'N/A'} commits`
  );

  // スプレッドシートに書き込み
  writeReworkRateToSheet(config.spreadsheet.id, metrics);

  Logger.log(`✅ Rework Rate synced successfully`);
}

// =============================================================================
// レビュー効率同期
// =============================================================================

/**
 * レビュー効率を収集してスプレッドシートに書き出す
 *
 * レビュー待ち時間とレビュー時間を計測。
 *
 * @param days - 過去何日分のデータを取得するか（デフォルト: 30日）
 */
export function syncReviewEfficiency(days = 30): void {
  ensureContainerInitialized();
  const config = getConfig();
  const token = getGitHubToken();

  Logger.log(`🔄 Syncing Review Efficiency (past ${days} days)`);
  Logger.log(`   Repositories: ${config.github.repositories.length}`);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const dateRange: DateRange = { since };

  // まずPRを取得（各リポジトリごとに）
  const allPRs: GitHubPullRequest[] = [];
  for (const repo of config.github.repositories) {
    const prsResult = getPullRequestsGraphQL({ repo, token, state: 'all', dateRange });
    if (prsResult.success && prsResult.data) {
      allPRs.push(...prsResult.data);
    } else {
      Logger.log(`  ⚠️ Failed to fetch PRs for ${repo.fullName}: ${prsResult.error}`);
    }
  }
  Logger.log(`📥 Fetched ${allPRs.length} PRs`);

  // レビュー効率データを取得
  const reviewData = getReviewEfficiencyDataForPRsGraphQL(allPRs, token);
  Logger.log(`📥 Fetched review data for ${reviewData.length} PRs`);

  // メトリクス計算
  const period = `過去${days}日`;
  const metrics = calculateReviewEfficiency(reviewData, period);

  Logger.log(
    `📈 Calculated review efficiency: ${metrics.prCount} PRs, avg wait ${metrics.timeToFirstReview.avgHours?.toFixed(1) ?? 'N/A'}h`
  );

  // スプレッドシートに書き込み
  writeReviewEfficiencyToSheet(config.spreadsheet.id, metrics);

  Logger.log(`✅ Review Efficiency synced successfully`);
}

// =============================================================================
// PRサイズ同期
// =============================================================================

/**
 * PRサイズを収集してスプレッドシートに書き出す
 *
 * 変更行数・変更ファイル数を計測。
 *
 * @param days - 過去何日分のデータを取得するか（デフォルト: 30日）
 */
export function syncPRSize(days = 30): void {
  ensureContainerInitialized();
  const config = getConfig();
  const token = getGitHubToken();

  Logger.log(`🔄 Syncing PR Size (past ${days} days)`);
  Logger.log(`   Repositories: ${config.github.repositories.length}`);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const dateRange: DateRange = { since };

  // まずPRを取得（各リポジトリごとに）
  const allPRs: GitHubPullRequest[] = [];
  for (const repo of config.github.repositories) {
    const prsResult = getPullRequestsGraphQL({ repo, token, state: 'all', dateRange });
    if (prsResult.success && prsResult.data) {
      allPRs.push(...prsResult.data);
    } else {
      Logger.log(`  ⚠️ Failed to fetch PRs for ${repo.fullName}: ${prsResult.error}`);
    }
  }
  Logger.log(`📥 Fetched ${allPRs.length} PRs`);

  // PRサイズデータを取得
  const sizeData = getPRSizeDataForPRsGraphQL(allPRs, token);
  Logger.log(`📥 Fetched size data for ${sizeData.length} PRs`);

  // メトリクス計算
  const period = `過去${days}日`;
  const metrics = calculatePRSize(sizeData, period);

  Logger.log(
    `📈 Calculated PR size: ${metrics.prCount} PRs, avg ${metrics.linesOfCode.avg?.toFixed(0) ?? 'N/A'} lines`
  );

  // スプレッドシートに書き込み
  writePRSizeToSheet(config.spreadsheet.id, metrics);

  Logger.log(`✅ PR Size synced successfully`);
}

// =============================================================================
// 全指標同期
// =============================================================================

/**
 * 全指標（DORA + 拡張指標）を一括同期
 *
 * GASエディタで一発で全シート生成できる便利関数。
 * - DORA指標（Dashboard含む）
 * - サイクルタイム
 * - コーディング時間
 * - 手戻り率
 * - レビュー効率
 * - PRサイズ
 *
 * @param days - 過去何日分のデータを取得するか（デフォルト: 30日）
 */
export async function syncAllMetrics(days = 30): Promise<void> {
  Logger.log(`🚀 Starting full metrics sync (past ${days} days)`);
  Logger.log(`   This will sync all DORA + Extended metrics`);

  const startTime = Date.now();

  try {
    // DORA指標同期（Dashboard含む）
    Logger.log(`\n📊 [1/6] Syncing DORA metrics...`);
    const { syncDevOpsMetrics } = await import('./sync');
    const since = new Date();
    since.setDate(since.getDate() - days);
    await syncDevOpsMetrics({ since });

    // サイクルタイム同期
    Logger.log(`\n⏱️  [2/6] Syncing Cycle Time...`);
    syncCycleTime(days);

    // コーディング時間同期
    Logger.log(`\n⌨️  [3/6] Syncing Coding Time...`);
    syncCodingTime(days);

    // 手戻り率同期
    Logger.log(`\n🔄 [4/6] Syncing Rework Rate...`);
    syncReworkRate(days);

    // レビュー効率同期
    Logger.log(`\n👀 [5/6] Syncing Review Efficiency...`);
    syncReviewEfficiency(days);

    // PRサイズ同期
    Logger.log(`\n📏 [6/6] Syncing PR Size...`);
    syncPRSize(days);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    Logger.log(`\n✅ All metrics synced successfully in ${elapsed}s`);
    Logger.log(`   Check your spreadsheet for updated data!`);
  } catch (error) {
    Logger.log(`\n❌ Failed to sync metrics: ${String(error)}`);
    throw error;
  }
}

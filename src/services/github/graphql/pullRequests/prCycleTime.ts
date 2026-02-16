/**
 * PR Cycle Time データ取得モジュール
 *
 * PR作成からPRマージまでの時間を計測するためのデータを取得する。
 * Issue有無は問わず、全てのマージ済みPRを対象とする。
 */

import type { GitHubRepository, ApiResponse, PRCycleTime } from '../../../../types';
import { getContainer } from '../../../../container';
import type { DateRange } from '../../api';
import { MS_TO_HOURS } from '../../../../utils/timeConstants.js';
import { getPullRequestsGraphQL } from './listing.js';

/**
 * PR Cycle Timeを計算（時間単位）
 *
 * @param prCreatedAt - PR作成日時
 * @param prMergedAt - PRマージ日時
 * @returns PR Cycle Time（時間）
 */
function calculatePRCycleTimeHours(prCreatedAt: string, prMergedAt: string): number {
  const startTime = new Date(prCreatedAt).getTime();
  const endTime = new Date(prMergedAt).getTime();
  return Math.round(((endTime - startTime) / MS_TO_HOURS) * 10) / 10;
}

/**
 * PR Cycle Timeデータを取得（GraphQL版）
 *
 * PR作成からPRマージまでの時間を計測するデータを取得する。
 * Issueリンクの有無は問わず、全てのマージ済みPRを対象とする。
 *
 * @param repositories - リポジトリ一覧
 * @param token - GitHubトークン
 * @param options - オプション設定
 * @param options.dateRange - 日付範囲（PR作成日基準）
 * @param options.excludeBaseBranches - 除外するベースブランチパターン（部分一致）
 * @returns PRCycleTimeデータ配列
 */
export function getPRCycleTimeDataGraphQL(
  repositories: GitHubRepository[],
  token: string,
  options: {
    dateRange?: DateRange;
    excludeBaseBranches?: string[];
  } = {}
): ApiResponse<PRCycleTime[]> {
  const { logger } = getContainer();
  const allPRCycleTimeData: PRCycleTime[] = [];
  const excludeBranches = options.excludeBaseBranches ?? [];

  logger.log('📦 Fetching PR Cycle Time data...');

  for (const repo of repositories) {
    logger.log(`🔍 Processing ${repo.fullName}...`);

    // マージ済みPRを取得（state: 'all' で取得し、後でフィルタ）
    const prsResult = getPullRequestsGraphQL({
      repo,
      token,
      state: 'all',
      dateRange: options.dateRange,
    });

    if (!prsResult.success || !prsResult.data) {
      logger.log(`  ⚠️ Failed to fetch PRs: ${prsResult.error}`);
      continue;
    }

    // マージ済みPRのみフィルタ
    const mergedPRs = prsResult.data.filter((pr) => pr.mergedAt !== null);
    logger.log(`  📋 Found ${mergedPRs.length} merged PRs`);

    for (const pr of mergedPRs) {
      // 除外ブランチチェック
      if (excludeBranches.length > 0 && pr.baseBranch) {
        const shouldExclude = excludeBranches.some((pattern) => pr.baseBranch!.includes(pattern));
        if (shouldExclude) {
          logger.debug(`  ⏩ Skipping PR#${pr.number} (baseBranch: ${pr.baseBranch})`);
          continue;
        }
      }

      const prCycleTimeHours = calculatePRCycleTimeHours(pr.createdAt, pr.mergedAt!);

      allPRCycleTimeData.push({
        prNumber: pr.number,
        prTitle: pr.title,
        repository: repo.fullName,
        prCreatedAt: pr.createdAt,
        prMergedAt: pr.mergedAt,
        prCycleTimeHours,
        linkedIssueNumber: null, // 将来的にGraphQLで取得可能
        baseBranch: pr.baseBranch ?? '',
      });
    }
  }

  logger.log(`✅ Total: ${allPRCycleTimeData.length} PRs processed`);
  return { success: true, data: allPRCycleTimeData };
}

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
 * 除外対象ブランチかどうかを判定
 */
function isExcludedBranch(baseBranch: string | undefined, excludePatterns: string[]): boolean {
  return (
    excludePatterns.length > 0 &&
    !!baseBranch &&
    excludePatterns.some((pattern) => baseBranch.includes(pattern))
  );
}

/**
 * PR Cycle Timeデータを取得（GraphQL版）
 *
 * PR作成からPRマージまでの時間を計測するデータを取得する。
 * Issueリンクの有無は問わず、全てのマージ済みPRを対象とする。
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

    const prsResult = getPullRequestsGraphQL({
      repo,
      token,
      state: 'closed',
      dateRange: options.dateRange,
    });

    if (!prsResult.success || !prsResult.data) {
      logger.log(`  ⚠️ Failed to fetch PRs: ${prsResult.error}`);
      continue;
    }

    const mergedPRs = prsResult.data.filter((pr) => pr.mergedAt !== null);
    logger.log(`  📋 Found ${mergedPRs.length} merged PRs`);

    for (const pr of mergedPRs) {
      if (isExcludedBranch(pr.baseBranch, excludeBranches)) {
        logger.debug(`  ⏩ Skipping PR#${pr.number} (baseBranch: ${pr.baseBranch})`);
        continue;
      }

      allPRCycleTimeData.push({
        prNumber: pr.number,
        prTitle: pr.title,
        repository: repo.fullName,
        prCreatedAt: pr.createdAt,
        prMergedAt: pr.mergedAt,
        prCycleTimeHours: calculatePRCycleTimeHours(pr.createdAt, pr.mergedAt!),
        linkedIssueNumber: null,
        baseBranch: pr.baseBranch ?? '',
      });
    }
  }

  logger.log(`✅ Total: ${allPRCycleTimeData.length} PRs processed`);
  return { success: true, data: allPRCycleTimeData };
}

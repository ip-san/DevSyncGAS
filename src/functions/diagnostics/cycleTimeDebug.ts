/**
 * サイクルタイム診断ツール
 *
 * 特定のIssueについて、なぜサイクルタイムが計算されないかを診断します。
 */

import { getGitHubToken, getProductionBranchPattern } from '../../config/settings';
import { getLinkedPRsForIssueGraphQL } from '../../services/github/graphql/issues/linkedPRs';
import { trackToProductionMergeGraphQL } from '../../services/github/graphql/issues/tracking';
import { getContainer } from '../../container';
import { ensureContainerInitialized } from '../helpers';
import type { LoggerClient } from '../../interfaces';
import type { PRChainItem } from '../../types';

/**
 * PRチェーンの詳細を診断
 */
function diagnosePRChain(
  prChain: PRChainItem[],
  productionMergedAt: string | null,
  productionPattern: string,
  logger: LoggerClient
): void {
  logger.log(`      PR Chain (${prChain.length} step(s)):`);
  for (let i = 0; i < prChain.length; i++) {
    const step = prChain[i];
    const arrow = i < prChain.length - 1 ? '→' : '';
    const status = step.mergedAt ? '✓ merged' : '✗ not merged';
    logger.log(
      `         ${i + 1}. PR #${step.prNumber}: ${step.headBranch} → ${step.baseBranch} (${status}) ${arrow}`
    );
  }

  if (productionMergedAt) {
    logger.log(`      ✅ Production merge found at: ${productionMergedAt}`);
    return;
  }

  logger.log(`      ❌ Production merge NOT found`);
  logger.log(`      💡 The PR chain did not reach a branch containing "${productionPattern}"`);

  if (prChain.length === 0) {
    return;
  }

  const lastPR = prChain[prChain.length - 1];
  logger.log(`      📌 Last PR in chain: #${lastPR.prNumber}`);
  logger.log(`         Base branch: "${lastPR.baseBranch}"`);
  logger.log(`         Merged: ${lastPR.mergedAt ? 'Yes' : 'No'}`);

  if (!lastPR.mergedAt) {
    logger.log(`      ⚠️  The PR is not merged yet - cannot track further`);
  } else if (!lastPR.baseBranch.toLowerCase().includes(productionPattern.toLowerCase())) {
    logger.log(
      `      ⚠️  Base branch "${lastPR.baseBranch}" does not contain "${productionPattern}"`
    );
    logger.log(
      `      💡 Check if there's a subsequent PR from "${lastPR.baseBranch}" to production`
    );
  }
}

/**
 * 指定したIssue番号のサイクルタイム追跡を診断
 *
 * @param owner - リポジトリオーナー
 * @param repo - リポジトリ名
 * @param issueNumber - Issue番号
 */
export function debugCycleTimeForIssue(owner: string, repo: string, issueNumber: number): void {
  ensureContainerInitialized();
  const { logger } = getContainer();
  const token = getGitHubToken();
  const productionPattern = getProductionBranchPattern();

  logger.log(`\n🔍 Debugging Cycle Time for Issue #${issueNumber}`);
  logger.log(`   Repository: ${owner}/${repo}`);
  logger.log(`   Production Pattern: "${productionPattern}"`);
  logger.log(`\n─────────────────────────────────────────────────────────`);

  // Step 1: IssueにリンクされたPRを取得
  logger.log(`\n📋 Step 1: Finding linked PRs...`);
  const linkedPRsResult = getLinkedPRsForIssueGraphQL(owner, repo, issueNumber, token);

  if (!linkedPRsResult.success || !linkedPRsResult.data || linkedPRsResult.data.length === 0) {
    logger.log(`   ❌ No linked PRs found`);
    logger.log(`   💡 Make sure the PR description includes "Fixes #${issueNumber}" or similar`);
    return;
  }

  logger.log(`   ✅ Found ${linkedPRsResult.data.length} linked PR(s):`);
  for (const pr of linkedPRsResult.data) {
    logger.log(`      - PR #${pr.number}`);
  }

  // Step 2: 各PRについてproductionまでの追跡を実行
  logger.log(`\n🔗 Step 2: Tracking each PR to production...`);

  for (const linkedPR of linkedPRsResult.data) {
    logger.log(`\n   ━━━ Tracking PR #${linkedPR.number} ━━━`);

    const trackResult = trackToProductionMergeGraphQL({
      owner,
      repo,
      initialPRNumber: linkedPR.number,
      token,
      productionPattern,
    });

    if (!trackResult.success || !trackResult.data) {
      logger.log(`      ❌ Tracking failed: ${trackResult.error}`);
      continue;
    }

    const { productionMergedAt, prChain } = trackResult.data;
    diagnosePRChain(prChain, productionMergedAt, productionPattern, logger);
  }

  logger.log(`\n─────────────────────────────────────────────────────────`);
  logger.log(`\n✅ Diagnostic complete`);
}

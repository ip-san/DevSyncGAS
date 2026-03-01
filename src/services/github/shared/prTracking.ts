/**
 * PRチェーン追跡の共通ロジック
 *
 * REST API / GraphQL API で共通のPR追跡アルゴリズムを提供。
 * Strategy パターンを使用して API呼び出し方法を抽象化。
 */

import type { ApiResponse, PRChainItem } from '../../../types';
import type { LoggerClient } from '../../../interfaces/index.js';

/** PRチェーン追跡の最大深度 */
export const MAX_PR_CHAIN_DEPTH = 5;

/**
 * PR情報（最小限の情報）
 */
export interface MinimalPRInfo {
  number: number;
  baseBranch: string | null;
  headBranch: string | null;
  mergedAt: string | null;
  mergeCommitSha: string | null;
}

/**
 * PR取得インターフェース（Strategy パターン）
 *
 * REST API / GraphQL API の実装を切り替え可能にする抽象化層
 */
export interface PRFetcher {
  /**
   * PR番号から詳細情報を取得
   */
  getPR(prNumber: number): ApiResponse<MinimalPRInfo | null>;

  /**
   * コミットSHAを含むPRを検索
   */
  findPRByCommit(commitSha: string, currentPRNumber: number): ApiResponse<number | null>;

  /**
   * ブランチ名で次のPRを検索（フォールバック用）
   *
   * 指定ブランチからマージされたPRのうち、指定日時以降に
   * マージされた最も早いPRを返す。
   * commit追跡が失敗した場合のフォールバックとして使用。
   */
  findNextPRByBranch?(headBranch: string, mergedAfter: string): ApiResponse<MinimalPRInfo | null>;
}

/**
 * PR追跡の1ステップ処理結果
 */
interface TrackStepResult {
  shouldContinue: boolean;
  productionMergedAt: string | null;
  nextPRNumber: number | null;
}

/**
 * productionブランチへのマージを検出
 */
function checkProductionMerge(
  pr: MinimalPRInfo,
  productionPattern: string,
  logger: LoggerClient
): TrackStepResult | null {
  if (pr.baseBranch && pr.baseBranch.toLowerCase().includes(productionPattern.toLowerCase())) {
    if (pr.mergedAt) {
      logger.log(
        `    ✅ Found production merge: PR #${pr.number} → ${pr.baseBranch} at ${pr.mergedAt}`
      );
      return { shouldContinue: false, productionMergedAt: pr.mergedAt, nextPRNumber: null };
    }
  }
  return null;
}

/**
 * PR追跡の1ステップを実行
 */
function processTrackStep(
  currentPRNumber: number,
  context: {
    productionPattern: string;
    fetcher: PRFetcher;
    prChain: PRChainItem[];
    logger: LoggerClient;
  }
): TrackStepResult {
  const { productionPattern, fetcher, prChain, logger } = context;
  const prResult = fetcher.getPR(currentPRNumber);

  if (!prResult.success || !prResult.data) {
    logger.log(`    ⚠️ Failed to fetch PR #${currentPRNumber}`);
    return { shouldContinue: false, productionMergedAt: null, nextPRNumber: null };
  }

  const pr = prResult.data;
  prChain.push({
    prNumber: pr.number,
    baseBranch: pr.baseBranch ?? 'unknown',
    headBranch: pr.headBranch ?? 'unknown',
    mergedAt: pr.mergedAt,
  });

  // productionブランチへのマージを検出
  const productionResult = checkProductionMerge(pr, productionPattern, logger);
  if (productionResult) {
    return productionResult;
  }

  // マージされていない場合は追跡終了
  if (!pr.mergedAt) {
    return { shouldContinue: false, productionMergedAt: null, nextPRNumber: null };
  }

  // 次のPRを検索（commit SHA追跡）
  if (pr.mergeCommitSha) {
    const nextPRResult = fetcher.findPRByCommit(pr.mergeCommitSha, currentPRNumber);
    if (nextPRResult.success && nextPRResult.data) {
      return { shouldContinue: true, productionMergedAt: null, nextPRNumber: nextPRResult.data };
    }
  }

  // フォールバック: ブランチ名ベースで次のPRを検索
  if (fetcher.findNextPRByBranch && pr.baseBranch) {
    logger.log(`    🔄 Commit tracking failed, trying branch fallback: head="${pr.baseBranch}"`);
    const branchResult = fetcher.findNextPRByBranch(pr.baseBranch, pr.mergedAt);
    if (branchResult.success && branchResult.data) {
      logger.log(
        `    🔗 Found next PR via branch fallback: PR #${branchResult.data.number} → ${branchResult.data.baseBranch}`
      );
      return {
        shouldContinue: true,
        productionMergedAt: null,
        nextPRNumber: branchResult.data.number,
      };
    }
  }

  return { shouldContinue: false, productionMergedAt: null, nextPRNumber: null };
}

/**
 * PRチェーンを追跡してproductionブランチへのマージを検出
 *
 * feature → main → staging → production のようなPRの連鎖を最大5段階まで追跡
 *
 * @param fetcher - PR取得の実装（REST or GraphQL）
 * @param initialPRNumber - 追跡開始PR番号
 * @param productionPattern - Productionブランチ判定パターン
 * @param logger - ログ出力クライアント
 * @returns Productionマージ日時とPRチェーン
 */
export function trackToProductionMerge(
  fetcher: PRFetcher,
  initialPRNumber: number,
  productionPattern: string,
  logger: LoggerClient
): ApiResponse<{
  productionMergedAt: string | null;
  prChain: PRChainItem[];
}> {
  const prChain: PRChainItem[] = [];
  let currentPRNumber = initialPRNumber;
  let productionMergedAt: string | null = null;

  const context = { productionPattern, fetcher, prChain, logger };

  for (let depth = 0; depth < MAX_PR_CHAIN_DEPTH; depth++) {
    const result = processTrackStep(currentPRNumber, context);

    if (result.productionMergedAt) {
      productionMergedAt = result.productionMergedAt;
    }

    if (!result.shouldContinue) {
      break;
    }

    currentPRNumber = result.nextPRNumber!;
  }

  return { success: true, data: { productionMergedAt, prChain } };
}

/**
 * 複数のPR追跡結果から最良のものを選択
 *
 * 優先順位:
 * 1. productionにマージされた結果（最も早い日時）
 * 2. マージされていない場合は最初の結果
 */
export function selectBestTrackResult(
  results: Array<{
    productionMergedAt: string | null;
    prChain: PRChainItem[];
  } | null>
): { productionMergedAt: string | null; prChain: PRChainItem[] } {
  let bestResult: { productionMergedAt: string | null; prChain: PRChainItem[] } | null = null;

  for (const result of results) {
    if (!result) {
      continue;
    }

    // productionにマージされたものを優先
    if (result.productionMergedAt) {
      const shouldUpdate =
        !bestResult?.productionMergedAt ||
        new Date(result.productionMergedAt) < new Date(bestResult.productionMergedAt);

      if (shouldUpdate) {
        bestResult = result;
      }
    } else if (!bestResult) {
      // productionマージがない場合は最初の結果を使用
      bestResult = result;
    }
  }

  return bestResult ?? { productionMergedAt: null, prChain: [] };
}

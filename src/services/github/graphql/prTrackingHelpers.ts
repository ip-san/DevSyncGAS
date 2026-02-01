/**
 * PR追跡のヘルパー関数（GraphQL API版）
 *
 * 共通のPR追跡ロジックにGraphQL API実装を提供するアダプター
 */

import type { ApiResponse } from '../../../types/index.js';
import type { PRFetcher, MinimalPRInfo } from '../shared/prTracking.js';
import { getPullRequestWithBranchesGraphQL } from './pullRequests.js';
import { findPRContainingCommitGraphQL } from './issues.js';

/**
 * GraphQL API版PRFetcherの作成
 *
 * 共通のPR追跡ロジックで使用するためのアダプター
 */
export function createGraphQLFetcher(owner: string, repo: string, token: string): PRFetcher {
  return {
    getPR(prNumber: number): ApiResponse<MinimalPRInfo | null> {
      const result = getPullRequestWithBranchesGraphQL(owner, repo, prNumber, token);

      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }

      const pr = result.data;
      return {
        success: true,
        data: {
          number: pr.number,
          baseBranch: pr.baseBranch ?? null,
          headBranch: pr.headBranch ?? null,
          mergedAt: pr.mergedAt,
          mergeCommitSha: pr.mergeCommitSha ?? null,
        },
      };
    },

    findPRByCommit(commitSha: string, currentPRNumber: number): ApiResponse<number | null> {
      const result = findPRContainingCommitGraphQL(owner, repo, commitSha, token);

      if (!result.success || !result.data) {
        return { success: true, data: null };
      }

      // 同じPRの場合は無限ループを防止
      if (result.data.number === currentPRNumber) {
        return { success: true, data: null };
      }

      return { success: true, data: result.data.number };
    },
  };
}

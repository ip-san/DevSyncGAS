/**
 * PRチェーン追跡ロジックのテスト
 *
 * commit SHA追跡とブランチベースフォールバックの両方をテスト
 */

import { describe, it, expect } from 'bun:test';
import {
  trackToProductionMerge,
  type PRFetcher,
  type MinimalPRInfo,
} from '../../src/services/github/shared/prTracking';
import type { ApiResponse } from '../../src/types';

/** テスト用のダミーロガー */
const dummyLogger = { log: () => {}, info: () => {}, warn: () => {}, error: () => {} };

/** テスト用PRデータ作成ヘルパー */
function makePR(overrides: Partial<MinimalPRInfo> & { number: number }): MinimalPRInfo {
  return {
    baseBranch: 'main',
    headBranch: 'feature',
    mergedAt: '2024-01-02T00:00:00Z',
    mergeCommitSha: 'abc123',
    ...overrides,
  };
}

/** テスト用PRFetcher作成 */
function createMockFetcher(options: {
  prs: Map<number, MinimalPRInfo>;
  commitToPR?: Map<string, number>;
  branchPRs?: Map<string, MinimalPRInfo>;
}): PRFetcher {
  return {
    getPR(prNumber: number): ApiResponse<MinimalPRInfo | null> {
      const pr = options.prs.get(prNumber);
      return { success: true, data: pr ?? null };
    },
    findPRByCommit(commitSha: string, currentPRNumber: number): ApiResponse<number | null> {
      const nextPR = options.commitToPR?.get(commitSha);
      if (nextPR && nextPR !== currentPRNumber) {
        return { success: true, data: nextPR };
      }
      return { success: true, data: null };
    },
    findNextPRByBranch(
      headBranch: string,
      _mergedAfter: string
    ): ApiResponse<MinimalPRInfo | null> {
      const pr = options.branchPRs?.get(headBranch);
      return { success: true, data: pr ?? null };
    },
  };
}

describe('trackToProductionMerge', () => {
  it('直接productionにマージされたPRを検出する', () => {
    const prs = new Map<number, MinimalPRInfo>();
    prs.set(
      100,
      makePR({ number: 100, baseBranch: 'production', mergedAt: '2024-01-02T00:00:00Z' })
    );

    const fetcher = createMockFetcher({ prs });
    const result = trackToProductionMerge(fetcher, 100, 'production', dummyLogger);

    expect(result.success).toBe(true);
    expect(result.data?.productionMergedAt).toBe('2024-01-02T00:00:00Z');
    expect(result.data?.prChain).toHaveLength(1);
  });

  it('commit SHA追跡でPRチェーンを辿れる', () => {
    const prs = new Map<number, MinimalPRInfo>();
    prs.set(
      100,
      makePR({
        number: 100,
        baseBranch: 'develop',
        headBranch: 'feature',
        mergedAt: '2024-01-02T00:00:00Z',
        mergeCommitSha: 'sha100',
      })
    );
    prs.set(
      101,
      makePR({
        number: 101,
        baseBranch: 'production',
        headBranch: 'develop',
        mergedAt: '2024-01-03T00:00:00Z',
        mergeCommitSha: 'sha101',
      })
    );

    const commitToPR = new Map<string, number>();
    commitToPR.set('sha100', 101);

    const fetcher = createMockFetcher({ prs, commitToPR });
    const result = trackToProductionMerge(fetcher, 100, 'production', dummyLogger);

    expect(result.data?.productionMergedAt).toBe('2024-01-03T00:00:00Z');
    expect(result.data?.prChain).toHaveLength(2);
    expect(result.data?.prChain[0].prNumber).toBe(100);
    expect(result.data?.prChain[1].prNumber).toBe(101);
  });

  it('commit追跡失敗時にブランチフォールバックで次PRを検出する', () => {
    const prs = new Map<number, MinimalPRInfo>();
    prs.set(
      100,
      makePR({
        number: 100,
        baseBranch: 'master',
        headBranch: 'feature',
        mergedAt: '2024-01-02T00:00:00Z',
        mergeCommitSha: 'sha100',
      })
    );
    prs.set(
      101,
      makePR({
        number: 101,
        baseBranch: 'production_server_toyama',
        headBranch: 'master',
        mergedAt: '2024-01-03T00:00:00Z',
        mergeCommitSha: 'sha101',
      })
    );

    // commit追跡はマッピングなし（失敗する）
    const commitToPR = new Map<string, number>();

    // ブランチフォールバック: masterからマージされたPRを返す
    const branchPRs = new Map<string, MinimalPRInfo>();
    branchPRs.set('master', prs.get(101)!);

    const fetcher = createMockFetcher({ prs, commitToPR, branchPRs });
    const result = trackToProductionMerge(fetcher, 100, 'production', dummyLogger);

    expect(result.data?.productionMergedAt).toBe('2024-01-03T00:00:00Z');
    expect(result.data?.prChain).toHaveLength(2);
  });

  it('feature → master → staging → production の3段チェーンをフォールバックで追跡', () => {
    const prs = new Map<number, MinimalPRInfo>();
    prs.set(
      100,
      makePR({
        number: 100,
        baseBranch: 'master',
        headBranch: 'feature',
        mergedAt: '2024-01-02T00:00:00Z',
        mergeCommitSha: 'sha100',
      })
    );
    prs.set(
      101,
      makePR({
        number: 101,
        baseBranch: 'staging_toyama',
        headBranch: 'master',
        mergedAt: '2024-01-03T00:00:00Z',
        mergeCommitSha: 'sha101',
      })
    );
    prs.set(
      102,
      makePR({
        number: 102,
        baseBranch: 'production_server_toyama',
        headBranch: 'staging_toyama',
        mergedAt: '2024-01-04T00:00:00Z',
        mergeCommitSha: 'sha102',
      })
    );

    // commit追跡は全て失敗
    const commitToPR = new Map<string, number>();

    // ブランチフォールバック
    const branchPRs = new Map<string, MinimalPRInfo>();
    branchPRs.set('master', prs.get(101)!);
    branchPRs.set('staging_toyama', prs.get(102)!);

    const fetcher = createMockFetcher({ prs, commitToPR, branchPRs });
    const result = trackToProductionMerge(fetcher, 100, 'production', dummyLogger);

    expect(result.data?.productionMergedAt).toBe('2024-01-04T00:00:00Z');
    expect(result.data?.prChain).toHaveLength(3);
    expect(result.data?.prChain[0].prNumber).toBe(100);
    expect(result.data?.prChain[1].prNumber).toBe(101);
    expect(result.data?.prChain[2].prNumber).toBe(102);
  });

  it('フォールバックも失敗した場合はnullを返す', () => {
    const prs = new Map<number, MinimalPRInfo>();
    prs.set(
      100,
      makePR({
        number: 100,
        baseBranch: 'develop',
        headBranch: 'feature',
        mergedAt: '2024-01-02T00:00:00Z',
        mergeCommitSha: 'sha100',
      })
    );

    // 両方とも失敗
    const fetcher = createMockFetcher({ prs });
    const result = trackToProductionMerge(fetcher, 100, 'production', dummyLogger);

    expect(result.data?.productionMergedAt).toBeNull();
    expect(result.data?.prChain).toHaveLength(1);
  });

  it('findNextPRByBranchが未実装のfetcherでも動作する', () => {
    const prs = new Map<number, MinimalPRInfo>();
    prs.set(
      100,
      makePR({
        number: 100,
        baseBranch: 'develop',
        headBranch: 'feature',
        mergedAt: '2024-01-02T00:00:00Z',
        mergeCommitSha: 'sha100',
      })
    );

    // findNextPRByBranchなしのfetcher
    const fetcher: PRFetcher = {
      getPR(prNumber: number) {
        const pr = prs.get(prNumber);
        return { success: true, data: pr ?? null };
      },
      findPRByCommit() {
        return { success: true, data: null };
      },
    };

    const result = trackToProductionMerge(fetcher, 100, 'production', dummyLogger);

    expect(result.data?.productionMergedAt).toBeNull();
    expect(result.data?.prChain).toHaveLength(1);
  });

  it('未マージPRでは追跡が停止する', () => {
    const prs = new Map<number, MinimalPRInfo>();
    prs.set(
      100,
      makePR({
        number: 100,
        baseBranch: 'develop',
        headBranch: 'feature',
        mergedAt: null,
        mergeCommitSha: null,
      })
    );

    const fetcher = createMockFetcher({ prs });
    const result = trackToProductionMerge(fetcher, 100, 'production', dummyLogger);

    expect(result.data?.productionMergedAt).toBeNull();
  });

  it('productionパターンの部分一致で検出する', () => {
    const prs = new Map<number, MinimalPRInfo>();
    prs.set(
      100,
      makePR({
        number: 100,
        baseBranch: 'production_server_toyama',
        headBranch: 'staging',
        mergedAt: '2024-01-02T00:00:00Z',
      })
    );

    const fetcher = createMockFetcher({ prs });
    const result = trackToProductionMerge(fetcher, 100, 'production', dummyLogger);

    expect(result.data?.productionMergedAt).toBe('2024-01-02T00:00:00Z');
  });
});

/**
 * レビュー効率データ計算のヘルパー関数（REST API版）
 *
 * getReviewEfficiencyDataForPRs の複雑度削減のため分離
 */

import type { PRReviewData, GitHubPullRequest } from '../../types/index.js';
import type { LoggerClient } from '../../interfaces/index.js';
import { getPRReadyForReviewAt, getPRReviews } from './pullRequests.js';
import { MS_TO_HOURS } from '../../utils/timeConstants.js';

/**
 * レビュー情報取得結果
 */
export interface ReviewInfo {
  firstReviewAt: string | null;
  approvedAt: string | null;
}

/**
 * PRのレビュー情報を取得してソート
 */
export function fetchAndSortReviews(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
  logger: LoggerClient
): ReviewInfo {
  const reviewsResult = getPRReviews(owner, repo, prNumber, token);
  let firstReviewAt: string | null = null;
  let approvedAt: string | null = null;

  if (reviewsResult.success && reviewsResult.data) {
    const sortedReviews = [...reviewsResult.data].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );

    if (sortedReviews.length > 0) {
      firstReviewAt = sortedReviews[0].submittedAt;
    }

    const approvalReview = sortedReviews.find((r) => r.state === 'APPROVED');
    if (approvalReview) {
      approvedAt = approvalReview.submittedAt;
    }
  } else {
    logger.log(`  ⚠️ Failed to fetch reviews for PR #${prNumber}: ${reviewsResult.error}`);
  }

  return { firstReviewAt, approvedAt };
}

/**
 * Ready for Review時刻を取得
 */
export function fetchReadyForReviewTime(
  owner: string,
  repo: string,
  prNumber: number,
  prCreatedAt: string,
  token: string,
  logger: LoggerClient
): string {
  const readyResult = getPRReadyForReviewAt(owner, repo, prNumber, token);

  if (readyResult.success && readyResult.data) {
    return readyResult.data;
  }

  if (!readyResult.success) {
    logger.log(`  ⚠️ Failed to fetch timeline for PR #${prNumber}: ${readyResult.error}`);
  }

  return prCreatedAt;
}

/**
 * レビュー効率指標を計算
 */
export interface ReviewMetrics {
  timeToFirstReviewHours: number | null;
  reviewDurationHours: number | null;
  timeToMergeHours: number | null;
  totalTimeHours: number | null;
}

export function calculateReviewMetrics(
  readyForReviewAt: string,
  firstReviewAt: string | null,
  approvedAt: string | null,
  mergedAt: string | null
): ReviewMetrics {
  const readyAt = new Date(readyForReviewAt).getTime();
  let timeToFirstReviewHours: number | null = null;
  let reviewDurationHours: number | null = null;
  let timeToMergeHours: number | null = null;
  let totalTimeHours: number | null = null;

  if (firstReviewAt) {
    timeToFirstReviewHours =
      Math.round(((new Date(firstReviewAt).getTime() - readyAt) / MS_TO_HOURS) * 10) / 10;
  }

  if (firstReviewAt && approvedAt) {
    reviewDurationHours =
      Math.round(
        ((new Date(approvedAt).getTime() - new Date(firstReviewAt).getTime()) / MS_TO_HOURS) * 10
      ) / 10;
  }

  if (approvedAt && mergedAt) {
    timeToMergeHours =
      Math.round(
        ((new Date(mergedAt).getTime() - new Date(approvedAt).getTime()) / MS_TO_HOURS) * 10
      ) / 10;
  }

  if (mergedAt) {
    totalTimeHours = Math.round(((new Date(mergedAt).getTime() - readyAt) / MS_TO_HOURS) * 10) / 10;
  }

  return {
    timeToFirstReviewHours,
    reviewDurationHours,
    timeToMergeHours,
    totalTimeHours,
  };
}

/**
 * PR1件分のレビュー効率データを作成
 */
export function buildReviewData(
  pr: GitHubPullRequest,
  readyForReviewAt: string,
  reviewInfo: ReviewInfo,
  metrics: ReviewMetrics
): PRReviewData {
  return {
    prNumber: pr.number,
    title: pr.title,
    repository: pr.repository,
    createdAt: pr.createdAt,
    readyForReviewAt,
    firstReviewAt: reviewInfo.firstReviewAt,
    approvedAt: reviewInfo.approvedAt,
    mergedAt: pr.mergedAt,
    ...metrics,
  };
}

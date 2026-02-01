/**
 * レビュー効率計算モジュール
 *
 * PRの各フェーズでの滞留時間を測定する。
 */

import type { ReviewEfficiencyMetrics, PRReviewData } from '../../types';
import { calculateStats } from './statsHelpers.js';

/**
 * レビュー効率（Review Efficiency）を計算
 *
 * 定義: PRの各フェーズでの滞留時間を測定
 */
export function calculateReviewEfficiency(
  reviewData: PRReviewData[],
  period: string
): ReviewEfficiencyMetrics {
  if (reviewData.length === 0) {
    return {
      period,
      prCount: 0,
      timeToFirstReview: {
        avgHours: null,
        medianHours: null,
        minHours: null,
        maxHours: null,
      },
      reviewDuration: {
        avgHours: null,
        medianHours: null,
        minHours: null,
        maxHours: null,
      },
      timeToMerge: {
        avgHours: null,
        medianHours: null,
        minHours: null,
        maxHours: null,
      },
      totalTime: {
        avgHours: null,
        medianHours: null,
        minHours: null,
        maxHours: null,
      },
      prDetails: [],
    };
  }

  // 各時間を抽出（nullを除外）
  const timeToFirstReviewValues = reviewData
    .map((pr) => pr.timeToFirstReviewHours)
    .filter((v): v is number => v !== null);

  const reviewDurationValues = reviewData
    .map((pr) => pr.reviewDurationHours)
    .filter((v): v is number => v !== null);

  const timeToMergeValues = reviewData
    .map((pr) => pr.timeToMergeHours)
    .filter((v): v is number => v !== null);

  const totalTimeValues = reviewData
    .map((pr) => pr.totalTimeHours)
    .filter((v): v is number => v !== null);

  // 統計値を計算
  const timeToFirstReviewStats = calculateStats(timeToFirstReviewValues);
  const reviewDurationStats = calculateStats(reviewDurationValues);
  const timeToMergeStats = calculateStats(timeToMergeValues);
  const totalTimeStats = calculateStats(totalTimeValues);

  return {
    period,
    prCount: reviewData.length,
    timeToFirstReview: {
      avgHours: timeToFirstReviewStats.avg,
      medianHours: timeToFirstReviewStats.median,
      minHours: timeToFirstReviewStats.min,
      maxHours: timeToFirstReviewStats.max,
    },
    reviewDuration: {
      avgHours: reviewDurationStats.avg,
      medianHours: reviewDurationStats.median,
      minHours: reviewDurationStats.min,
      maxHours: reviewDurationStats.max,
    },
    timeToMerge: {
      avgHours: timeToMergeStats.avg,
      medianHours: timeToMergeStats.median,
      minHours: timeToMergeStats.min,
      maxHours: timeToMergeStats.max,
    },
    totalTime: {
      avgHours: totalTimeStats.avg,
      medianHours: totalTimeStats.median,
      minHours: totalTimeStats.min,
      maxHours: totalTimeStats.max,
    },
    prDetails: reviewData,
  };
}

/**
 * PR Cycle Time計算モジュール
 *
 * PR作成（着手）から PRマージ（完了）までの時間を計算する。
 * Issue有無は問わず、全てのマージ済みPRを対象とする。
 */

import type { PRCycleTimeMetrics, PRCycleTime, PRCycleTimeDetail } from '../../types';
import { calculateStats } from './statsHelpers.js';

/**
 * PR Cycle Timeを計算
 *
 * 定義: PR作成（着手）から PRマージ（完了）までの時間
 */
export function calculatePRCycleTime(
  prCycleTimeData: PRCycleTime[],
  period: string
): PRCycleTimeMetrics {
  // マージ済みPRのみ対象
  const validPRs = prCycleTimeData.filter(
    (pr) => pr.prMergedAt !== null && pr.prCycleTimeHours !== null
  );

  if (validPRs.length === 0) {
    return {
      period,
      mergedPRCount: 0,
      avgPRCycleTimeHours: null,
      medianPRCycleTimeHours: null,
      minPRCycleTimeHours: null,
      maxPRCycleTimeHours: null,
      prDetails: [],
    };
  }

  const prDetails: PRCycleTimeDetail[] = validPRs.map((pr) => ({
    prNumber: pr.prNumber,
    title: pr.prTitle,
    repository: pr.repository,
    prCreatedAt: pr.prCreatedAt,
    prMergedAt: pr.prMergedAt!,
    prCycleTimeHours: pr.prCycleTimeHours!,
    linkedIssueNumber: pr.linkedIssueNumber,
    baseBranch: pr.baseBranch,
  }));

  const cycleTimes = prDetails.map((t) => t.prCycleTimeHours);
  const stats = calculateStats(cycleTimes);

  return {
    period,
    mergedPRCount: validPRs.length,
    avgPRCycleTimeHours: stats.avg,
    medianPRCycleTimeHours: stats.median,
    minPRCycleTimeHours: stats.min,
    maxPRCycleTimeHours: stats.max,
    prDetails,
  };
}

/**
 * 拡張指標のリポジトリ別シート操作共通ヘルパー
 *
 * 各拡張指標（Cycle Time、Coding Time、Rework Rate、Review Efficiency、PR Size）を
 * リポジトリ別シートに分離するための共通機能を提供。
 */

import type {
  IssueCycleTimeDetail,
  IssueCodingTimeDetail,
  ReworkRateMetrics,
  ReviewEfficiencyMetrics,
  PRSizeMetrics,
} from '../../types';
import { REPOSITORY_NAME_MAX_LENGTH } from '../../config/apiConfig';

/**
 * Issue詳細をリポジトリ別にグループ化
 *
 * @param details - Issue詳細の配列（CycleTime または CodingTime）
 * @returns リポジトリ名をキーとしたマップ
 */
export function groupIssueDetailsByRepository<T extends { repository: string }>(
  details: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const detail of details) {
    const existing = grouped.get(detail.repository) ?? [];
    existing.push(detail);
    grouped.set(detail.repository, existing);
  }

  return grouped;
}

/**
 * PR詳細をリポジトリ別にグループ化
 *
 * @param details - PR詳細の配列（ReworkRate、ReviewEfficiency、PRSize）
 * @returns リポジトリ名をキーとしたマップ
 */
export function groupPRDetailsByRepository<T extends { repository: string }>(
  details: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const detail of details) {
    const existing = grouped.get(detail.repository) ?? [];
    existing.push(detail);
    grouped.set(detail.repository, existing);
  }

  return grouped;
}

/**
 * 拡張指標のリポジトリ別シート名を生成
 *
 * @param repository - リポジトリ名（owner/repo形式）
 * @param metricName - 指標名（例: "サイクルタイム"）
 * @returns シート名（例: "owner/repo/サイクルタイム"）
 */
export function getExtendedMetricSheetName(repository: string, metricName: string): string {
  // Google Sheetsのシート名制限: 100文字以内
  const fullName = `${repository}/${metricName}`;

  if (fullName.length > REPOSITORY_NAME_MAX_LENGTH) {
    // リポジトリ名を切り詰めて指標名を保持
    const metricLength = metricName.length;
    const availableLength = REPOSITORY_NAME_MAX_LENGTH - metricLength - 1; // -1 for '/'
    const truncatedRepo = repository.substring(0, availableLength);
    return `${truncatedRepo}/${metricName}`;
  }

  return fullName;
}

/**
 * Cycle Time詳細をリポジトリ別にグループ化（型安全性のためのエイリアス）
 *
 * @param details - Cycle Time詳細の配列
 * @returns リポジトリ名をキーとしたマップ
 */
export function groupCycleTimeDetailsByRepository(
  details: IssueCycleTimeDetail[]
): Map<string, IssueCycleTimeDetail[]> {
  return groupIssueDetailsByRepository(details);
}

/**
 * Coding Time詳細をリポジトリ別にグループ化（型安全性のためのエイリアス）
 *
 * @param details - Coding Time詳細の配列
 * @returns リポジトリ名をキーとしたマップ
 */
export function groupCodingTimeDetailsByRepository(
  details: IssueCodingTimeDetail[]
): Map<string, IssueCodingTimeDetail[]> {
  return groupIssueDetailsByRepository(details);
}

/**
 * Rework Rate詳細をリポジトリ別にグループ化
 *
 * @param metrics - Rework Rate メトリクス
 * @returns リポジトリ名をキーとしたマップ
 */
export function groupReworkRateDetailsByRepository(
  details: ReworkRateMetrics['prDetails']
): Map<string, ReworkRateMetrics['prDetails']> {
  return groupPRDetailsByRepository(details);
}

/**
 * Review Efficiency詳細をリポジトリ別にグループ化
 *
 * @param details - Review Efficiency詳細の配列
 * @returns リポジトリ名をキーとしたマップ
 */
export function groupReviewEfficiencyDetailsByRepository(
  details: ReviewEfficiencyMetrics['prDetails']
): Map<string, ReviewEfficiencyMetrics['prDetails']> {
  return groupPRDetailsByRepository(details);
}

/**
 * PR Size詳細をリポジトリ別にグループ化
 *
 * @param details - PR Size詳細の配列
 * @returns リポジトリ名をキーとしたマップ
 */
export function groupPRSizeDetailsByRepository(
  details: PRSizeMetrics['prDetails']
): Map<string, PRSizeMetrics['prDetails']> {
  return groupPRDetailsByRepository(details);
}

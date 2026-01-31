import type { HealthStatus } from '../types/dashboard';

/**
 * 閾値設定（good/warning境界値）
 */
export interface ThresholdConfig {
  /** この値以下なら "good" */
  good: number;
  /** この値以下なら "warning"、超えると "critical" */
  warning: number;
}

/**
 * 単一の指標値を閾値に基づいてHealthStatusに評価する
 *
 * @param value - 評価する指標値（nullの場合は評価対象外）
 * @param threshold - 閾値設定
 * @returns 健全性ステータス（"good" | "warning" | "critical"）、nullの場合はnull
 *
 * @example
 * ```typescript
 * const status = evaluateMetric(12, { good: 24, warning: 168 });
 * // => "good" (12 <= 24)
 *
 * const status2 = evaluateMetric(100, { good: 24, warning: 168 });
 * // => "warning" (24 < 100 <= 168)
 *
 * const status3 = evaluateMetric(200, { good: 24, warning: 168 });
 * // => "critical" (168 < 200)
 * ```
 */
export function evaluateMetric(
  value: number | null,
  threshold: ThresholdConfig
): HealthStatus | null {
  if (value === null) {
    return null;
  }

  if (value <= threshold.good) {
    return 'good';
  }

  if (value <= threshold.warning) {
    return 'warning';
  }

  return 'critical';
}

/**
 * 複数のステータスから最も悪いステータスを選択する
 *
 * 優先度: critical > warning > good
 *
 * @param statuses - 評価するステータスの配列（nullは除外される）
 * @returns 最も悪いステータス（全てnullの場合は "good"）
 *
 * @example
 * ```typescript
 * const worst = selectWorstStatus(['good', 'warning', 'critical']);
 * // => "critical"
 *
 * const worst2 = selectWorstStatus(['good', null, 'warning']);
 * // => "warning"
 *
 * const worst3 = selectWorstStatus([null, null]);
 * // => "good"
 * ```
 */
export function selectWorstStatus(statuses: (HealthStatus | null)[]): HealthStatus {
  const validStatuses = statuses.filter((s): s is HealthStatus => s !== null);

  if (validStatuses.length === 0) {
    return 'good';
  }

  if (validStatuses.includes('critical')) {
    return 'critical';
  }

  if (validStatuses.includes('warning')) {
    return 'warning';
  }

  return 'good';
}

/**
 * 複数の指標を一括評価して総合ステータスを返す
 *
 * @param metrics - 評価する指標と閾値のマップ
 * @returns 総合的な健全性ステータス
 *
 * @example
 * ```typescript
 * const overall = evaluateOverallHealth({
 *   leadTime: { value: 12, threshold: { good: 24, warning: 168 } },
 *   cycleTime: { value: 100, threshold: { good: 48, warning: 120 } },
 * });
 * // => "warning" (leadTime: good, cycleTime: warning)
 * ```
 */
export function evaluateOverallHealth(
  metrics: Record<string, { value: number | null; threshold: ThresholdConfig }>
): HealthStatus {
  const statuses = Object.values(metrics).map(({ value, threshold }) =>
    evaluateMetric(value, threshold)
  );

  return selectWorstStatus(statuses);
}

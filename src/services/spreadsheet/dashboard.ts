/**
 * Dashboardシート操作
 *
 * プロジェクト全体を俯瞰するダッシュボードシートを生成。
 * - 最新状況: 全リポジトリ × 全指標のマトリクス
 * - トレンド: 週次の推移
 */

import type { DevOpsMetrics, HealthStatus } from '../../types';
import type { Sheet } from '../../interfaces';
import { getContainer } from '../../container';
import { DEFAULT_HEALTH_THRESHOLDS } from '../../types/dashboard';
import { autoResizeColumns, openSpreadsheet } from './helpers';
import { DASHBOARD_SCHEMA, getHeadersFromSchema } from '../../schemas';

const DASHBOARD_HEADERS = getHeadersFromSchema(DASHBOARD_SCHEMA);

/**
 * 健全性ステータスを判定
 */
export function determineHealthStatus(
  leadTimeHours: number | null,
  changeFailureRate: number | null,
  cycleTimeHours: number | null,
  timeToFirstReviewHours: number | null
): HealthStatus {
  const thresholds = DEFAULT_HEALTH_THRESHOLDS;

  // 各指標のステータスを判定
  const statuses: HealthStatus[] = [];

  if (leadTimeHours !== null) {
    if (leadTimeHours <= thresholds.leadTime.good) {
      statuses.push('good');
    } else if (leadTimeHours <= thresholds.leadTime.warning) {
      statuses.push('warning');
    } else {
      statuses.push('critical');
    }
  }

  if (changeFailureRate !== null) {
    if (changeFailureRate <= thresholds.changeFailureRate.good) {
      statuses.push('good');
    } else if (changeFailureRate <= thresholds.changeFailureRate.warning) {
      statuses.push('warning');
    } else {
      statuses.push('critical');
    }
  }

  if (cycleTimeHours !== null) {
    if (cycleTimeHours <= thresholds.cycleTime.good) {
      statuses.push('good');
    } else if (cycleTimeHours <= thresholds.cycleTime.warning) {
      statuses.push('warning');
    } else {
      statuses.push('critical');
    }
  }

  if (timeToFirstReviewHours !== null) {
    if (timeToFirstReviewHours <= thresholds.timeToFirstReview.good) {
      statuses.push('good');
    } else if (timeToFirstReviewHours <= thresholds.timeToFirstReview.warning) {
      statuses.push('warning');
    } else {
      statuses.push('critical');
    }
  }

  // 最も悪いステータスを返す
  if (statuses.includes('critical')) {return 'critical';}
  if (statuses.includes('warning')) {return 'warning';}
  return 'good';
}

/**
 * ステータスを表示用文字列に変換
 */
function formatStatus(status: HealthStatus): string {
  switch (status) {
    case 'good':
      return '良好';
    case 'warning':
      return '要注意';
    case 'critical':
      return '要対応';
  }
}

/**
 * リポジトリ別の最新メトリクスを集計
 */
interface RepositoryLatestData {
  repository: string;
  latestDate: string;
  deploymentFrequency: string;
  leadTimeHours: number | null;
  changeFailureRate: number | null;
  mttrHours: number | null;
  // 拡張指標（将来的に統合）
  cycleTimeHours: number | null;
  timeToFirstReviewHours: number | null;
  avgLinesOfCode: number | null;
  avgAdditionalCommits: number | null;
}

/**
 * メトリクスから各リポジトリの最新データを抽出
 */
export function extractLatestMetricsByRepository(
  metrics: DevOpsMetrics[]
): Map<string, RepositoryLatestData> {
  const latestByRepo = new Map<string, RepositoryLatestData>();

  for (const metric of metrics) {
    const existing = latestByRepo.get(metric.repository);

    if (!existing || metric.date > existing.latestDate) {
      latestByRepo.set(metric.repository, {
        repository: metric.repository,
        latestDate: metric.date,
        deploymentFrequency: metric.deploymentFrequency,
        leadTimeHours: metric.leadTimeForChangesHours,
        changeFailureRate: metric.changeFailureRate,
        mttrHours: metric.meanTimeToRecoveryHours,
        // 拡張指標は現時点ではnull（後で統合）
        cycleTimeHours: null,
        timeToFirstReviewHours: null,
        avgLinesOfCode: null,
        avgAdditionalCommits: null,
      });
    }
  }

  return latestByRepo;
}

/**
 * 全体平均を計算
 */
function calculateOverallAverage(
  repoDataList: RepositoryLatestData[]
): Omit<RepositoryLatestData, 'repository' | 'latestDate'> {
  if (repoDataList.length === 0) {
    return {
      deploymentFrequency: 'N/A',
      leadTimeHours: null,
      changeFailureRate: null,
      mttrHours: null,
      cycleTimeHours: null,
      timeToFirstReviewHours: null,
      avgLinesOfCode: null,
      avgAdditionalCommits: null,
    };
  }

  const avgOrNull = (values: (number | null)[]): number | null => {
    const valid = values.filter((v): v is number => v !== null);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };

  return {
    deploymentFrequency: '(平均)',
    leadTimeHours: avgOrNull(repoDataList.map((d) => d.leadTimeHours)),
    changeFailureRate: avgOrNull(repoDataList.map((d) => d.changeFailureRate)),
    mttrHours: avgOrNull(repoDataList.map((d) => d.mttrHours)),
    cycleTimeHours: avgOrNull(repoDataList.map((d) => d.cycleTimeHours)),
    timeToFirstReviewHours: avgOrNull(repoDataList.map((d) => d.timeToFirstReviewHours)),
    avgLinesOfCode: avgOrNull(repoDataList.map((d) => d.avgLinesOfCode)),
    avgAdditionalCommits: avgOrNull(repoDataList.map((d) => d.avgAdditionalCommits)),
  };
}

/**
 * Dashboardシートを作成または更新
 *
 * @param spreadsheetId - スプレッドシートID
 * @param metrics - 全リポジトリのメトリクス
 */
export function writeDashboard(
  spreadsheetId: string,
  metrics: DevOpsMetrics[]
): void {
  const { logger } = getContainer();
  const spreadsheet = openSpreadsheet(spreadsheetId);

  // 既存シートをクリアまたは作成
  let sheet = spreadsheet.getSheetByName('Dashboard');
  if (sheet) {
    sheet.clear();
  } else {
    sheet = spreadsheet.insertSheet('Dashboard');
  }

  // シートを先頭に移動（ユーザーが最初に見えるように）
  spreadsheet.setActiveSheet(sheet);
  spreadsheet.moveActiveSheet(1);

  // ヘッダー設定
  sheet.getRange(1, 1, 1, DASHBOARD_HEADERS.length).setValues([DASHBOARD_HEADERS]);
  sheet.getRange(1, 1, 1, DASHBOARD_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  if (metrics.length === 0) {
    logger.log('⚠️ No metrics for dashboard');
    return;
  }

  // リポジトリ別最新データを抽出
  const latestByRepo = extractLatestMetricsByRepository(metrics);
  const repoDataList = Array.from(latestByRepo.values());

  // 行データを作成
  const rows: (string | number)[][] = [];

  for (const data of repoDataList) {
    const status = determineHealthStatus(
      data.leadTimeHours,
      data.changeFailureRate,
      data.cycleTimeHours,
      data.timeToFirstReviewHours
    );

    rows.push([
      data.repository,
      data.deploymentFrequency,
      data.leadTimeHours ?? 'N/A',
      data.changeFailureRate ?? 'N/A',
      data.mttrHours ?? 'N/A',
      data.cycleTimeHours ?? 'N/A',
      data.timeToFirstReviewHours ?? 'N/A',
      data.avgLinesOfCode ?? 'N/A',
      formatStatus(status),
    ]);
  }

  // 全体平均行（複数リポジトリの場合）
  if (repoDataList.length > 1) {
    const overall = calculateOverallAverage(repoDataList);
    const overallStatus = determineHealthStatus(
      overall.leadTimeHours,
      overall.changeFailureRate,
      overall.cycleTimeHours,
      overall.timeToFirstReviewHours
    );

    rows.push([
      '【全体平均】',
      overall.deploymentFrequency,
      overall.leadTimeHours ?? 'N/A',
      overall.changeFailureRate ?? 'N/A',
      overall.mttrHours ?? 'N/A',
      overall.cycleTimeHours ?? 'N/A',
      overall.timeToFirstReviewHours ?? 'N/A',
      overall.avgLinesOfCode ?? 'N/A',
      formatStatus(overallStatus),
    ]);
  }

  // データ書き込み
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, DASHBOARD_HEADERS.length).setValues(rows);
  }

  // フォーマット
  formatDashboardSheet(sheet, rows.length, repoDataList.length > 1);

  logger.log(`✅ Dashboard updated with ${repoDataList.length} repositories`);
}

/**
 * Dashboardシートのフォーマット
 */
function formatDashboardSheet(sheet: Sheet, rowCount: number, hasOverallRow: boolean): void {
  if (rowCount === 0) {return;}

  const lastCol = sheet.getLastColumn();

  // 数値列のフォーマット（3-8列目）
  sheet.getRange(2, 3, rowCount, 1).setNumberFormat('#,##0.0'); // リードタイム
  sheet.getRange(2, 4, rowCount, 1).setNumberFormat('#,##0.0'); // 変更障害率
  sheet.getRange(2, 5, rowCount, 1).setNumberFormat('#,##0.0'); // MTTR
  sheet.getRange(2, 6, rowCount, 1).setNumberFormat('#,##0.0'); // サイクルタイム
  sheet.getRange(2, 7, rowCount, 1).setNumberFormat('#,##0.0'); // レビュー待ち
  sheet.getRange(2, 8, rowCount, 1).setNumberFormat('#,##0'); // PRサイズ

  // 全体平均行を太字に
  if (hasOverallRow) {
    sheet.getRange(rowCount + 1, 1, 1, lastCol).setFontWeight('bold');
  }

  // ステータス列の条件付き書式は手動設定が必要（GASの制限）

  autoResizeColumns(sheet, lastCol);
}

/**
 * 週次トレンドデータを計算
 */
export interface WeeklyTrendData {
  week: string;
  totalDeployments: number;
  avgLeadTimeHours: number | null;
  avgChangeFailureRate: number | null;
  avgCycleTimeHours: number | null;
}

/**
 * メトリクスから週次トレンドを計算
 */
export function calculateWeeklyTrends(
  metrics: DevOpsMetrics[],
  weekCount: number = 8
): WeeklyTrendData[] {
  // 日付→週に変換
  const weeklyData = new Map<string, DevOpsMetrics[]>();

  for (const metric of metrics) {
    const date = new Date(metric.date);
    const week = getISOWeek(date);
    const existing = weeklyData.get(week) ?? [];
    existing.push(metric);
    weeklyData.set(week, existing);
  }

  // 週でソート（新しい順）
  const sortedWeeks = Array.from(weeklyData.keys()).sort().reverse().slice(0, weekCount);

  const trends: WeeklyTrendData[] = [];

  for (const week of sortedWeeks) {
    const weekMetrics = weeklyData.get(week) ?? [];

    const totalDeployments = weekMetrics.reduce((sum, m) => sum + m.deploymentCount, 0);

    const leadTimes = weekMetrics
      .map((m) => m.leadTimeForChangesHours)
      .filter((v): v is number => v !== null && v > 0);
    const avgLeadTime =
      leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null;

    const cfrs = weekMetrics.map((m) => m.changeFailureRate).filter((v): v is number => v !== null);
    const avgCfr = cfrs.length > 0 ? cfrs.reduce((a, b) => a + b, 0) / cfrs.length : null;

    trends.push({
      week,
      totalDeployments,
      avgLeadTimeHours: avgLeadTime,
      avgChangeFailureRate: avgCfr,
      avgCycleTimeHours: null, // 拡張指標統合時に設定
    });
  }

  return trends;
}

/**
 * ISO週番号を取得（YYYY-Www形式）
 */
function getISOWeek(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * 前週比を計算
 */
function calculateChange(current: number | null, previous: number | null): string {
  if (current === null || previous === null || previous === 0) {
    return '-';
  }

  const changePercent = ((current - previous) / previous) * 100;

  if (Math.abs(changePercent) < 1) {
    return '横ばい';
  } else if (changePercent > 0) {
    // リードタイム等は増加=悪化
    return `+${changePercent.toFixed(0)}%`;
  } else {
    return `${changePercent.toFixed(0)}%`;
  }
}

/**
 * トレンドシートを作成または更新
 */
export function writeDashboardTrends(
  spreadsheetId: string,
  metrics: DevOpsMetrics[]
): void {
  const { logger } = getContainer();
  const spreadsheet = openSpreadsheet(spreadsheetId);

  const sheetName = 'Dashboard - Trend';
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const headers = ['週', 'デプロイ回数', 'リードタイム (時間)', '変更障害率 (%)', 'サイクルタイム (時間)', '前週比'];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  const trends = calculateWeeklyTrends(metrics);

  if (trends.length === 0) {
    logger.log('⚠️ No trend data available');
    return;
  }

  const rows: (string | number)[][] = [];

  for (let i = 0; i < trends.length; i++) {
    const current = trends[i];
    const previous = trends[i + 1] ?? null;

    const changeIndicator = previous
      ? calculateChange(current.avgLeadTimeHours, previous.avgLeadTimeHours)
      : '-';

    rows.push([
      current.week,
      current.totalDeployments,
      current.avgLeadTimeHours ?? 'N/A',
      current.avgChangeFailureRate ?? 'N/A',
      current.avgCycleTimeHours ?? 'N/A',
      changeIndicator,
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // フォーマット
  sheet.getRange(2, 2, rows.length, 1).setNumberFormat('#,##0');
  sheet.getRange(2, 3, rows.length, 1).setNumberFormat('#,##0.0');
  sheet.getRange(2, 4, rows.length, 1).setNumberFormat('#,##0.0');
  sheet.getRange(2, 5, rows.length, 1).setNumberFormat('#,##0.0');

  autoResizeColumns(sheet, headers.length);

  logger.log(`✅ Trend sheet updated with ${trends.length} weeks`);
}

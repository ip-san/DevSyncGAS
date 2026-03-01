/**
 * PR Cycle Time指標スプレッドシート操作
 *
 * PR作成からPRマージまでの時間を計測した結果を
 * スプレッドシートに書き出す機能を提供。
 */

import type { PRCycleTimeMetrics, PRCycleTimeDetail } from '../../types';
import type { Sheet } from '../../interfaces';
import { getContainer } from '../../container';
import {
  getOrCreateSheet,
  autoResizeColumns,
  openSpreadsheet,
  formatDecimalColumns,
  applyDataBorders,
} from './helpers';
import { formatRowsForSheet } from '../../utils/dateFormat';
import {
  getExtendedMetricSheetName,
  getExtendedMetricDetailSheetName,
} from './extendedMetricsRepositorySheet';

const SHEET_NAME = 'PR Cycle Time';

/**
 * 集計シートのヘッダー定義
 */
const REPOSITORY_AGGREGATE_HEADERS = [
  '日付',
  'マージ済みPR数',
  '平均PR Cycle Time (時間)',
  '平均PR Cycle Time (日)',
  '中央値 (時間)',
  '最小 (時間)',
  '最大 (時間)',
];

/**
 * 詳細シートのヘッダー定義
 */
const REPOSITORY_DETAIL_HEADERS = [
  'PR番号',
  'タイトル',
  'PR作成日時',
  'PRマージ日時',
  'PR Cycle Time (時間)',
  'PR Cycle Time (日)',
  'リンクIssue',
  'ベースブランチ',
];

/**
 * PR詳細を日付ごとにグループ化
 */
interface DailyAggregate {
  date: string;
  prCount: number;
  avgPRCycleTimeHours: number;
  medianPRCycleTimeHours: number;
  minPRCycleTimeHours: number;
  maxPRCycleTimeHours: number;
}

/**
 * PR詳細をマージ日ごとにグループ化して集計
 */
function aggregateByDate(details: PRCycleTimeDetail[]): DailyAggregate[] {
  if (details.length === 0) {
    return [];
  }

  // 日付ごとにグループ化
  const grouped = new Map<string, PRCycleTimeDetail[]>();
  for (const detail of details) {
    // prMergedAtから日付のみを抽出 (YYYY-MM-DD)
    const date = detail.prMergedAt.split('T')[0].split(' ')[0];
    const existing = grouped.get(date) ?? [];
    existing.push(detail);
    grouped.set(date, existing);
  }

  // 各日付の統計値を計算
  const aggregates: DailyAggregate[] = [];
  for (const [date, prs] of grouped) {
    const cycleTimeValues = prs.map((pr) => pr.prCycleTimeHours).sort((a, b) => a - b);
    const sum = cycleTimeValues.reduce((acc, val) => acc + val, 0);
    const avg = sum / cycleTimeValues.length;
    const median =
      cycleTimeValues.length % 2 === 0
        ? (cycleTimeValues[cycleTimeValues.length / 2 - 1] +
            cycleTimeValues[cycleTimeValues.length / 2]) /
          2
        : cycleTimeValues[Math.floor(cycleTimeValues.length / 2)];

    aggregates.push({
      date,
      prCount: prs.length,
      avgPRCycleTimeHours: avg,
      medianPRCycleTimeHours: median,
      minPRCycleTimeHours: Math.min(...cycleTimeValues),
      maxPRCycleTimeHours: Math.max(...cycleTimeValues),
    });
  }

  // 日付順にソート
  return aggregates.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * PR詳細をリポジトリ別にグループ化
 */
function groupPRDetailsByRepository(
  details: PRCycleTimeDetail[]
): Map<string, PRCycleTimeDetail[]> {
  const grouped = new Map<string, PRCycleTimeDetail[]>();

  for (const detail of details) {
    const existing = grouped.get(detail.repository) ?? [];
    existing.push(detail);
    grouped.set(detail.repository, existing);
  }

  return grouped;
}

/**
 * PR Cycle Time指標をスプレッドシートに書き出す
 *
 * リポジトリ別の集計シートと詳細シートに書き込む。
 */
export function writePRCycleTimeToSheet(spreadsheetId: string, metrics: PRCycleTimeMetrics): void {
  const { logger } = getContainer();

  // 集計シートと詳細シートの両方に書き込み
  writePRCycleTimeToAllRepositorySheets(spreadsheetId, metrics);

  logger.info(`📝 Wrote PR cycle time metrics to repository sheets (aggregate + details)`);
}

/**
 * 既存の日付を収集（集計シート用）
 */
function getExistingDates(sheet: Sheet): Set<string> {
  const dates = new Set<string>();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return dates;
  }

  // 日付列のみを取得（1列目）
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (const row of data) {
    const date = String(row[0]);
    if (date) {
      dates.add(date);
    }
  }

  return dates;
}

/**
 * 既存PRキーを収集（詳細シート用）
 */
function getExistingPRKeys(sheet: Sheet): Set<number> {
  const keys = new Set<number>();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return keys;
  }

  // PR番号列のみを取得（1列目）
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (const row of data) {
    const prNum = Number(String(row[0]).replace('#', ''));
    if (prNum) {
      keys.add(prNum);
    }
  }

  return keys;
}

/**
 * リポジトリ別集計シートにPR Cycle Timeを書き込む
 *
 * @param spreadsheetId - スプレッドシートID
 * @param repository - リポジトリ名（owner/repo形式）
 * @param details - PR詳細（このリポジトリのもののみ）
 * @returns 書き込み結果
 */
function writePRCycleTimeAggregateToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: PRCycleTimeDetail[]
): { written: number } {
  const { logger } = getContainer();
  const spreadsheet = openSpreadsheet(spreadsheetId);
  const sheetName = getExtendedMetricSheetName(repository, SHEET_NAME);
  const sheet = getOrCreateSheet(spreadsheet, sheetName, REPOSITORY_AGGREGATE_HEADERS);

  if (details.length === 0) {
    return { written: 0 };
  }

  // 日付ごとに集計
  const aggregates = aggregateByDate(details);

  // 既存の日付を取得
  const existingDates = getExistingDates(sheet);

  // 新しい日付のみをフィルタリング
  const newAggregates = aggregates.filter((agg) => !existingDates.has(agg.date));

  if (newAggregates.length === 0) {
    logger.info(`[${repository}] No new dates to write to aggregate sheet`);
    return { written: 0 };
  }

  // 行データを作成
  const rows = newAggregates.map((agg) => [
    agg.date,
    agg.prCount,
    agg.avgPRCycleTimeHours,
    Math.round((agg.avgPRCycleTimeHours / 24) * 10) / 10,
    agg.medianPRCycleTimeHours,
    agg.minPRCycleTimeHours,
    agg.maxPRCycleTimeHours,
  ]);

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, REPOSITORY_AGGREGATE_HEADERS.length).setValues(rows);

  formatRepositoryPRCycleTimeAggregateSheet(sheet);
  logger.info(`✅ [${repository}] Wrote ${newAggregates.length} aggregate records`);

  return { written: newAggregates.length };
}

/**
 * リポジトリ別詳細シートにPR Cycle Timeを書き込む
 *
 * @param spreadsheetId - スプレッドシートID
 * @param repository - リポジトリ名（owner/repo形式）
 * @param details - 書き込むPR詳細（このリポジトリのもののみ）
 * @param options - オプション
 * @returns 書き込み結果
 */
export function writePRCycleTimeDetailsToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: PRCycleTimeDetail[],
  options: { skipDuplicates?: boolean } = {}
): { written: number; skipped: number } {
  const { logger } = getContainer();
  const spreadsheet = openSpreadsheet(spreadsheetId);
  const sheetName = getExtendedMetricDetailSheetName(repository, SHEET_NAME);
  const sheet = getOrCreateSheet(spreadsheet, sheetName, REPOSITORY_DETAIL_HEADERS);

  if (details.length === 0) {
    return { written: 0, skipped: 0 };
  }

  const skipDuplicates = options.skipDuplicates !== false;
  let detailsToWrite = details;
  let skippedCount = 0;

  if (skipDuplicates) {
    const existingKeys = getExistingPRKeys(sheet);
    const originalCount = details.length;
    detailsToWrite = details.filter((d) => !existingKeys.has(d.prNumber));
    skippedCount = originalCount - detailsToWrite.length;
  }

  if (detailsToWrite.length === 0) {
    return { written: 0, skipped: skippedCount };
  }

  // リポジトリ列を除いた行データを作成
  const rows = detailsToWrite.map((pr) => [
    `#${pr.prNumber}`,
    pr.title,
    pr.prCreatedAt,
    pr.prMergedAt,
    pr.prCycleTimeHours,
    Math.round((pr.prCycleTimeHours / 24) * 10) / 10,
    pr.linkedIssueNumber ? `#${pr.linkedIssueNumber}` : '',
    pr.baseBranch,
  ]);

  const lastRow = sheet.getLastRow();
  sheet
    .getRange(lastRow + 1, 1, rows.length, REPOSITORY_DETAIL_HEADERS.length)
    .setValues(formatRowsForSheet(rows));

  formatRepositoryPRCycleTimeDetailSheet(sheet);
  logger.info(`✅ [${repository}] Wrote ${detailsToWrite.length} PR cycle time detail records`);

  return { written: detailsToWrite.length, skipped: skippedCount };
}

/**
 * リポジトリ別PR Cycle Time集計シートのフォーマットを整える
 */
function formatRepositoryPRCycleTimeAggregateSheet(sheet: Sheet): void {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow > 1) {
    // 数値列（3〜7列目）を小数点1桁でフォーマット
    formatDecimalColumns(sheet, 3, 5);

    // データ範囲にボーダーを適用
    applyDataBorders(sheet, lastRow - 1, lastCol);
  }

  autoResizeColumns(sheet, lastCol);
}

/**
 * リポジトリ別PR Cycle Time詳細シートのフォーマットを整える
 */
function formatRepositoryPRCycleTimeDetailSheet(sheet: Sheet): void {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow > 1) {
    // PR Cycle Time列（5〜6列目）を小数点1桁でフォーマット
    formatDecimalColumns(sheet, 5, 2);

    // データ範囲にボーダーを適用
    applyDataBorders(sheet, lastRow - 1, lastCol);
  }

  autoResizeColumns(sheet, lastCol);
}

/**
 * 全リポジトリをそれぞれのシートに書き込む（集計 + 詳細）
 *
 * @param spreadsheetId - スプレッドシートID
 * @param metrics - PR Cycle Timeメトリクス
 * @param options - オプション
 * @returns 各リポジトリの書き込み結果
 */
export function writePRCycleTimeToAllRepositorySheets(
  spreadsheetId: string,
  metrics: PRCycleTimeMetrics,
  options: { skipDuplicates?: boolean } = {}
): Map<string, { written: number; skipped: number }> {
  const { logger } = getContainer();
  const grouped = groupPRDetailsByRepository(metrics.prDetails);
  const results = new Map<string, { written: number; skipped: number }>();

  logger.info(
    `📊 Writing PR cycle time to ${grouped.size} repository sheets (aggregate + details)...`
  );

  for (const [repository, repoDetails] of grouped) {
    // 集計シート作成
    const aggregateResult = writePRCycleTimeAggregateToRepositorySheet(
      spreadsheetId,
      repository,
      repoDetails
    );

    // 詳細シート作成
    const detailResult = writePRCycleTimeDetailsToRepositorySheet(
      spreadsheetId,
      repository,
      repoDetails,
      options
    );

    // 両方の結果を合算
    results.set(repository, {
      written: aggregateResult.written + detailResult.written,
      skipped: detailResult.skipped,
    });
  }

  // 集計ログ
  let totalWritten = 0;
  let totalSkipped = 0;
  for (const result of results.values()) {
    totalWritten += result.written;
    totalSkipped += result.skipped;
  }

  logger.info(
    `✅ Total: ${totalWritten} written, ${totalSkipped} skipped across ${grouped.size} repositories`
  );

  return results;
}

/**
 * コーディング時間指標スプレッドシート操作
 *
 * Issue作成からPR作成までの時間を計測した結果を
 * スプレッドシートに書き出す機能を提供。
 */

import type { CodingTimeMetrics, IssueCodingTimeDetail } from '../../types';
import type { Sheet } from '../../interfaces';
import { getContainer } from '../../container';
import {
  getOrCreateSheet,
  autoResizeColumns,
  openSpreadsheet,
  formatDecimalColumns,
  applyDataBorders,
} from './helpers';
import {
  groupIssueDetailsByRepository,
  getExtendedMetricSheetName,
  getExtendedMetricDetailSheetName,
} from './extendedMetricsRepositorySheet';

const SHEET_NAME = 'コーディング時間';

/**
 * 集計シートのヘッダー定義
 */
const REPOSITORY_AGGREGATE_HEADERS = [
  '日付',
  '完了Issue数',
  '平均コーディング時間 (時間)',
  '平均コーディング時間 (日)',
  '中央値 (時間)',
  '最小 (時間)',
  '最大 (時間)',
];

/**
 * 詳細シートのヘッダー定義
 */
const REPOSITORY_DETAIL_HEADERS = [
  'Issue番号',
  'タイトル',
  'Issue作成日時',
  'PR作成日時',
  'PR番号',
  'コーディング時間 (時間)',
  'コーディング時間 (日)',
];

/**
 * Issue詳細を日付ごとにグループ化
 */
interface DailyAggregate {
  date: string;
  issueCount: number;
  avgCodingTimeHours: number;
  medianCodingTimeHours: number;
  minCodingTimeHours: number;
  maxCodingTimeHours: number;
}

/**
 * Issue詳細をPR作成日ごとにグループ化して集計
 */
function aggregateCodingTimeByDate(details: IssueCodingTimeDetail[]): DailyAggregate[] {
  if (details.length === 0) {
    return [];
  }

  // 日付ごとにグループ化
  const grouped = new Map<string, IssueCodingTimeDetail[]>();
  for (const detail of details) {
    // prCreatedAtから日付のみを抽出 (YYYY-MM-DD)
    const date = detail.prCreatedAt.split('T')[0].split(' ')[0];
    const existing = grouped.get(date) ?? [];
    existing.push(detail);
    grouped.set(date, existing);
  }

  // 各日付の統計値を計算
  const aggregates: DailyAggregate[] = [];
  for (const [date, issues] of grouped) {
    const codingTimeValues = issues.map((i) => i.codingTimeHours).sort((a, b) => a - b);
    const sum = codingTimeValues.reduce((acc, val) => acc + val, 0);
    const avg = sum / codingTimeValues.length;
    const median =
      codingTimeValues.length % 2 === 0
        ? (codingTimeValues[codingTimeValues.length / 2 - 1] +
            codingTimeValues[codingTimeValues.length / 2]) /
          2
        : codingTimeValues[Math.floor(codingTimeValues.length / 2)];

    aggregates.push({
      date,
      issueCount: issues.length,
      avgCodingTimeHours: avg,
      medianCodingTimeHours: median,
      minCodingTimeHours: Math.min(...codingTimeValues),
      maxCodingTimeHours: Math.max(...codingTimeValues),
    });
  }

  // 日付順にソート
  return aggregates.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * コーディング時間指標をスプレッドシートに書き出す
 *
 * リポジトリ別の集計シートと詳細シートに書き込む。
 */
export function writeCodingTimeToSheet(spreadsheetId: string, metrics: CodingTimeMetrics): void {
  const { logger } = getContainer();

  // 集計シートと詳細シートの両方に書き込み
  writeCodingTimeToAllRepositorySheets(spreadsheetId, metrics);

  logger.info(`📝 Wrote coding time metrics to repository sheets (aggregate + details)`);
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
 * 既存Issueキーを収集（詳細シート用）
 */
function getExistingIssueKeys(sheet: Sheet): Set<number> {
  const keys = new Set<number>();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return keys;
  }

  // Issue番号列のみを取得（1列目）
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (const row of data) {
    const issueNum = Number(String(row[0]).replace('#', ''));
    if (issueNum) {
      keys.add(issueNum);
    }
  }

  return keys;
}

/**
 * リポジトリ別集計シートにコーディング時間を書き込む
 *
 * @param spreadsheetId - スプレッドシートID
 * @param repository - リポジトリ名（owner/repo形式）
 * @param details - Issue詳細（このリポジトリのもののみ）
 * @returns 書き込み結果
 */
function writeCodingTimeAggregateToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: IssueCodingTimeDetail[]
): { written: number } {
  const { logger } = getContainer();
  const spreadsheet = openSpreadsheet(spreadsheetId);
  const sheetName = getExtendedMetricSheetName(repository, SHEET_NAME);
  const sheet = getOrCreateSheet(spreadsheet, sheetName, REPOSITORY_AGGREGATE_HEADERS);

  if (details.length === 0) {
    return { written: 0 };
  }

  // 日付ごとに集計
  const aggregates = aggregateCodingTimeByDate(details);

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
    agg.issueCount,
    agg.avgCodingTimeHours,
    Math.round((agg.avgCodingTimeHours / 24) * 10) / 10,
    agg.medianCodingTimeHours,
    agg.minCodingTimeHours,
    agg.maxCodingTimeHours,
  ]);

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, REPOSITORY_AGGREGATE_HEADERS.length).setValues(rows);

  formatRepositoryCodingTimeAggregateSheet(sheet);
  logger.info(`✅ [${repository}] Wrote ${newAggregates.length} aggregate records`);

  return { written: newAggregates.length };
}

/**
 * リポジトリ別詳細シートにコーディング時間を書き込む
 *
 * @param spreadsheetId - スプレッドシートID
 * @param repository - リポジトリ名（owner/repo形式）
 * @param details - 書き込むIssue詳細（このリポジトリのもののみ）
 * @param options - オプション
 * @returns 書き込み結果
 */
export function writeCodingTimeDetailsToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: IssueCodingTimeDetail[],
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
    const existingKeys = getExistingIssueKeys(sheet);
    const originalCount = details.length;
    detailsToWrite = details.filter((d) => !existingKeys.has(d.issueNumber));
    skippedCount = originalCount - detailsToWrite.length;
  }

  if (detailsToWrite.length === 0) {
    return { written: 0, skipped: skippedCount };
  }

  // リポジトリ列を除いた行データを作成
  const rows = detailsToWrite.map((issue) => [
    `#${issue.issueNumber}`,
    issue.title,
    issue.issueCreatedAt,
    issue.prCreatedAt,
    `#${issue.prNumber}`,
    issue.codingTimeHours,
    Math.round((issue.codingTimeHours / 24) * 10) / 10,
  ]);

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, REPOSITORY_DETAIL_HEADERS.length).setValues(rows);

  formatRepositoryCodingTimeDetailSheet(sheet);
  logger.info(`✅ [${repository}] Wrote ${detailsToWrite.length} coding time detail records`);

  return { written: detailsToWrite.length, skipped: skippedCount };
}

/**
 * リポジトリ別コーディング時間集計シートのフォーマットを整える
 */
function formatRepositoryCodingTimeAggregateSheet(sheet: Sheet): void {
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
 * リポジトリ別コーディング時間詳細シートのフォーマットを整える
 */
function formatRepositoryCodingTimeDetailSheet(sheet: Sheet): void {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow > 1) {
    // コーディング時間列（6〜7列目）を小数点1桁でフォーマット
    formatDecimalColumns(sheet, 6, 2);

    // データ範囲にボーダーを適用
    applyDataBorders(sheet, lastRow - 1, lastCol);
  }

  autoResizeColumns(sheet, lastCol);
}

/**
 * 全リポジトリをそれぞれのシートに書き込む（集計 + 詳細）
 *
 * @param spreadsheetId - スプレッドシートID
 * @param metrics - コーディング時間メトリクス
 * @param options - オプション
 * @returns 各リポジトリの書き込み結果
 */
export function writeCodingTimeToAllRepositorySheets(
  spreadsheetId: string,
  metrics: CodingTimeMetrics,
  options: { skipDuplicates?: boolean } = {}
): Map<string, { written: number; skipped: number }> {
  const { logger } = getContainer();
  const grouped = groupIssueDetailsByRepository(metrics.issueDetails);
  const results = new Map<string, { written: number; skipped: number }>();

  logger.info(
    `📊 Writing coding time to ${grouped.size} repository sheets (aggregate + details)...`
  );

  for (const [repository, repoDetails] of grouped) {
    // 集計シート作成
    const aggregateResult = writeCodingTimeAggregateToRepositorySheet(
      spreadsheetId,
      repository,
      repoDetails
    );

    // 詳細シート作成
    const detailResult = writeCodingTimeDetailsToRepositorySheet(
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

/**
 * リポジトリ別シートにコーディング時間を書き込む（後方互換性用）
 * @deprecated Use writeCodingTimeDetailsToRepositorySheet instead
 */
export function writeCodingTimeToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: IssueCodingTimeDetail[],
  options: { skipDuplicates?: boolean } = {}
): { written: number; skipped: number } {
  return writeCodingTimeDetailsToRepositorySheet(spreadsheetId, repository, details, options);
}

/**
 * レビュー効率指標スプレッドシート操作
 *
 * PRの各ステータスにおける滞留時間を計測した結果を
 * スプレッドシートに書き出す機能を提供。
 */

import type { ReviewEfficiencyMetrics } from '../../types';
import type { Sheet } from '../../interfaces';
import { getContainer } from '../../container';
import {
  getOrCreateSheet,
  autoResizeColumns,
  openSpreadsheet,
  formatDecimalColumns,
  applyDataBorders,
  getExistingDates,
} from './helpers';
import {
  groupPRDetailsByRepository,
  getExtendedMetricSheetName,
  getExtendedMetricDetailSheetName,
} from './extendedMetricsRepositorySheet';
import { SpreadsheetError, ErrorCode, AppError } from '../../utils/errors';
import { formatRowsForSheet } from '../../utils/dateFormat';

const SHEET_NAME = 'レビュー効率';

/**
 * 集計シートのヘッダー定義
 */
const REPOSITORY_AGGREGATE_HEADERS = [
  '日付',
  'PR数',
  '平均レビュー待ち時間 (時間)',
  'レビュー待ち中央値 (時間)',
  '平均レビュー時間 (時間)',
  'レビュー時間中央値 (時間)',
];

/**
 * 詳細シートのヘッダー定義
 */
const REPOSITORY_DETAIL_HEADERS = [
  'PR番号',
  'タイトル',
  '作成日時',
  'レビュー準備完了日時',
  '初回レビュー日時',
  '承認日時',
  'マージ日時',
  'レビュー待ち時間 (時間)',
  'レビュー時間 (時間)',
  'マージ待ち時間 (時間)',
  '全体時間 (時間)',
];

/**
 * PR詳細を日付ごとにグループ化
 */
interface DailyReviewAggregate {
  date: string;
  prCount: number;
  avgTimeToFirstReview: number;
  medianTimeToFirstReview: number;
  avgReviewDuration: number;
  medianReviewDuration: number;
}

/**
 * 数値配列の平均値を計算
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, val) => acc + val, 0) / values.length;
}

/**
 * 数値配列の中央値を計算
 */
function calculateMedian(sortedValues: number[]): number {
  if (sortedValues.length === 0) {
    return 0;
  }
  const mid = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 0) {
    return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
  }
  return sortedValues[mid];
}

/**
 * PR詳細を日付ごとにグループ化
 */
function groupByMergeDate(
  details: ReviewEfficiencyMetrics['prDetails']
): Map<string, ReviewEfficiencyMetrics['prDetails']> {
  const grouped = new Map<string, ReviewEfficiencyMetrics['prDetails']>();
  for (const detail of details) {
    if (!detail.mergedAt) {
      continue;
    }
    const date = detail.mergedAt.split('T')[0].split(' ')[0];
    const existing = grouped.get(date) ?? [];
    existing.push(detail);
    grouped.set(date, existing);
  }
  return grouped;
}

/**
 * PR詳細をマージ日ごとにグループ化して集計
 */
function aggregateReviewByDate(
  details: ReviewEfficiencyMetrics['prDetails']
): DailyReviewAggregate[] {
  if (details.length === 0) {
    return [];
  }

  const grouped = groupByMergeDate(details);
  const aggregates: DailyReviewAggregate[] = [];

  for (const [date, prs] of grouped) {
    const timeToFirstReviews = prs
      .map((pr) => pr.timeToFirstReviewHours)
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);
    const reviewDurations = prs
      .map((pr) => pr.reviewDurationHours)
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);

    aggregates.push({
      date,
      prCount: prs.length,
      avgTimeToFirstReview: calculateAverage(timeToFirstReviews),
      medianTimeToFirstReview: calculateMedian(timeToFirstReviews),
      avgReviewDuration: calculateAverage(reviewDurations),
      medianReviewDuration: calculateMedian(reviewDurations),
    });
  }

  return aggregates.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * レビュー効率指標をスプレッドシートに書き出す
 *
 * リポジトリ別の集計シートと詳細シートに書き込む。
 */
export function writeReviewEfficiencyToSheet(
  spreadsheetId: string,
  metrics: ReviewEfficiencyMetrics
): void {
  const { logger } = getContainer();

  try {
    // 集計シートと詳細シートの両方に書き込み
    writeReviewEfficiencyToAllRepositorySheets(spreadsheetId, metrics);

    logger.info(`📝 Wrote review efficiency metrics to repository sheets (aggregate + details)`);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new SpreadsheetError('Failed to write review efficiency metrics', {
      code: ErrorCode.SPREADSHEET_WRITE_FAILED,
      context: { spreadsheetId, period: metrics.period, prCount: metrics.prCount },
      cause: error as Error,
    });
  }
}

/**
 * 既存PRキーを収集（リポジトリ別シート用）
 */
function getExistingPRKeys(sheet: Sheet): Set<number> {
  const keys = new Set<number>();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return keys;
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (const row of data) {
    const prNum = Number(row[0]);
    if (prNum) {
      keys.add(prNum);
    }
  }

  return keys;
}

/**
 * 重複を除外してカウント
 */
function filterDuplicates(
  details: ReviewEfficiencyMetrics['prDetails'],
  sheet: Sheet,
  skipDuplicates: boolean
): { filtered: ReviewEfficiencyMetrics['prDetails']; skippedCount: number } {
  if (!skipDuplicates) {
    return { filtered: details, skippedCount: 0 };
  }

  const existingKeys = getExistingPRKeys(sheet);
  const filtered = details.filter((d) => !existingKeys.has(d.prNumber));
  return { filtered, skippedCount: details.length - filtered.length };
}

/**
 * リポジトリ別集計シートにレビュー効率を書き込む
 */
function writeReviewEfficiencyAggregateToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: ReviewEfficiencyMetrics['prDetails']
): { written: number } {
  const { logger } = getContainer();

  try {
    const spreadsheet = openSpreadsheet(spreadsheetId);
    const sheetName = getExtendedMetricSheetName(repository, SHEET_NAME);
    const sheet = getOrCreateSheet(spreadsheet, sheetName, REPOSITORY_AGGREGATE_HEADERS);

    if (details.length === 0) {
      return { written: 0 };
    }

    const aggregates = aggregateReviewByDate(details);
    const existingDates = getExistingDates(sheet);
    const newAggregates = aggregates.filter((agg) => !existingDates.has(agg.date));

    if (newAggregates.length === 0) {
      logger.info(`[${repository}] No new dates to write to aggregate sheet`);
      return { written: 0 };
    }

    const rows = newAggregates.map((agg) => [
      agg.date,
      agg.prCount,
      agg.avgTimeToFirstReview,
      agg.medianTimeToFirstReview,
      agg.avgReviewDuration,
      agg.medianReviewDuration,
    ]);

    const lastRow = sheet.getLastRow();
    sheet
      .getRange(lastRow + 1, 1, rows.length, REPOSITORY_AGGREGATE_HEADERS.length)
      .setValues(rows);

    formatRepositoryReviewEfficiencyAggregateSheet(sheet);
    logger.info(
      `✅ [${repository}] Wrote ${newAggregates.length} review efficiency aggregate records`
    );

    return { written: newAggregates.length };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new SpreadsheetError('Failed to write review efficiency aggregate', {
      code: ErrorCode.SPREADSHEET_WRITE_FAILED,
      context: { spreadsheetId, repository },
      cause: error as Error,
    });
  }
}

/**
 * リポジトリ別詳細シートにレビュー効率を書き込む
 */
export function writeReviewEfficiencyDetailsToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: ReviewEfficiencyMetrics['prDetails'],
  options: { skipDuplicates?: boolean } = {}
): { written: number; skipped: number } {
  const { logger } = getContainer();

  try {
    const spreadsheet = openSpreadsheet(spreadsheetId);
    const sheetName = getExtendedMetricDetailSheetName(repository, SHEET_NAME);
    const sheet = getOrCreateSheet(spreadsheet, sheetName, REPOSITORY_DETAIL_HEADERS);

    if (details.length === 0) {
      return { written: 0, skipped: 0 };
    }

    const skipDuplicates = options.skipDuplicates !== false;
    const { filtered, skippedCount } = filterDuplicates(details, sheet, skipDuplicates);

    if (filtered.length === 0) {
      return { written: 0, skipped: skippedCount };
    }

    const rows = filtered.map((pr) => [
      pr.prNumber,
      pr.title,
      pr.createdAt,
      pr.readyForReviewAt,
      pr.firstReviewAt ?? 'N/A',
      pr.approvedAt ?? 'N/A',
      pr.mergedAt ?? 'Not merged',
      pr.timeToFirstReviewHours ?? 'N/A',
      pr.reviewDurationHours ?? 'N/A',
      pr.timeToMergeHours ?? 'N/A',
      pr.totalTimeHours ?? 'N/A',
    ]);

    const lastRow = sheet.getLastRow();
    sheet
      .getRange(lastRow + 1, 1, rows.length, REPOSITORY_DETAIL_HEADERS.length)
      .setValues(formatRowsForSheet(rows));

    formatRepositoryReviewEfficiencyDetailSheet(sheet);
    logger.info(`✅ [${repository}] Wrote ${filtered.length} review efficiency detail records`);

    return { written: filtered.length, skipped: skippedCount };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new SpreadsheetError('Failed to write review efficiency to repository sheet', {
      code: ErrorCode.SPREADSHEET_WRITE_FAILED,
      context: { spreadsheetId, repository, sheetName: SHEET_NAME, detailCount: details.length },
      cause: error as Error,
    });
  }
}

/**
 * リポジトリ別レビュー効率集計シートのフォーマットを整える
 */
function formatRepositoryReviewEfficiencyAggregateSheet(sheet: Sheet): void {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow > 1) {
    // 数値列（3〜6列目）を小数点1桁でフォーマット
    formatDecimalColumns(sheet, 3, 4);
    applyDataBorders(sheet, lastRow - 1, lastCol);
  }

  autoResizeColumns(sheet, lastCol);
}

/**
 * リポジトリ別レビュー効率詳細シートのフォーマットを整える
 */
function formatRepositoryReviewEfficiencyDetailSheet(sheet: Sheet): void {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow > 1) {
    // 時間列（8-11列目）を小数点1桁でフォーマット
    formatDecimalColumns(sheet, 8, 4);
    applyDataBorders(sheet, lastRow - 1, lastCol);
  }

  autoResizeColumns(sheet, lastCol);
}

/**
 * 全リポジトリをそれぞれのシートに書き込む（集計 + 詳細）
 */
export function writeReviewEfficiencyToAllRepositorySheets(
  spreadsheetId: string,
  metrics: ReviewEfficiencyMetrics,
  options: { skipDuplicates?: boolean } = {}
): Map<string, { written: number; skipped: number }> {
  const { logger } = getContainer();
  const grouped = groupPRDetailsByRepository(metrics.prDetails);
  const results = new Map<string, { written: number; skipped: number }>();

  logger.info(
    `📊 Writing review efficiency to ${grouped.size} repository sheets (aggregate + details)...`
  );

  for (const [repository, repoDetails] of grouped) {
    // 集計シート作成
    const aggregateResult = writeReviewEfficiencyAggregateToRepositorySheet(
      spreadsheetId,
      repository,
      repoDetails
    );

    // 詳細シート作成
    const detailResult = writeReviewEfficiencyDetailsToRepositorySheet(
      spreadsheetId,
      repository,
      repoDetails,
      options
    );

    results.set(repository, {
      written: aggregateResult.written + detailResult.written,
      skipped: detailResult.skipped,
    });
  }

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
 * リポジトリ別シートにレビュー効率を書き込む（後方互換性用）
 * @deprecated Use writeReviewEfficiencyDetailsToRepositorySheet instead
 */
export function writeReviewEfficiencyToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: ReviewEfficiencyMetrics['prDetails'],
  options: { skipDuplicates?: boolean } = {}
): { written: number; skipped: number } {
  return writeReviewEfficiencyDetailsToRepositorySheet(spreadsheetId, repository, details, options);
}

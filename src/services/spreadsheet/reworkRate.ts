/**
 * 手戻り率指標スプレッドシート操作
 *
 * PR作成後の追加コミット数とForce Push回数を計測した結果を
 * スプレッドシートに書き出す機能を提供。
 */

import type { ReworkRateMetrics } from '../../types';
import type { Sheet } from '../../interfaces';
import { getContainer } from '../../container';
import {
  getOrCreateSheet,
  autoResizeColumns,
  openSpreadsheet,
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

const SHEET_NAME = '手戻り率';

/**
 * 集計シートのヘッダー定義
 */
const REPOSITORY_AGGREGATE_HEADERS = [
  '日付',
  'PR数',
  '平均追加コミット数',
  '追加コミット中央値',
  '平均Force Push回数',
  'Force Push率 (%)',
];

/**
 * 詳細シートのヘッダー定義
 */
const REPOSITORY_DETAIL_HEADERS = [
  'PR番号',
  'タイトル',
  '作成日時',
  'マージ日時',
  '総コミット数',
  '追加コミット数',
  'Force Push回数',
];

/**
 * PR詳細を日付ごとにグループ化
 */
interface DailyReworkAggregate {
  date: string;
  prCount: number;
  avgAdditionalCommits: number;
  medianAdditionalCommits: number;
  avgForcePushCount: number;
  forcePushRate: number;
}

/**
 * PR詳細をマージ日ごとにグループ化して集計
 */
function aggregateReworkByDate(details: ReworkRateMetrics['prDetails']): DailyReworkAggregate[] {
  if (details.length === 0) {
    return [];
  }

  // 日付ごとにグループ化
  const grouped = new Map<string, ReworkRateMetrics['prDetails']>();
  for (const detail of details) {
    if (!detail.mergedAt) {
      continue;
    }
    // mergedAtから日付のみを抽出 (YYYY-MM-DD)
    const date = detail.mergedAt.split('T')[0].split(' ')[0];
    const existing = grouped.get(date) ?? [];
    existing.push(detail);
    grouped.set(date, existing);
  }

  // 各日付の統計値を計算
  const aggregates: DailyReworkAggregate[] = [];
  for (const [date, prs] of grouped) {
    const additionalCommits = prs.map((pr) => pr.additionalCommits).sort((a, b) => a - b);
    const forcePushCounts = prs.map((pr) => pr.forcePushCount);
    const prsWithForcePush = prs.filter((pr) => pr.forcePushCount > 0).length;

    const sumAdditional = additionalCommits.reduce((acc, val) => acc + val, 0);
    const avgAdditional = sumAdditional / additionalCommits.length;
    const medianAdditional =
      additionalCommits.length % 2 === 0
        ? (additionalCommits[additionalCommits.length / 2 - 1] +
            additionalCommits[additionalCommits.length / 2]) /
          2
        : additionalCommits[Math.floor(additionalCommits.length / 2)];

    const sumForcePush = forcePushCounts.reduce((acc, val) => acc + val, 0);
    const avgForcePush = sumForcePush / forcePushCounts.length;
    const forcePushRate = (prsWithForcePush / prs.length) * 100;

    aggregates.push({
      date,
      prCount: prs.length,
      avgAdditionalCommits: avgAdditional,
      medianAdditionalCommits: medianAdditional,
      avgForcePushCount: avgForcePush,
      forcePushRate,
    });
  }

  // 日付順にソート
  return aggregates.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 手戻り率指標をスプレッドシートに書き出す
 *
 * リポジトリ別の集計シートと詳細シートに書き込む。
 */
export function writeReworkRateToSheet(spreadsheetId: string, metrics: ReworkRateMetrics): void {
  const { logger } = getContainer();

  try {
    // 集計シートと詳細シートの両方に書き込み
    writeReworkRateToAllRepositorySheets(spreadsheetId, metrics);

    logger.info(`📝 Wrote rework rate metrics to repository sheets (aggregate + details)`);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new SpreadsheetError('Failed to write rework rate metrics', {
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
  details: ReworkRateMetrics['prDetails'],
  sheet: Sheet,
  skipDuplicates: boolean
): { filtered: ReworkRateMetrics['prDetails']; skippedCount: number } {
  if (!skipDuplicates) {
    return { filtered: details, skippedCount: 0 };
  }

  const existingKeys = getExistingPRKeys(sheet);
  const filtered = details.filter((d) => !existingKeys.has(d.prNumber));
  return { filtered, skippedCount: details.length - filtered.length };
}

/**
 * リポジトリ別集計シートに手戻り率を書き込む
 */
function writeReworkRateAggregateToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: ReworkRateMetrics['prDetails']
): { written: number } {
  const { logger } = getContainer();

  try {
    const spreadsheet = openSpreadsheet(spreadsheetId);
    const sheetName = getExtendedMetricSheetName(repository, SHEET_NAME);
    const sheet = getOrCreateSheet(spreadsheet, sheetName, REPOSITORY_AGGREGATE_HEADERS);

    if (details.length === 0) {
      return { written: 0 };
    }

    // 日付ごとに集計
    const aggregates = aggregateReworkByDate(details);

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
      agg.avgAdditionalCommits,
      agg.medianAdditionalCommits,
      agg.avgForcePushCount,
      agg.forcePushRate,
    ]);

    const lastRow = sheet.getLastRow();
    sheet
      .getRange(lastRow + 1, 1, rows.length, REPOSITORY_AGGREGATE_HEADERS.length)
      .setValues(rows);

    formatRepositoryReworkRateAggregateSheet(sheet);
    logger.info(`✅ [${repository}] Wrote ${newAggregates.length} rework rate aggregate records`);

    return { written: newAggregates.length };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new SpreadsheetError('Failed to write rework rate aggregate', {
      code: ErrorCode.SPREADSHEET_WRITE_FAILED,
      context: { spreadsheetId, repository },
      cause: error as Error,
    });
  }
}

/**
 * リポジトリ別詳細シートに手戻り率を書き込む
 */
export function writeReworkRateDetailsToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: ReworkRateMetrics['prDetails'],
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
      pr.mergedAt ?? 'Not merged',
      pr.totalCommits,
      pr.additionalCommits,
      pr.forcePushCount,
    ]);

    const lastRow = sheet.getLastRow();
    sheet
      .getRange(lastRow + 1, 1, rows.length, REPOSITORY_DETAIL_HEADERS.length)
      .setValues(formatRowsForSheet(rows));

    formatRepositoryReworkRateDetailSheet(sheet);
    logger.info(`✅ [${repository}] Wrote ${filtered.length} rework rate detail records`);

    return { written: filtered.length, skipped: skippedCount };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new SpreadsheetError('Failed to write rework rate to repository sheet', {
      code: ErrorCode.SPREADSHEET_WRITE_FAILED,
      context: { spreadsheetId, repository, sheetName: SHEET_NAME, detailCount: details.length },
      cause: error as Error,
    });
  }
}

/**
 * リポジトリ別手戻り率集計シートのフォーマットを整える
 */
function formatRepositoryReworkRateAggregateSheet(sheet: Sheet): void {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow > 1) {
    // 数値列（3〜6列目）を小数点1桁でフォーマット
    sheet.getRange(2, 3, lastRow - 1, 4).setNumberFormat('#,##0.0');

    applyDataBorders(sheet, lastRow - 1, lastCol);
  }

  autoResizeColumns(sheet, lastCol);
}

/**
 * リポジトリ別手戻り率詳細シートのフォーマットを整える
 */
function formatRepositoryReworkRateDetailSheet(sheet: Sheet): void {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow > 1) {
    applyDataBorders(sheet, lastRow - 1, lastCol);
  }

  autoResizeColumns(sheet, lastCol);
}

/**
 * 全リポジトリをそれぞれのシートに書き込む（集計 + 詳細）
 */
export function writeReworkRateToAllRepositorySheets(
  spreadsheetId: string,
  metrics: ReworkRateMetrics,
  options: { skipDuplicates?: boolean } = {}
): Map<string, { written: number; skipped: number }> {
  const { logger } = getContainer();
  const grouped = groupPRDetailsByRepository(metrics.prDetails);
  const results = new Map<string, { written: number; skipped: number }>();

  logger.info(
    `📊 Writing rework rate to ${grouped.size} repository sheets (aggregate + details)...`
  );

  for (const [repository, repoDetails] of grouped) {
    // 集計シート作成
    const aggregateResult = writeReworkRateAggregateToRepositorySheet(
      spreadsheetId,
      repository,
      repoDetails
    );

    // 詳細シート作成
    const detailResult = writeReworkRateDetailsToRepositorySheet(
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
 * リポジトリ別シートに手戻り率を書き込む（後方互換性用）
 * @deprecated Use writeReworkRateDetailsToRepositorySheet instead
 */
export function writeReworkRateToRepositorySheet(
  spreadsheetId: string,
  repository: string,
  details: ReworkRateMetrics['prDetails'],
  options: { skipDuplicates?: boolean } = {}
): { written: number; skipped: number } {
  return writeReworkRateDetailsToRepositorySheet(spreadsheetId, repository, details, options);
}

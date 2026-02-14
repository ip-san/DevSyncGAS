/**
 * Slack日次サマリー通知機能
 *
 * DORA指標の日次サマリーをSlackに送信
 */

import type { DevOpsMetrics, HealthStatus } from '../../types';
import type { SlackMessage, SlackBlock } from '../../interfaces';
import { determineHealthStatus } from '../spreadsheet/dashboard';
import { getContainer } from '../../container';

/**
 * 健全性ステータスを絵文字に変換
 */
function statusToEmoji(status: HealthStatus): string {
  switch (status) {
    case 'good':
      return ':large_green_circle:';
    case 'warning':
      return ':large_yellow_circle:';
    case 'critical':
      return ':red_circle:';
  }
}

/**
 * 健全性ステータスをテキストに変換
 */
function statusToText(status: HealthStatus): string {
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
 * 数値を小数点1桁にフォーマット
 */
function formatNumber(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return value.toFixed(1);
}

/**
 * 最新日付のメトリクスを取得
 */
function getLatestMetrics(metrics: DevOpsMetrics[]): {
  latestDate: string;
  latestMetrics: DevOpsMetrics[];
} {
  const sortedMetrics = [...metrics].sort((a, b) => b.date.localeCompare(a.date));
  const latestDate = sortedMetrics[0].date;
  const latestMetrics = sortedMetrics.filter((m) => m.date === latestDate);
  return { latestDate, latestMetrics };
}

/**
 * メトリクスの平均値
 */
interface AverageMetrics {
  avgDeploymentFrequency: number;
  avgLeadTime: number | null;
  avgCFR: number | null;
  avgMTTR: number | null;
}

/**
 * 平均値を計算
 */
function calculateAverageMetrics(metrics: DevOpsMetrics[]): AverageMetrics {
  const avgDeploymentFrequency =
    metrics.reduce((sum, m) => sum + m.deploymentFrequency, 0) / metrics.length;

  const validLeadTimes = metrics
    .map((m) => m.leadTimeForChangesHours)
    .filter((v): v is number => v !== null);
  const avgLeadTime =
    validLeadTimes.length > 0
      ? validLeadTimes.reduce((sum, v) => sum + v, 0) / validLeadTimes.length
      : null;

  const validCFRs = metrics.map((m) => m.changeFailureRate).filter((v): v is number => v !== null);
  const avgCFR =
    validCFRs.length > 0 ? validCFRs.reduce((sum, v) => sum + v, 0) / validCFRs.length : null;

  const validMTTRs = metrics
    .map((m) => m.meanTimeToRecoveryHours)
    .filter((v): v is number => v !== null);
  const avgMTTR =
    validMTTRs.length > 0 ? validMTTRs.reduce((sum, v) => sum + v, 0) / validMTTRs.length : null;

  return { avgDeploymentFrequency, avgLeadTime, avgCFR, avgMTTR };
}

/**
 * ヘッダーブロックを生成
 */
function createHeaderBlocks(latestDate: string, healthStatus: HealthStatus): SlackBlock[] {
  const statusEmoji = statusToEmoji(healthStatus);
  const statusText = statusToText(healthStatus);

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 DevOps Metrics 日次レポート (${latestDate})`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*総合ステータス:* ${statusEmoji} ${statusText}`,
      },
    },
  ];
}

/**
 * メトリクスブロックを生成
 */
function createMetricsBlocks(avg: AverageMetrics): SlackBlock {
  return {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: `*:rocket: デプロイ頻度*\n${formatNumber(avg.avgDeploymentFrequency)}回/日`,
      },
      {
        type: 'mrkdwn',
        text: `*:hourglass_flowing_sand: リードタイム*\n${formatNumber(avg.avgLeadTime)}時間`,
      },
      {
        type: 'mrkdwn',
        text: `*:fire: 変更障害率*\n${formatNumber(avg.avgCFR)}%`,
      },
      {
        type: 'mrkdwn',
        text: `*:wrench: MTTR*\n${formatNumber(avg.avgMTTR)}時間`,
      },
    ],
  };
}

/**
 * フッターブロックを生成
 */
function createFooterBlocks(repoCount: number, spreadsheetUrl: string): SlackBlock[] {
  return [
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `対象リポジトリ: ${repoCount}個`,
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📄 詳細レポートを開く',
          },
          url: spreadsheetUrl,
          action_id: 'open_spreadsheet',
        },
      ],
    },
  ];
}

/**
 * 日次サマリーメッセージを生成
 */
export function createDailySummaryMessage(
  metrics: DevOpsMetrics[],
  spreadsheetUrl: string
): SlackMessage {
  const { logger } = getContainer();

  if (metrics.length === 0) {
    logger.warn('No metrics available for daily summary');
    return {
      text: '📊 DevOps Metrics 日次レポート - データなし',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*📊 DevOps Metrics 日次レポート*\n\n本日のデータはありません。',
          },
        },
      ],
    };
  }

  const { latestDate, latestMetrics } = getLatestMetrics(metrics);
  const avg = calculateAverageMetrics(latestMetrics);
  const healthStatus = determineHealthStatus(avg.avgLeadTime, avg.avgCFR, null, null);

  const blocks: SlackBlock[] = [
    ...createHeaderBlocks(latestDate, healthStatus),
    createMetricsBlocks(avg),
    ...createFooterBlocks(latestMetrics.length, spreadsheetUrl),
  ];

  return {
    text: `📊 DevOps Metrics 日次レポート (${latestDate})`,
    blocks,
  };
}

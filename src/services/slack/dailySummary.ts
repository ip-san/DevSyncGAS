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

  // 最新のメトリクスを取得（日付でソート）
  const sortedMetrics = [...metrics].sort((a, b) => b.date.localeCompare(a.date));
  const latestDate = sortedMetrics[0].date;

  // 最新日付のメトリクスのみを抽出
  const latestMetrics = sortedMetrics.filter((m) => m.date === latestDate);

  // 全リポジトリの平均を計算
  const avgDeploymentFrequency =
    latestMetrics.reduce((sum, m) => sum + parseFloat(m.deploymentFrequency), 0) /
    latestMetrics.length;

  const validLeadTimes = latestMetrics
    .map((m) => m.leadTimeForChangesHours)
    .filter((v): v is number => v !== null);
  const avgLeadTime =
    validLeadTimes.length > 0
      ? validLeadTimes.reduce((sum, v) => sum + v, 0) / validLeadTimes.length
      : null;

  const validCFRs = latestMetrics
    .map((m) => m.changeFailureRate)
    .filter((v): v is number => v !== null);
  const avgCFR =
    validCFRs.length > 0 ? validCFRs.reduce((sum, v) => sum + v, 0) / validCFRs.length : null;

  const validMTTRs = latestMetrics
    .map((m) => m.meanTimeToRecoveryHours)
    .filter((v): v is number => v !== null);
  const avgMTTR =
    validMTTRs.length > 0 ? validMTTRs.reduce((sum, v) => sum + v, 0) / validMTTRs.length : null;

  // 健全性ステータスを判定
  const healthStatus = determineHealthStatus(avgLeadTime, avgCFR, null, null);
  const statusEmoji = statusToEmoji(healthStatus);
  const statusText = statusToText(healthStatus);

  // Slack Block Kit メッセージを構築
  const blocks: SlackBlock[] = [
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
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*:rocket: デプロイ頻度*\n${formatNumber(avgDeploymentFrequency)}回/日`,
        },
        {
          type: 'mrkdwn',
          text: `*:hourglass_flowing_sand: リードタイム*\n${formatNumber(avgLeadTime)}時間`,
        },
        {
          type: 'mrkdwn',
          text: `*:fire: 変更障害率*\n${formatNumber(avgCFR)}%`,
        },
        {
          type: 'mrkdwn',
          text: `*:wrench: MTTR*\n${formatNumber(avgMTTR)}時間`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `対象リポジトリ: ${latestMetrics.length}個`,
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

  return {
    text: `📊 DevOps Metrics 日次レポート (${latestDate})`,
    blocks,
  };
}

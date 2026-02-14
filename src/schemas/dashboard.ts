/**
 * Dashboard スキーマ定義
 */
import type { SheetSchema } from './types';

export const DASHBOARD_SCHEMA: SheetSchema = {
  version: '2.0.0',
  sheetName: 'Dashboard',
  columns: [
    { id: 'repository', header: 'リポジトリ', type: 'string' },
    {
      id: 'deploymentFrequency',
      header: 'デプロイ頻度',
      type: 'string',
      description:
        '【デプロイ頻度】\n週に何回本番リリースできているか\n理想: 1日1回以上（Elite）\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/DORA_METRICS.md#1-デプロイ頻度deployment-frequency',
      docUrl:
        'https://github.com/ip-san/dev-sync-gas/blob/main/docs/DORA_METRICS.md#1-デプロイ頻度deployment-frequency',
    },
    {
      id: 'leadTimeHours',
      header: 'リードタイム (時間)',
      type: 'number',
      numberFormat: '#,##0.0',
      description:
        '【リードタイム】\nコミットから本番デプロイまでの時間\n理想: 1時間以内（Elite）\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/DORA_METRICS.md#2-リードタイムlead-time-for-changes',
      docUrl:
        'https://github.com/ip-san/dev-sync-gas/blob/main/docs/DORA_METRICS.md#2-リードタイムlead-time-for-changes',
    },
    {
      id: 'changeFailureRate',
      header: '変更障害率 (%)',
      type: 'number',
      numberFormat: '#,##0.0',
      description:
        '【変更障害率】\nデプロイの何%で障害が起きるか\n理想: 15%以下（Elite）\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/DORA_METRICS.md#3-変更障害率change-failure-rate',
      docUrl:
        'https://github.com/ip-san/dev-sync-gas/blob/main/docs/DORA_METRICS.md#3-変更障害率change-failure-rate',
    },
    {
      id: 'mttrHours',
      header: 'MTTR (時間)',
      type: 'number',
      numberFormat: '#,##0.0',
      description:
        '【平均修復時間】\n障害から何時間で復旧できるか\n理想: 1時間以内（Elite）\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/DORA_METRICS.md#4-平均修復時間mean-time-to-recovery',
      docUrl:
        'https://github.com/ip-san/dev-sync-gas/blob/main/docs/DORA_METRICS.md#4-平均修復時間mean-time-to-recovery',
    },
    {
      id: 'cycleTimeHours',
      header: 'サイクルタイム (時間)',
      type: 'number',
      numberFormat: '#,##0.0',
      description:
        '【サイクルタイム】\nIssue作成からProductionマージまでの時間\nチーム全体の開発速度を表す\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/CYCLE_TIME.md',
      docUrl: 'https://github.com/ip-san/dev-sync-gas/blob/main/docs/CYCLE_TIME.md',
    },
    {
      id: 'codingTimeHours',
      header: 'コーディング時間 (時間)',
      type: 'number',
      numberFormat: '#,##0.0',
      description:
        '【コーディング時間】\nIssue作成からPR作成までの時間\nAI活用で短縮される傾向がある\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/CODING_TIME.md',
      docUrl: 'https://github.com/ip-san/dev-sync-gas/blob/main/docs/CODING_TIME.md',
    },
    {
      id: 'timeToFirstReviewHours',
      header: 'レビュー待ち (時間)',
      type: 'number',
      numberFormat: '#,##0.0',
      description:
        '【レビュー待ち時間】\nPR作成から最初のレビューまでの時間\nチームのレスポンス速度を表す\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/REVIEW_EFFICIENCY.md',
      docUrl: 'https://github.com/ip-san/dev-sync-gas/blob/main/docs/REVIEW_EFFICIENCY.md',
    },
    {
      id: 'reviewDurationHours',
      header: 'レビュー時間 (時間)',
      type: 'number',
      numberFormat: '#,##0.0',
      description:
        '【レビュー時間】\nレビュー開始からApproveまでの時間\nコードの複雑さ・品質を反映\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/REVIEW_EFFICIENCY.md',
      docUrl: 'https://github.com/ip-san/dev-sync-gas/blob/main/docs/REVIEW_EFFICIENCY.md',
    },
    {
      id: 'avgLinesOfCode',
      header: 'PRサイズ (平均行数)',
      type: 'number',
      numberFormat: '#,##0',
      description:
        '【PRサイズ】\n変更行数（追加+削除）の平均\n小さいほどレビューしやすく、マージが速い\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/PR_SIZE.md',
      docUrl: 'https://github.com/ip-san/dev-sync-gas/blob/main/docs/PR_SIZE.md',
    },
    {
      id: 'avgAdditionalCommits',
      header: '追加コミット数 (平均)',
      type: 'number',
      numberFormat: '#,##0.0',
      description:
        '【追加コミット数】\nPR作成後の追加コミット数\nAI活用で減る傾向（初回コード品質の指標）\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/REWORK_RATE.md',
      docUrl: 'https://github.com/ip-san/dev-sync-gas/blob/main/docs/REWORK_RATE.md',
    },
    {
      id: 'avgForcePushCount',
      header: 'Force Push回数 (平均)',
      type: 'number',
      numberFormat: '#,##0.0',
      description:
        '【Force Push回数】\nPRの手戻り指標\n頻繁な場合は初回コードの完成度に課題がある可能性\n\n📖 詳細: https://github.com/ip-san/dev-sync-gas/blob/main/docs/REWORK_RATE.md',
      docUrl: 'https://github.com/ip-san/dev-sync-gas/blob/main/docs/REWORK_RATE.md',
    },
    {
      id: 'status',
      header: 'ステータス',
      type: 'string',
      description: '【総合ステータス】\n各指標から算出した健全性\n🟢 良好 / 🟡 注意 / 🔴 要改善',
    },
  ],
};

export const DASHBOARD_TREND_SCHEMA: SheetSchema = {
  version: '1.0.0',
  sheetName: 'Dashboard - Trend',
  columns: [
    { id: 'week', header: '週', type: 'string' },
    { id: 'totalDeployments', header: 'デプロイ回数', type: 'number', numberFormat: '#,##0' },
    {
      id: 'avgLeadTimeHours',
      header: 'リードタイム (時間)',
      type: 'number',
      numberFormat: '#,##0.0',
    },
    {
      id: 'avgChangeFailureRate',
      header: '変更障害率 (%)',
      type: 'number',
      numberFormat: '#,##0.0',
    },
    {
      id: 'avgCycleTimeHours',
      header: 'サイクルタイム (時間)',
      type: 'number',
      numberFormat: '#,##0.0',
    },
    { id: 'changeIndicator', header: '前週比', type: 'string' },
  ],
};

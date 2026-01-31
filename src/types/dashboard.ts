/**
 * ダッシュボード関連の型定義
 *
 * プロジェクト全体の俯瞰ビュー（Dashboard）と、
 * リポジトリ別シート構造に関する型定義。
 */

// =============================================================================
// ダッシュボード - 最新状況
// =============================================================================

/**
 * リポジトリの健全性ステータス
 */
export type HealthStatus = 'good' | 'warning' | 'critical';

/**
 * リポジトリ別の最新メトリクスサマリー
 */
export interface RepositoryLatestMetrics {
  /** リポジトリ名（owner/repo形式） */
  repository: string;
  /** 計測日 */
  date: string;
  /** デプロイ頻度 */
  deploymentFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  /** リードタイム（時間） */
  leadTimeHours: number | null;
  /** 変更障害率（%） */
  changeFailureRate: number | null;
  /** 平均復旧時間（時間） */
  mttrHours: number | null;
  /** 平均サイクルタイム（時間） */
  avgCycleTimeHours: number | null;
  /** 平均レビュー待ち時間（時間） */
  avgTimeToFirstReviewHours: number | null;
  /** 平均PRサイズ（変更行数） */
  avgLinesOfCode: number | null;
  /** 平均手戻り率（追加コミット数） */
  avgAdditionalCommits: number | null;
  /** 健全性ステータス */
  status: HealthStatus;
}

/**
 * プロジェクト全体の最新サマリー
 */
export interface ProjectLatestSummary {
  /** 計測日 */
  date: string;
  /** リポジトリ数 */
  repositoryCount: number;
  /** 各リポジトリのメトリクス */
  repositories: RepositoryLatestMetrics[];
  /** 全体平均 */
  overall: Omit<RepositoryLatestMetrics, 'repository' | 'date'>;
}

// =============================================================================
// ダッシュボード - トレンド
// =============================================================================

/**
 * 週次トレンドデータ
 */
export interface WeeklyTrend {
  /** 週（YYYY-Www形式） */
  week: string;
  /** デプロイ回数（合計） */
  totalDeployments: number;
  /** 平均リードタイム（時間） */
  avgLeadTimeHours: number | null;
  /** 平均変更障害率（%） */
  avgChangeFailureRate: number | null;
  /** 平均サイクルタイム（時間） */
  avgCycleTimeHours: number | null;
  /** 前週比（%、正=悪化、負=改善） */
  changeFromPreviousWeek: {
    leadTime: number | null;
    changeFailureRate: number | null;
    cycleTime: number | null;
  };
}

/**
 * トレンドサマリー
 */
export interface TrendSummary {
  /** 週次トレンド（新しい順） */
  weeklyTrends: WeeklyTrend[];
  /** トレンド期間 */
  periodStart: string;
  periodEnd: string;
}

// =============================================================================
// ダッシュボード全体
// =============================================================================

/**
 * ダッシュボードデータ
 */
export interface DashboardData {
  /** プロジェクト名 */
  projectName: string;
  /** 最終更新日時 */
  lastUpdated: string;
  /** 最新状況 */
  latestSummary: ProjectLatestSummary;
  /** トレンド */
  trends: TrendSummary;
}

// =============================================================================
// 健全性判定の閾値
// =============================================================================

/**
 * 健全性判定の閾値設定
 */
export interface HealthThresholds {
  /** リードタイム（時間） */
  leadTime: {
    good: number; // これ以下はgood
    warning: number; // これ以下はwarning、超えたらcritical
  };
  /** 変更障害率（%） */
  changeFailureRate: {
    good: number;
    warning: number;
  };
  /** サイクルタイム（時間） */
  cycleTime: {
    good: number;
    warning: number;
  };
  /** レビュー待ち時間（時間） */
  timeToFirstReview: {
    good: number;
    warning: number;
  };
}

/**
 * デフォルトの閾値（DORA Elite/High performer基準を参考）
 */
export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  leadTime: {
    good: 24, // 1日以内
    warning: 168, // 1週間以内
  },
  changeFailureRate: {
    good: 5, // 5%以下
    warning: 15, // 15%以下
  },
  cycleTime: {
    good: 48, // 2日以内
    warning: 120, // 5日以内
  },
  timeToFirstReview: {
    good: 4, // 4時間以内
    warning: 24, // 1日以内
  },
};

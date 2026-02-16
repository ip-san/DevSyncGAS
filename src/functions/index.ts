/**
 * GAS関数モジュール - エントリーポイント
 *
 * GASで実行可能な関数を提供するモジュール群の統合エクスポート。
 *
 * 構成:
 * - helpers.ts: 共通ヘルパー関数
 * - extendedMetrics.ts: 全指標同期関数（DORA + 拡張指標）
 * - setup.ts: セットアップ・設定関数
 * - config.ts: 設定表示・変更関数
 * - migration.ts: マイグレーション関数
 */

// 共通ヘルパー
export { ensureContainerInitialized } from './helpers';

// メトリクス同期（DORA + 拡張指標）
export {
  syncAllMetrics,
  syncAllMetricsIncremental,
  syncAllMetricsFromScratch,
} from './extendedMetrics';

// セットアップ・設定
export {
  showAuthMode,
  listRepos,
  scheduleDailyMetricsSync,
  checkConfig,
  testPermissions,
} from './setup';

// 設定表示・変更
export {
  configureProductionBranch,
  showProductionBranch,
  configureCycleTimeLabels,
  showCycleTimeLabels,
  showCycleTimeConfig,
  configureCodingTimeLabels,
  showCodingTimeLabels,
  showCodingTimeConfig,
  configurePRCycleTimeExcludeBranches,
  showPRCycleTimeExcludeBranches,
  configurePRSizeExcludeBranches,
  showPRSizeExcludeBranches,
  configureDeployWorkflowPatterns,
  showDeployWorkflowPatterns,
  resetDeployWorkflowPatternsConfig,
  // API モード設定
  configureApiMode,
  showApiMode,
} from './config';

// マイグレーション
export {
  previewMigration,
  migrateAllSchemas,
  migrateSheet,
  updateHeadersOnly,
  showBackupCleanupHelp,
} from './migration';

// 監査ログ
export { exportAuditLogs, showAuditLogs } from './audit';

// Secret Manager
export {
  enableSecretManager,
  disableSecretManager,
  showSecretManagerStatus,
  storeSecret,
  getSecret,
  deleteSecret,
  migratePrivateKey,
} from './secretManager';

// ログレベル設定
export { showLogLevel, configureLogLevel } from './logLevel';

// Slack設定
export { configureSlackWebhook, removeSlackWebhook, showSlackConfig } from './slackConfig';

// 診断ツール
export { debugCycleTimeForIssue, debugDeploymentFrequency } from './diagnostics';

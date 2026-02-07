/**
 * 初期化ロジック
 * init.ts の設定オブジェクトから実際の設定を適用する
 */

import {
  setConfig,
  addRepository,
  setExcludePRSizeBaseBranches,
  setExcludeReviewEfficiencyBaseBranches,
  setExcludeCycleTimeBaseBranches,
  setExcludeCodingTimeBaseBranches,
  setExcludeReworkRateBaseBranches,
  setDeployWorkflowPatterns,
} from './settings';
import { initializeContainer, isContainerInitialized } from '../container';
import { createGasAdapters } from '../adapters/gas';

/**
 * 設定オブジェクトの型定義
 */
export interface InitConfig {
  auth:
    | {
        type: 'token';
        token: string;
      }
    | {
        type: 'github-app';
        appId: string;
        installationId: string;
        privateKey: string;
      };
  spreadsheet: {
    id: string;
    sheetName?: string;
  };
  repositories: Array<{
    owner: string;
    name: string;
  }>;
  /** PRサイズ計算から除外するbaseブランチ（部分一致） */
  prSizeExcludeBranches?: string[];
  /** レビュー効率計算から除外するbaseブランチ（部分一致） */
  reviewEfficiencyExcludeBranches?: string[];
  /** サイクルタイム計算から除外するbaseブランチ（部分一致） */
  cycleTimeExcludeBranches?: string[];
  /** コーディング時間計算から除外するbaseブランチ（部分一致） */
  codingTimeExcludeBranches?: string[];
  /** 手戻り率計算から除外するbaseブランチ（部分一致） */
  reworkRateExcludeBranches?: string[];
  /** デプロイワークフローパターン（部分一致） */
  deployWorkflowPatterns?: string[];
}

/**
 * 認証設定を保存
 */
function saveAuthConfig(config: InitConfig): void {
  if (config.auth.type === 'token') {
    setConfig({
      github: { token: config.auth.token, repositories: [] },
      spreadsheet: {
        id: config.spreadsheet.id,
        sheetName: config.spreadsheet.sheetName ?? 'DevOps Metrics',
      },
    });
    Logger.log('✅ Configuration saved (Personal Access Token auth)');
  } else {
    setConfig({
      github: {
        appConfig: {
          appId: config.auth.appId,
          privateKey: config.auth.privateKey,
          installationId: config.auth.installationId,
        },
        repositories: [],
      },
      spreadsheet: {
        id: config.spreadsheet.id,
        sheetName: config.spreadsheet.sheetName ?? 'DevOps Metrics',
      },
    });
    Logger.log('✅ Configuration saved (GitHub App auth)');
  }
}

/**
 * リポジトリを追加
 */
function addRepositories(repositories: Array<{ owner: string; name: string }>): void {
  for (const repo of repositories) {
    addRepository(repo.owner, repo.name);
    Logger.log(`✅ Added repository: ${repo.owner}/${repo.name}`);
  }
}

/**
 * 除外ブランチ設定を適用
 */
function applyExcludeBranchSettings(config: InitConfig): void {
  if (config.prSizeExcludeBranches?.length) {
    setExcludePRSizeBaseBranches(config.prSizeExcludeBranches);
    Logger.log(
      `✅ PR size exclude branches: ${config.prSizeExcludeBranches.join(', ')} (partial match)`
    );
  }

  if (config.reviewEfficiencyExcludeBranches?.length) {
    setExcludeReviewEfficiencyBaseBranches(config.reviewEfficiencyExcludeBranches);
    Logger.log(
      `✅ Review efficiency exclude branches: ${config.reviewEfficiencyExcludeBranches.join(', ')} (partial match)`
    );
  }

  if (config.cycleTimeExcludeBranches?.length) {
    setExcludeCycleTimeBaseBranches(config.cycleTimeExcludeBranches);
    Logger.log(
      `✅ Cycle time exclude branches: ${config.cycleTimeExcludeBranches.join(', ')} (partial match)`
    );
  }

  if (config.codingTimeExcludeBranches?.length) {
    setExcludeCodingTimeBaseBranches(config.codingTimeExcludeBranches);
    Logger.log(
      `✅ Coding time exclude branches: ${config.codingTimeExcludeBranches.join(', ')} (partial match)`
    );
  }

  if (config.reworkRateExcludeBranches?.length) {
    setExcludeReworkRateBaseBranches(config.reworkRateExcludeBranches);
    Logger.log(
      `✅ Rework rate exclude branches: ${config.reworkRateExcludeBranches.join(', ')} (partial match)`
    );
  }

  if (config.deployWorkflowPatterns?.length) {
    setDeployWorkflowPatterns(config.deployWorkflowPatterns);
    Logger.log(
      `✅ Deploy workflow patterns: ${config.deployWorkflowPatterns.join(', ')} (partial match)`
    );
  }
}

/**
 * 設定オブジェクトから初期化を実行
 */
export function initializeFromConfig(config: InitConfig): void {
  if (!isContainerInitialized()) {
    initializeContainer(createGasAdapters());
  }

  saveAuthConfig(config);
  addRepositories(config.repositories);
  applyExcludeBranchSettings(config);

  Logger.log('✅ 初期設定完了');
  Logger.log(
    `🔐 認証モード: ${config.auth.type === 'token' ? 'Personal Access Token' : 'GitHub App'}`
  );
}

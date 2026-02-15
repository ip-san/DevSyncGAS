/**
 * 設定診断機能
 *
 * diagnoseConfig() の複雑度削減のため、診断ロジックを分割
 */

import { getContainer } from '../container.js';
import type { GitHubRepository } from '../types/index.js';
import { getGitHubAuthMode } from './authMode.js';
import { GitHubRepositoriesSchema } from '../utils/configSchemas.js';
import { SPREADSHEET_ID_DISPLAY_LENGTH } from './apiConfig.js';
import { getProjects } from './settings.js';

export interface ConfigDiagnosticItem {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  hint?: string;
  details?: string[]; // プロジェクト一覧などの詳細情報
}

export interface ConfigDiagnosticResult {
  items: ConfigDiagnosticItem[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

/**
 * スプレッドシートID設定を診断
 */
function diagnoseSpreadsheetId(): ConfigDiagnosticItem {
  const { storageClient } = getContainer();
  const spreadsheetId = storageClient.getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    return {
      name: 'Spreadsheet ID',
      status: 'error',
      message: '未設定です',
      hint: "setup('GITHUB_TOKEN', 'SPREADSHEET_ID') または setupWithGitHubApp() で設定してください",
    };
  }

  return {
    name: 'Spreadsheet ID',
    status: 'ok',
    message: `設定済み: ${spreadsheetId.substring(0, SPREADSHEET_ID_DISPLAY_LENGTH)}...`,
  };
}

/**
 * GitHub Apps設定の不足項目をチェック
 */
function findMissingAppConfigItems(
  appId: string | null,
  privateKey: string | null,
  installationId: string | null
): string[] {
  const missing: string[] = [];
  if (!appId) {
    missing.push('App ID');
  }
  if (!privateKey) {
    missing.push('Private Key');
  }
  if (!installationId) {
    missing.push('Installation ID');
  }
  return missing;
}

/**
 * GitHub Apps設定が部分的に存在するかチェック
 */
function hasPartialAppConfig(
  appId: string | null,
  privateKey: string | null,
  installationId: string | null
): boolean {
  return appId !== null || privateKey !== null || installationId !== null;
}

/**
 * 認証が未設定の場合の診断結果を作成
 */
function diagnoseNoAuth(): ConfigDiagnosticItem[] {
  const { storageClient } = getContainer();
  const appId = storageClient.getProperty('GITHUB_APP_ID');
  const privateKey = storageClient.getProperty('GITHUB_APP_PRIVATE_KEY');
  const installationId = storageClient.getProperty('GITHUB_APP_INSTALLATION_ID');
  const token = storageClient.getProperty('GITHUB_TOKEN');

  // 部分的に設定されている場合のヒント
  if (hasPartialAppConfig(appId, privateKey, installationId)) {
    const missing = findMissingAppConfigItems(appId, privateKey, installationId);

    return [
      {
        name: 'GitHub認証',
        status: 'error',
        message: `GitHub Apps設定が不完全です（${missing.join(', ')} が未設定）`,
        hint: 'setupWithGitHubApp(appId, privateKey, installationId, spreadsheetId) で全ての値を設定してください',
      },
    ];
  }

  if (!token) {
    return [
      {
        name: 'GitHub認証',
        status: 'error',
        message: 'GitHub認証が設定されていません',
        hint: "setup('GITHUB_TOKEN', 'SPREADSHEET_ID') でPAT認証、または setupWithGitHubApp() でGitHub Apps認証を設定してください",
      },
    ];
  }

  return [];
}

/**
 * GitHub認証設定を診断
 */
function diagnoseGitHubAuth(): ConfigDiagnosticItem[] {
  const authMode = getGitHubAuthMode();

  if (authMode === 'none') {
    return diagnoseNoAuth();
  }

  if (authMode === 'pat') {
    return diagnosePATAuth();
  }

  if (authMode === 'app') {
    return diagnoseAppAuth();
  }

  return [];
}

/**
 * PAT認証を診断
 */
function diagnosePATAuth(): ConfigDiagnosticItem[] {
  const { storageClient } = getContainer();
  const token = storageClient.getProperty('GITHUB_TOKEN');

  // トークン形式の簡易チェック
  if (token && !token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    return [
      {
        name: 'GitHub認証',
        status: 'warning',
        message: 'PAT認証（トークン形式が通常と異なります）',
        hint: "Fine-grained PATは 'github_pat_' で始まり、Classic PATは 'ghp_' で始まります。正しいトークンか確認してください",
      },
    ];
  }

  return [
    {
      name: 'GitHub認証',
      status: 'ok',
      message: 'PAT認証 (Personal Access Token)',
    },
  ];
}

/**
 * GitHub Apps認証を診断
 */
function diagnoseAppAuth(): ConfigDiagnosticItem[] {
  const { storageClient } = getContainer();
  const items: ConfigDiagnosticItem[] = [
    {
      name: 'GitHub認証',
      status: 'ok',
      message: 'GitHub Apps認証',
    },
  ];

  // Private Key形式の簡易チェック
  const privateKey = storageClient.getProperty('GITHUB_APP_PRIVATE_KEY');
  if (privateKey) {
    const hasValidHeader =
      privateKey.includes('-----BEGIN RSA PRIVATE KEY-----') ||
      privateKey.includes('-----BEGIN PRIVATE KEY-----');
    const hasValidFooter =
      privateKey.includes('-----END RSA PRIVATE KEY-----') ||
      privateKey.includes('-----END PRIVATE KEY-----');

    if (!hasValidHeader || !hasValidFooter) {
      items.push({
        name: 'Private Key形式',
        status: 'error',
        message: 'PEM形式ではありません',
        hint: "Private Keyは '-----BEGIN RSA PRIVATE KEY-----' で始まる必要があります。改行は \\n に置換してください",
      });
    }
  }

  return items;
}

/**
 * リポジトリ設定を診断
 */
function diagnoseRepositories(): ConfigDiagnosticItem {
  const { storageClient } = getContainer();
  const repositoriesJson = storageClient.getProperty('GITHUB_REPOSITORIES');

  let repositories: GitHubRepository[] = [];
  try {
    const parsed: unknown = repositoriesJson ? JSON.parse(repositoriesJson) : [];
    repositories = GitHubRepositoriesSchema.parse(parsed);
  } catch {
    return {
      name: 'リポジトリ設定',
      status: 'error',
      message: 'リポジトリ設定のJSON形式が不正です',
      hint: "addRepo('owner', 'repo-name') で再設定してください",
    };
  }

  if (repositories.length === 0) {
    return {
      name: 'リポジトリ',
      status: 'warning',
      message: 'リポジトリが登録されていません',
      hint: "addRepo('owner', 'repo-name') でリポジトリを追加してください",
    };
  }

  return {
    name: 'リポジトリ',
    status: 'ok',
    message: `${repositories.length}件登録済み`,
  };
}

/**
 * プロジェクト設定を診断
 */
function diagnoseProjects(): ConfigDiagnosticItem {
  try {
    const projects = getProjects();

    if (projects.length === 0) {
      return {
        name: 'プロジェクト',
        status: 'ok',
        message: 'プロジェクトなし（単一スプレッドシート運用）',
      };
    }

    const details: string[] = [];
    for (const project of projects) {
      details.push(`🔹 ${project.name}`);
      details.push(`   Spreadsheet: ${project.spreadsheetId}`);
      details.push(`   Sheet: ${project.sheetName}`);
      details.push(`   Repositories: ${project.repositories.length}件`);
      project.repositories.forEach((repo) => {
        details.push(`     - ${repo.fullName}`);
      });
    }

    return {
      name: 'プロジェクト',
      status: 'ok',
      message: `${projects.length}件登録済み`,
      details,
    };
  } catch {
    // 設定が不完全な場合（他の診断項目でエラーを報告するため、ここでは警告のみ）
    return {
      name: 'プロジェクト',
      status: 'warning',
      message: '設定の取得に失敗しました',
      hint: '他の設定エラーを修正してください',
    };
  }
}

/**
 * 診断結果のサマリーを計算
 */
function calculateSummary(items: ConfigDiagnosticItem[]): {
  hasErrors: boolean;
  hasWarnings: boolean;
} {
  return {
    hasErrors: items.some((item) => item.status === 'error'),
    hasWarnings: items.some((item) => item.status === 'warning'),
  };
}

/**
 * 設定状況を診断する
 * 設定ミスを分かりやすいメッセージで報告
 *
 * @returns 診断結果
 */
export function diagnoseConfig(): ConfigDiagnosticResult {
  const items: ConfigDiagnosticItem[] = [];

  // 1. スプレッドシートID
  items.push(diagnoseSpreadsheetId());

  // 2. GitHub認証
  items.push(...diagnoseGitHubAuth());

  // 3. リポジトリ設定
  items.push(diagnoseRepositories());

  // 4. プロジェクト設定
  items.push(diagnoseProjects());

  // 結果のサマリー
  const summary = calculateSummary(items);

  return { items, ...summary };
}

/**
 * 設定診断結果をフォーマットして文字列で返す
 */
export function formatDiagnosticResult(result: ConfigDiagnosticResult): string {
  const lines: string[] = [];
  lines.push('=== DevSyncGAS 設定診断 ===\n');

  for (const item of result.items) {
    const icon = item.status === 'ok' ? '✅' : item.status === 'warning' ? '⚠️' : '❌';
    lines.push(`${icon} ${item.name}: ${item.message}`);
    if (item.hint) {
      lines.push(`   → ${item.hint}`);
    }
    if (item.details) {
      lines.push('');
      lines.push(...item.details);
    }
  }

  lines.push('');

  if (result.hasErrors) {
    lines.push('❌ エラーがあります。上記のヒントを参考に設定を修正してください。');
  } else if (result.hasWarnings) {
    lines.push('⚠️ 警告があります。必要に応じて設定を確認してください。');
  } else {
    lines.push('✅ すべての設定が正常です。');
  }

  return lines.join('\n');
}

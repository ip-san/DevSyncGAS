#!/usr/bin/env bun
/**
 * DevSyncGAS 対話的セットアップスクリプト
 *
 * このスクリプトは、初心者でも迷わずセットアップできるように
 * 対話的に必要な情報を収集し、自動的に設定ファイルを生成します。
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import * as readline from 'readline';

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

function log(message: string, color = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string): void {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string): void {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string): void {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string): void {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logStep(step: number, total: number, message: string): void {
  console.log('');
  log('━'.repeat(50), colors.gray);
  log(`${colors.bright}ステップ ${step}/${total}: ${message}${colors.reset}`, colors.cyan);
  log('━'.repeat(50), colors.gray);
  console.log('');
}

function execCommand(command: string, silent = false): string {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return result.toString().trim();
  } catch (error) {
    if (!silent) {
      throw error;
    }
    return '';
  }
}

function checkCommand(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function checkPrerequisites(): Promise<boolean> {
  logStep(1, 7, '前提条件の確認');

  let allOk = true;

  // Bun
  if (checkCommand('bun')) {
    const version = execCommand('bun --version', true);
    logSuccess(`Bun: v${version}`);
  } else {
    logError('Bun: インストールされていません');
    logInfo('インストール方法: https://bun.sh/');
    allOk = false;
  }

  // Node.js
  if (checkCommand('node')) {
    const version = execCommand('node --version', true);
    logSuccess(`Node.js: ${version}`);
  } else {
    logWarning('Node.js: インストールされていません（推奨）');
  }

  // git
  if (checkCommand('git')) {
    const version = execCommand('git --version', true);
    logSuccess(`git: ${version}`);
  } else {
    logError('git: インストールされていません');
    allOk = false;
  }

  // clasp
  if (checkCommand('clasp')) {
    const version = execCommand('clasp --version', true);
    logSuccess(`clasp: ${version}`);
  } else {
    logError('clasp: インストールされていません');
    logInfo('インストール方法: npm install -g @google/clasp');
    allOk = false;
  }

  console.log('');

  if (!allOk) {
    logError('前提条件が不足しています。上記のツールをインストールしてください。');
    return false;
  }

  logSuccess('すべての前提条件を満たしています！');
  return true;
}

async function installDependencies(): Promise<void> {
  logStep(2, 7, '依存関係のインストール');

  if (existsSync('node_modules')) {
    logInfo('node_modules が既に存在します。スキップします。');
    return;
  }

  logInfo('bun install を実行中...');
  try {
    execCommand('bun install');
    logSuccess('依存関係のインストール完了');
  } catch (error) {
    logError('依存関係のインストールに失敗しました');
    throw error;
  }
}

async function collectConfiguration(): Promise<{
  githubToken: string;
  spreadsheetId: string;
  owner: string;
  name: string;
}> {
  logStep(3, 7, '設定情報の入力');

  logInfo('GitHub Personal Access Token を取得してください:');
  console.log(
    colors.gray +
      '  1. https://github.com/settings/personal-access-tokens/new にアクセス' +
      colors.reset
  );
  console.log(colors.gray + '  2. Token name: DevSyncGAS' + colors.reset);
  console.log(colors.gray + '  3. Expiration: 90日（推奨）' + colors.reset);
  console.log(colors.gray + '  4. Repository access: 計測したいリポジトリを選択' + colors.reset);
  console.log(colors.gray + '  5. Permissions (Read-only):' + colors.reset);
  console.log(colors.gray + '     - Pull requests: Read-only' + colors.reset);
  console.log(colors.gray + '     - Actions: Read-only' + colors.reset);
  console.log(colors.gray + '     - Metadata: Read-only（自動選択）' + colors.reset);
  console.log('');

  const githubToken = await question('GitHub Token (ghp_...): ');
  if (!githubToken.startsWith('ghp_')) {
    logWarning('トークンが "ghp_" で始まっていません。正しいトークンか確認してください。');
  }

  console.log('');
  logInfo('Google スプレッドシートを作成してください:');
  console.log(colors.gray + '  1. https://sheets.google.com で新規作成' + colors.reset);
  console.log(
    colors.gray +
      '  2. URLから ID をコピー: https://docs.google.com/spreadsheets/d/【ここ】/edit' +
      colors.reset
  );
  console.log('');

  const spreadsheetId = await question('Spreadsheet ID: ');
  if (spreadsheetId.length !== 44) {
    logWarning('Spreadsheet ID は通常44文字です。正しいIDか確認してください。');
  }

  console.log('');
  logInfo('計測対象のリポジトリ情報を入力してください:');
  const owner = await question('Repository owner (組織名/ユーザー名): ');
  const name = await question('Repository name (リポジトリ名): ');

  console.log('');
  logInfo('入力内容の確認:');
  console.log(colors.gray + `  GitHub Token: ${githubToken.substring(0, 10)}...` + colors.reset);
  console.log(colors.gray + `  Spreadsheet ID: ${spreadsheetId}` + colors.reset);
  console.log(colors.gray + `  Repository: ${owner}/${name}` + colors.reset);
  console.log('');

  const confirm = await question('この内容でよろしいですか？ (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    logError('セットアップをキャンセルしました。');
    process.exit(0);
  }

  return { githubToken, spreadsheetId, owner, name };
}

function generateInitTs(config: {
  githubToken: string;
  spreadsheetId: string;
  owner: string;
  name: string;
}): void {
  logStep(4, 7, '設定ファイルの生成');

  const initTsPath = resolve(process.cwd(), 'src/init.ts');

  const content = `/**
 * DevSyncGAS 初期設定ファイル
 * セットアップスクリプトにより自動生成されました
 */

import type { InitConfig } from './config/initializer';
import { initializeFromConfig } from './config/initializer';

/// <reference path="./types/gas-global.d.ts" />

export const config: InitConfig = {
  // 認証設定
  auth: {
    type: 'token',
    token: '${config.githubToken}',
  },

  // プロジェクト設定
  projects: [
    {
      name: 'My Project',
      spreadsheet: {
        id: '${config.spreadsheetId}',
      },
      repositories: [
        { owner: '${config.owner}', name: '${config.name}' },
      ],
    },
  ],
};

/**
 * GAS環境で実行される初期化関数
 * GASエディタで実行してください
 */
function initConfig(): void {
  initializeFromConfig(config);
}

// GASグローバル関数として登録
global.initConfig = initConfig;
`;

  writeFileSync(initTsPath, content, 'utf-8');
  logSuccess(`設定ファイルを生成しました: ${initTsPath}`);
}

async function setupClasp(): Promise<void> {
  logStep(5, 7, 'Google Apps Script の設定');

  // clasp login 確認
  const clasprcPath = resolve(process.env.HOME || '~', '.clasprc.json');
  if (!existsSync(clasprcPath)) {
    logInfo('clasp login を実行します...');
    logWarning('ブラウザが開きますので、Googleアカウントで認証してください。');
    console.log('');

    try {
      execCommand('clasp login');
      logSuccess('clasp login 完了');
    } catch (error) {
      logError('clasp login に失敗しました');
      throw error;
    }
  } else {
    logSuccess('clasp login 済み');
  }

  // Apps Script API 有効化の確認
  console.log('');
  logWarning('重要: Google Apps Script API を有効化してください');
  console.log(
    colors.gray + '  1. https://script.google.com/home/usersettings にアクセス' + colors.reset
  );
  console.log(colors.gray + '  2. "Google Apps Script API" をオンに切り替え' + colors.reset);
  console.log('');

  const confirmed = await question('有効化しましたか？ (y/N): ');
  if (confirmed.toLowerCase() !== 'y') {
    logError('有効化してから再度セットアップを実行してください。');
    process.exit(0);
  }

  // .clasp.json の確認
  const claspJsonPath = resolve(process.cwd(), '.clasp.json');
  if (existsSync(claspJsonPath)) {
    logInfo('.clasp.json が既に存在します。');
    const overwrite = await question('上書きしますか？ (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      logInfo('既存の設定を使用します。');
      return;
    }
  }

  // clasp create
  logInfo('GASプロジェクトを作成中...');
  console.log('');

  // distディレクトリが存在しない場合は作成
  const distPath = resolve(process.cwd(), 'dist');
  if (!existsSync(distPath)) {
    mkdirSync(distPath, { recursive: true });
    logInfo('dist ディレクトリを作成しました');
  }

  try {
    execCommand('clasp create --title "DevSyncGAS" --type standalone --rootDir ./dist');
    logSuccess('GASプロジェクトの作成完了');
  } catch (error) {
    logError('GASプロジェクトの作成に失敗しました');
    throw error;
  }
}

async function buildAndDeploy(): Promise<void> {
  logStep(6, 7, 'ビルドとデプロイ');

  logInfo('プロジェクトをビルド中...');
  try {
    execCommand('bun run build', true);
    logSuccess('ビルド完了');
  } catch (error) {
    logError('ビルドに失敗しました');
    throw error;
  }

  console.log('');
  logInfo('GASにデプロイ中...');
  try {
    execCommand('clasp push');
    logSuccess('デプロイ完了');
  } catch (error) {
    logError('デプロイに失敗しました');
    throw error;
  }
}

function showNextSteps(): void {
  logStep(7, 7, '次のステップ');

  console.log('');
  log('🎉 セットアップ完了！', colors.bright + colors.green);
  console.log('');

  log('━'.repeat(50), colors.gray);
  log('📋 次に実行すること:', colors.bright);
  log('━'.repeat(50), colors.gray);
  console.log('');

  console.log('1️⃣  GASエディタを開く:');
  console.log(colors.cyan + '   clasp open' + colors.reset);
  console.log('');

  console.log('2️⃣  GASエディタで以下を実行:');
  console.log(colors.gray + '   a. 関数ドロップダウンから "initConfig" を選択' + colors.reset);
  console.log(colors.gray + '   b. 実行ボタン (▶) をクリック' + colors.reset);
  console.log(colors.gray + '   c. 初回は権限承認が必要 → 「許可」をクリック' + colors.reset);
  console.log('');

  console.log('3️⃣  データを取得:');
  console.log(colors.gray + '   a. 関数ドロップダウンから "syncAllMetrics" を選択' + colors.reset);
  console.log(colors.gray + '   b. 実行ボタン (▶) をクリック' + colors.reset);
  console.log(colors.gray + '   c. 実行完了まで 30秒〜1分 待機' + colors.reset);
  console.log('');

  console.log('4️⃣  スプレッドシートを確認:');
  console.log(colors.gray + '   https://docs.google.com/spreadsheets で開いて、' + colors.reset);
  console.log(colors.gray + '   Dashboard シートに指標が表示されているか確認' + colors.reset);
  console.log('');

  log('━'.repeat(50), colors.gray);
  log('💡 困ったときは:', colors.bright);
  log('━'.repeat(50), colors.gray);
  console.log('');
  console.log(colors.gray + '  - 設定診断: GASエディタで checkConfig() を実行' + colors.reset);
  console.log(colors.gray + '  - トラブルシューティング: docs/TROUBLESHOOTING.md' + colors.reset);
  console.log(colors.gray + '  - クイックスタート: docs/QUICK_START.md' + colors.reset);
  console.log('');

  log('━'.repeat(50), colors.gray);
}

async function main(): Promise<void> {
  console.clear();
  console.log('');
  log('🚀 DevSyncGAS セットアップウィザード', colors.bright + colors.cyan);
  log('━'.repeat(50), colors.gray);
  console.log('');
  log('所要時間: 10-15分（初めての場合）', colors.gray);
  console.log('');

  try {
    // 前提条件チェック
    const prerequisitesOk = await checkPrerequisites();
    if (!prerequisitesOk) {
      process.exit(1);
    }

    // 依存関係のインストール
    await installDependencies();

    // 設定情報の収集
    const config = await collectConfiguration();

    // 設定ファイルの生成
    generateInitTs(config);

    // clasp セットアップ
    await setupClasp();

    // ビルド&デプロイ
    await buildAndDeploy();

    // 次のステップを表示
    showNextSteps();
  } catch (error) {
    console.log('');
    logError('セットアップ中にエラーが発生しました:');
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();

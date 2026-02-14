#!/usr/bin/env bun
/**
 * DevSyncGAS 環境診断スクリプト
 *
 * セットアップに必要な前提条件をチェックし、
 * 問題があれば解決方法を提示します。
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

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

function log(message: string, color = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command: string): string {
  try {
    const result = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    return result.toString().trim();
  } catch {
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

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  hint?: string;
}

function checkBun(): CheckResult {
  if (!checkCommand('bun')) {
    return {
      name: 'Bun',
      status: 'error',
      message: 'インストールされていません',
      hint: `インストール方法:
  Mac/Linux: curl -fsSL https://bun.sh/install | bash
  Windows: powershell -c "irm bun.sh/install.ps1 | iex"

  詳細: https://bun.sh/`,
    };
  }

  const version = execCommand('bun --version');
  const versionNum = parseFloat(version);

  if (versionNum < 1.0) {
    return {
      name: 'Bun',
      status: 'warning',
      message: `v${version} （推奨: v1.0.0以上）`,
      hint: 'アップデート方法: bun upgrade',
    };
  }

  return {
    name: 'Bun',
    status: 'ok',
    message: `v${version}`,
  };
}

function checkNodeJs(): CheckResult {
  if (!checkCommand('node')) {
    return {
      name: 'Node.js',
      status: 'warning',
      message: 'インストールされていません（推奨）',
      hint: `Node.js は clasp のために推奨されます。
  インストール方法: https://nodejs.org/`,
    };
  }

  const version = execCommand('node --version');
  const versionNum = parseFloat(version.substring(1));

  if (versionNum < 18.0) {
    return {
      name: 'Node.js',
      status: 'warning',
      message: `${version} （推奨: v18.0以上）`,
      hint: 'アップデート方法: https://nodejs.org/',
    };
  }

  return {
    name: 'Node.js',
    status: 'ok',
    message: version,
  };
}

function checkGit(): CheckResult {
  if (!checkCommand('git')) {
    return {
      name: 'git',
      status: 'error',
      message: 'インストールされていません',
      hint: `インストール方法:
  Mac: brew install git
  Linux: sudo apt-get install git
  Windows: https://git-scm.com/download/win`,
    };
  }

  const version = execCommand('git --version');
  return {
    name: 'git',
    status: 'ok',
    message: version,
  };
}

function checkClasp(): CheckResult {
  if (!checkCommand('clasp')) {
    return {
      name: 'clasp',
      status: 'error',
      message: 'インストールされていません',
      hint: `インストール方法:
  npm install -g @google/clasp

  または

  bun install -g @google/clasp`,
    };
  }

  const version = execCommand('clasp --version');
  return {
    name: 'clasp',
    status: 'ok',
    message: version,
  };
}

function checkClaspLogin(): CheckResult {
  const clasprcPath = resolve(process.env.HOME || '~', '.clasprc.json');

  if (!existsSync(clasprcPath)) {
    return {
      name: 'clasp login',
      status: 'warning',
      message: 'ログインしていません',
      hint: `ログイン方法:
  clasp login

  ブラウザが開き、Googleアカウントで認証します。`,
    };
  }

  return {
    name: 'clasp login',
    status: 'ok',
    message: 'ログイン済み',
  };
}

function checkAppsScriptApi(): CheckResult {
  // .clasprc.json が存在すればログイン済みと判断
  const clasprcPath = resolve(process.env.HOME || '~', '.clasprc.json');

  if (!existsSync(clasprcPath)) {
    return {
      name: 'Apps Script API',
      status: 'warning',
      message: '未確認（clasp未ログイン）',
      hint: '先に clasp login を実行してください。',
    };
  }

  return {
    name: 'Apps Script API',
    status: 'warning',
    message: '手動で確認してください',
    hint: `確認方法:
  1. https://script.google.com/home/usersettings にアクセス
  2. "Google Apps Script API" がオンになっているか確認

  オフの場合はオンに切り替えてください。`,
  };
}

function checkProjectStructure(): CheckResult {
  const required = ['src', 'package.json', 'tsconfig.json'];
  const missing = required.filter((file) => !existsSync(file));

  if (missing.length > 0) {
    return {
      name: 'プロジェクト構造',
      status: 'error',
      message: `必要なファイル/ディレクトリが見つかりません: ${missing.join(', ')}`,
      hint: 'プロジェクトルートディレクトリで実行していますか？',
    };
  }

  return {
    name: 'プロジェクト構造',
    status: 'ok',
    message: 'OK',
  };
}

function checkNodeModules(): CheckResult {
  if (!existsSync('node_modules')) {
    return {
      name: '依存関係',
      status: 'warning',
      message: 'node_modules が見つかりません',
      hint: `インストール方法:
  bun install`,
    };
  }

  return {
    name: '依存関係',
    status: 'ok',
    message: 'インストール済み',
  };
}

function checkInitTs(): CheckResult {
  const initTsPath = resolve(process.cwd(), 'src/init.ts');

  if (!existsSync(initTsPath)) {
    return {
      name: '設定ファイル',
      status: 'warning',
      message: 'src/init.ts が見つかりません',
      hint: `作成方法:
  1. cp src/init.example.ts src/init.ts
  2. src/init.ts を編集して認証情報を設定

  または、自動セットアップを実行:
  bun run setup`,
    };
  }

  return {
    name: '設定ファイル',
    status: 'ok',
    message: 'src/init.ts 存在',
  };
}

function checkClaspJson(): CheckResult {
  if (!existsSync('.clasp.json')) {
    return {
      name: 'GASプロジェクト',
      status: 'warning',
      message: '.clasp.json が見つかりません',
      hint: `作成方法:
  clasp create --title "DevSyncGAS" --type standalone --rootDir ./dist

  または、自動セットアップを実行:
  bun run setup`,
    };
  }

  return {
    name: 'GASプロジェクト',
    status: 'ok',
    message: '作成済み',
  };
}

function printResult(result: CheckResult): void {
  let icon: string;
  let color: string;

  switch (result.status) {
    case 'ok':
      icon = '✅';
      color = colors.green;
      break;
    case 'warning':
      icon = '⚠️ ';
      color = colors.yellow;
      break;
    case 'error':
      icon = '❌';
      color = colors.red;
      break;
  }

  console.log(`${icon} ${color}${result.name}${colors.reset}: ${result.message}`);

  if (result.hint) {
    console.log(colors.gray + '   → ' + result.hint.split('\n').join('\n   → ') + colors.reset);
    console.log('');
  }
}

function main(): void {
  console.clear();
  console.log('');
  log('🔍 DevSyncGAS 環境診断', colors.bright + colors.cyan);
  log('━'.repeat(60), colors.gray);
  console.log('');

  const results: CheckResult[] = [
    checkBun(),
    checkNodeJs(),
    checkGit(),
    checkClasp(),
    checkClaspLogin(),
    checkAppsScriptApi(),
    checkProjectStructure(),
    checkNodeModules(),
    checkInitTs(),
    checkClaspJson(),
  ];

  results.forEach(printResult);

  log('━'.repeat(60), colors.gray);
  console.log('');

  const errors = results.filter((r) => r.status === 'error');
  const warnings = results.filter((r) => r.status === 'warning');

  if (errors.length > 0) {
    log('❌ エラーがあります', colors.red + colors.bright);
    console.log(colors.red + `   ${errors.length}個の必須項目が不足しています。` + colors.reset);
    console.log(colors.gray + '   上記のヒントを参考に解決してください。' + colors.reset);
    console.log('');
    process.exit(1);
  }

  if (warnings.length > 0) {
    log('⚠️  警告があります', colors.yellow + colors.bright);
    console.log(colors.yellow + `   ${warnings.length}個の推奨項目が未完了です。` + colors.reset);
    console.log(
      colors.gray +
        '   セットアップを続行できますが、上記を確認することを推奨します。' +
        colors.reset
    );
    console.log('');
  } else {
    log('✅ すべての環境チェックをクリアしました！', colors.green + colors.bright);
    console.log('');
    console.log(colors.gray + '次のステップ:' + colors.reset);
    console.log(colors.cyan + '  bun run setup' + colors.reset);
    console.log(colors.gray + '  または' + colors.reset);
    console.log(colors.cyan + '  bun run push' + colors.reset);
    console.log('');
  }

  log('━'.repeat(60), colors.gray);
}

main();

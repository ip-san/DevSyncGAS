/**
 * 初期設定ファイル - 最小構成テンプレート
 *
 * 【このテンプレートについて】
 * まずはこの最小構成で試してみましょう。
 * Personal Access Token (PAT) 認証で、1つのリポジトリを監視する最もシンプルな構成です。
 *
 * 【使い方】
 * 1. このファイルを src/init.ts にコピー
 *    cp src/init.simple.example.ts src/init.ts
 *
 * 2. 以下の3箇所を編集（YOUR_xxx_HERE の部分）
 *    - GitHub Token
 *    - Spreadsheet ID
 *    - Repository owner/name
 *
 * 3. デプロイして初期化
 *    bun run push
 *    # GASエディタで initConfig() を実行
 *
 * 【より高度な設定が必要な場合】
 * - 複数のリポジトリを監視したい → init.example.ts を参照
 * - GitHub Apps認証を使いたい → docs/GITHUB_APPS_AUTH.md を参照
 * - 除外設定をカスタマイズしたい → init.example.ts を参照
 *
 * 【自動セットアップ】
 * 手動編集が面倒な場合は、対話的セットアップスクリプトを使用できます:
 *   bun run setup
 */

import type { InitConfig } from './config/initializer';
import { initializeFromConfig } from './config/initializer';

/// <reference path="./types/gas-global.d.ts" />

// ===== ここを編集 =====
export const config: InitConfig = {
  // GitHub認証設定
  auth: {
    type: 'token',
    token: 'YOUR_GITHUB_TOKEN_HERE', // 例: 'ghp_xxxxxxxxxxxxx'
    // 取得方法: https://github.com/settings/personal-access-tokens/new
    // 必要な権限: Pull requests (Read-only), Actions (Read-only), Metadata (Read-only)
  },

  // プロジェクト設定
  projects: [
    {
      // プロジェクト名（任意、識別用）
      name: 'My First Project',

      // 出力先のGoogleスプレッドシート
      spreadsheet: {
        id: 'YOUR_SPREADSHEET_ID_HERE', // 例: '1a2b3c4d5e6f7g8h9i0j'
        // スプレッドシートのURLから取得:
        // https://docs.google.com/spreadsheets/d/【ここがID】/edit
      },

      // 監視対象のリポジトリ（まずは1つから）
      repositories: [
        {
          owner: 'your-org', // 組織名またはユーザー名
          name: 'your-repo', // リポジトリ名
        },
        // 複数のリポジトリを追加する場合:
        // { owner: 'your-org', name: 'another-repo' },
      ],
    },
  ],
};
// ======================

/**
 * GAS環境で実行される初期化関数
 * GASエディタで実行してください
 *
 * 実行方法:
 * 1. GASエディタ (clasp open) を開く
 * 2. 関数ドロップダウンから "initConfig" を選択
 * 3. 実行ボタン (▶) をクリック
 * 4. 初回は権限承認が必要 → 「許可」をクリック
 */
function initConfig(): void {
  initializeFromConfig(config);
}

// GASグローバル関数として登録
global.initConfig = initConfig;

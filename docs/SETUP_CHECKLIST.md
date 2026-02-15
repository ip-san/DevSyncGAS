# DevSyncGAS セットアップチェックリスト

**印刷して、チェックしながら進めましょう！**

所要時間: 10-15分 | 最終更新: 2026-02

---

## 事前準備

### 環境確認

□ GitHubアカウントを持っている
□ Googleアカウントを持っている
□ 計測対象リポジトリへのアクセス権がある（Collaborator以上）
□ PCの管理者権限がある（ツールインストール用）

### ツールインストール

□ Bun インストール完了
  - Mac/Linux: `curl -fsSL https://bun.sh/install | bash`
  - Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`
  - 確認: `bun --version` → v1.0.0以上

□ clasp インストール完了
  - インストール: `npm install -g @google/clasp`
  - 確認: `clasp --version`

□ git インストール完了
  - 確認: `git --version`

□ 環境診断実行完了
  - プロジェクトクローン: `git clone <repo-url>`
  - 依存関係インストール: `bun install`
  - 診断実行: `bun run check:env`
  - すべて ✅ を確認

---

## セットアップ

### 方法選択

どちらか一方をチェック:

□ **【推奨】自動セットアップ** → このまま下に進む
□ **手動セットアップ** → [手動セットアップのチェックリスト](#手動セットアップ)へ

---

## 自動セットアップ

### Step 1: GitHubトークン取得

□ https://github.com/settings/personal-access-tokens/new にアクセス

□ 以下を設定:
  - Token name: `DevSyncGAS`
  - Expiration: `90日`
  - Repository access: 計測対象リポジトリを選択
  - Permissions:
    - ✅ Pull requests: Read-only
    - ✅ Actions: Read-only
    - ✅ Metadata: Read-only（自動）

□ 「Generate token」をクリック

□ `ghp_` で始まるトークンをコピー（**画面を閉じる前に！**）

□ トークンを安全な場所にメモ（一時的に）

---

### Step 2: Googleスプレッドシート作成

□ https://sheets.google.com にアクセス

□ 新しいスプレッドシートを作成

□ タイトルを「DevOps Metrics Dashboard」などに変更

□ URLからスプレッドシートIDをコピー（44文字）
  - URL: `https://docs.google.com/spreadsheets/d/【ID】/edit`

□ スプレッドシートIDをメモ

---

### Step 3: セットアップスクリプト実行

□ ターミナルでプロジェクトルートに移動

□ `bun run setup` を実行

□ スクリプトの質問に回答:
  - □ GitHub Token: Step 1のトークンを貼り付け
  - □ Spreadsheet ID: Step 2のIDを貼り付け
  - □ Repository owner: 組織名/ユーザー名を入力
  - □ Repository name: リポジトリ名を入力
  - □ 確認: 入力内容を確認して `y` を入力

□ Apps Script API 有効化を確認:
  - □ https://script.google.com/home/usersettings にアクセス
  - □ 「Google Apps Script API」をオンに切り替え
  - □ `y` を入力

□ ブラウザで認証:
  - □ clasp login のブラウザ認証を完了
  - □ GAS実行権限の承認を完了

□ スクリプト完了を確認:
  - 「🎉 セットアップ完了！」が表示される

---

### Step 4: GASで初期設定

□ GASエディタを開く:
  - コマンド: `clasp open`
  - または、スクリプトが表示したURLを開く

□ `initConfig` 関数を実行:
  - □ 関数ドロップダウンから `initConfig` を選択
  - □ 実行ボタン（▶）をクリック
  - □ 初回は権限承認 → 「許可」をクリック
  - □ 「✅ 初期設定完了！」がログに表示される

---

### Step 5: データ取得

□ `syncAllMetrics` 関数を実行:
  - □ 関数ドロップダウンから `syncAllMetrics` を選択
  - □ 実行ボタン（▶）をクリック
  - □ 30秒〜1分待機（ログで進捗確認）
  - □ 「✅ すべてのデータ取得が完了しました！」が表示される

---

### Step 6: 動作確認

□ スプレッドシートを開く（Step 2で作成したもの）

□ 以下のシートが作成されていることを確認:
  - □ Dashboard
  - □ Dashboard - Trend
  - □ DevOps Summary
  - □ {owner/repo}（リポジトリ別シート）

□ Dashboard シートにデータが表示されている

□ リードタイム、変更障害率、MTTRに数値が入っている

---

## セットアップ完了！ 🎉

□ GitHubトークンのメモを削除（もう不要）

□ README.mdで次のステップを確認

---

## オプション設定

### デプロイ頻度の計測（推奨）

□ [DEPLOYMENT_RECORDING.md](DEPLOYMENT_RECORDING.md) を参照

□ 計測対象リポジトリにワークフローファイルを追加

□ デプロイ記録が取得できることを確認

---

### 日次自動実行の設定（推奨）

□ GASエディタで `scheduleDailyMetricsSync()` を実行

□ トリガーが作成されたことを確認:
  - GASエディタ → 左サイドバー「トリガー」で確認

---

### Slack通知の設定（オプション）

□ SlackでIncoming Webhook URLを取得

□ GASエディタで `configureSlackWebhook('URL')` を実行

□ 週次レポートのトリガーを設定

---

## トラブルシューティング

問題が発生したら:

□ GASエディタで `checkConfig()` を実行して設定診断

□ [TROUBLESHOOTING.md](TROUBLESHOOTING.md) を参照

□ [FAQ.md](FAQ.md) でよくある質問を確認

---

## 手動セットアップ

### Step 1: プロジェクト準備

□ プロジェクトをクローン:
  ```bash
  git clone <repo-url>
  cd dev-sync-gas
  ```

□ 依存関係をインストール:
  ```bash
  bun install
  ```

---

### Step 2: GASデプロイ

□ Apps Script API を有効化:
  - https://script.google.com/home/usersettings にアクセス
  - 「Google Apps Script API」をオンに

□ clasp login:
  ```bash
  clasp login
  ```

□ GASプロジェクト作成:
  ```bash
  clasp create --title "DevSyncGAS" --type standalone --rootDir ./dist
  ```

□ ビルド＆デプロイ:
  ```bash
  bun run push
  ```

---

### Step 3: 設定ファイル作成

□ テンプレートをコピー:
  ```bash
  cp src/init.simple.example.ts src/init.ts
  ```

□ `src/init.ts` を編集:
  - □ `token`: GitHubトークンを設定
  - □ `id`: スプレッドシートIDを設定
  - □ `owner`, `name`: リポジトリ情報を設定

□ 再デプロイ:
  ```bash
  bun run push
  ```

---

### Step 4: 初期化＆データ取得

□ GASエディタを開く: `clasp open`

□ `initConfig()` を実行（[自動セットアップのStep 4](#step-4-gasで初期設定)参照）

□ `syncAllMetrics()` を実行（[自動セットアップのStep 5](#step-5-データ取得)参照）

□ スプレッドシートでデータを確認（[自動セットアップのStep 6](#step-6-動作確認)参照）

---

## 完了確認

すべてのチェックが付いたら、セットアップ完了です！

**総チェック数（自動セットアップ）:** 40項目
**総チェック数（手動セットアップ）:** 35項目

---

**📝 メモ欄**

```
GitHub Token (最初の10文字のみ): ghp_______

Spreadsheet ID (最初の10文字のみ): __________

Repository: ___________________

セットアップ日時: _____ / _____ / _____

担当者: _____________________

備考:





```

---

**💡 このチェックリストを印刷して、チームメンバーと共有しましょう！**

# クイックスタート

**✨ 10-15分で、あなたのチームの開発生産性を可視化しましょう。**

```
ゴール: スプレッドシートにPRベースのDORA指標が表示される
所要時間: 10-15分（初めての場合）
必要なもの: GitHubアカウント、Googleアカウント
```

**📌 この手順で計測できる指標:**
- ✅ リードタイム（PR作成→マージ→デプロイ）
- ✅ 変更障害率
- ✅ MTTR（平均修復時間）
- ✅ 手戻り率、レビュー効率、PRサイズ（PRベース）
- 📝 デプロイ頻度 → [追加設定](DEPLOYMENT_RECORDING.md)が必要
- 📝 サイクルタイム、コーディング時間 → [Issue/PRリンク運用](#運用上の注意-issuepr-リンク)が必要

---

## 何ができるようになる？

このガイドを完了すると、こんなスプレッドシートが手に入ります:

```
Dashboard シート:
┌─────────────┬──────────┬────────────┬──────────┬──────┐
│ リポジトリ  │ デプロイ │ リードタイム │ 変更障害率│ MTTR │
├─────────────┼──────────┼────────────┼──────────┼──────┤
│ your/repo   │ yearly*  │ 18.5h      │ 5.0%     │ 2.3h │
└─────────────┴──────────┴────────────┴──────────┴──────┘
```

> **Note:** デプロイ頻度（上記の `yearly*`）を正確に計測するには、[追加設定](DEPLOYMENT_RECORDING.md)が必要です。

**これを使って:**
- 「レビュー待ちが長すぎる」を数字で証明
- 「AI導入後、どれだけ速くなった？」に答える
- チームのボトルネックを特定

---

##  セットアップ方法の選択

### 🎯 推奨: 自動セットアップ（10分）

対話的なスクリプトが設定を自動化します。**初めての方はこちらを推奨します。**

```bash
bun run setup
```

スクリプトが以下を自動実行:
- ✅ 前提条件チェック
- ✅ 設定ファイル自動生成
- ✅ GASプロジェクト作成・デプロイ

👉 [自動セットアップの手順](#自動セットアップ-推奨)へ

### 🔧 手動セットアップ（15分）

自分で設定ファイルを編集したい場合はこちら。

👉 [手動セットアップの手順](#手動セットアップ)へ

---

## 自動セットアップ（推奨）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**進捗:** ■□□□□ ステップ 1/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Step 1: 前提条件の確認（3分）

#### 1.1 Bunのインストール

**Mac/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows:**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

✅ **確認コマンド:**
```bash
bun --version  # v1.0.0 以上ならOK
```

❌ **エラーが出る場合:**
- **M1/M2 Macの場合:** Rosettaインストールが必要
  ```bash
  /usr/sbin/softwareupdate --install-rosetta
  ```
- **その他の場合:** [Bun公式サイト](https://bun.sh/) を参照

#### 1.2 claspのインストール

```bash
npm install -g @google/clasp
```

または

```bash
bun install -g @google/clasp
```

✅ **確認コマンド:**
```bash
clasp --version
```

#### 1.3 環境診断

```bash
git clone https://github.com/your-org/dev-sync-gas.git
cd dev-sync-gas
bun install
bun run check:env
```

**出力例:**
```
🔍 DevSyncGAS 環境診断
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Bun: v1.0.0
✅ Node.js: v20.0.0
✅ git: git version 2.39.0
✅ clasp: 2.4.2
⚠️  clasp login: ログインしていません
   → ログイン方法: clasp login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

すべてに ✅ が付けば次へ進めます。

💡 **ヒント:** ⚠️  が出ている項目は後のステップで解決します。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**進捗:** ■■□□□ ステップ 2/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Step 2: GitHubトークンを取得（2分）

**なぜ必要？** DevSyncGASがGitHubからPR・デプロイメント情報を読み取るための認証です。

1. [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new) にアクセス
2. 以下を設定:

| 項目 | 設定内容 |
|------|---------|
| **Token name** | `DevSyncGAS` |
| **Expiration** | `90日`（推奨） |
| **Repository access** | 計測したいリポジトリを選択 |
| **Permissions** | 以下をすべて **Read-only** に設定:<br>✅ Pull requests<br>✅ Actions<br>✅ Metadata（自動選択） |

3. 「Generate token」をクリック
4. `ghp_` で始まるトークンをコピー（**画面を閉じる前に必ずコピー**）

✅ **完了の目印:** `ghp_xxxxxxxxxxxxx` の形式のトークンがコピーできた

💡 **組織での運用:** [GitHub Apps認証](GITHUB_APPS_AUTH.md)を推奨（トークン発行者の退職リスク回避）

❌ **トラブル:**
- **リポジトリが選択肢に出ない:** リポジトリへのアクセス権がありません → リポジトリ管理者に Collaborator として追加してもらう
- **組織のリポジトリ全体が出ない:** 組織管理者に Fine-grained PAT の許可を依頼

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**進捗:** ■■■□□ ステップ 3/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Step 3: Googleスプレッドシートを作成（1分）

**なぜ必要？** DORA指標を表示する場所を用意します。

1. [sheets.google.com](https://sheets.google.com/) で新しいスプレッドシートを作成
2. タイトルを「DevOps Metrics Dashboard」など、わかりやすい名前に変更
3. URLからスプレッドシートIDをコピー

```
https://docs.google.com/spreadsheets/d/【ここがID】/edit
                                    ↑
                                この部分（44文字）をコピー
```

✅ **完了の目印:** 44文字のランダムな文字列がコピーできた

❌ **トラブル:**
- **IDが44文字でない:** URLが正しくコピーされていません → もう一度URLを確認

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**進捗:** ■■■■□ ステップ 4/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Step 4: セットアップスクリプトを実行（5分）

対話的なスクリプトが設定を自動化します。

```bash
bun run setup
```

**スクリプトが質問してくる内容:**

1. **GitHub Token:** Step 2 でコピーしたトークンを貼り付け
2. **Spreadsheet ID:** Step 3 でコピーしたIDを貼り付け
3. **Repository owner:** 組織名またはユーザー名（例: `your-org`）
4. **Repository name:** リポジトリ名（例: `your-repo`）

**実行例:**
```
🚀 DevSyncGAS セットアップウィザード
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

所要時間: 10-15分（初めての場合）

ステップ 1/7: 前提条件の確認
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Bun: v1.0.0
✅ Node.js: v20.0.0
✅ git: git version 2.39.0
✅ clasp: 2.4.2

✅ すべての前提条件を満たしています！

ステップ 3/7: 設定情報の入力
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GitHub Token (ghp_...): ghp_xxxxxxxxxxxxx
Spreadsheet ID: 1a2b3c4d5e6f7g8h9i0j...
Repository owner: your-org
Repository name: your-repo

この内容でよろしいですか？ (y/N): y

✅ 設定ファイルを生成しました
...
```

**途中でブラウザが開きます:**
- Google Apps Script API の有効化確認
- clasp login の認証
- GAS実行権限の承認

すべて「許可」をクリックしてください。

✅ **完了の目印:** 「🎉 セットアップ完了！」と表示される

❌ **よくあるエラー:**

**「Apps Script API が無効です」**
→ [script.google.com/home/usersettings](https://script.google.com/home/usersettings) で API をオンに

**「clasp login が失敗する」**
→ ブラウザのポップアップブロックを無効化してから再実行

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**進捗:** ■■■■■ ステップ 5/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Step 5: データを取得（3分）

スクリプト完了後、GASエディタでデータを取得します。

#### 5.1 GASエディタを開く

```bash
clasp open
```

または、スクリプトが表示するURLをブラウザで開く。

#### 5.2 初期設定を実行

1. **関数ドロップダウン** から `initConfig` を選択
2. **実行ボタン（▶）** をクリック
3. 初回は権限承認が必要 → 「許可」をクリック

**実行後のログ（例）:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 DevSyncGAS 初期設定を開始します...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 認証方式: Personal Access Token
📊 プロジェクト数: 1

✅ Added repository: your-org/your-repo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 初期設定完了！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 次のステップ:
  1. syncAllMetrics(30) を実行してデータを取得
  2. スプレッドシートを開いて Dashboard シートを確認
```

✅ **完了の目印:** 「✅ 初期設定完了！」と表示される

#### 5.3 データを同期

1. **関数ドロップダウン** から `syncAllMetrics` を選択
2. **実行ボタン（▶）** をクリック
3. **実行完了まで 30秒〜1分 待機**（ログで進捗確認）

**実行後のログ（例）:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DevSyncGAS データ取得を開始します
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 対象期間: 過去 30 日
⏳ データ取得中です... (30秒〜1分ほどかかります)

📊 [1/7] DORA指標を取得中...
   📥 45 PRs, 120 Workflow実行, 15 デプロイメントを取得
   ✅ 1リポジトリの DORA指標を同期完了

⏱️  [2/7] サイクルタイムを取得中...
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ すべてのデータ取得が完了しました！ (42.3秒)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

✅ **完了の目印:** 「✅ すべてのデータ取得が完了しました！」と表示される

#### 5.4 スプレッドシートを確認

Step 3 で作成したスプレッドシートを開くと、以下のシートが作成されています:

| シート名 | 内容 |
|---------|------|
| 📊 **Dashboard** | 全リポジトリの指標一覧（一目で現状把握） |
| 📈 **Dashboard - Trend** | 週次トレンド（改善しているか追跡） |
| 📋 **DevOps Summary** | リポジトリ比較（どこがボトルネックか） |
| 📁 **owner/repo** | リポジトリ別の詳細データ |

**🎉 おめでとうございます！これであなたのチームのDORA指標が可視化されました。**

❌ **トラブル:**

**「データが表示されない」**
1. GASエディタで `checkConfig()` を実行して設定確認
2. ログにエラーが出ていないか確認
3. [トラブルシューティング](TROUBLESHOOTING.md)を参照

**「認証エラーが出る」**
→ GitHubトークンの有効期限・権限を確認 → 新しいトークンを発行して `initConfig()` を再実行

---

## 手動セットアップ

自分で設定ファイルを編集したい場合の手順です。

<details>
<summary><strong>📖 手動セットアップの手順を表示</strong></summary>

### Step 1: プロジェクトを準備（1分）

```bash
git clone https://github.com/your-org/dev-sync-gas.git
cd dev-sync-gas
bun install
```

### Step 2: Google Apps Scriptにデプロイ（2分）

#### 2.1 Apps Script APIを有効化

[script.google.com/home/usersettings](https://script.google.com/home/usersettings) にアクセスし、「Google Apps Script API」を**オン**にします。

#### 2.2 Googleアカウントでログイン

```bash
clasp login
```

#### 2.3 GASプロジェクトを作成

```bash
clasp create --title "DevSyncGAS" --type standalone --rootDir ./dist
```

#### 2.4 ビルド＆デプロイ

```bash
bun run push
```

### Step 3: 設定ファイルを作成（2分）

#### 3.1 テンプレートをコピー

```bash
cp src/init.simple.example.ts src/init.ts
```

#### 3.2 設定ファイルを編集

`src/init.ts` を開いて、以下の3箇所を編集:

```typescript
export const config: InitConfig = {
  auth: {
    type: 'token',
    token: 'ghp_xxxxxxxxxxxxx', // ← Step 2で取得したトークン
  },
  projects: [
    {
      name: 'My First Project',
      spreadsheet: {
        id: '1a2b3c4d5e6f7g8h9i0j...', // ← Step 3で取得したID
      },
      repositories: [
        { owner: 'your-org', name: 'your-repo' }, // ← 実際のリポジトリ名
      ],
    },
  ],
};
```

#### 3.3 再デプロイ

```bash
bun run push
```

### Step 4: 初期化＆データ取得

[自動セットアップのStep 5](#step-5-データを取得3分)と同じ手順で、GASエディタで `initConfig()` と `syncAllMetrics()` を実行してください。

</details>

---

## 運用上の注意: Issue/PR リンク

**📌 重要:** 以下の拡張指標を計測するには、チームの運用方法に前提条件があります。

### 影響を受ける指標

| 指標 | 前提条件 | 計測できない場合の表示 |
|------|---------|---------------------|
| **サイクルタイム** | Issue と PR のリンク | `null` |
| **コーディング時間** | Issue と PR のリンク | `null` |

### 必要な運用

#### 1. Issue でタスク管理

```
やると決めたタスクを GitHub Issue として作成
    ↓
すぐに着手
    ↓
PR作成時に Issue 番号をリンク
```

**重要:** Issue を「いつかやるかもしれないリスト」として寝かせる運用には合いません。

#### 2. PR 本文に Issue 番号を記載

PR を作成する際、本文に以下のいずれかを記載：

```markdown
Fixes #123
Closes #456
Resolves #789
```

**例:**
```markdown
## 概要
ユーザー認証機能を追加

## 関連Issue
Fixes #123
```

### これらの指標が不要な場合

**手戻り率、レビュー効率、PRサイズ** は PR ベースで計測できるため、Issue/PR リンクなしでも利用可能です。

詳しくは [計測思想](MEASUREMENT_PHILOSOPHY.md) を参照してください。

---

## 次のステップ

### デプロイ頻度を計測する（オプション）

現時点では、デプロイ頻度は「yearly」と表示されています。これは、GitHub上にデプロイ記録が存在しないためです。

**解決方法:** 計測対象リポジトリにデプロイ記録ワークフローを追加します（3分）。

詳しくは [デプロイ記録の設定ガイド](DEPLOYMENT_RECORDING.md) を参照してください。

### 日次自動実行を設定する

毎日自動でメトリクスを収集したい場合、トリガーを設定します:

**方法1: GAS関数で設定（推奨）**
```javascript
createDailyTrigger();  // syncAllMetricsIncremental を毎日9時に実行
```

**方法2: 手動で設定**
1. GASエディタ → 左サイドバー「トリガー」（時計アイコン）
2. 「トリガーを追加」をクリック
3. 以下を設定:
   - 実行する関数: `syncAllMetricsIncremental`
   - イベントのソース: `時間主導型`
   - 時間ベースのトリガー: `日付ベースのタイマー`
   - 時刻: `午前9時〜10時`

### もっと知る

- [計測思想を理解する](MEASUREMENT_PHILOSOPHY.md) - なぜこの指標を、この方法で測るのか
- [セットアップガイド](SETUP.md) - チームでの導入、詳細な設定方法
- [トラブルシューティング](TROUBLESHOOTING.md) - エラー解決方法
- [GitHub Apps認証](GITHUB_APPS_AUTH.md) - 組織向けのセキュアな認証方式

---

## よくある質問

### 「認証が必要です」が繰り返し表示される

一部の権限のみ許可している可能性があります。[トラブルシューティング](TROUBLESHOOTING.md) を参照してください。

### スプレッドシートにデータが出力されない

`checkConfig()` を実行して設定を確認してください:

```javascript
checkConfig();
```

### 複数のリポジトリを監視したい

**自動セットアップの場合:**

もう一度 `bun run setup` を実行すると、既存設定に追加できます（未実装の場合は手動で）。

**手動の場合:**

`src/init.ts` の `repositories` 配列に追加して、再デプロイ＆`initConfig()` を実行:

```typescript
repositories: [
  { owner: 'your-org', name: 'frontend' },
  { owner: 'your-org', name: 'backend' },
  { owner: 'your-org', name: 'api' },
],
```

```bash
bun run push  # 再デプロイ
```

その後、GASエディタで `initConfig()` を実行。

### トークンの有効期限が切れた

新しいトークンを発行して、`src/init.ts` を更新し、再デプロイ＆`initConfig()` を実行してください:

```typescript
// src/init.ts
auth: {
  type: 'token',
  token: 'ghp_新しいトークン', // ← 新しいトークンに更新
},
```

```bash
bun run push  # 再デプロイ
```

その後、GASエディタで `initConfig()` を実行します。

---

**🎉 以上でクイックスタートは完了です！困ったことがあれば、[トラブルシューティング](TROUBLESHOOTING.md)または[FAQ](FAQ.md)を参照してください。**

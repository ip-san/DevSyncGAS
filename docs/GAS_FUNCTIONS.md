# GAS関数 完全リファレンス

**📌 このドキュメントは:** DevSyncGASのGoogle Apps Script関数（グローバル関数）の**完全な詳細リファレンス**です。

**🎯 このドキュメントの役割:**
- **全GAS関数の詳細仕様** - 引数、戻り値、使用例、実行方法
- **GASエディタでの実行方法** - 引数付き関数の実行方法、ログ確認方法
- **初回セットアップ手順** - どの順序で関数を実行すればいいか

**📚 関連ドキュメント:**
- **よく使うコマンド/関数:** 日常的に使うコマンドは [CLAUDE_COMMANDS.md](../CLAUDE_COMMANDS.md) を参照
- **エラー解決:** エラーが出た場合は [TROUBLESHOOTING.md](TROUBLESHOOTING.md) を参照

**💡 使い分け:**
- よく使う関数を確認したい → [CLAUDE_COMMANDS.md](../CLAUDE_COMMANDS.md)
- 特定の関数の詳細（引数、実行方法）を知りたい → **このドキュメント**

**いつ読む？** GASエディタで「どの関数を実行すればいいか」「引数は何を渡すか」を確認したい場合。

---

## 目次

1. [初回セットアップ実行順序](#初回セットアップ実行順序)
2. [全グローバル関数一覧](#全グローバル関数一覧)
3. [GASエディタでの実行方法](#gasエディタでの実行方法)

---

## 🎯 初回セットアップ実行順序

GASエディタで以下の順序で実行してください：

```javascript
// 1. 初期設定を反映（最初の1回のみ）
initConfig()

// 2. 設定確認（問題があればエラーメッセージに従って修正）
checkConfig()

// 3. データ同期開始
syncAllMetrics(30)  // 過去30日分のデータを取得
```

**💡 Tip:** エラーが出た場合は [TROUBLESHOOTING.md](TROUBLESHOOTING.md) を参照してください。

---

## 📋 全グローバル関数一覧

### 初期設定・診断

| 関数名 | 引数 | 戻り値 | 説明 |
|--------|------|--------|------|
| `initConfig()` | なし | void | src/init.ts の設定を PropertiesService に保存（初回のみ実行） |
| `checkConfig()` | なし | void | 設定診断・検証（困ったら最初に実行、リポジトリ一覧も表示） |
| `testPermissions()` | なし | void | GitHub API権限テスト（認証トークンの有効性確認） |
| `showAuthMode()` | なし | void | 現在の認証方式を表示（"PAT" または "GitHub Apps"） |
| `listRepos()` | なし | void | 登録済みリポジトリの一覧表示（owner/repo 形式） |

**使用例:**
```javascript
// 初回セットアップ後の確認
initConfig();
checkConfig();  // ✅または❌で設定状況を確認

// 認証方式の確認
showAuthMode();  // 出力: GitHub Apps認証

// リポジトリ一覧の確認
listRepos();  // 出力: owner/repo1, owner/repo2
```

---

### データ同期（メトリクス収集）

| 関数名 | 引数 | 戻り値 | 説明 |
|--------|------|--------|------|
| `syncAllMetrics(days)` | days: 取得期間（日数） | void | 全DORA指標+拡張指標をスプレッドシートに同期 |
| `syncAllMetricsIncremental()` | なし | void | 差分更新（前回同期以降のデータのみ、定期実行用） |
| `syncAllMetricsFromScratch(days)` | days: 取得期間（日数） | void | 完全再構築（既存シートをクリアして再同期） |

**使用例:**
```javascript
// 通常のデータ更新（過去30日分）
syncAllMetrics(30);

// 長期間のデータ取得（過去90日分）
syncAllMetrics(90);

// 定期実行（トリガー設定用、前回同期以降のみ）
syncAllMetricsIncremental();

// データ不整合が起きた場合（シートをリセット）
syncAllMetricsFromScratch(30);
```

**⚠️ 注意:** `syncAllMetrics()` は API呼び出しが多いため、初回は5-10分かかることがあります。

**📊 同期される指標:**
- **DORA指標:** デプロイ頻度、リードタイム、変更障害率、MTTR
- **拡張指標:** サイクルタイム、コーディング時間、手戻り率、レビュー効率、PRサイズ

詳細: [DORA_METRICS.md](DORA_METRICS.md), [EXTENDED_METRICS.md](EXTENDED_METRICS.md)

---

### 診断ツール（メトリクス詳細調査）

| 関数名 | 引数 | 戻り値 | 説明 |
|--------|------|--------|------|
| `debugDeploymentFrequency(owner, repo, days?)` | owner: リポジトリ所有者<br>repo: リポジトリ名<br>days: 期間（省略時30日） | void | デプロイ頻度の詳細診断（なぜyearlyになるのか等） |
| `debugCycleTimeForIssue(owner, repo, issueNumber)` | owner: リポジトリ所有者<br>repo: リポジトリ名<br>issueNumber: Issue番号 | void | 特定IssueのCycle Time追跡診断 |

**使用例:**
```javascript
// デプロイ頻度が想定と違う場合の診断
debugDeploymentFrequency('myorg', 'backend-api');
// 出力例:
// デプロイ頻度: yearly（過去30日間で1回）
// デプロイ数: 1回
// 期間: 30日
// 判定基準: DORA公式（週1回未満=yearly）

// → 期間を延ばして再診断
debugDeploymentFrequency('myorg', 'backend-api', 90);

// Issue #123 のサイクルタイムが長い原因を調査
debugCycleTimeForIssue('myorg', 'frontend', 123);
// 出力例:
// Issue #123: ログイン画面のバグ修正
// Issue作成: 2024-01-01 10:00
// PR作成: 2024-01-02 14:30（28.5時間後）← コーディング時間
// マージ: 2024-01-03 09:00（18.5時間後）← レビュー時間
// サイクルタイム: 47時間
```

**💡 いつ使う？**
- スプレッドシートの値が想定と違う場合
- DORA指標が「yearly」「low」になる理由を調査したい
- 特定Issueのボトルネックを特定したい

---

### トリガー管理

| 関数名 | 引数 | 戻り値 | 説明 |
|--------|------|--------|------|
| `scheduleDailyMetricsSync()` | なし | void | syncAllMetricsIncremental() を毎日午前9時に自動実行するトリガーを作成 |

**🔗 関連関数:**
- `syncAllMetricsIncremental()` - この関数が定期実行する対象（メトリクス差分更新）

**使用例:**
```javascript
// 毎日自動でメトリクス更新するトリガーを設定
scheduleDailyMetricsSync();

// これにより、毎日午前9時に以下が自動実行される：
// → syncAllMetricsIncremental()
```

**💡 Note:**
- この関数は `syncAllMetricsIncremental()` のスケジュール設定を行う
- トリガーの時刻は `src/init.ts` で設定（デフォルト: 午前9時）
- 既存のトリガーは自動的に削除されます（重複防止）
- トリガーの確認: GASエディタの「トリガー」メニュー
- **初回セットアップ時に1回実行すればOK**（以降は自動実行される）

詳細: [SLACK_NOTIFICATIONS.md](SLACK_NOTIFICATIONS.md)

---

### Slack通知（手動テスト・トリガー実行用）

| 関数名 | 引数 | 戻り値 | 説明 |
|--------|------|--------|------|
| `sendWeeklyReport()` | なし | void | 週次レポートをSlackに送信（DORA指標+拡張指標） |
| `sendMonthlyReport()` | なし | void | 月次レポートをSlackに送信 |
| `sendIncidentDailySummary()` | なし | void | インシデント日次サマリーをSlackに送信 |
| `checkAndSendAlerts()` | なし | void | アラート条件をチェックして通知 |

**使用例:**
```javascript
// まずSlack Webhookを設定
configureSlackWebhook('https://hooks.slack.com/services/YOUR/WEBHOOK/URL');

// 設定確認
showSlackConfig();

// 週次レポートをテスト送信
sendWeeklyReport();

// 月次レポートをテスト送信
sendMonthlyReport();

// アラート通知をテスト送信（閾値超過時のみ送信）
checkAndSendAlerts();

// インシデントサマリーをテスト送信
sendIncidentDailySummary();
```

**⚠️ 注意:** これらの関数は通常トリガーで自動実行します。手動実行は動作確認用です。

**📬 通知内容:**

#### 週次レポート（sendWeeklyReport）
```
📊 週次DevOpsレポート (2026-02-08 〜 2026-02-14)

🚀 デプロイ頻度: 0.81回/日 (High)
⚡ リードタイム: 2.3時間 (Elite)
🔧 変更障害率: 5.2% (Medium)
⏱️ MTTR: 1.2時間 (Elite)

📈 拡張指標
- サイクルタイム: 18.5時間
- コーディング時間: 4.2時間
- 手戻り率: 8.3%
- レビュー効率: 2.1時間
- PRサイズ: 285行（中央値）
```

#### アラート通知（checkAndSendAlerts）
```
⚠️ DevOps指標アラート

🔴 変更障害率: 18.5% (閾値: 15%)
   → 過去7日間で4件のインシデントが発生

🔴 MTTR: 5.2時間 (閾値: 4時間)
   → 平均復旧時間が長期化しています
```

**アラート閾値:**
- リードタイム > 24時間
- 変更障害率 > 15%
- MTTR > 4時間
- デプロイ頻度 < 0.1回/日

---

### Slack設定

| 関数名 | 引数 | 戻り値 | 説明 |
|--------|------|--------|------|
| `configureSlackWebhook(webhookUrl)` | webhookUrl: Slack Webhook URL | void | Slack Webhook URLを設定 |
| `showSlackConfig()` | なし | void | Slack設定の確認（URL末尾のみ表示） |
| `removeSlackWebhook()` | なし | void | Slack Webhook URLを削除（通知無効化） |

**使用例:**
```javascript
// Webhook URLを設定
configureSlackWebhook('https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX');

// 設定確認
showSlackConfig();
// 出力: Webhook URL: ...末尾20文字...

// Slack通知を無効化
removeSlackWebhook();
```

**💡 Note:** Webhook URLの取得方法: [SLACK_NOTIFICATIONS.md](SLACK_NOTIFICATIONS.md)

---

## 🎬 GASエディタでの実行方法

### 基本的な実行手順

1. **GASエディタを開く**
   - [script.google.com](https://script.google.com) にアクセス
   - デプロイしたプロジェクトを選択

2. **関数を選択**
   - エディタ上部の「関数を選択」ドロップダウンをクリック
   - 実行したい関数名を選択（例: `checkConfig`）

3. **実行**
   - ▶（実行）ボタンをクリック
   - 初回実行時は承認画面が表示される場合があります

4. **ログを確認**
   - 表示 → ログ（または `Ctrl+Enter`）
   - 実行結果が表示されます

---

### 引数が必要な関数の実行方法

引数が必要な関数（例: `syncAllMetrics(30)`, `debugDeploymentFrequency('owner', 'repo')`）は、エディタで直接呼び出しコードを書いて実行します。

#### 方法1: 一時関数を作成

```javascript
// エディタに以下を追加
function runSyncAllMetrics() {
  syncAllMetrics(30);  // 過去30日分
}

function runDebugDeploymentFrequency() {
  debugDeploymentFrequency('myorg', 'myrepo', 90);
}

function runConfigureSlackWebhook() {
  configureSlackWebhook('https://hooks.slack.com/services/YOUR/WEBHOOK/URL');
}
```

1. 上記のコードをエディタに追加
2. 保存（`Ctrl+S`）
3. 関数ドロップダウンから `runSyncAllMetrics` を選択
4. ▶ ボタンをクリック

#### 方法2: Apps Script IDE の実行機能

GASエディタの「実行」メニューから、関数を直接実行することもできます：

```javascript
// スクリプトに直接記述
syncAllMetrics(30);
```

この場合、カーソルを関数呼び出しの行に置いて、`実行 → カーソル位置の関数を実行` を選択します。

---

### ログの確認方法

DevSyncGASは実行結果を3つの方法で出力します：

| ログ種別 | 確認方法 | 用途 |
|---------|---------|------|
| **console.log()** | 表示 → ログ（`Ctrl+Enter`） | 診断結果、エラーメッセージ |
| **Logger.log()** | 表示 → ログ（`Ctrl+Enter`） | デバッグ情報 |
| **実行ログ** | エディタ下部の「実行ログ」タブ | 実行時間、エラースタック |

**ログ出力例:**

```javascript
checkConfig();
```

実行結果:
```
=== DevSyncGAS 設定診断 ===

✅ Spreadsheet ID: 設定済み: 1234567890...
✅ GitHub認証: GitHub Apps認証
✅ リポジトリ: 3件登録済み: owner/repo1, owner/repo2, owner/repo3

✅ すべての設定が正常です。
```

---

### トラブルシューティング

#### 「関数が見つかりません」エラー

**原因:** デプロイが正しく行われていない

**解決方法:**
```bash
# ローカルで再ビルド・デプロイ
bun run push
```

#### 「認証エラー」が表示される

**原因:** 初回実行時の承認が必要

**解決方法:**
1. 実行時に表示される承認画面で「許可」をクリック
2. Googleアカウントを選択
3. 「詳細」→「安全でないページに移動」をクリック（自分のスクリプトの場合）
4. 「許可」をクリック

#### 実行が途中で止まる

**原因:** GASの実行時間制限（6分）を超えている

**解決方法:**
- `syncAllMetrics()` の期間を短くする（90日 → 30日）
- `syncAllMetricsIncremental()` を使用する（差分更新）

詳細: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 🎯 よくある実行パターン

### 初回セットアップ

```javascript
// 1. 設定を反映
initConfig()

// 2. 設定確認
checkConfig()

// 3. データ同期開始
syncAllMetrics(30)

// 4. 定期実行トリガーを設定
scheduleDailyMetricsSync()
```

---

### 日常的なメンテナンス

```javascript
// 設定確認
checkConfig()

// 手動でデータ更新
syncAllMetrics(30)

// リポジトリ一覧確認
listRepos()
```

---

### トラブルシューティング

```javascript
// 1. 設定診断
checkConfig()

// 2. GitHub API権限テスト
testPermissions()

// 3. 認証方式確認
showAuthMode()

// 4. デプロイ頻度が想定と違う場合
debugDeploymentFrequency('myorg', 'myrepo', 90)

// 5. Issueのサイクルタイムが長い場合
debugCycleTimeForIssue('myorg', 'myrepo', 123)
```

---

### Slack通知のセットアップ

```javascript
// 1. Webhook URLを設定
configureSlackWebhook('https://hooks.slack.com/services/YOUR/WEBHOOK/URL')

// 2. 設定確認
showSlackConfig()

// 3. テスト送信
sendWeeklyReport()

// 4. トリガーは init.ts で設定（詳細: SLACK_NOTIFICATIONS.md）
```

---

## 📚 関連ドキュメント

- **[CLAUDE_COMMANDS.md](../CLAUDE_COMMANDS.md)** - コマンドクイックリファレンス
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - エラー解決ガイド
- **[SLACK_NOTIFICATIONS.md](SLACK_NOTIFICATIONS.md)** - Slack通知の詳細設定
- **[DORA_METRICS.md](DORA_METRICS.md)** - DORA指標の計算方法
- **[EXTENDED_METRICS.md](EXTENDED_METRICS.md)** - 拡張指標の計算方法

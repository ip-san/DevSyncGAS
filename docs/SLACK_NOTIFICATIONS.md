# Slack通知設定ガイド

**📌 このガイドは:** DevSyncGASのメトリクスとアラートをSlackに自動通知するための設定手順です。

**いつ読む？** [クイックスタートガイド](QUICK_START.md)完了後、チームへの定期レポートやアラート通知を設定したい場合。

**所要時間:** 10分

---

## 🎯 概要

DevSyncGASは4種類のSlack通知機能を提供します：

| 通知種別 | 説明 | 実行スケジュール | 用途 |
|---------|------|----------------|------|
| **週次レポート** | DORA指標＋拡張指標の週次サマリー | 毎週月曜 9:00 | チーム定例での振り返り |
| **月次レポート** | DORA指標＋拡張指標の月次サマリー | 毎月1日 9:00 | マネジメント報告 |
| **アラート通知** | 閾値を超えた指標の警告 | 毎日 10:00 | 問題の早期発見 |
| **インシデント日次サマリー** | 変更障害率の日次レポート | 毎日 18:00 | インシデント対応の振り返り |

---

## 📋 前提条件

- ✅ DevSyncGASの基本セットアップが完了していること
- ✅ Slackワークスペースの管理者権限（Webhook URL作成のため）
- ✅ 通知を送信したいSlackチャンネルへのアクセス権

---

## 🚀 セットアップ手順

### Step 1: Slack Incoming Webhook URLを取得（5分）

#### 1.1 Slackアプリを作成

1. [Slack API](https://api.slack.com/apps)にアクセス
2. **「Create New App」**をクリック
3. **「From scratch」**を選択
4. アプリ名を入力（例: `DevSyncGAS`）
5. 通知先のワークスペースを選択
6. **「Create App」**をクリック

#### 1.2 Incoming Webhooksを有効化

1. 左サイドバーから**「Incoming Webhooks」**を選択
2. 右上のトグルを**「On」**に切り替え
3. **「Add New Webhook to Workspace」**をクリック
4. 通知を送信したいチャンネルを選択（例: `#dev-metrics`）
5. **「許可する」**をクリック

#### 1.3 Webhook URLをコピー

画面に表示される **Webhook URL** をコピーします。

```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

**⚠️ 重要:** このURLは秘密情報です。公開リポジトリにコミットしないでください。

---

### Step 2: DevSyncGASにWebhook URLを設定（1分）

GASエディタで以下の関数を実行：

```javascript
configureSlackWebhook('https://hooks.slack.com/services/YOUR/WEBHOOK/URL');
```

**実行方法:**
1. GASエディタを開く
2. 関数ドロップダウンから `configureSlackWebhook` を選択
3. コード中のURLを実際のWebhook URLに置き換え
4. 実行ボタン（▶）をクリック

**確認:**
```javascript
showSlackConfig();
// 出力: Webhook URL: https://hooks.slack.com/services/...（末尾20文字のみ表示）
```

---

### Step 3: 通知を有効化・トリガーを設定（4分）

#### 3.1 週次レポートを設定

```javascript
// トリガーを設定（毎週月曜 9:00に自動実行）
setupWeeklyReportTrigger();

// すぐにテスト送信
sendWeeklyReport();
```

**送信されるメッセージ例:**
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

#### 3.2 月次レポートを設定

```javascript
// トリガーを設定（毎月1日 9:00に自動実行）
setupMonthlyReportTrigger();

// すぐにテスト送信
sendMonthlyReport();
```

#### 3.3 アラート通知を設定

```javascript
// トリガーを設定（毎日 10:00に自動実行）
setupAlertTrigger();

// すぐにテスト送信
checkAndSendAlerts();
```

**アラート条件:**
- リードタイム > 24時間
- 変更障害率 > 15%
- MTTR > 4時間
- デプロイ頻度 < 0.1回/日

**送信されるメッセージ例:**
```
⚠️ DevOps指標アラート

🔴 変更障害率: 18.5% (閾値: 15%)
   → 過去7日間で4件のインシデントが発生

🔴 MTTR: 5.2時間 (閾値: 4時間)
   → 平均復旧時間が長期化しています
```

#### 3.4 インシデント日次サマリーを設定

```javascript
// トリガーを設定（毎日 18:00に自動実行）
setupIncidentDailySummaryTrigger();

// すぐにテスト送信
sendIncidentDailySummary();
```

---

## 🔧 管理機能

### トリガーの削除

通知を停止したい場合：

```javascript
// 週次レポートを停止
removeWeeklyReportTrigger();

// 月次レポートを停止
removeMonthlyReportTrigger();

// アラート通知を停止
removeAlertTrigger();

// インシデント日次サマリーを停止
removeIncidentDailySummaryTrigger();
```

### Webhook URLの変更

```javascript
// 新しいURLを設定
configureSlackWebhook('https://hooks.slack.com/services/NEW/WEBHOOK/URL');
```

### Webhook URLの削除

```javascript
// Slack通知を完全に無効化
removeSlackWebhook();
```

---

## 📊 通知の詳細仕様

### 週次レポート

**関数:** `sendWeeklyReport()`
**実行スケジュール:** 毎週月曜 9:00
**集計期間:** 過去7日間

**含まれる指標:**
- DORA 4指標（デプロイ頻度、リードタイム、変更障害率、MTTR）
- 拡張指標（サイクルタイム、コーディング時間、手戻り率、レビュー効率、PRサイズ）

**パフォーマンスレベル:**
- Elite（最高）
- High（高）
- Medium（中）
- Low（低）

---

### 月次レポート

**関数:** `sendMonthlyReport()`
**実行スケジュール:** 毎月1日 9:00
**集計期間:** 過去30日間

週次レポートと同じ形式で、より長期的なトレンドを把握できます。

---

### アラート通知

**関数:** `checkAndSendAlerts()`
**実行スケジュール:** 毎日 10:00
**集計期間:** 過去7日間

**アラート閾値:**

| 指標 | 閾値 | 説明 |
|------|------|------|
| リードタイム | > 24時間 | 開発速度の低下 |
| 変更障害率 | > 15% | 品質の低下 |
| MTTR | > 4時間 | 復旧時間の長期化 |
| デプロイ頻度 | < 0.1回/日 | デプロイ停滞 |

**通知条件:**
- 少なくとも1つの指標が閾値を超えた場合のみ送信
- 全指標が正常範囲内の場合は通知なし

---

### インシデント日次サマリー

**関数:** `sendIncidentDailySummary()`
**実行スケジュール:** 毎日 18:00
**集計期間:** 過去24時間

**送信条件:**
- 過去24時間以内にインシデント（revert PR）が発生した場合のみ送信
- インシデントがない場合は通知なし

**含まれる情報:**
- インシデント件数
- 変更障害率（過去7日間）
- 各インシデントの詳細（PR番号、タイトル、リンク）

---

## 🚨 トラブルシューティング

### 通知が届かない

**原因1: Webhook URLが未設定**

```javascript
showSlackConfig();
// 出力: Webhook URL: 未設定
```

**解決策:**
```javascript
configureSlackWebhook('https://hooks.slack.com/services/YOUR/WEBHOOK/URL');
```

---

**原因2: Webhook URLが無効**

エラーメッセージ例:
```
Error: Invalid Slack Webhook URL format
```

**解決策:**
- Webhook URLが `https://hooks.slack.com/services/` で始まることを確認
- SlackアプリでWebhook URLを再生成

---

**原因3: トリガーが設定されていない**

GASエディタで確認:
1. 左サイドバーから**「トリガー」**を選択
2. `sendWeeklyReport` などの関数が表示されるか確認

**解決策:**
```javascript
setupWeeklyReportTrigger();  // トリガーを再設定
```

---

**原因4: 権限エラー**

エラーメッセージ例:
```
Error: No access to PropertiesService
```

**解決策:**
1. GASエディタで `configureSlackWebhook()` を再実行
2. 権限承認ダイアログで「許可」をクリック

---

### メッセージがフォーマットされていない

**原因:** Slackチャンネルの設定でマークダウンが無効

**解決策:**
1. Slackチャンネルを開く
2. 歯車アイコン → 「設定」
3. 「メッセージのフォーマット」を有効化

---

### アラートが頻繁すぎる

**原因:** 閾値が厳しすぎる

**解決策:**
閾値はコードで変更できます（`src/functions/slackAlerts.ts`）:

```typescript
const ALERT_THRESHOLDS = {
  leadTime: 24,        // 時間（デフォルト: 24）
  changeFailureRate: 15, // %（デフォルト: 15）
  mttr: 4,            // 時間（デフォルト: 4）
  deploymentFrequency: 0.1, // 回/日（デフォルト: 0.1）
};
```

修正後、`bun run push` でデプロイしてください。

---

## 💡 活用例

### ケース1: 週次定例での振り返り

**シナリオ:**
- 毎週月曜の朝会で先週のメトリクスを確認
- 改善点を議論

**設定:**
```javascript
setupWeeklyReportTrigger();  // 月曜 9:00に自動送信
```

**活用方法:**
- Slackに届いたレポートをもとに議論
- 気になる指標があれば、スプレッドシートで詳細確認

---

### ケース2: 緊急アラート対応

**シナリオ:**
- 変更障害率が急上昇した際に即座に気づきたい
- アラートを受けて対策会議を開く

**設定:**
```javascript
setupAlertTrigger();  // 毎日 10:00にチェック
```

**活用方法:**
- アラートが届いたら、スプレッドシートで原因分析
- 該当するPR/Issueを特定して対策

---

### ケース3: 経営層への月次報告

**シナリオ:**
- 月初にマネージャー向けチャンネルへ自動送信
- データに基づく改善提案

**設定:**
```javascript
// マネージャー専用チャンネルのWebhook URLを取得
configureSlackWebhook('https://hooks.slack.com/services/MANAGER/CHANNEL/URL');
setupMonthlyReportTrigger();  // 毎月1日 9:00に自動送信
```

---

## 📚 関連情報

### 関数リファレンス

| 関数名 | 説明 | 引数 |
|-------|------|------|
| `configureSlackWebhook(url)` | Webhook URLを設定 | url: string |
| `removeSlackWebhook()` | Webhook URLを削除 | なし |
| `showSlackConfig()` | 現在の設定を表示 | なし |
| `sendWeeklyReport()` | 週次レポートを即座に送信 | なし |
| `setupWeeklyReportTrigger()` | 週次レポートのトリガーを設定 | なし |
| `removeWeeklyReportTrigger()` | 週次レポートのトリガーを削除 | なし |
| `sendMonthlyReport()` | 月次レポートを即座に送信 | なし |
| `setupMonthlyReportTrigger()` | 月次レポートのトリガーを設定 | なし |
| `removeMonthlyReportTrigger()` | 月次レポートのトリガーを削除 | なし |
| `checkAndSendAlerts()` | アラートチェック＆送信 | なし |
| `setupAlertTrigger()` | アラートのトリガーを設定 | なし |
| `removeAlertTrigger()` | アラートのトリガーを削除 | なし |
| `sendIncidentDailySummary()` | インシデントサマリーを即座に送信 | なし |
| `setupIncidentDailySummaryTrigger()` | インシデントサマリーのトリガーを設定 | なし |
| `removeIncidentDailySummaryTrigger()` | インシデントサマリーのトリガーを削除 | なし |

### 関連ドキュメント

- [QUICK_START.md](QUICK_START.md) - DevSyncGASの基本セットアップ
- [SETUP.md](SETUP.md) - 詳細なセットアップガイド
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - エラー解決方法
- [DORA_METRICS.md](DORA_METRICS.md) - DORA指標の詳細
- [EXTENDED_METRICS.md](EXTENDED_METRICS.md) - 拡張指標の詳細

---

## 📝 注意事項

### セキュリティ

- ✅ Webhook URLは `PropertiesService` に暗号化して保存されます
- ✅ `showSlackConfig()` は末尾20文字のみ表示（セキュリティ保護）
- ❌ Webhook URLをコードにハードコーディングしないでください
- ❌ 公開リポジトリにWebhook URLをコミットしないでください

### パフォーマンス

- ✅ 各通知関数は5秒以内に完了します
- ✅ GitHub APIのレート制限には影響しません（スプレッドシートから読み取るのみ）
- ⚠️ トリガーが多すぎるとGASの実行時間制限（6分）に注意

### コスト

- ✅ Slack Incoming Webhooksは完全無料
- ✅ GASの無料枠で十分動作します（1日あたり数秒の実行時間）

---

## 🎯 まとめ

DevSyncGASのSlack通知機能を活用することで：

1. **チーム全体でメトリクスを共有** - 定期レポートで自動的に可視化
2. **問題の早期発見** - アラート通知で閾値超過を即座に把握
3. **振り返りの習慣化** - インシデントサマリーで日次改善サイクル
4. **経営層への報告が簡単** - 月次レポートでデータに基づく改善提案

セットアップは10分、設定後は完全自動で動作します。ぜひ活用してください！

# 設定・実装上の考慮事項

本プロジェクトの設定方法と実装上の注意点を解説します。

## 目次

- [閾値の設定ファイル](#閾値の設定ファイル)
- [データソースの優先順位](#データソースの優先順位)
- [skipStatusFetchオプション](#skipstatusfetchオプション)
- [環境フィルタリング](#環境フィルタリング)
- [インシデントトラッキング設定](#インシデントトラッキング設定)
- [より正確なDORA Metrics計測に向けて](#より正確なdora-metrics計測に向けて)

---

## 閾値の設定ファイル

パフォーマンスレベル（Elite/High/Medium/Low）を判定する閾値は、設定ファイルに切り出されています:

```
src/config/doraThresholds.ts
```

**閾値を変更するには**:

DORAが年次レポートで閾値を更新した場合、このファイルの定数を修正してください:

```typescript
// 例: Deployment Frequency の閾値
export const DEPLOYMENT_FREQUENCY_THRESHOLDS = {
  elite: 1,      // 1日1回以上
  high: 1 / 7,   // 週1回以上
  medium: 1 / 30, // 月1回以上
} as const;
```

**パフォーマンスレベル判定関数**:

各指標のパフォーマンスレベルを取得する関数も提供しています:

```typescript
import {
  getDeploymentFrequencyLevel,
  getLeadTimeLevel,
  getChangeFailureRateLevel,
  getMTTRLevel,
} from "./config/doraThresholds";

// 使用例
const level = getLeadTimeLevel(2.5); // "high"
```

---

## データソースの優先順位

本プロジェクトでは、以下の優先順位でデータを取得します:

```
GitHub Deployments API（推奨）
    ↓ フォールバック
GitHub Actions Workflow Runs
```

GitHub Deployments APIを使用することで、より正確なデプロイ情報を取得できます。ただし、Deployments APIを使用していないプロジェクトでは、ワークフロー実行データにフォールバックします。

---

## `skipStatusFetch`オプション

デプロイメントのステータス取得はN+1クエリとなるため、パフォーマンスに影響します。

```typescript
getDeployments(repo, token, { skipStatusFetch: true })
```

`skipStatusFetch=true`に設定すると:
- API呼び出しが大幅に削減される
- すべてのデプロイの`status`が`null`になる
- Deployment Frequency, CFR, MTTRがワークフローベースのフォールバックを使用

メトリクス計算が目的の場合は`skipStatusFetch=false`（デフォルト）を推奨します。

---

## 環境フィルタリング

デプロイメントは指定された環境（デフォルト: `production`）でフィルタリングされます:

```typescript
getAllRepositoriesData(repos, token, {
  deploymentEnvironment: "production",  // または "prod", "live" など
  deploymentEnvironmentMatchMode: "exact"  // "exact" または "partial"
})
```

**マッチングモード:**
- `exact`（デフォルト）: 完全一致。GitHub APIのフィルタを使用するため高速
- `partial`: 部分一致。`production_v2`や`production-east`などにもマッチ

```typescript
// 例: "production"で始まるすべての環境を対象にする
getAllRepositoriesData(repos, token, {
  deploymentEnvironment: "production",
  deploymentEnvironmentMatchMode: "partial"  // production_v2, production-east等にもマッチ
})
```

---

## インシデントトラッキング設定

GitHub Issuesをインシデントトラッキングとして使用する場合の設定方法です。

### ラベル設定

インシデントとして認識するIssueのラベルを設定します:

```javascript
// GASエディタで実行

// 現在の設定を確認
const config = getIncidentConfig();
console.log(config);  // { labels: ["incident"], enabled: true }

// ラベルを追加
addIncidentLabel("production-bug");
addIncidentLabel("P0");

// ラベルを削除
removeIncidentLabel("incident");

// ラベルを一括設定
setIncidentConfig({
  labels: ["incident", "production-bug", "P0", "outage"]
});
```

### インシデントトラッキングの有効/無効

```javascript
// 無効化（Issueを取得しない）
disableIncidentTracking();

// 有効化
enableIncidentTracking();
```

### 推奨ラベル

チームの運用に合わせて、以下のようなラベルを使用することを推奨します:

| ラベル | 用途 |
|--------|------|
| `incident` | 一般的なインシデント |
| `production-bug` | 本番環境のバグ |
| `P0`, `P1` | 優先度別のインシデント |
| `outage` | サービス停止 |
| `hotfix` | 緊急修正 |

---

## より正確なDORA Metrics計測に向けて

本実装はGitHub APIを使用した実装です。インシデントトラッキング（GitHub Issues）を使用することで、真のDORA定義に近いMTTRを計測できます。

### 現在の実装状況

| 指標 | 実装方式 | DORA定義との一致度 |
|------|----------|-------------------|
| Deployment Frequency | GitHub Deployments/Actions | ✅ 正確 |
| Lead Time for Changes | PR + Deployments | ⚠️ 近似（時間ベースマッチング） |
| Change Failure Rate | デプロイ失敗率 | ⚠️ 近似（CI/CD失敗を測定） |
| MTTR (CI/CD方式) | デプロイ復旧時間 | ⚠️ 近似 |
| MTTR (インシデント方式) | GitHub Issues | ✅ DORA定義に近い |

### さらなる改善案

#### Change Failure Rate の改善

- **外部インシデント管理システム連携**: PagerDuty, Opsgenie, ServiceNow等
- **アラート管理**: Prometheus Alertmanager, Datadog等

#### MTTR の改善（インシデント方式以外）

- **モニタリングツール連携**: Datadog, New Relic, Grafana等
- **ステータスページ連携**: Statuspage, Atlassian等
- **オンコール管理**: PagerDuty, Opsgenie等

### GitHub Issuesを使ったインシデントトラッキングの運用

インシデント方式のMTTRを効果的に活用するためのワークフロー例:

```
1. 障害検知
   └→ アラート発報 or ユーザー報告

2. インシデントIssue作成
   └→ ラベル: "incident"
   └→ タイトル: "[障害] ログイン機能が停止"
   └→ 本文: 影響範囲、暫定対応など

3. 復旧作業
   └→ 原因調査、修正、デプロイ

4. 復旧確認・Issueクローズ
   └→ 復旧確認のコメントを追加
   └→ Issueをクローズ

→ MTTR = Issue作成からクローズまでの時間
```

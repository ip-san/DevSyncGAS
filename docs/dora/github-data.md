# GitHubから取得するデータ

本プロジェクトでは、GitHub APIから4種類のデータを取得してDORA Metricsを計算しています。

## 目次

- [1. Pull Request（プルリクエスト）](#1-pull-requestプルリクエスト)
- [2. Workflow Run（ワークフロー実行）](#2-workflow-runワークフロー実行)
- [3. Deployment（デプロイメント）](#3-deploymentデプロイメント)
- [4. Issues（インシデント）](#4-issuesインシデント)
- [データ取得の流れ](#データ取得の流れ)
- [フォールバックが発生する条件](#フォールバックが発生する条件)
- [Deploymentsの確認方法](#あなたのリポジトリでdeploymentsが使われているか確認する方法)

---

## 1. Pull Request（プルリクエスト）

**API**: `GET /repos/{owner}/{repo}/pulls`

**何を見ているか**: コードの変更履歴

PRはコードの変更をレビューしてもらうための仕組みです。以下の情報を取得しています:

| GitHub UI表示名 | APIフィールド | 説明 | 使用目的 |
|----------------|--------------|------|----------|
| （内部ID） | `id` | システム内部のID | 一意識別子 |
| **#番号**（例: #123） | `number` | PRの通し番号 | 表示用 |
| **タイトル** | `title` | PRのタイトル | 表示用 |
| **Open / Closed / Merged** | `state` | PRの状態 | マージ済みPRのフィルタリング |
| **opened this pull request on 日付** | `created_at` | PRを作成した日時 | Lead Timeのフォールバック計算 |
| **merged commit ... on 日付** | `merged_at` | PRがマージされた日時 | ⭐ **Lead Timeの起点** |
| **closed this on 日付** | `closed_at` | PRがクローズされた日時 | 情報用 |
| **作成者のアイコン・名前** | `user.login` | PRを作成したユーザー | 表示用 |

**GitHubでの確認方法**: リポジトリ → 「Pull requests」タブ → 各PRをクリック

```
┌─────────────────────────────────────────────────────────────┐
│ Pull requests                                               │
├─────────────────────────────────────────────────────────────┤
│  #123  Fix login bug                        ← number, title │
│  👤 yamada opened this on Jan 15            ← user, created │
│                                                             │
│  [Merged] ✓ merged commit abc123 on Jan 15  ← state, merged │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Workflow Run（ワークフロー実行）

**API**: `GET /repos/{owner}/{repo}/actions/runs`

**何を見ているか**: GitHub Actionsの実行履歴

GitHub Actionsで定義したCI/CDパイプラインの実行結果です:

| GitHub UI表示名 | APIフィールド | 説明 | 使用目的 |
|----------------|--------------|------|----------|
| （内部ID） | `id` | システム内部のID | 一意識別子 |
| **ワークフロー名**（左側に表示） | `name` | .github/workflows/で定義した名前 | ⭐ **デプロイ判定**（「deploy」を含むか） |
| **In progress / Queued** | `status` | 実行中の状態 | 進行中かどうかの判定 |
| **✓ / ✗ アイコン + Success/Failure** | `conclusion` | 完了後の結果 | ⭐ **成功/失敗の判定** |
| **日時**（右側に表示） | `created_at` | ワークフロー開始日時 | ⭐ **時系列分析、MTTR計算** |
| （表示なし） | `updated_at` | 最終更新日時 | 情報用 |

**GitHubでの確認方法**: リポジトリ → 「Actions」タブ

```
┌─────────────────────────────────────────────────────────────┐
│ Actions                                                     │
├─────────────────────────────────────────────────────────────┤
│ All workflows                                               │
│                                                             │
│  ✓ Deploy to Production           Jan 15, 2024  ← name     │
│    Fix login bug #123             3m 24s                    │
│    main                           ← conclusion = success    │
│                                                             │
│  ✗ Deploy to Production           Jan 14, 2024             │
│    Add new feature #122           1m 12s                    │
│    main                           ← conclusion = failure    │
└─────────────────────────────────────────────────────────────┘
```

**よくあるワークフロー名の例**:
- `Deploy to Production` ✅ デプロイとして認識
- `deploy` ✅ デプロイとして認識
- `CD - Deploy` ✅ デプロイとして認識
- `Build and Test` ❌ デプロイとして認識されない
- `CI` ❌ デプロイとして認識されない

---

## 3. Deployment（デプロイメント）

**API**: `GET /repos/{owner}/{repo}/deployments` + `GET /repos/{owner}/{repo}/deployments/{id}/statuses`

**何を見ているか**: GitHub Deploymentsの記録

GitHub Deploymentsは、特定の環境（production, staging等）へのデプロイを追跡する機能です:

| GitHub UI表示名 | APIフィールド | 説明 | 使用目的 |
|----------------|--------------|------|----------|
| （内部ID） | `id` | システム内部のID | ステータス取得に使用 |
| **コミットハッシュ**（7桁の英数字） | `sha` | デプロイしたコミットのSHA | （将来的にPRとの紐付けに使用予定） |
| **環境名**（production等） | `environment` | デプロイ先の環境名 | ⭐ **本番環境のフィルタリング** |
| **Deployed 日時** | `created_at` | デプロイが作成された日時 | ⭐ **Lead Time, MTTR計算** |
| （表示なし） | `updated_at` | 最終更新日時 | 情報用 |
| **Active / Inactive / Failure** | `status` | デプロイのステータス | ⭐ **成功/失敗の判定** |

> **注意**: `status`は別途 Deployment Statuses API から取得します。これにより追加のAPIコールが発生します。

**GitHubでの確認方法**: リポジトリ右サイドバー → 「Environments」セクション → 環境名をクリック

```
┌─────────────────────────────────────────────────────────────┐
│ リポジトリのトップページ（右サイドバー）                       │
├─────────────────────────────────────────────────────────────┤
│ Environments                                                │
│   🟢 production        ← environment = "production"         │
│   🟡 staging                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ production をクリックすると表示される画面                     │
├─────────────────────────────────────────────────────────────┤
│ Deployment history                                          │
│                                                             │
│  ✓ Active   abc1234   Deployed on Jan 15   ← status, sha   │
│             Fix login bug #123                              │
│                                                             │
│  ✗ Inactive def5678   Deployed on Jan 14                   │
│             Add feature #122                                │
└─────────────────────────────────────────────────────────────┘
```

### statusの値と各指標への影響

| 値 | 意味 | Deployment Frequency | Lead Time | CFR | MTTR |
|----|------|---------------------|-----------|-----|------|
| `success` | 成功 | ✅ カウント | ✅ 使用 | 分母に含む | 復旧として検出 |
| `failure` | 失敗 | - | - | 分母・分子に含む | 障害として検出 |
| `error` | エラー | - | - | 分母・分子に含む | 障害として検出 |
| `inactive` | 非アクティブ | - | - | 分母に含む | - |
| `in_progress` | 進行中 | - | - | 分母に含む | - |
| `queued` | 待機中 | - | - | 分母に含む | - |
| `pending` | 保留中 | - | - | 分母に含む | - |
| `null` | 取得失敗 | フォールバック | フォールバック | フォールバック | フォールバック |

> **注意**: `in_progress`や`queued`などの進行中ステータスもCFRの分母に含まれます。
> これらが多いとCFRが実際より低く見える可能性があります。

---

## 4. Issues（インシデント）

**API**: `GET /repos/{owner}/{repo}/issues?labels={labels}&state=all`

**何を見ているか**: 本番環境で発生した障害の記録

GitHub Issuesを使用して本番インシデントを追跡することで、真のDORA定義に近いMTTRを計測できます:

| GitHub UI表示名 | APIフィールド | 説明 | 使用目的 |
|----------------|--------------|------|----------|
| （内部ID） | `id` | システム内部のID | 一意識別子 |
| **#番号**（例: #456） | `number` | Issueの通し番号 | 表示用 |
| **タイトル** | `title` | Issueのタイトル | 表示用 |
| **Open / Closed** | `state` | Issueの状態 | ⭐ **未解決インシデントのカウント** |
| **opened this issue on 日付** | `created_at` | Issueが作成された日時 | ⭐ **障害検知時刻（MTTR開始点）** |
| **closed this on 日付** | `closed_at` | Issueがクローズされた日時 | ⭐ **復旧確認時刻（MTTR終了点）** |
| **ラベル**（色付きタグ） | `labels` | Issueに付けられたラベル | ⭐ **インシデント判定（フィルタ条件）** |

> **注意**: PRはIssues APIからも返される場合がありますが、`pull_request`フィールドの有無でフィルタしています。

**GitHubでの確認方法**: リポジトリ → 「Issues」タブ → ラベルでフィルタリング

```
┌─────────────────────────────────────────────────────────────┐
│ Issues                                                      │
├─────────────────────────────────────────────────────────────┤
│ Labels: incident ▼  （ラベルでフィルタリング）              │
│                                                             │
│  🔴 #456  本番環境でログイン機能が停止     ← number, title  │
│     [incident] [P0]                        ← labels         │
│     👤 suzuki opened on Jan 15             ← created_at     │
│                                                             │
│  ✓ Closed                                                  │
│  🟢 #455  決済処理でタイムアウト発生                        │
│     [incident]                                              │
│     👤 tanaka opened on Jan 14, closed on Jan 14           │
│                          └→ created_at      └→ closed_at   │
│                             (MTTR開始点)       (MTTR終了点)  │
└─────────────────────────────────────────────────────────────┘
```

**インシデントとして認識されるIssue**:
- デフォルトでは`incident`ラベルが付いたIssue
- ラベルは設定でカスタマイズ可能（例: `production-bug`, `P0`, `outage`）

**設定方法**:
```javascript
// GASエディタで実行
setIncidentConfig({ labels: ["incident", "production-bug", "P0"] });
```

---

## データ取得の流れ

### GitHubから取得する情報

| Pull Requests | Workflow Runs | Deployments | Issues |
|:--------------|:--------------|:------------|:-------|
| #番号 | ワークフロー名 ★ | コミットハッシュ | #番号 |
| タイトル | 実行状態 | 環境名 ★ | タイトル |
| Open/Closed | 結果(✓/✗) ★ | デプロイ日時 ★ | Open/Closed ★ |
| 作成日時 ★ | 開始日時 ★ | ステータス ★ | 作成日時 ★ |
| マージ日時 ★ | | | クローズ日時 ★ |
| 作成者 | | | ラベル ★ |

> ★ = メトリクス計算に直接使用される情報

### DORA Metrics の計算方法

| 指標 | 計算式 | フォールバック |
|:-----|:-------|:--------------|
| **Deployment Frequency**<br>（デプロイ頻度） | Deploymentsの成功数をカウント | Workflow名に"deploy"を含む成功数 |
| **Lead Time for Changes**<br>（変更リードタイム） | PRマージ日時 → デプロイ日時 の差分 | PR作成日時 → マージ日時 |
| **Change Failure Rate**<br>（変更失敗率） | 失敗デプロイ数 ÷ 全デプロイ数 | Workflow失敗数 ÷ 全Workflow数 |
| **MTTR - CI/CD方式**<br>（平均復旧時間） | デプロイ失敗 → 次の成功デプロイ までの時間 | Workflow失敗 → 成功 |
| **MTTR - インシデント方式** ⭐推奨<br>（平均復旧時間） | Issue作成日時 → クローズ日時 の差分 | （なし） |

---

## フォールバックが発生する条件

各指標がワークフローにフォールバックするタイミング:

| 指標 | フォールバック条件 |
|------|-------------------|
| Deployment Frequency | `status=success`のデプロイが0件の場合 |
| Lead Time | `status=success`のデプロイが0件の場合（PR作成→マージ時間を使用） |
| Change Failure Rate | `status≠null`のデプロイが0件の場合 |
| MTTR (CI/CD方式) | `status≠null`のデプロイが0件の場合 |
| MTTR (インシデント方式) | クローズ済みインシデントが0件の場合は`null` |

> **ポイント**: Deploymentsが存在しても、すべてのステータスが`null`の場合はフォールバックします。
> これは`skipStatusFetch=true`を使用した場合や、ステータス取得に失敗した場合に発生します。

> **インシデント方式のMTTR**: インシデントトラッキングが有効な場合、`incidentMetrics.mttrHours`として別途出力されます。
> CI/CD方式の`meanTimeToRecoveryHours`とは独立して計算されるため、両方の値を比較できます。

---

## あなたのリポジトリでDeploymentsが使われているか確認する方法

1. GitHubでリポジトリを開く
2. 右サイドバーの「Environments」セクションを確認
3. 「production」などの環境が表示されていれば、Deployments APIが使用されています

**Deploymentsがない場合**:
- GitHub Actionsのワークフロー実行データにフォールバックします
- ワークフロー名に「deploy」が含まれているものがデプロイとして認識されます

**Deploymentsを有効にするには**:
GitHub Actionsのワークフローで `environment` を指定します:

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # ← これを追加
    steps:
      - name: Deploy
        run: ./deploy.sh
```

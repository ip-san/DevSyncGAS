# サイクルタイム

**Issue作成からProductionマージまでの時間**を計測します。

```
Issue作成 ──────────────────→ Productionマージ
    │                              │
   着手                          完了
    └───── サイクルタイム ─────────┘
```

> なぜ「Issue作成」を起点にしているかは [計測思想](MEASUREMENT_PHILOSOPHY.md) を参照してください。

---

## 使い方

```javascript
// サイクルタイムを含む全指標を同期
syncAllMetrics();       // デフォルト: 過去30日
syncAllMetrics(90);     // 過去90日
```

### 前提条件

1. IssueとPRがリンクされている（PRのdescriptionにGitHub closing keywordを記載）
2. PRがProductionブランチにマージされている

#### GitHub closing keyword

以下のキーワードいずれでもリンクが作成されます（大文字小文字不問）：

| キーワード | 例 |
|-----------|-----|
| `close` / `closes` / `closed` | `close #123`, `Closes #123` |
| `fix` / `fixes` / `fixed` | `fix #456`, `Fixes #456` |
| `resolve` / `resolves` / `resolved` | `resolve #789`, `Resolves #789` |

DevSyncGASはキーワードを自前でパースせず、GitHubが自動生成する `CrossReferencedEvent` を読み取ります。そのためGitHubが認識するキーワードであればすべて対応しています。

---

## 出力されるシート

リポジトリごとに2つのシートが生成されます：

### 集約シート: `{owner/repo} - サイクルタイム`

**日付ごとの統計**（トレンド分析用）

| 日付 | Issue数 | 平均 (時間) | 中央値 | 最小 | 最大 | 記録日時 |
|------|---------|-------------|--------|------|------|---------|
| 2024-01-10 | 3 | 48.5 | 36.0 | 4.0 | 120.0 | 2024-01-15 12:00 |
| 2024-01-11 | 5 | 52.3 | 42.0 | 8.0 | 96.0 | 2024-01-15 12:00 |

### 詳細シート: `{owner/repo} - サイクルタイム - Details`

**Issue単位の個別レコード**（ドリルダウン調査用）

| Issue番号 | タイトル | リポジトリ | Issue作成日時 | マージ日時 | サイクルタイム (時間) | PRチェーン |
|-----------|---------|-----------|--------------|-----------|---------------------|-----------|
| #123 | Feature X | org/repo | 2024-01-10T10:00 | 2024-01-11T14:00 | 28.0 | #1→#2→#3 |
| #124 | Bug Fix | org/repo | 2024-01-10T14:00 | 2024-01-12T08:00 | 42.0 | #5→#6 |

---

## 設定

### Productionブランチパターン

ブランチ名にこのパターンが含まれていればProductionとみなします。

#### init.tsで設定（推奨）

`src/init.ts` に設定を記述して永続化できます：

```typescript
export const config: InitConfig = {
  // ... 他の設定 ...

  projects: [
    {
      name: 'My Project',
      // ... 他の設定 ...

      // Productionブランチパターン（部分一致、デフォルト: "production"）
      productionBranchPattern: 'production',
    },
  ],
};
```

設定後の適用手順：
1. `bun run push` でデプロイ
2. GASエディタで `initConfig()` を実行（設定を保存）
3. `syncAllMetrics(30)` を実行（サイクルタイムを再計算）

#### GASエディタで直接設定

```javascript
configureProductionBranch("production");  // デフォルト
configureProductionBranch("release");     // "release" ブランチを使用する場合

showProductionBranch();   // 現在の設定を確認
resetProductionBranch();  // デフォルトにリセット
```

### ラベルフィルタ

特定のラベルが付いたIssueのみを計測対象にできます。

```javascript
configureCycleTimeLabels(["feature"]);           // "feature" ラベルのみ
configureCycleTimeLabels(["feature", "bug"]);    // 複数ラベル（OR条件）

showCycleTimeLabels();          // 現在の設定を確認
resetCycleTimeLabelsConfig();   // 全Issueを対象にリセット
checkConfig();                  // 全設定を一覧表示
```

### デプロイ用PRの除外

デプロイ用PRは通常、開発プロセスが異なるため、統計を歪めることがあります。特定のbaseブランチへのマージを除外できます。

#### init.tsで設定（推奨）

`src/init.ts` に設定を記述して永続化できます：

```typescript
export const config: InitConfig = {
  // ... 他の設定 ...

  // サイクルタイム計算から除外するbaseブランチ（部分一致）
  cycleTimeExcludeBranches: ['production', 'staging'],
};
```

設定後の適用手順：
1. `bun run push` でデプロイ
2. GASエディタで `initConfig()` を実行（設定を保存）
3. `syncAllMetrics(90)` を実行（全指標を再計算）

#### GASエディタで直接設定

```javascript
// デプロイ用ブランチを除外（部分一致）
configureCycleTimeExcludeBranches(['production', 'staging']);
// → ✅ Cycle time exclude branches set to: production, staging (partial match)

// 現在の設定を確認
showCycleTimeExcludeBranches();
// → 📋 Cycle time exclude branches: production, staging (partial match)

// 設定をリセット（全Issue対象に戻す）
resetCycleTimeExcludeBranchesConfig();
// → ✅ Cycle time exclude branches reset (all issues will be included)
```

#### 部分一致による判定

ブランチ名は**部分一致**で判定されます。

---

## PRチェーン追跡

多段階マージ（feature→main→staging→production）の場合、PRチェーンを追跡してProductionマージを検出します。

```
Issue #123 作成 (着手日)
    ↓
PR1 (feature→main) ← "Fixes #123" でリンク
    ↓ マージコミットSHA
PR2 (main→staging)
    ↓ マージコミットSHA
PR3 (staging→production) ← このマージ日 = 完了日
```

最大5段階まで追跡します。

### 追跡方法

2段階の追跡戦略で次のPRを検索します：

1. **Commit SHA追跡**（優先）: マージコミットSHAを含むPRを検索
2. **ブランチフォールバック**: commit追跡が失敗した場合、baseBranch名をheadとするマージ済みPRを時系列で検索

#### ブランチフォールバックが必要なケース

squashマージやrebaseマージでは、マージコミットSHAが書き換わるため、commit SHA追跡が途切れることがあります。この場合、ブランチ名ベースのフォールバックが自動的に使用されます。

```
PR #100 (feature → master) merged 1/2
    ↓ commit追跡失敗（squashマージ）
    ↓ フォールバック: headRefName="master" のマージ済みPRを検索
PR #101 (master → staging_toyama) merged 1/3
    ↓ commit追跡失敗
    ↓ フォールバック: headRefName="staging_toyama" のマージ済みPRを検索
PR #102 (staging_toyama → production_server_toyama) merged 1/4
    ↓ baseBranch.includes("production") → 検出
サイクルタイム = Issue作成日 → 1/4
```

---

## DORA Lead Time との違い

| 指標 | 起点 | 終点 | 視点 |
|------|------|------|------|
| **サイクルタイム** | Issue作成 | Productionマージ | タスク管理 |
| Lead Time for Changes | コミット | デプロイ | CI/CDパイプライン |

```
Issue作成 ─→ コーディング ─→ PR作成 ─→ マージ ─→ Productionマージ ─→ デプロイ
    │                                                │                   │
    └───────────── サイクルタイム ──────────────────┘                   │
                                     └─────── Lead Time (DORA) ────────┘
```

---

## トラブルシューティング

### Issueが取得されない

- GitHub PAT の権限を確認（Issues: Read-only）
- `listRepos()` でリポジトリが正しく登録されているか確認
- 計測期間内にProductionマージされたIssueが存在するか確認

### DashboardのサイクルタイムがN/Aになる

N/Aの原因は主に2つです：

1. **IssueとPRが紐付いていない**（ログに `No linked PRs found`）
   - PRのdescriptionに `close #123` 等のclosing keywordが書かれているか確認
   - 対象: 上記「GitHub closing keyword」の表を参照
2. **PRチェーンがProductionに到達しない**（ログに `Could not track to production`）
   - `checkConfig()` でProductionブランチパターンを確認
   - ブランチ名がパターンに部分一致するか確認（例: パターン `production` → `production_server_toyama` はマッチ）

### サイクルタイムがnullになる

- IssueとPRがリンクされているか確認（`close #123` / `Fixes #123` など）
- PRがProductionブランチにマージされているか確認
- `checkConfig()` でブランチパターンを確認

### PRチェーンが検出されない

- 各PRがマージ済みか確認
- squashマージやrebaseマージの場合はcommit SHA追跡が途切れますが、ブランチフォールバックで自動補完されます

---

## 制約事項

- PRリンク必須（`close #123` / `Fixes #123` などでリンクされていないIssueは除外）
- PRチェーン深度: 最大5段階
- GAS実行時間制限: 6分（大量のIssueがある場合は期間を短くするか、ラベルフィルタで絞る）

---

## 参考資料

- [Microsoft Azure DevOps - Cycle Time](https://learn.microsoft.com/en-us/azure/devops/report/dashboards/cycle-time-and-lead-time)
- [Kanban Guide for Scrum Teams](https://www.scrum.org/resources/kanban-guide-scrum-teams)
- [計測思想](MEASUREMENT_PHILOSOPHY.md) - なぜIssue作成から計測するか

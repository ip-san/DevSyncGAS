# PR Cycle Time

**PR作成からPRマージまでの時間**を計測します。

```
PR作成 ──────────────────→ PRマージ
    │                       │
  開始                    完了
    └─── PR Cycle Time ────┘
```

---

## なぜ必要か

### AI駆動時代の開発フロー変化

**従来の開発フロー:**
```
Issue作成 → 設計 → 実装 → PR作成 → レビュー → マージ
```

**AI駆動開発（Claude Code等）:**
```
(Issueなし) → 即座に実装 → PR作成 → レビュー → マージ
```

- タイポ修正、ドキュメント更新
- 1行の設定変更
- 緊急のホットフィックス

→ **Issue作成のオーバーヘッドを避け、いきなりPRから始める**ケースが増加

---

## サイクルタイムとの違い

| 指標 | 起点 | 終点 | 対象 | 用途 |
|------|------|------|------|------|
| **Cycle Time** | Issue作成 | Productionマージ | Issueがあるタスク | チーム全体の開発速度 |
| **PR Cycle Time** | PR作成 | PRマージ | すべてのPR | 純粋なコードレビュー速度 |

```
Issue作成 ─→ PR作成 ─→ PRマージ ─→ Productionマージ
    │                      │                  │
    └── Cycle Time ────────┘                  │
             └── PR Cycle Time ──┘            │
```

**PR Cycle Timeは：**
- Issueの有無に関わらず全PRを計測
- レビュープロセスの効率性を直接測定
- AI駆動開発の実態を可視化

---

## 使い方

### データ取得

```javascript
// 過去30日分を取得
syncAllMetrics(30);  // PR Cycle Timeも含む

// 差分更新（定期実行用）
syncAllMetricsIncremental();
```

### 前提条件

- PRがマージされている（`merged_at`が存在）
- クローズのみ（マージなし）のPRは除外

---

## 出力されるシート

リポジトリごとに2つのシートが生成されます：

### 集計シート: `{owner/repo} - PR Cycle Time`

**日付ごとの統計**（トレンド分析用）

| 日付 | マージ済みPR数 | 平均 (時間) | 平均 (日) | 中央値 | 最小 | 最大 |
|------|---------------|-------------|----------|--------|------|------|
| 2024-01-10 | 5 | 24.5 | 1.0 | 18.0 | 2.0 | 48.0 |
| 2024-01-11 | 8 | 16.8 | 0.7 | 12.0 | 1.5 | 36.0 |

### 詳細シート: `{owner/repo} - PR Cycle Time - Details`

**PR単位の個別レコード**（ドリルダウン調査用）

| PR番号 | タイトル | PR作成日時 | PRマージ日時 | PR Cycle Time (時間) | PR Cycle Time (日) | リンクIssue | ベースブランチ |
|--------|---------|-----------|-------------|---------------------|-------------------|------------|--------------|
| #123 | Fix bug | 2024-01-10T10:00 | 2024-01-10T22:00 | 12.0 | 0.5 | #100 | main |
| #124 | Update docs | 2024-01-10T14:00 | 2024-01-10T16:00 | 2.0 | 0.1 | | main |

---

## 設定

### 除外ブランチ設定

デプロイ用PRは通常、開発プロセスが異なるため、統計を歪めることがあります。特定のbaseブランチへのマージを除外できます。

#### GASエディタで設定

```javascript
// production/stagingブランチへのPRを除外（部分一致）
configurePRCycleTimeExcludeBranches(['production', 'staging']);
// → ✅ PR Cycle Time exclude branches set to: production, staging (partial match)

// 現在の設定を確認
showPRCycleTimeExcludeBranches();
// → 📋 PR Cycle Time exclude branches: production, staging (partial match)

// 設定をリセット（全PR対象に戻す）
resetPRCycleTimeExcludeBranchesConfig();
// → ✅ PR Cycle Time exclude branches reset (all PRs will be included)
```

#### 部分一致による判定

ブランチ名は**部分一致**で判定されます。

**例:** `['production']` を設定した場合：
- ✅ 除外: `production`, `production-hotfix`, `production-v1`
- ❌ 含める: `main`, `develop`, `feature/add-production-logs`

---

## ダッシュボード表示

**Dashboard** シートの「PR Cycle Time (時間)」列で、リポジトリ別の平均値を確認できます。

他の指標と組み合わせて分析：
- **レビュー待ち時間**が長い + PR Cycle Timeが長い → レビュアー不足
- **レビュー時間**が長い + PR Cycle Timeが長い → PRサイズが大きい可能性
- **追加コミット数**が多い + PR Cycle Timeが長い → 初回コード品質に課題

---

## 分析のヒント

### 1. Issueリンク有無で比較

詳細シートの「リンクIssue」列で、IssueありPRとIssueなしPRのサイクルタイムを比較：

- IssueなしPRが短い → AI駆動の小さな修正が効率的に処理されている
- IssueなしPRが長い → 小さな修正でもレビューが滞っている

### 2. ベースブランチで比較

「ベースブランチ」列で、main/develop/feature各ブランチへのマージ時間を分析：

- feature→main が長い → メインブランチへの統合が遅い
- main→production が長い → リリースプロセスに時間がかかっている

### 3. 他指標との組み合わせ

| PR Cycle Timeの状態 | + 他の指標 | 示唆すること |
|---------------------|-----------|-------------|
| 長い | レビュー待ち時間が長い | レビュアー不足 |
| 長い | レビュー時間が長い | PRサイズが大きい、コードが複雑 |
| 長い | 追加コミット数が多い | 初回コード品質に課題 |
| 短い | Issueなし率が高い | AI駆動開発が機能している |

---

## トラブルシューティング

### PRが取得されない

- GitHub PAT の権限を確認（Pull Requests: Read-only）
- `listRepos()` でリポジトリが正しく登録されているか確認
- 計測期間内にマージされたPRが存在するか確認

### PR Cycle Timeがnullになる

- PRがマージされているか確認（`merged_at`が存在するか）
- クローズのみ（マージなし）のPRは除外されます

---

## 制約事項

- マージ済みPRのみ対象（クローズのみは除外）
- GAS実行時間制限: 6分（大量のPRがある場合は期間を短くする）

---

## 参考資料

- [Cycle Time](CYCLE_TIME.md) - Issue作成からの計測
- [Coding Time](CODING_TIME.md) - Issue作成→PR作成の計測
- [Review Efficiency](REVIEW_EFFICIENCY.md) - レビュープロセス分析
- [Measurement Philosophy](MEASUREMENT_PHILOSOPHY.md) - 計測思想

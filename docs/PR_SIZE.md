# PRサイズ（PR Size）実装ガイド

GitHubのPRデータを使用して、PRの変更規模を計測する機能の解説です。

---

## 目次

1. [概要](#概要)
2. [なぜこの指標を選んだか](#なぜこの指標を選んだか)
3. [業界標準との比較](#業界標準との比較)
4. [AI活用での活用方法](#ai活用での活用方法)
5. [計測方法](#計測方法)
6. [使い方](#使い方)
7. [出力データ](#出力データ)
8. [制約事項と将来の拡張](#制約事項と将来の拡張)
9. [出典・参考資料](#出典参考資料)

---

## 概要

### PRサイズとは

PRサイズは、プルリクエストの**変更規模**を測定する指標です。変更行数（additions + deletions）と変更ファイル数を計測します。

```
PR Size = Lines of Code + Files Changed
        = (Additions + Deletions) + Changed Files

例: +200行 / -50行 / 8ファイル変更
    → Lines of Code: 250
    → Files Changed: 8
```

### 計測する指標

| 指標 | 定義 | 意味 |
|------|------|------|
| **Lines of Code** | additions + deletions | 変更行数の合計 |
| **Files Changed** | 変更されたファイル数 | 変更の分散度 |

### なぜ計測するのか

- **レビュー容易性**: 小さいPRほどレビューしやすい
- **マージ速度**: 小さいPRほど早くマージされる傾向
- **リスク管理**: 大きなPRは障害リスクが高い
- **作業分割の評価**: タスクが適切に分割されているか

---

## なぜこの指標を選んだか

### PRサイズを選んだ理由

**1. レビュー効率との相関**
- 研究により、PRサイズとレビュー効率には明確な相関があることが証明されている
- Google社の研究では、200行以下のPRが最もレビュー効率が高い
- 大きなPRはレビューされにくく、見落としが増える

**2. AI活用の評価**
- AIは一度に大量のコードを生成する傾向がある
- PRサイズをモニタリングすることで、適切な分割ができているか確認
- 大きすぎるPRは、AIの出力を適切に分割できていない可能性を示唆

**3. シンプルで測定可能**
- GitHub APIから直接取得可能（追加のAPI呼び出し不要）
- 客観的な数値で比較可能
- チーム間・プロジェクト間で比較しやすい

### 推奨されるPRサイズ

| サイズ | Lines of Code | 評価 |
|--------|---------------|------|
| XS | ~50 | 理想的 |
| S | 51-200 | 推奨 |
| M | 201-400 | 許容範囲 |
| L | 401-800 | 注意が必要 |
| XL | 800+ | 分割を検討 |

---

## 業界標準との比較

### 研究からの知見

Googleの研究（"Modern Code Review: A Case Study at Google"）によると：

> - 平均的なPRサイズは約200行
> - レビュー効率は100行以下で最も高い
> - 400行を超えるとレビュー品質が低下する

### 他ツールでの定義

| ツール | 指標名 | 分類基準 |
|--------|--------|---------|
| GitHub | - | additions + deletions |
| LinearB | PR Size | XS/S/M/L/XL分類 |
| Code Climate | Lines Changed | 変更行数 |
| Pluralsight Flow | Commit Size | コミットあたりの変更 |

### ベストプラクティス

| 観点 | 推奨値 | 出典 |
|------|--------|------|
| Lines of Code | 200行以下 | Google |
| Files Changed | 10ファイル以下 | Industry best practice |
| Review Time | 60分以内 | Cisco研究 |

---

## AI活用での活用方法

### 期待される効果と測定

AIコーディングツール（GitHub Copilot、Claude等）を活用する場合、以下のパターンが見られることがあります：

```
パターン1: 適切な分割
──────────────────────────────────────
Lines of Code: 150
Files Changed: 5
→ レビュアーが理解しやすい
→ マージが早い
──────────────────────────────────────

パターン2: 過大なPR
──────────────────────────────────────
Lines of Code: 1500
Files Changed: 30
→ AIが一度に大量生成
→ 分割が不十分
→ レビューが困難
──────────────────────────────────────
```

### 測定の観点

| 観点 | 説明 | アクション |
|------|------|-----------|
| **平均LOCの増加** | AIで一度に多く生成 | 作業を分割してPR作成 |
| **最大LOCの監視** | 極端に大きなPR | AIの出力を複数PRに分割 |
| **ファイル数との相関** | 多くのファイル変更 | 変更範囲を限定 |

### AI活用特有の考慮事項

1. **適切な分割が重要**
   - AIは一度に大量のコードを生成できる
   - レビュー可能なサイズに分割することが重要
   - 1機能 = 1PR の原則を守る

2. **スコープの明確化**
   - AIへの指示を具体的かつ限定的に
   - 「すべてを一度に」ではなく段階的に実装

3. **継続的なモニタリング**
   - PRサイズの傾向を追跡
   - 大きなPRが増えていないか確認

---

## 計測方法

### データソース

GitHub APIから以下のデータを取得します：

| エンドポイント | 取得データ | 用途 |
|---------------|-----------|------|
| `GET /repos/{owner}/{repo}/pulls` | PR一覧 | 対象PRの取得 |
| `GET /repos/{owner}/{repo}/pulls/{number}` | PR詳細 | additions, deletions, changed_files |

### 計算式

```
Lines of Code = additions + deletions

Files Changed = changed_files
```

### 統計値

| 指標 | 説明 |
|------|------|
| 合計（Total） | 全PRの合計値 |
| 平均（Average） | 全PRの平均値 |
| 中央値（Median） | ソート後の中央の値（外れ値の影響を受けにくい） |
| 最小（Min） | 最も変更が少なかったPRの値 |
| 最大（Max） | 最も変更が多かったPRの値 |

### 他の指標との関係

```
着手 ──→ コーディング ──→ PR作成 ──→ Review ──→ Merged ──→ Deploy
                            │            │
                            └─ PR Size ──┘
                               (変更規模)
```

| 指標 | 測定対象 | 相関 |
|------|----------|------|
| **PRサイズ** | 変更規模 | レビュー効率と負の相関 |
| レビュー効率 | Ready〜Merged | PRサイズと負の相関 |
| 手戻り率 | 追加コミット | PRサイズと正の相関（大きいほど手戻り多い） |
| Lead Time | マージ〜デプロイ | PRサイズと正の相関 |

---

## 使い方

### 基本的な使い方

```javascript
// GASエディタで実行

// 過去30日間のPRサイズを計測
syncPRSize();

// 過去90日間のPRサイズを計測
syncPRSize(90);

// PR詳細をログで確認（デバッグ用）
showPRSizeDetails(30);
```

### 前提条件

**1. GitHub PAT**

```javascript
setup(
  'ghp_xxxx',           // GitHub PAT（必須）
  'spreadsheet-id'      // Google Spreadsheet ID
);

addRepo('owner', 'repo-name');
```

**2. 必要な権限**（Fine-grained PAT）

- `Pull requests`: Read-only
- `Metadata`: Read-only

---

## 出力データ

### スプレッドシート

2つのシートが作成されます：

**「PR Size」シート（サマリー）**

| Period | PR Count | LOC Total | LOC Avg | LOC Median | LOC Min | LOC Max | Files Total | Files Avg | Files Median | Files Min | Files Max | Recorded At |
|--------|----------|-----------|---------|------------|---------|---------|-------------|-----------|--------------|-----------|-----------|-------------|
| 2024-01-01〜2024-01-31 | 25 | 5000 | 200 | 150 | 10 | 800 | 125 | 5 | 4 | 1 | 20 | 2024-01-31T... |

**「PR Size - Details」シート（PR詳細）**

| PR # | Title | Repository | Created At | Merged At | Additions | Deletions | Lines of Code | Files Changed |
|------|-------|------------|------------|-----------|-----------|-----------|---------------|---------------|
| 123 | Feature X | owner/repo | 2024-01-10T... | 2024-01-11T... | 150 | 30 | 180 | 6 |

### ログ出力例

```
📏 Calculating PR Size for 30 days
   Period: 2024-01-01〜2024-01-31
📡 Fetching PRs from owner/repo...
   Found 25 merged PRs
📊 Fetching PR size data for 25 PRs...
📊 PR Size Results:
   PRs analyzed: 25
   Lines of Code: total=5000, avg=200, median=150
   Files Changed: total=125, avg=5, median=4
✅ PR Size metrics synced
```

---

## 制約事項と将来の拡張

### 現在の制約

| 制約 | 説明 | 対処法 |
|------|------|--------|
| **マージ済みPRのみ** | オープン/クローズのみのPRは対象外 | - |
| **API呼び出し回数** | PRごとに1回（詳細取得） | 期間を短くする |
| **レート制限** | GitHub API 5000回/時間 | 期間を分割 |

### 計測対象外

- オープン状態のPR
- マージされていないPR（クローズのみ）

### トラブルシューティング

| 問題 | 原因 | 対処法 |
|------|------|--------|
| 「No merged PRs found」 | 期間内にマージPRがない | 期間を広げる、`listRepos()`で確認 |
| API制限エラー | 5000回/時間超過 | 期間を短くする |
| サイズが0のPR | 空のマージ（リベースのみ等） | 正常動作 |

### 将来の拡張案

| 機能 | 説明 | 優先度 |
|------|------|--------|
| サイズ分類（XS/S/M/L/XL） | 業界標準に合わせた分類 | 高 |
| 著者別集計 | 誰が大きなPRを作りがちか | 高 |
| リポジトリ別集計 | リポジトリごとの傾向 | 中 |
| レビュー効率との相関分析 | サイズとレビュー時間の関係 | 高 |
| ファイル種類別集計 | テスト/本番コードの分離 | 低 |

---

## 出典・参考資料

### フレームワーク・研究

| # | 資料 | 説明 |
|---|------|------|
| 1 | [Modern Code Review at Google](https://research.google/pubs/pub47025/) | Google社のコードレビュー研究 |
| 2 | [SPACE Framework](https://queue.acm.org/detail.cfm?id=3454124) | Microsoft Research。開発者生産性 |
| 3 | [Best Kept Secrets of Code Review](https://smartbear.com/resources/ebooks/best-kept-secrets-of-code-review/) | Cisco研究。レビュー効率 |

### エンジニアリングメトリクスツール

| # | 資料 | 説明 |
|---|------|------|
| 4 | [LinearB - PR Size](https://linearb.io/blog/pr-size-best-practices) | PRサイズのベストプラクティス |
| 5 | [Code Climate - Lines Changed](https://docs.velocity.codeclimate.com/) | 変更行数の測定 |

### GitHub API

| # | 資料 | 説明 |
|---|------|------|
| 6 | [Pull Requests API](https://docs.github.com/en/rest/pulls/pulls) | PR一覧・詳細取得 |
| 7 | [Pull Request Object](https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request) | additions, deletions, changed_files |

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-01 | 初版作成。PRサイズ計測機能を追加 |

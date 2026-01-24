# レビュー効率（Review Efficiency）実装ガイド

GitHubのPRデータを使用して、レビュープロセスの効率を計測する機能の解説です。

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

### レビュー効率とは

レビュー効率は、PRの各ステータスにおける**滞留時間**を測定する指標です。特に**レビュー時間が長い**場合、AIが生成したコードが難解である可能性を示唆します。

```
Ready for Review ───→ First Review ───→ Approved ───→ Merged
      ↑                    ↑                ↑            ↑
      │←─ レビュー待ち時間 ─→│←─ レビュー時間 ─→│←マージ待ち→│
      │                                                    │
      └────────────────── 全体時間 ─────────────────────────┘
```

### 計測する指標

| 指標 | 定義 | 意味 |
|------|------|------|
| **レビュー待ち時間** | Ready for Review → First Review | レビュアーの応答速度 |
| **レビュー時間** | First Review → Approved | コードの理解・修正にかかる時間 |
| **マージ待ち時間** | Approved → Merged | 承認後のプロセス時間 |
| **全体時間** | Ready for Review → Merged | PR完了までの総時間 |

### なぜ計測するのか

- **AIコード品質の可視化**: レビュー時間が長い = AIコードが難解な可能性
- **ボトルネックの特定**: どのフェーズで時間がかかっているかを把握
- **プロセス改善**: レビュアー不足、承認プロセスの問題を発見
- **チーム効率の測定**: レビュー文化・速度の可視化

---

## なぜこの指標を選んだか

### PRステータス滞留時間を選んだ理由

**1. AI活用効果の直接測定**
- AIが生成したコードは、人間にとって読みにくい場合がある
- レビュー時間（First Review → Approved）が長いほど、理解に時間がかかっている
- この指標でAIコードの「理解しやすさ」を間接的に測定可能

**2. 各フェーズの分離**
- 「レビュー待ち」と「レビュー中」を分離することで原因特定が容易
- レビュー待ち時間が長い = レビュアー不足・負荷偏り
- レビュー時間が長い = コードの複雑さ・品質問題

**3. ドラフトPRの考慮**
- 「Ready for Review」イベントを起点とすることで、WIP期間を除外
- より正確なレビュープロセス時間を測定可能

### 注意すべきトレードオフ

| 観点 | 本実装 | 従来の方法（PR作成起点） |
|------|--------|------------------------|
| ドラフト期間 | ✅ 除外 | ❌ 含まれる |
| 正確性 | ✅ 高い | △ ドラフト期間に依存 |
| API呼び出し | ⚠️ 多い（Timeline API必要） | ✅ 少ない |
| 古いPR | ⚠️ 情報不足の可能性 | ✅ 常に取得可能 |

---

## 業界標準との比較

### SPACEフレームワークとの関連

レビュー効率は、Microsoft ResearchのSPACEフレームワークにおける**Efficiency and Flow（効率とフロー）** および **Collaboration and Communication（協調とコミュニケーション）** に該当します。

> "Handoffs and delays" in the development process can be measured by "wait time for code review".
>
> — [Microsoft Research - SPACE Framework](https://queue.acm.org/detail.cfm?id=3454124)

### 他ツールでの定義

| ツール | 指標名 | 定義 |
|--------|--------|------|
| LinearB | Review Time | PR作成からレビュー完了まで |
| Sleuth | Review Time | 最初のレビューから最後のレビューまで |
| Code Climate | Review Lag | レビューリクエストから最初のレビューまで |
| Pluralsight Flow | Review Time | サイクルタイム内のレビューフェーズ |

### 推奨される目標値

| 指標 | 推奨値 | 出典 |
|------|--------|------|
| Time to First Review | 4時間以内 | LinearB |
| Review Time | 24時間以内 | Industry best practice |
| **レビュー待ち時間（本実装）** | **4時間以内** | 本実装推奨 |
| **レビュー時間（本実装）** | **24時間以内** | 本実装推奨 |

---

## AI活用での活用方法

### 期待される効果と測定

AIコーディングツール（GitHub Copilot、Claude等）を活用する場合、以下のパターンが見られることがあります：

```
パターン1: AIコードが読みやすい
──────────────────────────────────────
レビュー待ち時間: 2時間
レビュー時間: 4時間     ← 短い = 理解しやすい
マージ待ち時間: 1時間
──────────────────────────────────────

パターン2: AIコードが難解
──────────────────────────────────────
レビュー待ち時間: 2時間
レビュー時間: 48時間    ← 長い = 理解に時間がかかる
マージ待ち時間: 1時間
──────────────────────────────────────
```

### 測定の観点

| 観点 | 説明 | アクション |
|------|------|-----------|
| **レビュー時間の増加** | AIコードが難解である可能性 | プロンプト改善、コード説明追加 |
| **レビュー待ち時間の増加** | レビュアー不足 | レビュー担当の分散 |
| **著者別の傾向** | 特定のエンジニアでレビュー時間が長い | AI活用スキルの向上支援 |

### AI活用特有の考慮事項

1. **コードの説明が重要**
   - AIが生成したコードにはコメントを追加することを推奨
   - PRの説明を詳細に記載することでレビュー時間短縮

2. **レビュアーへの配慮**
   - AIコードは人間が書くコードと異なるパターンを持つことがある
   - レビュアーへの事前説明が有効

3. **継続的なモニタリング**
   - AI活用度合いとレビュー時間の相関を追跡
   - 長期的な傾向を見ることが重要

---

## 計測方法

### データソース

GitHub APIから以下のデータを取得します：

| エンドポイント | 取得データ | 用途 |
|---------------|-----------|------|
| `GET /repos/{owner}/{repo}/pulls` | PR一覧 | 対象PRの取得 |
| `GET /repos/{owner}/{repo}/issues/{number}/timeline` | タイムライン | `ready_for_review`イベントの検出 |
| `GET /repos/{owner}/{repo}/pulls/{number}/reviews` | レビュー一覧 | First Review, Approvedの検出 |

### 計算式

```
レビュー待ち時間 = First Review日時 - Ready for Review日時

レビュー時間 = Approved日時 - First Review日時

マージ待ち時間 = Merged日時 - Approved日時

全体時間 = Merged日時 - Ready for Review日時
```

### Ready for Review の判定

| 条件 | 値 |
|------|-----|
| PRがドラフトから変更された | Timeline APIの`ready_for_review`イベントの日時 |
| PRが最初からドラフトでない | PR作成日時（`created_at`） |

### First Review の判定

Reviews APIから、以下の条件を満たす最初のレビューを取得：
- `state` が `APPROVED`, `CHANGES_REQUESTED`, `COMMENTED` のいずれか
- `submitted_at` が存在する

### 統計値

| 指標 | 説明 |
|------|------|
| 平均（Average） | 全PRの平均値 |
| 中央値（Median） | ソート後の中央の値（外れ値の影響を受けにくい） |
| 最小（Min） | 最も時間が短かったPRの値 |
| 最大（Max） | 最も時間がかかったPRの値 |

### 他の指標との関係

```
着手 ──→ コーディング ──→ PR作成 ──→ Ready ──→ Review ──→ Approved ──→ Merged ──→ Deploy
         │                                      │                       │
         └── Coding Time ──────────────────────→│                       │
                                               └── Review Efficiency ───┘
```

| 指標 | 測定対象 | フレームワーク |
|------|----------|---------------|
| **レビュー効率** | Ready〜Merged | SPACE (Efficiency, Collaboration) |
| 手戻り率 | PR作成後の修正 | SPACE (Efficiency) |
| コーディング時間 | 着手〜PR作成 | SPACE (Activity) |
| Lead Time for Changes | マージ〜デプロイ | DORA |

---

## 使い方

### 基本的な使い方

```javascript
// GASエディタで実行

// 過去30日間のレビュー効率を計測
syncReviewEfficiency();

// 過去90日間のレビュー効率を計測
syncReviewEfficiency(90);

// PR詳細をログで確認（デバッグ用）
showReviewEfficiencyDetails(30);
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

**「Review Efficiency」シート（サマリー）**

| Period | PR Count | Time to First Review (Avg/Median/Min/Max) | Review Duration (Avg/Median/Min/Max) | Time to Merge (Avg/Median/Min/Max) | Total Time (Avg/Median/Min/Max) | Recorded At |
|--------|----------|-------------------------------------------|--------------------------------------|-----------------------------------|--------------------------------|-------------|
| 2024-01-01〜2024-01-31 | 25 | 3.5 / 2.0 / 0.5 / 12.0 | 12.4 / 8.0 / 1.0 / 48.0 | 2.1 / 1.5 / 0.2 / 8.0 | 18.0 / 11.5 / 2.0 / 68.0 | 2024-01-31T... |

**「Review Efficiency - Details」シート（PR詳細）**

| PR # | Title | Repository | Created At | Ready For Review At | First Review At | Approved At | Merged At | Time to First Review (h) | Review Duration (h) | Time to Merge (h) | Total Time (h) |
|------|-------|------------|------------|---------------------|-----------------|-------------|-----------|--------------------------|--------------------|--------------------|----------------|
| 123 | Feature X | owner/repo | 2024-01-10T... | 2024-01-10T... | 2024-01-10T... | 2024-01-11T... | 2024-01-11T... | 2.5 | 8.0 | 1.5 | 12.0 |

### ログ出力例

```
📊 Calculating Review Efficiency for 30 days
   Period: 2024-01-01〜2024-01-31
📡 Fetching PRs from owner/repo...
   Found 25 merged PRs
📊 Fetching review data for 25 PRs...
📊 Review Efficiency Results:
   PRs analyzed: 25
   Time to First Review: avg=3.5h, median=2.0h
   Review Duration: avg=12.4h, median=8.0h
   Time to Merge: avg=2.1h, median=1.5h
   Total Time: avg=18.0h, median=11.5h
✅ Review Efficiency metrics synced
```

---

## 制約事項と将来の拡張

### 現在の制約

| 制約 | 説明 | 対処法 |
|------|------|--------|
| **マージ済みPRのみ** | オープン/クローズのみのPRは対象外 | - |
| **API呼び出し回数** | PRごとに2回（Timeline + Reviews） | 期間を短くする |
| **古いPRのTimeline** | 古いPRでは`ready_for_review`イベントがない場合あり | PR作成日時にフォールバック |
| **レート制限** | GitHub API 5000回/時間 | 期間を分割 |

### 計測対象外

- オープン状態のPR
- マージされていないPR（クローズのみ）
- レビューなしでマージされたPR（レビュー時間はnull）
- 承認なしでマージされたPR（マージ待ち時間はnull）

### トラブルシューティング

| 問題 | 原因 | 対処法 |
|------|------|--------|
| 「No merged PRs found」 | 期間内にマージPRがない | 期間を広げる、`listRepos()`で確認 |
| レビュー時間がnull | レビューなしでマージ | 正常（セルフマージなど） |
| Ready for Reviewが古い | Timeline API制限 | 古いPRでは取得不可 |
| API制限エラー | 5000回/時間超過 | 期間を短くする |
| 「Negative time」警告 | データ不整合（タイムゾーン問題等） | 通常は無視可能、頻発する場合はPRを確認 |

### 将来の拡張案

| 機能 | 説明 | 優先度 |
|------|------|--------|
| レビュアー別集計 | 誰がどれくらい時間をかけているか | 高 |
| リポジトリ別集計 | リポジトリごとの傾向分析 | 中 |
| レビューコメント数との相関 | レビュー時間とコメント数の関係 | 中 |
| 著者別集計 | 特定の著者のPRがレビュー困難かを把握 | 高 |
| ラベル別集計 | 機能追加/バグ修正別の傾向 | 低 |

---

## 出典・参考資料

### フレームワーク・研究

| # | 資料 | 説明 |
|---|------|------|
| 1 | [SPACE Framework](https://queue.acm.org/detail.cfm?id=3454124) | Microsoft Research。開発者生産性の5ディメンション |
| 2 | [DORA](https://dora.dev/) | ソフトウェアデリバリーの4 Key Metrics |
| 3 | [Accelerate](https://www.oreilly.com/library/view/accelerate/9781457191435/) | DORA研究の書籍（Forsgren, Humble, Kim） |

### エンジニアリングメトリクスツール

| # | 資料 | 説明 |
|---|------|------|
| 4 | [LinearB - Cycle Time](https://linearb.io/blog/cycle-time) | Review Timeを含むサイクルタイム解説 |
| 5 | [Sleuth - Review Time](https://www.sleuth.io/metrics/review-time) | レビュー時間の定義と測定 |
| 6 | [Code Climate - Review Lag](https://docs.velocity.codeclimate.com/en/articles/2913574) | レビュー遅延の測定 |

### GitHub API

| # | 資料 | 説明 |
|---|------|------|
| 7 | [Pull Requests API](https://docs.github.com/en/rest/pulls/pulls) | PR一覧取得 |
| 8 | [Timeline Events API](https://docs.github.com/en/rest/issues/timeline) | `ready_for_review`イベント検出 |
| 9 | [Pull Request Reviews API](https://docs.github.com/en/rest/pulls/reviews) | レビュー一覧取得 |

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-01 | 初版作成。レビュー効率計測機能を追加 |

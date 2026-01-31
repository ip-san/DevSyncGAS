# DevSyncGAS 計測思想

本ドキュメントは、DevSyncGASが採用する計測方式の設計思想と、その背景にある考え方を説明します。

---

## 目次

- [なぜこのドキュメントが必要か](#なぜこのドキュメントが必要か)
- [計測起点の選択肢](#計測起点の選択肢)
- [DevSyncGASの計測方式](#devSyncgasの計測方式)
- [公式フレームワークとの関係](#公式フレームワークとの関係)
- [前提となる開発フロー](#前提となる開発フロー)
- [AI駆動開発との相性](#ai駆動開発との相性)
- [合わないケースと代替案](#合わないケースと代替案)
- [参考資料](#参考資料)

---

## なぜこのドキュメントが必要か

DevSyncGASはサイクルタイムを「Issue作成時点」から計測します。これに対して「寝かせておくIssueの数字がおかしくなる」という懸念が生じることがあります。

この設計判断には明確な意図があり、以下の背景を理解することで、本ツールが想定する開発フローとの適合性を判断できます。

---

## 計測起点の選択肢

DevOps指標の計測起点には複数の選択肢があり、それぞれ異なる視点を持ちます。

| 起点 | 視点 | メリット | デメリット |
|------|------|----------|------------|
| **Issue作成** | 顧客・ビジネス | アイデアから価値提供までの全体時間を把握 | バックログ待機時間の影響を受ける |
| **In Progress遷移** | チーム作業 | 実作業時間に焦点を当てられる | ステータス更新の運用規律に依存 |
| **First Commit** | デリバリー | 自動計測可能、DORA標準に準拠 | 計画・設計フェーズを含まない |
| **PR作成** | コードレビュー | 明確な開始点 | コーディング時間を含まない |

**重要**: どの起点が「正解」ということはなく、チームが何を改善したいかによって適切な起点が異なります。

---

## DevSyncGASの計測方式

### 現在の計測起点

| 指標 | 起点 | 終点 |
|------|------|------|
| サイクルタイム | Issue作成 | Productionマージ |
| コーディング時間 | Issue作成 | PR作成 |
| Lead Time for Changes | First Commit | Production Deploy |

### 設計意図

DevSyncGASは「**Issue作成 = 作業開始の意思表示**」という前提に基づいています。

この前提が成立するのは、以下の開発フローを想定しているからです：

1. **イシュードリブン開発**: 「やる」と決めたものだけをIssueにする
2. **GitHub完結**: 外部ツール（Jira、Slack連携等）を不要にし、導入障壁を下げる
3. **AI駆動開発**: Issue作成から実装開始までの時間が大幅に短縮される

---

## 公式フレームワークとの関係

### DORA Metrics

[DORA](https://dora.dev/guides/dora-metrics/) は Lead Time for Changes を「**コミットからデプロイまで**」と定義しています。

> "The amount of time it takes for a change to go from committed to version control to deployed in production."

DORAがこの範囲に限定した理由は：

- 開発/DevOpsチームが**直接コントロールできる範囲**に焦点を当てる
- 機能の種類に関わらず**一貫した計測**が可能
- バックログでの待機時間やビジネス判断の遅延はチームの直接的な影響外

DevSyncGASの **Lead Time for Changes** はDORA標準に準拠しています。

### Evidence-Based Management（EBM）

[Scrum.org のEBMガイド](https://www.scrum.org/resources/evidence-based-management-guide)では、より広い視点の指標を定義しています：

| EBM指標 | 定義 |
|---------|------|
| Lead Time | アイデアが提案されてから顧客が価値を得られるまでの時間 |
| Customer Cycle Time | リリース作業開始から実際のリリースまでの時間 |
| Time-to-Learn | アイデア→構築→顧客→学習までの合計時間 |

DevSyncGASの**サイクルタイム**は、EBMの「Lead Time」に近い概念です。

### Kanban Guide for Scrum Teams

[Scrum.orgのカンバンガイド](https://www.scrum.org/resources/kanban-guide-scrum-teams)では、以下のように述べられています：

> ワークフローの「開始」と「終了」ポイントは**チーム自身が定義**する

つまり、Issue作成を「開始」とするか、In Progress遷移を「開始」とするかは**チームの選択**です。

### 4つのフローメトリクス

カンバンガイドでは以下の4指標を定義しています：

| 指標 | 定義 |
|------|------|
| **WIP** | 開始したが終了していない作業項目の数 |
| **サイクルタイム** | 作業項目が「開始」してから「終了」するまでの経過時間 |
| **スループット** | 単位時間あたりに「終了」した作業項目の数 |
| **作業項目の年齢** | 作業項目が「開始」してから現在までの経過時間 |

これらは**リトルの法則**で関連付けられています：

```
平均サイクルタイム = 平均WIP / 平均スループット
```

---

## 前提となる開発フロー

DevSyncGASは以下の開発フローを想定しています。

### イシュードリブン開発

```
議論・検討（Slack等）
    ↓ 「やる」と決定
Issue作成
    ↓ すぐに着手
PR作成
    ↓
マージ
```

**ポイント**: Issueは「バックログに積む」ためではなく「やると決めた作業を追跡する」ために作成します。

### GitHub完結の原則

外部ツールとの連携を不要にすることで：

- **導入障壁の低減**: GitHub + Google Spreadsheet だけで完結
- **データの一元化**: 計測に必要な情報がすべてGitHubに存在
- **運用コストの削減**: ステータス更新忘れなどの人的エラーを排除

### Issue-PRリンク

GitHubの標準機能でIssueとPRをリンクします：

```markdown
<!-- PRのdescription -->
Fixes #123
```

これにより、Issue作成からProductionマージまでの追跡が自動化されます。

---

## AI駆動開発との相性

### 従来の懸念

「Issue作成から計測すると、寝かせたIssueの数字が悪化する」

→ だからバックログ管理と作業開始を分離したい

### AI駆動開発がもたらす変化

AI（Claude Code、GitHub Copilot等）を活用した開発では：

| フェーズ | 従来 | AI駆動開発 |
|----------|------|-----------|
| Issue作成→設計 | 数時間〜数日 | 数分〜数時間 |
| 設計→実装開始 | 数日 | 数分 |
| 実装→PR作成 | 数日〜数週間 | 数時間〜数日 |

**結果**: 「寝かせるIssue」という概念自体が薄れます。

### DevSyncGASの位置づけ

DevSyncGASは**AI駆動開発時代のDevOps計測**を想定しています。

- Issue作成から実装開始までの時間が短縮される前提
- 「思いついたらIssue作成、すぐにAIと実装開始」というフロー
- 計測起点の問題が問題でなくなる

---

## 合わないケースと代替案

### 本ツールが合わないケース

以下の運用をしているチームには、本ツールの計測方式が合わない可能性があります：

1. **大規模バックログ運用**
   - 先にIssueを大量に作成し、優先度をつけて順次着手
   - Issue作成 ≠ 作業開始

2. **外部ツールでのタスク管理**
   - Jira、Asana等でバックログを管理
   - GitHubはコード管理のみに使用

3. **複数チーム・長期プロジェクト**
   - Issueが数週間〜数ヶ月寝ることが前提
   - 計画フェーズと実行フェーズが明確に分離

### 代替案

#### 1. ラベルフィルタの活用

「着手済み」ラベルを付けたIssueのみを計測対象にする：

```javascript
configureCycleTimeLabels(["in-progress", "started"]);
```

#### 2. Lead Time for Changesに注目

DORAのLead Time for Changes（コミット→デプロイ）はバックログ待機を含まないため、より安定した指標になります。

#### 3. 計測期間の調整

短い期間で計測することで、長期間寝ているIssueの影響を軽減：

```javascript
syncCycleTime(14);  // 過去14日間のみ
```

### 将来の拡張可能性

以下の機能は将来的に追加を検討できます：

- In Progress遷移時点からの計測オプション
- GitHub Projects連携によるステータスベースの計測
- カスタム開始点の設定

---

## 参考資料

### 公式ドキュメント

| 資料 | URL |
|------|-----|
| DORA Metrics Guide | https://dora.dev/guides/dora-metrics/ |
| State of DevOps Report 2024 | https://dora.dev/research/2024/dora-report/ |
| Evidence-Based Management Guide | https://www.scrum.org/resources/evidence-based-management-guide |
| Kanban Guide for Scrum Teams | https://www.scrum.org/resources/kanban-guide-scrum-teams |
| Professional Scrum with Kanban Glossary | https://www.scrum.org/resources/professional-scrum-kanban-glossary |
| 4 Key Flow Metrics | https://www.scrum.org/resources/blog/4-key-flow-metrics-and-how-use-them-scrums-events |
| Azure DevOps - Cycle Time and Lead Time | https://learn.microsoft.com/en-us/azure/devops/report/dashboards/cycle-time-and-lead-time |
| GitHub Flow | https://docs.github.com/get-started/quickstart/github-flow |

### 書籍

- **Accelerate: The Science of Lean Software and DevOps** - Nicole Forsgren, Jez Humble, Gene Kim
- **The Scrum Guide (2020)** - Ken Schwaber, Jeff Sutherland

### 関連ドキュメント

- [CYCLE_TIME.md](CYCLE_TIME.md) - サイクルタイム計測の技術詳細
- [CODING_TIME.md](CODING_TIME.md) - コーディング時間計測の技術詳細
- [ARCHITECTURE.md](ARCHITECTURE.md) - 全体アーキテクチャ

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-01 | 初版作成 |

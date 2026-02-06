# DevSyncGAS - アーキテクチャガイド

プロジェクトの全体設計、ディレクトリ構造、設計思想を理解するためのガイド。

---

## 🎯 プロジェクトの本質

### 何を作っているか
- GitHub複数リポジトリからDevOps指標（DORA metrics + 拡張指標）を自動収集
- Googleスプレッドシートに可視化（Dashboard、週次トレンド、チャート）
- Slack通知による定期レポート

### 技術的特徴
- **実行環境**: Google Apps Script（GAS）
- **制約**: fetch不可、UrlFetchApp使用必須、PropertiesServiceでストレージ管理
- **計測思想**: Issue作成 = 作業開始（イシュードリブン開発）
- **API戦略**: GraphQL優先（レート制限対策）
- **アーキテクチャ**: DIコンテナによる依存性注入

### 主要機能
- **DORA指標**: Deployment Frequency, Lead Time, Change Failure Rate, MTTR
- **拡張指標**: Cycle Time, Coding Time, Rework Rate, Review Efficiency, PR Size
- **出力**: リポジトリ別シート + Dashboard + 週次トレンド + チャート自動生成
- **認証**: GitHub PAT / GitHub Apps 両対応
- **通知**: Slack週次レポート、インシデント日次サマリー

---

## 🏗 ディレクトリ構造

```
src/
├── functions/       # GAS公開関数（global.* でエクスポート）
│   ├── index.ts     # メイン関数（syncDevOpsMetrics等）
│   ├── setup.ts     # 初期設定関数（initConfig等）
│   └── slack.ts     # Slack通知関数
│
├── services/        # ビジネスロジック
│   ├── github/      # GitHub API（GraphQL/REST切替可能）
│   │   ├── graphql/ # GraphQL API実装
│   │   └── rest/    # REST API実装
│   ├── metrics/     # DORA指標 + 拡張指標の計算
│   └── spreadsheet/ # スプレッドシート操作（シート生成、チャート）
│
├── core/           # コア機能
│   ├── container.ts # DIコンテナ（依存性注入）
│   └── config.ts    # 設定管理、Secret Manager
│
└── utils/          # ユーティリティ
    ├── errors.ts    # エラークラス、ErrorCode 1000-9000番台
    ├── logger.ts    # ログ管理、ログレベル制御
    └── types.ts     # 型定義
```

### 主要ディレクトリの役割

#### `src/functions/`
- GASから直接呼び出される公開関数
- `global.functionName = functionName` でエクスポート
- ユーザーがGASエディタから実行する関数を定義

#### `src/services/github/`
- GitHub API（REST/GraphQL）との通信を担当
- `graphql/` と `rest/` でAPI実装を分離
- DIコンテナで切り替え可能

#### `src/services/metrics/`
- DORA指標と拡張指標の計算ロジック
- 各指標ごとにCalculatorクラスを実装
- テスト容易性を重視した設計

#### `src/services/spreadsheet/`
- Googleスプレッドシートへのデータ書き込み
- シート生成、フォーマット、チャート自動生成

#### `src/core/`
- DIコンテナ（container.ts）
- 設定管理（config.ts）
- プロジェクトの基盤機能

---

## 🔄 データフロー

```
1. GitHub API
   ↓
2. データ取得（PR/Workflow/Issue/Deployment）
   ↓
3. メトリクス計算（DORA + 拡張指標）
   ↓
4. スプレッドシート出力（リポジトリ別シート + Dashboard）
   ↓
5. チャート自動生成
   ↓
6. Slack通知（オプション）
```

### 詳細フロー

```
syncDevOpsMetrics()
├─ 1. 設定読み込み (PropertiesService)
├─ 2. DIコンテナ初期化
│    ├─ GitHub APIクライアント（GraphQL/REST）
│    ├─ MetricsCalculator
│    └─ SpreadsheetService
│
├─ 3. データ取得（並列実行）
│    ├─ PRデータ（GraphQL: searches + details）
│    ├─ Workflowデータ（REST API）
│    ├─ Issueデータ（GraphQL）
│    └─ Deploymentデータ（REST API）
│
├─ 4. 指標計算
│    ├─ DORA指標
│    │   ├─ Deployment Frequency
│    │   ├─ Lead Time for Changes
│    │   ├─ Change Failure Rate
│    │   └─ MTTR
│    └─ 拡張指標
│        ├─ Cycle Time
│        ├─ Coding Time
│        ├─ Rework Rate
│        ├─ Review Efficiency
│        └─ PR Size
│
├─ 5. スプレッドシート出力
│    ├─ リポジトリ別シート作成/更新
│    ├─ Dashboard集計シート作成
│    ├─ 週次トレンドシート作成
│    └─ チャート自動生成
│
└─ 6. Slack通知（オプション）
     ├─ 週次レポート（月曜9時）
     └─ インシデント日次サマリー（毎日18時）
```

---

## 🧩 重要な設計判断

### 計測起点: Issue作成 = 作業開始

| テーマ | 判断内容 | 理由 |
|--------|---------|------|
| 計測起点 | Issue作成 = 作業開始 | イシュードリブン開発、AI駆動開発との相性 |

**詳細**: [MEASUREMENT_PHILOSOPHY.md](docs/MEASUREMENT_PHILOSOPHY.md)

- 従来: PR作成 = 作業開始
- DevSyncGAS: Issue作成 = 作業開始
- メリット: 計画・設計フェーズも含めた真のサイクルタイム計測

### API選択: GraphQL優先

| テーマ | 判断内容 | 理由 |
|--------|---------|------|
| API選択 | GraphQL優先（デフォルト有効） | レート制限対策（REST: 5,000/h → GraphQL: 複数データを1リクエスト） |

**詳細**: [ADR-0001](docs/adr/0001-graphql-api-default.md)

- REST API: 5,000リクエスト/時
- GraphQL API: 単一クエリで複数データ取得可能
- 複数リポジトリの同期でレート制限に達しにくい

### DIコンテナ採用

| テーマ | 判断内容 | 理由 |
|--------|---------|------|
| DI採用 | DIコンテナによる依存性注入 | GAS環境の抽象化、テスト容易性向上 |

**詳細**: [ADR-0002](docs/adr/0002-di-container-for-gas-abstraction.md)

- GAS固有API（UrlFetchApp, PropertiesService）を抽象化
- テスト時にモックに差し替え可能
- API実装（GraphQL/REST）の切り替えが容易

---

## 🔐 セキュリティ設計

### 認証情報の管理

```
PropertiesService (GAS標準のストレージ)
├─ GITHUB_TOKEN or GITHUB_PRIVATE_KEY
├─ GITHUB_INSTALLATION_ID (GitHub Apps使用時)
├─ SPREADSHEET_ID
└─ SLACK_WEBHOOK_URL (オプション)
```

**重要:**
- 機密情報はすべて PropertiesService に保存
- コードに認証情報を含めない
- エラーログに認証情報を出力しない

### エラーハンドリング

```typescript
// エラーコード体系
1000番台: 設定エラー（CONFIG_*）
2000番台: GitHub APIエラー（GITHUB_*）
3000番台: スプレッドシートエラー（SPREADSHEET_*）
4000番台: 計算エラー（CALCULATION_*）
5000番台: Slackエラー（SLACK_*）
9000番台: その他のエラー（UNKNOWN_ERROR）
```

**詳細**: [src/utils/errors.ts](src/utils/errors.ts)

---

## 📊 指標計算の設計思想

### DORA指標の実装

| 指標 | 計算方法 | データソース |
|------|---------|------------|
| Deployment Frequency | 本番デプロイ回数/期間 | GitHub Deployments API |
| Lead Time for Changes | Issue作成→本番マージの中央値 | Issue + PR + Merge時刻 |
| Change Failure Rate | インシデント関連PR / 全PR | PRラベル（incident等） |
| MTTR | インシデントIssue開始→クローズの中央値 | Issue（インシデントラベル） |

**詳細**: [DORA_METRICS.md](docs/DORA_METRICS.md)

### 拡張指標の実装

| 指標 | 計算方法 | データソース |
|------|---------|------------|
| Cycle Time | Issue作成→本番マージ | Issue + PR + Merge |
| Coding Time | Issue作成→PR作成 | Issue + PR |
| Rework Rate | 追加コミット数 / 全コミット数 | PR Commits |
| Review Efficiency | レビュー待ち時間 / 全体時間 | PR Review Events |
| PR Size | 変更行数、ファイル数の分布 | PR Diff Stats |

**詳細**: [EXTENDED_METRICS.md](docs/EXTENDED_METRICS.md)

---

## 🛠 技術スタック

### 開発環境
- **言語**: TypeScript 5.x
- **ランタイム**: Bun（開発時）、Google Apps Script（本番）
- **ビルド**: esbuild（高速バンドル）
- **デプロイ**: clasp（Google公式CLI）

### GAS制約への対応

| 制約 | 対応 |
|------|------|
| `fetch` 不可 | `UrlFetchApp.fetch` を使用 |
| モジュールシステム不可 | esbuildで単一ファイルにバンドル |
| Node.js標準ライブラリ不可 | GAS互換のユーティリティを実装 |
| ストレージ | `PropertiesService` を使用 |
| 型定義 | `@types/google-apps-script` をインストール |

### 品質管理

```bash
# 型チェック（95%以上）
bun run check:types

# 循環依存チェック
bun run check:circular

# 未使用コードチェック
bun run check:unused

# 全品質チェック
bun run check:all
```

**詳細**: [CODE_QUALITY.md](docs/CODE_QUALITY.md)

---

## 📝 コーディング原則（再掲）

### Claude Codeへの指示
- ❌ 過剰エンジニアリング禁止（要求された機能のみ実装）
- ❌ 不要な抽象化を作らない（1回限りの処理にヘルパー関数不要）
- ❌ 未使用コードは完全削除（後方互換性ハック不要）
- ✅ 既存パターンを踏襲（Grep/Readで確認）
- ✅ セキュリティ第一（機密情報露出禁止）
- ✅ GAS制約遵守（fetch禁止、UrlFetchApp使用）

---

## 🔗 関連ドキュメント

- **プロジェクト概要**: [CLAUDE.md](CLAUDE.md)
- **コマンド集**: [CLAUDE_COMMANDS.md](CLAUDE_COMMANDS.md)
- **タスクフロー**: [CLAUDE_TASKS.md](CLAUDE_TASKS.md)
- **ナビゲーション**: [CLAUDE_NAV.md](CLAUDE_NAV.md)
- **詳細設計**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **計測思想**: [docs/MEASUREMENT_PHILOSOPHY.md](docs/MEASUREMENT_PHILOSOPHY.md)

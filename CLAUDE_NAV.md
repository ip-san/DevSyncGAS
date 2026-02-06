# DevSyncGAS - ナビゲーションガイド

情報を素早く見つけるためのナビゲーションマップ。

---

## 🔍 クイックナビゲーション（キーワード検索）

### コード理解・実装
- **GitHub API実装**: [ARCHITECTURE.md](docs/ARCHITECTURE.md) - src/services/github/
- **GraphQL vs REST**: [ADR-0001](docs/adr/0001-graphql-api-default.md)
- **DORA指標計算**: [DORA_METRICS.md](docs/DORA_METRICS.md) - Deployment Frequency/Lead Time/CFR/MTTR
- **拡張指標計算**: [EXTENDED_METRICS.md](docs/EXTENDED_METRICS.md) - Cycle Time/Coding Time/Rework/Review/PR Size
- **サイクルタイム**: [CYCLE_TIME.md](docs/CYCLE_TIME.md) - Issue作成→Productionマージ
- **コーディング時間**: [CODING_TIME.md](docs/CODING_TIME.md) - Issue作成→PR作成
- **手戻り率**: [REWORK_RATE.md](docs/REWORK_RATE.md) - 追加コミット/Force Push
- **レビュー効率**: [REVIEW_EFFICIENCY.md](docs/REVIEW_EFFICIENCY.md) - レビュー待ち/レビュー時間
- **PRサイズ**: [PR_SIZE.md](docs/PR_SIZE.md) - 変更行数/ファイル数
- **スプレッドシート操作**: [ARCHITECTURE.md](docs/ARCHITECTURE.md) - src/services/spreadsheet/
- **チャート生成**: src/services/spreadsheet/charts.ts
- **DIコンテナ**: [ADR-0002](docs/adr/0002-di-container-for-gas-abstraction.md) - src/core/container.ts
- **エラーハンドリング**: src/utils/errors.ts - ErrorCode 1000-9000番台

### セットアップ・設定
- **初期設定**: [SETUP.md](docs/SETUP.md) - 認証設定、clasp、初回デプロイ
- **クイックスタート**: [QUICK_START.md](docs/QUICK_START.md) - 5分で動かす
- **GitHub Apps認証**: [GITHUB_APPS_AUTH.md](docs/GITHUB_APPS_AUTH.md) - App作成、Private Key、Installation ID
- **Slack通知**: src/functions/slack.ts - 週次レポート、インシデント日次サマリー
- **トラブルシューティング**: [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - checkConfig()、エラー解決

### 品質・保守
- **コード品質**: [CODE_QUALITY.md](docs/CODE_QUALITY.md) - check:all、循環依存、未使用コード、型カバレッジ
- **リファクタリング**: [REFACTORING_GUIDE.md](docs/REFACTORING_GUIDE.md) - 複雑度管理、リファクタリング手法
- **新指標追加**: [ADDING_METRICS.md](docs/ADDING_METRICS.md) - 指標追加の手順、チェックリスト
- **設計判断記録**: [docs/adr/](docs/adr/) - ADR作成手順

---

## 📂 ファイルパス逆引き索引

| ファイル/ディレクトリ | 関連ドキュメント | 用途 |
|---------------------|-----------------|------|
| `src/functions/` | [ARCHITECTURE.md](docs/ARCHITECTURE.md) | GAS公開関数（global.*でエクスポート） |
| `src/services/github/` | [ARCHITECTURE.md](docs/ARCHITECTURE.md) | GitHub API実装（GraphQL/REST） |
| `src/services/metrics/` | [DORA_METRICS.md](docs/DORA_METRICS.md), [EXTENDED_METRICS.md](docs/EXTENDED_METRICS.md) | DORA + 拡張指標計算ロジック |
| `src/services/spreadsheet/` | [ARCHITECTURE.md](docs/ARCHITECTURE.md) | スプレッドシート操作、シート生成 |
| `src/services/spreadsheet/charts.ts` | [ARCHITECTURE.md](docs/ARCHITECTURE.md) | チャート自動生成 |
| `src/core/container.ts` | [ADR-0002](docs/adr/0002-di-container-for-gas-abstraction.md) | DIコンテナ、依存性注入 |
| `src/core/config.ts` | [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 設定管理、Secret Manager |
| `src/utils/errors.ts` | src/utils/errors.ts | カスタムエラークラス、ErrorCode |
| `src/utils/logger.ts` | [LOGGING_GUIDELINES.md](docs/LOGGING_GUIDELINES.md) | ログ管理、ログレベル制御 |
| `src/init.ts` | [SETUP.md](docs/SETUP.md) | 初期設定ファイル |

---

## 🗂 ドキュメントマトリックス

### Claudeガイド（このプロジェクト用）
| ドキュメント | 内容 | 読むタイミング |
|-------------|------|--------------|
| [CLAUDE.md](CLAUDE.md) | プロジェクト概要、制約、よく使うコマンド | 最初に必ず読む |
| [CLAUDE_COMMANDS.md](CLAUDE_COMMANDS.md) | コマンドリファレンス、GAS関数、よくあるパターン | コマンドを探す時、日常作業で参照 |
| [CLAUDE_TASKS.md](CLAUDE_TASKS.md) | タスク別フロー（実装、バグ修正、指標追加、PR作成等） | 作業を開始する前に参照 |
| [CLAUDE_NAV.md](CLAUDE_NAV.md) | キーワード検索、ファイルパス逆引き、ドキュメント索引 | 情報を探す時（このファイル） |
| [CLAUDE_ARCH.md](CLAUDE_ARCH.md) | アーキテクチャ概要、ディレクトリ構造、設計判断 | 全体像を理解したい時 |

### セットアップ・設定
| ドキュメント | 内容 | 読むタイミング |
|-------------|------|--------------|
| [SETUP.md](docs/SETUP.md) | 初期設定、認証設定、clasp、初回デプロイ | 初回セットアップ時 |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | 診断ツール、トラブルシューティング、エラー解決 | エラー発生時 |
| [FAQ.md](docs/FAQ.md) | よくある質問 | 疑問点がある時 |
| [QUICK_START.md](docs/QUICK_START.md) | 5分で動かす手順 | 初回セットアップ時 |
| [GITHUB_APPS_AUTH.md](docs/GITHUB_APPS_AUTH.md) | GitHub App作成、Private Key、Installation ID | GitHub Apps認証を選択する場合 |

### 設計・アーキテクチャ
| ドキュメント | 内容 | 読むタイミング |
|-------------|------|--------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 全体設計、ディレクトリ構造、データフロー、技術選定 | プロジェクト全体を理解したい時 |
| [MEASUREMENT_PHILOSOPHY.md](docs/MEASUREMENT_PHILOSOPHY.md) | 計測思想、Issue起点の設計判断、イシュードリブン開発 | 計測思想を理解したい時 |
| [docs/adr/](docs/adr/) | 設計判断記録（ADR-0001: GraphQL優先、ADR-0002: DIコンテナ） | 設計判断の背景を知りたい時 |

### 機能・指標
| ドキュメント | 内容 | 読むタイミング |
|-------------|------|--------------|
| [DORA_METRICS.md](docs/DORA_METRICS.md) | DORA指標の計算方法（Deployment Frequency/Lead Time/CFR/MTTR） | DORA指標の実装を理解・修正したい時 |
| [EXTENDED_METRICS.md](docs/EXTENDED_METRICS.md) | 拡張指標の計算方法（Cycle Time/Coding Time/Rework/Review/PR Size） | 拡張指標の実装を理解・修正したい時 |
| [CYCLE_TIME.md](docs/CYCLE_TIME.md) | サイクルタイム計測（Issue作成→Productionマージ） | サイクルタイムの詳細を知りたい時 |
| [CODING_TIME.md](docs/CODING_TIME.md) | コーディング時間計測（Issue作成→PR作成） | コーディング時間の詳細を知りたい時 |
| [REWORK_RATE.md](docs/REWORK_RATE.md) | 手戻り率計測（追加コミット数/Force Push回数） | 手戻り率の詳細を知りたい時 |
| [REVIEW_EFFICIENCY.md](docs/REVIEW_EFFICIENCY.md) | レビュー効率計測（レビュー待ち時間/レビュー時間） | レビュー効率の詳細を知りたい時 |
| [PR_SIZE.md](docs/PR_SIZE.md) | PRサイズ計測（変更行数/ファイル数） | PRサイズの詳細を知りたい時 |
| [ADDING_METRICS.md](docs/ADDING_METRICS.md) | 新しい指標の追加手順、チェックリスト | 新しい指標を追加したい時 |

### 開発・保守
| ドキュメント | 内容 | 読むタイミング |
|-------------|------|--------------|
| [CODE_QUALITY.md](docs/CODE_QUALITY.md) | コード品質基準、チェックツール（循環依存、未使用コード、型カバレッジ） | コード品質を向上させたい時 |
| [REFACTORING_GUIDE.md](docs/REFACTORING_GUIDE.md) | リファクタリング手法、複雑度管理 | リファクタリングを実施したい時 |
| [LOGGING_GUIDELINES.md](docs/LOGGING_GUIDELINES.md) | ログガイドライン、ログレベル制御 | ログ実装・デバッグ時 |
| [SECURITY.md](docs/SECURITY.md) | セキュリティガイドライン | セキュリティ要件を確認したい時 |

---

## 🎯 目的別のドキュメント探索パス

### 「初めてプロジェクトに参加」
1. [CLAUDE.md](CLAUDE.md) - プロジェクト概要
2. [QUICK_START.md](docs/QUICK_START.md) - 5分で動かす
3. [SETUP.md](docs/SETUP.md) - セットアップ
4. [ARCHITECTURE.md](docs/ARCHITECTURE.md) - 全体像の理解

### 「機能を追加したい」
1. [CLAUDE_TASKS.md](CLAUDE_TASKS.md) - 新機能実装フロー
2. [CLAUDE_NAV.md](CLAUDE_NAV.md) - 関連コードの場所を探す
3. [CLAUDE_ARCH.md](CLAUDE_ARCH.md) - アーキテクチャ理解
4. [CLAUDE_COMMANDS.md](CLAUDE_COMMANDS.md) - 開発コマンド確認

### 「バグを修正したい」
1. [CLAUDE_TASKS.md](CLAUDE_TASKS.md) - バグ修正フロー
2. [CLAUDE_COMMANDS.md](CLAUDE_COMMANDS.md) - エラー調査パターン
3. [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - トラブルシューティング

### 「新しい指標を追加したい」
1. [CLAUDE_TASKS.md](CLAUDE_TASKS.md) - 新指標追加フロー
2. [ADDING_METRICS.md](docs/ADDING_METRICS.md) - 指標追加手順
3. [DORA_METRICS.md](docs/DORA_METRICS.md) / [EXTENDED_METRICS.md](docs/EXTENDED_METRICS.md) - 既存指標の実装例
4. [ARCHITECTURE.md](docs/ARCHITECTURE.md) - 指標計算の全体像

### 「コードをリファクタリングしたい」
1. [CLAUDE_TASKS.md](CLAUDE_TASKS.md) - リファクタリングフロー
2. [REFACTORING_GUIDE.md](docs/REFACTORING_GUIDE.md) - リファクタリング手法
3. [CODE_QUALITY.md](docs/CODE_QUALITY.md) - 品質基準

### 「設計判断を記録したい」
1. [docs/adr/README.md](docs/adr/README.md) - ADR作成手順
2. [docs/adr/0000-template.md](docs/adr/0000-template.md) - ADRテンプレート

---

## 🔗 外部リソース

### 公式ドキュメント
- [Google Apps Script公式](https://developers.google.com/apps-script)
- [GitHub REST API](https://docs.github.com/en/rest)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [DORA Metrics (Google Cloud)](https://cloud.google.com/architecture/devops/devops-measurement)

### 技術スタック
- [TypeScript](https://www.typescriptlang.org/)
- [Bun](https://bun.sh/)
- [esbuild](https://esbuild.github.io/)
- [clasp](https://github.com/google/clasp)

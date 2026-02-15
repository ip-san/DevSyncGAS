# DevSyncGAS - アーキテクチャガイド

プロジェクトの全体設計、ディレクトリ構造、設計思想の概要。

---

## 🎯 プロジェクト概要 & 設計思想

**何を作っているか**: GitHub複数リポジトリ → DORA metrics収集 → Googleスプレッドシート出力（GAS）

**技術的特徴**:
- **実行環境**: Google Apps Script（fetch禁止、UrlFetchApp使用）
- **計測思想**: Issue作成 = 作業開始（[MEASUREMENT_PHILOSOPHY.md](docs/MEASUREMENT_PHILOSOPHY.md)）
- **API戦略**: GraphQL優先（30倍効率化、[ADR-0001](docs/adr/0001-graphql-api-default.md)）
- **アーキテクチャ**: DIコンテナ（テスト容易性、[ADR-0002](docs/adr/0002-di-container-for-gas-abstraction.md)）

**主要機能**:
- DORA指標 + 拡張指標（9種類）
- リポジトリ別シート + Dashboard + チャート自動生成
- GitHub PAT / Apps 両対応
- Slack通知（週次・月次・インシデント）

---

## 🏗 ディレクトリ構造

```
src/
├── container.ts          # DIコンテナ
├── config/               # 設定管理
├── functions/            # GAS公開関数（global.*）
├── services/
│   ├── github/           # GitHub API（GraphQL/REST）
│   ├── spreadsheet/      # シート操作・チャート生成
│   └── migration/        # スキーママイグレーション
└── utils/metrics/        # 指標計算
```

**詳細**: [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🔄 データフロー

GitHub API → データ取得 → メトリクス計算 → スプレッドシート出力 → チャート生成 → Slack通知

**詳細**: [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🔐 セキュリティ設計

**認証情報管理**: PropertiesService（GAS標準ストレージ）
- GITHUB_TOKEN / GITHUB_PRIVATE_KEY
- GITHUB_INSTALLATION_ID（GitHub Apps使用時）
- SPREADSHEET_ID
- SLACK_WEBHOOK_URL（オプション）

**エラーコード体系**: 1000-9000番台（CONFIG/GITHUB/SPREADSHEET/CALCULATION/SLACK/UNKNOWN）

**詳細**: [src/utils/errors.ts](src/utils/errors.ts)

---

## 📊 指標計算

**DORA指標**: Deployment Frequency, Lead Time, CFR, MTTR
**拡張指標**: Cycle Time, Coding Time, Rework Rate, Review Efficiency, PR Size

**シート構造**: 拡張指標は2層構造（集約シート + 詳細シート）

**詳細**: [DORA_METRICS.md](docs/DORA_METRICS.md), [EXTENDED_METRICS.md](docs/EXTENDED_METRICS.md)

---

## 🛠 技術スタック

| 分類 | 技術 |
|------|------|
| 開発環境 | TypeScript 5.x + Bun + esbuild + clasp |
| 実行環境 | Google Apps Script |
| 制約対応 | UrlFetchApp（fetch禁止）、PropertiesService |
| 品質管理 | `bun run check:all` - 型・循環依存・未使用コード |

**詳細**: [CODE_QUALITY.md](docs/CODE_QUALITY.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 📝 コーディング原則

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
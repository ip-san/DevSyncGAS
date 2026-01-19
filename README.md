# DevSyncGAS

GitHub複数リポジトリとNotionを連携してDevOps指標（DORA metrics）をGoogleスプレッドシートに書き出すGASプロダクト。

## 機能

- 複数GitHubリポジトリからPR・デプロイメント情報を取得
- DORA 4 Key Metrics を自動計算
  - Deployment Frequency（デプロイ頻度）
  - Lead Time for Changes（変更のリードタイム）
  - Change Failure Rate（変更失敗率）
  - Mean Time to Recovery（平均復旧時間）
- Notionデータベースとの連携
- Googleスプレッドシートへの自動書き出し
- 日次トリガーによる定期実行

## セットアップ

### 1. 依存関係のインストール

```bash
bun install
```

### 2. claspのログイン

```bash
bunx clasp login
```

### 3. GASプロジェクトの作成

```bash
bunx clasp create --title "DevSyncGAS" --type standalone
```

作成後、`.clasp.json` の `scriptId` が自動で更新されます。

### 4. ビルド＆プッシュ

```bash
bun run push
```

### 5. 初期設定（GASエディタで実行）

```javascript
setup(
  'ghp_xxxx',           // GitHub Personal Access Token
  'secret_xxxx',        // Notion Integration Token
  'xxxxxxxx-xxxx-xxxx', // Notion Database ID
  'spreadsheet-id'      // Google Spreadsheet ID
);
```

### 6. リポジトリの追加

```javascript
addRepo('owner', 'repo-name');
addRepo('owner', 'another-repo');
```

### 7. トリガー設定

```javascript
createDailyTrigger(); // 毎日9時に実行
```

## 利用可能な関数

| 関数 | 説明 |
|------|------|
| `syncDevOpsMetrics()` | 手動でメトリクスを同期 |
| `createDailyTrigger()` | 日次トリガーを設定 |
| `setup(...)` | 初期設定 |
| `addRepo(owner, name)` | リポジトリを追加 |
| `removeRepo(fullName)` | リポジトリを削除 |
| `listRepos()` | 登録済みリポジトリ一覧 |
| `cleanup(days)` | 古いデータを削除 |
| `generateSummary()` | サマリーシートを作成 |

## 必要なAPIトークン

### GitHub Personal Access Token

以下のスコープが必要:
- `repo` (プライベートリポジトリの場合)
- `read:org` (組織リポジトリの場合)

### Notion Integration Token

1. https://www.notion.so/my-integrations でインテグレーションを作成
2. 対象データベースにインテグレーションを追加

## ディレクトリ構成

```
DevSyncGAS/
├── src/
│   ├── main.ts           # エントリーポイント
│   ├── config/
│   │   └── settings.ts   # 設定管理
│   ├── services/
│   │   ├── github.ts     # GitHub API
│   │   ├── notion.ts     # Notion API
│   │   └── spreadsheet.ts # スプレッドシート操作
│   ├── types/
│   │   └── index.ts      # 型定義
│   └── utils/
│       └── metrics.ts    # 指標計算
├── dist/                 # ビルド出力
├── tests/                # テスト
├── package.json
├── tsconfig.json
├── esbuild.config.ts
└── .clasp.json
```

## 開発

```bash
# ビルドのみ
bun run build

# ビルド＆プッシュ
bun run push

# テスト
bun test

# リント
bun run lint
```

## License

MIT

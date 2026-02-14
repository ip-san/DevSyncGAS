# プロジェクト中心の設定ガイド

**作成日**: 2026-02-07
**バージョン**: 2.0

---

## 概要

DevSyncGASは、プロジェクトごとに設定をグループ化する**プロジェクト中心の設定構造**を採用しています。

この構造により、以下のメリットが得られます：

- ✅ **直感的な構造**: プロジェクト → スプレッドシート → リポジトリの階層が明確
- ✅ **設定の一元化**: プロジェクトごとに設定が1箇所にまとまる
- ✅ **スケーラビリティ**: 複数プロジェクトの管理が容易
- ✅ **柔軟性**: プロジェクトごとに異なる除外設定が可能

---

## 基本構造

```typescript
export const config = {
  auth: { ... },        // 認証設定（全プロジェクト共通）
  projects: [           // プロジェクト一覧
    {
      name: 'プロジェクト名',
      spreadsheet: { ... },
      repositories: [ ... ],
      excludeBranches: { ... },
      deployWorkflowPatterns: [ ... ],
    },
    // 複数プロジェクト対応
  ],
}
```

---

## 設定例

### 単一プロジェクトの場合

```typescript
import type { InitConfig } from './config/initializer';

export const config: InitConfig = {
  // 認証設定
  auth: {
    type: 'github-app',
    appId: 'YOUR_APP_ID',
    installationId: 'YOUR_INSTALLATION_ID',
    privateKey: `-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----`,
  },

  // プロジェクト設定
  projects: [
    {
      name: 'My Project',

      // 出力先スプレッドシート
      spreadsheet: {
        id: 'YOUR_SPREADSHEET_ID',
        sheetName: 'DevOps Metrics',  // 省略可
      },

      // 監視対象リポジトリ
      repositories: [
        { owner: 'your-org', name: 'repo1' },
        { owner: 'your-org', name: 'repo2' },
      ],

      // 除外ブランチ設定（省略可）
      excludeBranches: {
        prSize: ['production', 'staging'],
        reviewEfficiency: ['production', 'staging'],
        cycleTime: ['production', 'staging'],
        codingTime: ['production', 'staging'],
        reworkRate: ['production', 'staging'],
      },

      // デプロイワークフローパターン（省略可）
      deployWorkflowPatterns: ['deploy', 'release'],
    },
  ],
};
```

### 複数プロジェクトの場合

```typescript
export const config: InitConfig = {
  auth: {
    type: 'github-app',
    appId: 'YOUR_APP_ID',
    installationId: 'YOUR_INSTALLATION_ID',
    privateKey: `...`,
  },

  projects: [
    // プロジェクトA
    {
      name: 'Project A',
      spreadsheet: {
        id: 'SPREADSHEET_ID_A',
        sheetName: 'DevOps Metrics',
      },
      repositories: [
        { owner: 'org-a', name: 'repo-a1' },
        { owner: 'org-a', name: 'repo-a2' },
      ],
      excludeBranches: {
        prSize: ['production'],
        reviewEfficiency: ['production'],
      },
    },

    // プロジェクトB（異なる設定）
    {
      name: 'Project B',
      spreadsheet: {
        id: 'SPREADSHEET_ID_B',
        sheetName: 'Metrics Dashboard',
      },
      repositories: [
        { owner: 'org-b', name: 'repo-b1' },
      ],
      excludeBranches: {
        prSize: ['main', 'develop'],
        cycleTime: ['main'],
      },
      deployWorkflowPatterns: ['cd-pipeline'],
    },
  ],
};
```

---

## 設定項目の詳細

### 1. 認証設定 (auth)

**全プロジェクト共通**の認証設定です。

#### GitHub Apps認証（推奨）

```typescript
auth: {
  type: 'github-app',
  appId: 'YOUR_APP_ID',
  installationId: 'YOUR_INSTALLATION_ID',
  privateKey: `-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----`,
}
```

#### Personal Access Token認証

```typescript
auth: {
  type: 'token',
  token: 'ghp_xxxxxxxxxxxxx',
}
```

### 2. プロジェクト設定 (projects)

各プロジェクトは以下の項目を持ちます：

#### name（必須）

プロジェクトの識別名です。ログ出力に使用されます。

```typescript
name: 'My Project'
```

#### spreadsheet（必須）

このプロジェクトの出力先スプレッドシート設定です。

```typescript
spreadsheet: {
  id: '1vm07kWKJvIBhJo-bgDkcEt7v6scDtyMosDbZsiAvbkw',  // 必須
  sheetName: 'DevOps Metrics',  // 省略可（デフォルト: 'DevOps Metrics'）
}
```

#### repositories（必須）

このプロジェクトに含まれるリポジトリの一覧です。

```typescript
repositories: [
  { owner: 'your-org', name: 'your-repo' },
  { owner: 'your-org', name: 'another-repo' },
]
```

#### excludeBranches（省略可）

指標計算から除外するブランチを指定します（**部分一致**）。

```typescript
excludeBranches: {
  prSize: ['production', 'staging'],           // PRサイズ計算から除外
  reviewEfficiency: ['production', 'staging'], // レビュー効率計算から除外
  cycleTime: ['production', 'staging'],        // サイクルタイム計算から除外
  codingTime: ['production', 'staging'],       // コーディング時間計算から除外
  reworkRate: ['production', 'staging'],       // 手戻り率計算から除外
}
```

**例**: `prSize: ['production']` を設定すると、以下のブランチが除外されます：
- `production`
- `production-hotfix`
- `pre-production`

#### deployWorkflowPatterns（省略可）

デプロイワークフローを識別するパターンを指定します（**部分一致**）。

```typescript
deployWorkflowPatterns: ['deploy', 'release', 'cd-pipeline']
```

**例**: `['deploy']` を設定すると、以下のワークフローが該当します：
- `deploy-production.yml`
- `auto-deploy.yml`
- `deployment-pipeline.yml`

---

## 初期化手順

### 1. 設定ファイルの編集

[src/init.ts](../src/init.ts) を編集します。

```typescript
export const config: InitConfig = {
  auth: { ... },
  projects: [ ... ],
};
```

### 2. デプロイ

```bash
bun run push
```

### 3. GASエディタで初期化関数を実行

GASエディタで `initConfig` 関数を実行します。

ログ出力例：

```
🚀 Starting initialization...
🔐 Auth mode: GitHub App
📊 Projects count: 1

📦 Initializing project: My Project
✅ Configuration saved (GitHub App auth)
✅ Added repository: your-org/your-repo
✅ PR size exclude branches: production, staging (partial match)
✅ Review efficiency exclude branches: production, staging (partial match)
✅ Cycle time exclude branches: production, staging (partial match)
✅ Coding time exclude branches: production, staging (partial match)
✅ Rework rate exclude branches: production, staging (partial match)
✅ Deploy workflow patterns: deploy (partial match)
✅ Project "My Project" initialized

✅ 初期設定完了
```

### 4. 機密情報の削除

設定完了後、`src/init.ts` から機密情報（Private Key、Token）を削除してOKです。
PropertiesServiceに保存済みのため、再実行時も動作します。

---

## 後方互換性

旧形式の設定（スプレッドシートとリポジトリを直接指定する形式）も引き続きサポートされます。

### 旧形式の例

```typescript
export const config: LegacyInitConfig = {
  auth: { ... },
  spreadsheet: { id: '...', sheetName: '...' },
  repositories: [ ... ],
  prSizeExcludeBranches: [ ... ],
  reviewEfficiencyExcludeBranches: [ ... ],
  // ...
};
```

旧形式の設定は、内部で自動的に新形式に変換されます：

- プロジェクト名: `'Default Project'`
- その他の設定はすべて引き継がれます

---

## よくある質問

### Q1. 複数プロジェクトで同じリポジトリを監視できますか？

**A**: いいえ、推奨しません。同一リポジトリを複数プロジェクトで監視すると、データが重複します。

### Q2. プロジェクトごとに異なる認証情報を使用できますか？

**A**: 現在はサポートしていません。認証設定は全プロジェクト共通です。

### Q3. スプレッドシートは必ずプロジェクトごとに分ける必要がありますか？

**A**: いいえ、同じスプレッドシートIDを複数プロジェクトで指定することも可能です。ただし、シート名を変えることを推奨します。

### Q4. 除外設定を後から変更できますか？

**A**: はい、`src/init.ts` を編集して `bun run push` → `initConfig` を再実行してください。

---

## トラブルシューティング

### 設定が反映されない

1. `bun run push` でデプロイしたか確認
2. GASエディタで `initConfig` を実行したか確認
3. `checkConfig()` を実行して設定内容を確認

```javascript
checkConfig()
```

### 型エラーが出る

TypeScriptの型チェックを実行して、設定の構造が正しいか確認してください。

```bash
bunx tsc --noEmit
```

---

## 関連ドキュメント

- [CLAUDE_COMMANDS.md](../CLAUDE_COMMANDS.md) - コマンドリファレンス
- [QUICK_START.md](./QUICK_START.md) - クイックスタートガイド
- [AUTHENTICATION.md](./AUTHENTICATION.md) - 認証設定の詳細

---

**最終更新**: 2026-02-07

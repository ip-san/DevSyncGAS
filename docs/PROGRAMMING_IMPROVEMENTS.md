# プログラミング改善計画

このドキュメントは、v1.0.0リリース後の次のサイクルで対応するプログラミング的な改善点をまとめています。

**作成日**: 2026-02-01
**対象バージョン**: v1.1.0以降

---

## 改善点の優先度分類

### 高優先度（v1.1.0で対応）

#### 1. 型安全性の向上

**ファイル**: `src/adapters/gas/index.ts:54`
```typescript
// 現状: 危険な2重キャスト
(gasOptions as unknown as { muteHttpExceptions: boolean }).muteHttpExceptions = true;

// 改善案
const gasOptionsWithMute: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions &
  { muteHttpExceptions?: boolean } = gasOptions;
gasOptionsWithMute.muteHttpExceptions = true;
```

**影響範囲**: 小
**期待効果**: TypeScriptの型チェック機能が正常に動作し、実行時エラーを防止

---

#### 2. エラーログの記録

**ファイル**: `src/adapters/gas/index.ts:90`
```typescript
// 現状: エラーを黙って無視
try {
  data = JSON.parse(content) as T;
} catch {
  // JSONでない場合はundefined
}

// 改善案
try {
  data = JSON.parse(content) as T;
} catch (error) {
  const { logger } = getContainer();
  logger.log(`⚠️ Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
}
```

**影響範囲**: 小
**期待効果**: デバッグ時の問題特定が容易になる

---

#### 3. 設定取得関数の重複削除

**ファイル**: `src/config/settings.ts:461-533`
```typescript
// 現状: 同じパターンが複数回
export function getCycleTimeIssueLabels(): string[] {
  const { storageClient } = getContainer();
  const json = storageClient.getProperty('CYCLE_TIME_ISSUE_LABELS');
  if (!json) return [];
  return JSON.parse(json) as string[];
}

export function getCodingTimeIssueLabels(): string[] {
  const { storageClient } = getContainer();
  const json = storageClient.getProperty('CODING_TIME_ISSUE_LABELS');
  if (!json) return [];
  return JSON.parse(json) as string[];
}

// 改善案: 汎用化
function getPropertyAsStringArray(key: string): string[] {
  const { storageClient } = getContainer();
  const json = storageClient.getProperty(key);
  if (!json) return [];

  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed;
    }
  } catch (error) {
    logger.log(`⚠️ Failed to parse ${key}: ${error}`);
  }

  return [];
}

export function getCycleTimeIssueLabels(): string[] {
  return getPropertyAsStringArray('CYCLE_TIME_ISSUE_LABELS');
}

export function getCodingTimeIssueLabels(): string[] {
  return getPropertyAsStringArray('CODING_TIME_ISSUE_LABELS');
}
```

**影響範囲**: 中（複数の設定関数に影響）
**期待効果**: コードの重複削減、安全性向上

---

#### 4. 変数名の改善

**ファイル**: `src/services/spreadsheet/metricsSummary.ts:75`
```typescript
// 現状: 曖昧な名前
for (const summary of aggregated.repositorySummaries) {
  rows.push([...]);
}

// 改善案
const summaryRows: (string | number)[][] = [];
for (const summary of aggregated.repositorySummaries) {
  summaryRows.push([...]);
}
```

**影響範囲**: 小
**期待効果**: コードの可読性向上

---

### 中優先度（v1.2.0で対応）

#### 5. settings.ts の分割

**現状**: `src/config/settings.ts` が732行・40+関数を含む

**改善案**: カテゴリ別にファイル分割
```
src/config/
  ├── settings.ts          # メインインターフェース（再エクスポート）
  ├── github.ts            # GitHub認証・API設定
  ├── spreadsheet.ts       # スプレッドシート設定
  ├── metrics.ts           # メトリクス設定
  └── labels.ts            # ラベル設定
```

**影響範囲**: 大（既存の全インポート文に影響）
**期待効果**: 保守性の向上、モジュール境界の明確化

---

#### 6. PR処理の共通化

**現状**: REST版とGraphQL版で重複したロジック

**ファイル**:
- `src/services/github/pullRequests.ts:208-325`
- `src/services/github/graphql/pullRequests.ts:219-372`

**改善案**: 共通ユーティリティ関数の作成
```typescript
// src/utils/prGrouping.ts
export function groupPRsByRepository(
  pullRequests: GitHubPullRequest[]
): Map<string, GitHubPullRequest[]> {
  const grouped = new Map<string, GitHubPullRequest[]>();

  for (const pr of pullRequests) {
    const existing = grouped.get(pr.repository) ?? [];
    existing.push(pr);
    grouped.set(pr.repository, existing);
  }

  return grouped;
}
```

**影響範囲**: 中
**期待効果**: コードの重複削減、バグ修正の一元化

---

#### 7. バッチ処理の統一

**現状**: REST版は1PR = 複数リクエスト、GraphQL版はバッチ処理済み

**改善案**: GraphQL版への完全移行を推奨（REST版の廃止）

**影響範囲**: 中
**期待効果**: パフォーマンス向上、API呼び出し回数削減

---

#### 8. エラーログ形式の統一

**現状**: ファイルごとに異なるログ形式

**改善案**: エラーログユーティリティの作成
```typescript
// src/utils/errorLogger.ts
export function logApiError(context: string, error: string): void {
  const { logger } = getContainer();
  logger.log(`⚠️ [${context}] ${error}`);
}

export function logParseError(resource: string, error: string): void {
  const { logger } = getContainer();
  logger.log(`⚠️ Failed to parse ${resource}: ${error}`);
}
```

**影響範囲**: 中
**期待効果**: ログの一貫性向上、検索性の向上

---

### 低優先度（将来のリファクタリング）

#### 9. 依存性注入パターンの導入

**現状**: `getContainer()` へのグローバル依存（52回以上）

**改善案**: 関数の引数として依存を渡す
```typescript
// 現状
export function getCycleTimeData(repositories, token, options = {}) {
  const { logger } = getContainer();  // グローバル依存
}

// 改善案
export function getCycleTimeData(
  repositories,
  token,
  options = {},
  dependencies = getDefaultDependencies()
) {
  const { logger } = dependencies;
}
```

**影響範囲**: 大（ほぼ全ファイルに影響）
**期待効果**: テスタビリティの向上、モック化が容易に

---

#### 10. ドメイン別メトリクス計算の分離

**現状**: `src/utils/metrics/extended.ts` に全メトリクス計算が含まれる

**改善案**: ドメイン別にファイル分割
```
src/utils/metrics/
  ├── cycleTime.ts
  ├── codingTime.ts
  ├── reworkRate.ts
  ├── reviewEfficiency.ts
  └── prSize.ts
```

**影響範囲**: 中
**期待効果**: 関心の分離、保守性の向上

---

#### 11. 循環依存のチェック

**対象**: `src/services/spreadsheet/` 配下

**改善案**: CI/CDに `bun run check:circular` を追加

**影響範囲**: 小
**期待効果**: 循環依存の早期検出

---

#### 12. Strategy パターンの導入（API層）

**現状**: REST版とGraphQL版の切り替えロジックが分散

**改善案**: Strategy パターンで統一
```typescript
interface GitHubAPIStrategy {
  getPullRequests(...): ApiResponse<GitHubPullRequest[]>;
  getDeployments(...): ApiResponse<GitHubDeployment[]>;
}

class GraphQLStrategy implements GitHubAPIStrategy { ... }
class RESTStrategy implements GitHubAPIStrategy { ... }

class GitHubAPIFactory {
  static create(mode: 'graphql' | 'rest'): GitHubAPIStrategy { ... }
}
```

**影響範囲**: 大
**期待効果**: アーキテクチャの明確化、拡張性の向上

---

## 全改善項目リスト（55項目）

以下は完全なチェックリストです：

### 1. コードの重複
- [ ] 設定取得関数の汎用化 (`getPropertyAsStringArray()`)
- [ ] PR処理の共通化 (`groupPRsByRepository()`)
- [ ] ストレージキーの一元管理

### 2. 型安全性
- [ ] `as unknown as` の削除 (gas/index.ts:54)
- [ ] タイプガード関数の実装 (`isStringArray()`)
- [ ] 不要な型アサーションの削除 (graphql/deployments.ts:157)
- [ ] 安全なJSONパーサーの使用 (`safeParseJSON()`)

### 3. エラーハンドリング
- [ ] catch ブロックのログ記録 (gas/index.ts:90)
- [ ] エラー検査の明確化 (pullRequests.ts:216-220)
- [ ] エラーログ形式の統一

### 4. 関数の複雑度と長さ
- [ ] `migrateSheetSchema()` の分割
- [ ] 深いネストの Early return 化 (graphql/pullRequests.ts:271-317)
- [ ] `settings.ts` のファイル分割

### 5. ネーミング
- [ ] `rows` → `summaryRows` (metricsSummary.ts:75)
- [ ] `[owner, repo]` → `[repositoryOwner, repositoryName]`
- [ ] `calculateStats()` の具体化

### 6. 未使用コード
- [ ] `groupBy()` ユーティリティの作成
- [ ] 不要な条件分岐の削除 (gas/index.ts:53-55)

### 7. パフォーマンス
- [ ] バッチ処理の統一（GraphQL版への移行）
- [ ] `reduce()` によるワンパス処理 (dashboard.ts:87-104)
- [ ] Date オブジェクトのキャッシュ (dora.ts:83-94)

### 8. テスタビリティ
- [ ] 依存性注入パターンの導入
- [ ] `IssuesFetcher` インターフェースの作成
- [ ] `SheetWriter` インターフェースの作成

### 9. 依存関係
- [ ] 循環依存のチェック（CI追加）
- [ ] 設定とビジネスロジックの分離
- [ ] コンテナ初期化の自動確認

### 10. アーキテクチャ
- [ ] メトリクス計算のドメイン別分離
- [ ] 設定キーの統一フォーマット化
- [ ] Strategy パターンの導入（API層）
- [ ] ページネーションの拡張
- [ ] スキーマとTypeScript型の一元管理（zod検討）

---

## 実施タイムライン

| バージョン | 対応項目 | 期間目安 |
|-----------|---------|---------|
| v1.1.0 | 高優先度4項目 | 1-2週間 |
| v1.2.0 | 中優先度4項目 | 2-3週間 |
| v2.0.0 | 低優先度（アーキテクチャ変更含む） | 1-2ヶ月 |

---

## 参考資料

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 現在のアーキテクチャ
- [CODE_QUALITY.md](./CODE_QUALITY.md) - コード品質基準
- [docs/adr/](./adr/) - 設計判断の記録

---

**Note**: このドキュメントはv1.0.0リリース時に作成されました。各改善項目の実施時には、ADR（Architecture Decision Record）として記録することを推奨します。

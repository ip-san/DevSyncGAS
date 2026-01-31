# 新しい指標を追加する

本ドキュメントは、DevSyncGASに新しい指標を追加する際の手順を説明します。

---

## 概要

新しい指標の追加には、以下のファイルを変更します：

| # | ファイル | 内容 |
|---|----------|------|
| 1 | `src/types/metrics.ts` | 指標の型定義 |
| 2 | `src/schemas/index.ts` | スプレッドシートのスキーマ定義 |
| 3 | `src/utils/metrics/extended.ts` | 計算ロジック |
| 4 | `src/utils/metrics/index.ts` | エクスポート追加 |
| 5 | `src/services/spreadsheet/xxx.ts` | スプレッドシート書き出し |
| 6 | `src/services/spreadsheet/index.ts` | エクスポート追加 |
| 7 | `src/functions/extendedMetrics.ts` | GASエントリーポイント関数 |
| 8 | `src/main.ts` | グローバル関数エクスポート |
| 9 | `tests/unit/xxx.test.ts` | ユニットテスト |
| 10 | `docs/XXX.md` | 指標の説明ドキュメント |

---

## 1. 型定義を追加（`src/types/metrics.ts`）

### 1.1 詳細データの型

個別アイテム（PR、Issue等）のデータ型を定義します。

```typescript
/**
 * 個別PRの〇〇データ
 */
export interface PRXxxData {
  /** PR番号 */
  prNumber: number;
  /** PRタイトル */
  title: string;
  /** リポジトリ */
  repository: string;
  /** PR作成日時 */
  createdAt: string;
  /** 計測値 */
  value: number;
}
```

### 1.2 指標サマリーの型

集計結果の型を定義します。

```typescript
/**
 * 〇〇指標
 * [この指標が何を測定するか説明]
 */
export interface XxxMetrics {
  /** 計測期間 */
  period: string;
  /** 対象PR数 */
  prCount: number;
  /** 平均値 */
  avgValue: number | null;
  /** 中央値 */
  medianValue: number | null;
  /** 最小値 */
  minValue: number | null;
  /** 最大値 */
  maxValue: number | null;
  /** 詳細データ */
  prDetails: PRXxxData[];
}
```

### 命名規則

- 詳細データ型: `PR{Name}Data` または `Issue{Name}Detail`
- サマリー型: `{Name}Metrics`
- null許容: 計算できない場合（データ不足等）は `number | null`

---

## 2. スキーマ定義を追加（`src/schemas/index.ts`）

スプレッドシートの列構造を定義します。

```typescript
export const XXX_SCHEMA: SheetSchema = {
  version: '1.0.0',
  sheetName: '〇〇指標',
  columns: [
    { id: 'period', header: '期間', type: 'string' },
    { id: 'count', header: '件数', type: 'number', numberFormat: '#,##0' },
    { id: 'avgValue', header: '平均値', type: 'number', numberFormat: '#,##0.0' },
    { id: 'medianValue', header: '中央値', type: 'number', numberFormat: '#,##0.0' },
    { id: 'recordedAt', header: '記録日時', type: 'date' },
  ],
};

export const XXX_DETAIL_SCHEMA: SheetSchema = {
  version: '1.0.0',
  sheetName: '〇〇指標 - Details',
  columns: [
    { id: 'prNumber', header: 'PR番号', type: 'number' },
    { id: 'title', header: 'タイトル', type: 'string' },
    { id: 'repository', header: 'リポジトリ', type: 'string' },
    { id: 'createdAt', header: '作成日時', type: 'date' },
    { id: 'value', header: '計測値', type: 'number', numberFormat: '#,##0.0' },
  ],
};
```

### カラム定義のルール

- `id`: 内部識別子（英数字、キャメルケース、**変更不可**）
- `header`: 表示名（日本語、変更可能）
- `type`: `'string'` | `'number'` | `'date'`
- `numberFormat`: 数値フォーマット（例: `'#,##0.0'`、`'#,##0%'`）
- `defaultValue`: マイグレーション時のデフォルト値

---

## 3. 計算ロジックを追加（`src/utils/metrics/extended.ts`）

### 3.1 計算関数

```typescript
/**
 * 〇〇指標を計算
 *
 * [計算方法の説明]
 */
export function calculateXxx(
  data: PRXxxRawData[],
  period: string
): XxxMetrics {
  if (data.length === 0) {
    return {
      period,
      prCount: 0,
      avgValue: null,
      medianValue: null,
      minValue: null,
      maxValue: null,
      prDetails: [],
    };
  }

  const values = data.map(d => d.value);
  const stats = calculateStats(values);

  const prDetails: PRXxxData[] = data.map(d => ({
    prNumber: d.prNumber,
    title: d.title,
    repository: d.repository,
    createdAt: d.createdAt,
    value: d.value,
  }));

  return {
    period,
    prCount: data.length,
    avgValue: stats.avg,
    medianValue: stats.median,
    minValue: stats.min,
    maxValue: stats.max,
    prDetails,
  };
}
```

### 3.2 エクスポート追加（`src/utils/metrics/index.ts`）

```typescript
export { calculateXxx } from './extended';
```

---

## 4. スプレッドシート書き出しを追加

### 4.1 書き出し関数（`src/services/spreadsheet/xxx.ts`）

```typescript
import type { XxxMetrics } from '../../types';
import { getContainer } from '../../container';
import { getOrCreateSheet, autoResizeColumns, openSpreadsheet } from './helpers';

const SHEET_NAME = '〇〇指標';

const SUMMARY_HEADERS = [
  '期間',
  '件数',
  '平均値',
  '中央値',
  '最小値',
  '最大値',
  '記録日時',
];

const DETAIL_HEADERS = [
  'PR番号',
  'タイトル',
  'リポジトリ',
  '作成日時',
  '計測値',
];

export function writeXxxToSheet(spreadsheetId: string, metrics: XxxMetrics): void {
  const { logger } = getContainer();
  const spreadsheet = openSpreadsheet(spreadsheetId);

  // サマリーシート
  const summarySheet = getOrCreateSheet(spreadsheet, SHEET_NAME, SUMMARY_HEADERS);
  const summaryRow = [
    metrics.period,
    metrics.prCount,
    metrics.avgValue ?? 'N/A',
    metrics.medianValue ?? 'N/A',
    metrics.minValue ?? 'N/A',
    metrics.maxValue ?? 'N/A',
    new Date(),
  ];
  summarySheet.appendRow(summaryRow);
  autoResizeColumns(summarySheet, SUMMARY_HEADERS.length);

  // 詳細シート
  const detailSheet = getOrCreateSheet(spreadsheet, `${SHEET_NAME} - Details`, DETAIL_HEADERS);
  const detailRows = metrics.prDetails.map(d => [
    d.prNumber,
    d.title,
    d.repository,
    d.createdAt,
    d.value,
  ]);
  if (detailRows.length > 0) {
    detailSheet.getRange(detailSheet.getLastRow() + 1, 1, detailRows.length, DETAIL_HEADERS.length)
      .setValues(detailRows);
  }
  autoResizeColumns(detailSheet, DETAIL_HEADERS.length);

  logger.log(`📝 Wrote xxx metrics to sheet "${SHEET_NAME}"`);
}
```

### 4.2 エクスポート追加（`src/services/spreadsheet/index.ts`）

```typescript
export { writeXxxToSheet } from './xxx';
```

---

## 5. GASエントリーポイント関数を追加（`src/functions/extendedMetrics.ts`）

```typescript
/**
 * 〇〇指標を計算してスプレッドシートに書き出す
 *
 * [指標の説明]
 */
export function syncXxx(days = 30): void {
  ensureContainerInitialized();
  const config = getConfig();

  if (!checkAuthConfigured(getGitHubAuthMode())) {
    return;
  }
  if (!checkRepositoriesConfigured(config.github.repositories.length)) {
    return;
  }

  const token = getGitHubToken();
  const { startDateStr, endDateStr, period } = createDateRange(days);

  Logger.log(`📊 Calculating Xxx for ${days} days`);
  Logger.log(`   Period: ${period}`);

  // データ取得
  const apiMode = getGitHubApiMode();
  const getData = apiMode === 'graphql' ? getXxxDataGraphQL : getXxxData;

  const result = getData(config.github.repositories, token, {
    dateRange: { start: startDateStr, end: endDateStr },
  });

  if (!result.success || !result.data) {
    Logger.log(`❌ Failed to fetch xxx data: ${result.error}`);
    return;
  }

  // 計算
  const metrics = calculateXxx(result.data, period);

  // 書き出し
  writeXxxToSheet(config.spreadsheetId, metrics);

  Logger.log(`✅ Xxx sync completed: ${metrics.prCount} items`);
}
```

---

## 6. グローバル関数をエクスポート（`src/main.ts`）

```typescript
import { syncXxx } from './functions/extendedMetrics';

// GASから呼び出し可能にする
global.syncXxx = syncXxx;
```

---

## 7. テストを追加（`tests/unit/xxx.test.ts`）

```typescript
import { describe, test, expect } from 'bun:test';
import { calculateXxx } from '../../src/utils/metrics/extended';

describe('calculateXxx', () => {
  test('空データの場合はnullを返す', () => {
    const result = calculateXxx([], '2024-01-01 〜 2024-01-31');

    expect(result.prCount).toBe(0);
    expect(result.avgValue).toBeNull();
    expect(result.medianValue).toBeNull();
  });

  test('正しく統計値を計算する', () => {
    const data = [
      { prNumber: 1, title: 'PR1', repository: 'repo', createdAt: '2024-01-01', value: 10 },
      { prNumber: 2, title: 'PR2', repository: 'repo', createdAt: '2024-01-02', value: 20 },
      { prNumber: 3, title: 'PR3', repository: 'repo', createdAt: '2024-01-03', value: 30 },
    ];

    const result = calculateXxx(data, '2024-01-01 〜 2024-01-31');

    expect(result.prCount).toBe(3);
    expect(result.avgValue).toBe(20);
    expect(result.medianValue).toBe(20);
    expect(result.minValue).toBe(10);
    expect(result.maxValue).toBe(30);
  });
});
```

---

## 8. ドキュメントを追加（`docs/XXX.md`）

```markdown
# 〇〇指標

## 概要

[この指標が何を測定し、なぜ重要かを説明]

## 計算方法

[計算ロジックの詳細]

## スプレッドシート出力

### サマリーシート（〇〇指標）

| 列 | 説明 |
|----|------|
| 期間 | 計測期間 |
| ... | ... |

### 詳細シート（〇〇指標 - Details）

| 列 | 説明 |
|----|------|
| PR番号 | ... |
| ... | ... |

## 使用方法

GASエディタで実行:

\`\`\`javascript
syncXxx();      // 過去30日
syncXxx(90);    // 過去90日
\`\`\`
```

---

## チェックリスト

新しい指標を追加する際は、以下を確認してください：

- [ ] 型定義（`src/types/metrics.ts`）
- [ ] スキーマ定義（`src/schemas/index.ts`）
- [ ] 計算ロジック（`src/utils/metrics/extended.ts`）
- [ ] utils/metrics/index.ts にエクスポート追加
- [ ] スプレッドシート書き出し（`src/services/spreadsheet/xxx.ts`）
- [ ] services/spreadsheet/index.ts にエクスポート追加
- [ ] GASエントリーポイント（`src/functions/extendedMetrics.ts`）
- [ ] main.ts にグローバル関数エクスポート
- [ ] ユニットテスト（`tests/unit/xxx.test.ts`）
- [ ] ドキュメント（`docs/XXX.md`）
- [ ] `bun test` が通ること
- [ ] `bun run build` が通ること

---

## 参考: 既存の指標実装

| 指標 | 型定義 | 計算ロジック | スプレッドシート |
|------|--------|-------------|-----------------|
| サイクルタイム | `CycleTimeMetrics` | `calculateCycleTime` | `writeCycleTimeToSheet` |
| コーディング時間 | `CodingTimeMetrics` | `calculateCodingTime` | `writeCodingTimeToSheet` |
| 手戻り率 | `ReworkRateMetrics` | `calculateReworkRate` | `writeReworkRateToSheet` |
| レビュー効率 | `ReviewEfficiencyMetrics` | `calculateReviewEfficiency` | `writeReviewEfficiencyToSheet` |
| PRサイズ | `PRSizeMetrics` | `calculatePRSize` | `writePRSizeToSheet` |

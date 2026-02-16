/**
 * PR Cycle Time スキーマ定義
 */
import type { SheetSchema } from './types';

export const PR_CYCLE_TIME_SCHEMA: SheetSchema = {
  version: '1.0.0',
  sheetName: 'PR Cycle Time',
  columns: [
    { id: 'period', header: '期間', type: 'string' },
    { id: 'mergedPRCount', header: 'マージ済みPR数', type: 'number', numberFormat: '#,##0' },
    {
      id: 'avgPRCycleTimeHours',
      header: '平均PR Cycle Time (時間)',
      type: 'number',
      numberFormat: '#,##0.0',
    },
    {
      id: 'avgPRCycleTimeDays',
      header: '平均PR Cycle Time (日)',
      type: 'number',
      numberFormat: '#,##0.0',
    },
    { id: 'medianHours', header: '中央値 (時間)', type: 'number', numberFormat: '#,##0.0' },
    { id: 'minHours', header: '最小 (時間)', type: 'number', numberFormat: '#,##0.0' },
    { id: 'maxHours', header: '最大 (時間)', type: 'number', numberFormat: '#,##0.0' },
    { id: 'recordedAt', header: '記録日時', type: 'date' },
  ],
};

export const PR_CYCLE_TIME_DETAIL_SCHEMA: SheetSchema = {
  version: '1.0.0',
  sheetName: 'PR Cycle Time - Details',
  columns: [
    { id: 'prNumber', header: 'PR番号', type: 'string' },
    { id: 'title', header: 'タイトル', type: 'string' },
    { id: 'prCreatedAt', header: 'PR作成日時', type: 'date' },
    { id: 'prMergedAt', header: 'PRマージ日時', type: 'date' },
    {
      id: 'prCycleTimeHours',
      header: 'PR Cycle Time (時間)',
      type: 'number',
      numberFormat: '#,##0.0',
    },
    {
      id: 'prCycleTimeDays',
      header: 'PR Cycle Time (日)',
      type: 'number',
      numberFormat: '#,##0.0',
    },
    { id: 'linkedIssue', header: 'リンクIssue', type: 'string' },
    { id: 'baseBranch', header: 'ベースブランチ', type: 'string' },
  ],
};

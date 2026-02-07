/**
 * CodingTime / CycleTime書き込みのユニットテスト
 *
 * リポジトリ別シートへの書き込み処理をテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { initializeContainer, resetContainer } from '../../src/container';
import { createMockContainer } from '../mocks';
import {
  writeCodingTimeToSheet,
  writeCodingTimeToAllRepositorySheets,
} from '../../src/services/spreadsheet/codingTime';
import {
  writeCycleTimeToSheet,
  writeCycleTimeToAllRepositorySheets,
} from '../../src/services/spreadsheet/cycleTime';
import type { CodingTimeMetrics, CycleTimeMetrics } from '../../src/types';
import type { MockSpreadsheet } from '../mocks';

describe('CodingTime / CycleTime Write', () => {
  let mockContainer: ReturnType<typeof createMockContainer>;

  beforeEach(() => {
    mockContainer = createMockContainer();
    initializeContainer(mockContainer);
  });

  afterEach(() => {
    resetContainer();
  });

  describe('writeCodingTimeToSheet', () => {
    it('should write coding time metrics to repository sheets', () => {
      const metrics: CodingTimeMetrics = {
        period: '2024-01-01 to 2024-01-07',
        issueCount: 2,
        avgCodingTimeHours: 12.0,
        medianCodingTimeHours: 11.5,
        minCodingTimeHours: 10.0,
        maxCodingTimeHours: 14.0,
        issueDetails: [
          {
            issueNumber: 123,
            title: 'Test Issue 1',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-01T10:00:00Z',
            prCreatedAt: '2024-01-01T20:00:00Z',
            prNumber: 1,
            codingTimeHours: 10.0,
          },
          {
            issueNumber: 124,
            title: 'Test Issue 2',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-02T09:00:00Z',
            prCreatedAt: '2024-01-02T23:00:00Z',
            prNumber: 2,
            codingTimeHours: 14.0,
          },
        ],
      };

      writeCodingTimeToSheet(mockContainer.spreadsheetId, metrics);

      const spreadsheet = mockContainer.spreadsheetClient.openById(
        mockContainer.spreadsheetId
      ) as MockSpreadsheet;
      const sheet = spreadsheet.getSheetByName('owner/repo1 - コーディング時間');

      expect(sheet).not.toBeNull();
      expect(sheet?.getLastRow()).toBeGreaterThanOrEqual(3); // ヘッダー + 2行（集計シート）
    });

    it('should group details by repository', () => {
      const metrics: CodingTimeMetrics = {
        period: '2024-01-01 to 2024-01-07',
        issueCount: 3,
        avgCodingTimeHours: 12.0,
        medianCodingTimeHours: 12.0,
        minCodingTimeHours: 10.0,
        maxCodingTimeHours: 14.0,
        issueDetails: [
          {
            issueNumber: 123,
            title: 'Issue A',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-01T10:00:00Z',
            prCreatedAt: '2024-01-01T20:00:00Z',
            prNumber: 1,
            codingTimeHours: 10.0,
          },
          {
            issueNumber: 124,
            title: 'Issue B',
            repository: 'owner/repo2',
            issueCreatedAt: '2024-01-02T09:00:00Z',
            prCreatedAt: '2024-01-02T23:00:00Z',
            prNumber: 2,
            codingTimeHours: 14.0,
          },
          {
            issueNumber: 125,
            title: 'Issue C',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-03T08:00:00Z',
            prCreatedAt: '2024-01-03T20:00:00Z',
            prNumber: 3,
            codingTimeHours: 12.0,
          },
        ],
      };

      writeCodingTimeToSheet(mockContainer.spreadsheetId, metrics);

      const spreadsheet = mockContainer.spreadsheetClient.openById(
        mockContainer.spreadsheetId
      ) as MockSpreadsheet;

      // repo1 に 2つ、repo2 に 1つ（集計シート）
      const sheet1 = spreadsheet.getSheetByName('owner/repo1 - コーディング時間');
      const sheet2 = spreadsheet.getSheetByName('owner/repo2 - コーディング時間');

      expect(sheet1).not.toBeNull();
      expect(sheet2).not.toBeNull();
      expect(sheet1?.getLastRow()).toBe(3); // ヘッダー + 2行（2つのIssueが異なる日付）
      expect(sheet2?.getLastRow()).toBe(2); // ヘッダー + 1行（1つのIssue）
    });

    it('should handle empty details', () => {
      const metrics: CodingTimeMetrics = {
        period: '2024-01-01 to 2024-01-07',
        issueCount: 0,
        avgCodingTimeHours: null,
        medianCodingTimeHours: null,
        minCodingTimeHours: null,
        maxCodingTimeHours: null,
        issueDetails: [],
      };

      writeCodingTimeToSheet(mockContainer.spreadsheetId, metrics);

      const spreadsheet = mockContainer.spreadsheetClient.openById(
        mockContainer.spreadsheetId
      ) as MockSpreadsheet;

      // シートは作成されない
      expect(spreadsheet.getSheetByName('owner/repo1 - コーディング時間')).toBeNull();
    });
  });

  describe('writeCycleTimeToSheet', () => {
    it('should write cycle time metrics to repository sheets', () => {
      const metrics: CycleTimeMetrics = {
        period: '2024-01-01 to 2024-01-07',
        completedTaskCount: 2,
        avgCycleTimeHours: 48.0,
        medianCycleTimeHours: 46.0,
        minCycleTimeHours: 44.0,
        maxCycleTimeHours: 52.0,
        issueDetails: [
          {
            issueNumber: 123,
            title: 'Test Issue 1',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-01T10:00:00Z',
            productionMergedAt: '2024-01-03T10:00:00Z',
            cycleTimeHours: 48.0,
            prChainSummary: '#1',
          },
          {
            issueNumber: 124,
            title: 'Test Issue 2',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-02T09:00:00Z',
            productionMergedAt: '2024-01-04T13:00:00Z',
            cycleTimeHours: 52.0,
            prChainSummary: '#2',
          },
        ],
      };

      writeCycleTimeToSheet(mockContainer.spreadsheetId, metrics);

      const spreadsheet = mockContainer.spreadsheetClient.openById(
        mockContainer.spreadsheetId
      ) as MockSpreadsheet;
      const sheet = spreadsheet.getSheetByName('owner/repo1 - サイクルタイム');

      expect(sheet).not.toBeNull();
      expect(sheet?.getLastRow()).toBeGreaterThanOrEqual(3); // ヘッダー + 2行（集計シート）
    });

    it('should handle multiple PR chain', () => {
      const metrics: CycleTimeMetrics = {
        period: '2024-01-01 to 2024-01-07',
        completedTaskCount: 1,
        avgCycleTimeHours: 72.0,
        medianCycleTimeHours: 72.0,
        minCycleTimeHours: 72.0,
        maxCycleTimeHours: 72.0,
        issueDetails: [
          {
            issueNumber: 123,
            title: 'Complex Issue',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-01T10:00:00Z',
            productionMergedAt: '2024-01-04T10:00:00Z',
            cycleTimeHours: 72.0,
            prChainSummary: '#1 → #2 → #3',
          },
        ],
      };

      writeCycleTimeToSheet(mockContainer.spreadsheetId, metrics);

      const spreadsheet = mockContainer.spreadsheetClient.openById(
        mockContainer.spreadsheetId
      ) as MockSpreadsheet;
      const sheet = spreadsheet.getSheetByName('owner/repo1 - サイクルタイム');

      expect(sheet).not.toBeNull();
      expect(sheet?.getLastRow()).toBe(2); // ヘッダー + 1行（集計シート）
    });

    it('should group details by repository', () => {
      const metrics: CycleTimeMetrics = {
        period: '2024-01-01 to 2024-01-07',
        completedTaskCount: 3,
        avgCycleTimeHours: 48.0,
        medianCycleTimeHours: 48.0,
        minCycleTimeHours: 40.0,
        maxCycleTimeHours: 56.0,
        issueDetails: [
          {
            issueNumber: 123,
            title: 'Issue A',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-01T10:00:00Z',
            productionMergedAt: '2024-01-03T02:00:00Z',
            cycleTimeHours: 40.0,
            prChainSummary: '#1',
          },
          {
            issueNumber: 124,
            title: 'Issue B',
            repository: 'owner/repo2',
            issueCreatedAt: '2024-01-02T09:00:00Z',
            productionMergedAt: '2024-01-04T17:00:00Z',
            cycleTimeHours: 56.0,
            prChainSummary: '#2',
          },
          {
            issueNumber: 125,
            title: 'Issue C',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-03T08:00:00Z',
            productionMergedAt: '2024-01-05T08:00:00Z',
            cycleTimeHours: 48.0,
            prChainSummary: '#3',
          },
        ],
      };

      writeCycleTimeToSheet(mockContainer.spreadsheetId, metrics);

      const spreadsheet = mockContainer.spreadsheetClient.openById(
        mockContainer.spreadsheetId
      ) as MockSpreadsheet;

      // repo1 に 2つ、repo2 に 1つ（集計シート）
      const sheet1 = spreadsheet.getSheetByName('owner/repo1 - サイクルタイム');
      const sheet2 = spreadsheet.getSheetByName('owner/repo2 - サイクルタイム');

      expect(sheet1).not.toBeNull();
      expect(sheet2).not.toBeNull();
      expect(sheet1?.getLastRow()).toBe(3); // ヘッダー + 2行（2つのIssueが異なる日付）
      expect(sheet2?.getLastRow()).toBe(2); // ヘッダー + 1行（1つのIssue）
    });
  });

  describe('writeCodingTimeToAllRepositorySheets', () => {
    it('should write to multiple repository sheets simultaneously', () => {
      const metrics: CodingTimeMetrics = {
        period: '2024-01-01 to 2024-01-07',
        issueCount: 2,
        avgCodingTimeHours: 12.0,
        medianCodingTimeHours: 12.0,
        minCodingTimeHours: 10.0,
        maxCodingTimeHours: 14.0,
        issueDetails: [
          {
            issueNumber: 123,
            title: 'Issue A',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-01T10:00:00Z',
            prCreatedAt: '2024-01-01T20:00:00Z',
            prNumber: 1,
            codingTimeHours: 10.0,
          },
          {
            issueNumber: 124,
            title: 'Issue B',
            repository: 'owner/repo2',
            issueCreatedAt: '2024-01-02T09:00:00Z',
            prCreatedAt: '2024-01-02T23:00:00Z',
            prNumber: 2,
            codingTimeHours: 14.0,
          },
        ],
      };

      const result = writeCodingTimeToAllRepositorySheets(mockContainer.spreadsheetId, metrics);

      // 2リポジトリに書き込み（集計シート1行 + 詳細シート1行 = 計2行）
      expect(result.size).toBe(2);
      expect(result.get('owner/repo1')?.written).toBe(2);
      expect(result.get('owner/repo2')?.written).toBe(2);
    });
  });

  describe('writeCycleTimeToAllRepositorySheets', () => {
    it('should write to multiple repository sheets simultaneously', () => {
      const metrics: CycleTimeMetrics = {
        period: '2024-01-01 to 2024-01-07',
        completedTaskCount: 2,
        avgCycleTimeHours: 48.0,
        medianCycleTimeHours: 48.0,
        minCycleTimeHours: 40.0,
        maxCycleTimeHours: 56.0,
        issueDetails: [
          {
            issueNumber: 123,
            title: 'Issue A',
            repository: 'owner/repo1',
            issueCreatedAt: '2024-01-01T10:00:00Z',
            productionMergedAt: '2024-01-03T02:00:00Z',
            cycleTimeHours: 40.0,
            prChainSummary: '#1',
          },
          {
            issueNumber: 124,
            title: 'Issue B',
            repository: 'owner/repo2',
            issueCreatedAt: '2024-01-02T09:00:00Z',
            productionMergedAt: '2024-01-04T17:00:00Z',
            cycleTimeHours: 56.0,
            prChainSummary: '#2',
          },
        ],
      };

      const result = writeCycleTimeToAllRepositorySheets(mockContainer.spreadsheetId, metrics);

      // 2リポジトリに書き込み（集計シート1行 + 詳細シート1行 = 計2行）
      expect(result.size).toBe(2);
      expect(result.get('owner/repo1')?.written).toBe(2);
      expect(result.get('owner/repo2')?.written).toBe(2);
    });
  });
});

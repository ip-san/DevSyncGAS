/**
 * GraphQL Issues 統合テスト
 *
 * Issue取得、ラベルフィルタリング、ページネーションのテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

// GASグローバルのUtilitiesをモック
(globalThis as typeof globalThis & { Utilities: { sleep: (ms: number) => void } }).Utilities = {
  sleep: (_ms: number) => {
    // テスト時は待機しない
  },
};
import { initializeContainer, resetContainer } from '../../src/container';
import { createMockContainer, MockHttpClient } from '../mocks';
import { getIssuesGraphQL } from '../../src/services/github/graphql/issues';
import { GITHUB_GRAPHQL_ENDPOINT } from '../../src/services/github/graphql/client';
import type { GitHubRepository } from '../../src/types';

describe('GraphQL Issues Integration', () => {
  let mockContainer: ReturnType<typeof createMockContainer>;
  let mockHttpClient: MockHttpClient;
  const testToken = 'test-token';
  const testRepo: GitHubRepository = {
    owner: 'test-owner',
    name: 'test-repo',
    fullName: 'test-owner/test-repo',
  };

  beforeEach(() => {
    mockContainer = createMockContainer();
    mockHttpClient = mockContainer.httpClient as MockHttpClient;
    initializeContainer(mockContainer);
  });

  afterEach(() => {
    resetContainer();
    mockHttpClient.reset();
  });

  describe('Basic Issue Fetching', () => {
    it('should fetch issues successfully', () => {
      const mockResponse = {
        data: {
          repository: {
            issues: {
              nodes: [
                {
                  id: 'I_1',
                  number: 1,
                  title: 'Test Issue',
                  state: 'OPEN',
                  createdAt: '2024-01-01T10:00:00Z',
                  closedAt: null,
                  labels: {
                    nodes: [],
                  },
                  author: {
                    login: 'test-user',
                  },
                },
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
      };

      mockHttpClient.setResponse(GITHUB_GRAPHQL_ENDPOINT, {
        statusCode: 200,
        content: JSON.stringify(mockResponse),
        data: mockResponse,
      });

      const result = getIssuesGraphQL(testRepo, testToken);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].number).toBe(1);
      expect(result.data?.[0].title).toBe('Test Issue');
    });

    it('should handle empty repository', () => {
      const mockResponse = {
        data: {
          repository: {
            issues: {
              nodes: [],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
      };

      mockHttpClient.setResponse(GITHUB_GRAPHQL_ENDPOINT, {
        statusCode: 200,
        content: JSON.stringify(mockResponse),
        data: mockResponse,
      });

      const result = getIssuesGraphQL(testRepo, testToken);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Label Filtering', () => {
    it('should exclude issues with excluded labels', () => {
      const mockResponse = {
        data: {
          repository: {
            issues: {
              nodes: [
                {
                  id: 'I_1',
                  number: 1,
                  title: 'Normal Issue',
                  state: 'OPEN',
                  createdAt: '2024-01-01T10:00:00Z',
                  closedAt: null,
                  labels: {
                    nodes: [],
                  },
                  author: {
                    login: 'test-user',
                  },
                },
                {
                  id: 'I_2',
                  number: 2,
                  title: 'Excluded Issue',
                  state: 'OPEN',
                  createdAt: '2024-01-02T10:00:00Z',
                  closedAt: null,
                  labels: {
                    nodes: [{ name: 'exclude-metrics' }],
                  },
                  author: {
                    login: 'test-user',
                  },
                },
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
      };

      mockHttpClient.setResponse(GITHUB_GRAPHQL_ENDPOINT, {
        statusCode: 200,
        content: JSON.stringify(mockResponse),
        data: mockResponse,
      });

      const result = getIssuesGraphQL(testRepo, testToken);

      expect(result.success).toBe(true);
      // exclude-metricsラベル付きIssueは除外される
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].number).toBe(1);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter issues by date range', () => {
      const mockResponse = {
        data: {
          repository: {
            issues: {
              nodes: [
                {
                  id: 'I_1',
                  number: 1,
                  title: 'Old Issue',
                  state: 'CLOSED',
                  createdAt: '2023-12-01T10:00:00Z',
                  closedAt: '2023-12-15T10:00:00Z',
                  labels: {
                    nodes: [],
                  },
                  author: {
                    login: 'test-user',
                  },
                },
                {
                  id: 'I_2',
                  number: 2,
                  title: 'Recent Issue',
                  state: 'OPEN',
                  createdAt: '2024-01-15T10:00:00Z',
                  closedAt: null,
                  labels: {
                    nodes: [],
                  },
                  author: {
                    login: 'test-user',
                  },
                },
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
      };

      mockHttpClient.setResponse(GITHUB_GRAPHQL_ENDPOINT, {
        statusCode: 200,
        content: JSON.stringify(mockResponse),
        data: mockResponse,
      });

      const result = getIssuesGraphQL(testRepo, testToken, {
        dateRange: {
          start: '2024-01-01T00:00:00Z',
        },
      });

      expect(result.success).toBe(true);
      // 2024-01-01以降のIssueのみ
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].number).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphQL errors', () => {
      const mockResponse = {
        errors: [
          {
            message: 'API rate limit exceeded',
            type: 'RATE_LIMITED',
          },
        ],
      };

      mockHttpClient.setResponse(GITHUB_GRAPHQL_ENDPOINT, {
        statusCode: 200,
        content: JSON.stringify(mockResponse),
        data: mockResponse,
      });

      const result = getIssuesGraphQL(testRepo, testToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('should handle network errors', () => {
      mockHttpClient.setResponse(GITHUB_GRAPHQL_ENDPOINT, {
        statusCode: 500,
        content: 'Internal Server Error',
      });

      const result = getIssuesGraphQL(testRepo, testToken);

      expect(result.success).toBe(false);
    });
  });
});

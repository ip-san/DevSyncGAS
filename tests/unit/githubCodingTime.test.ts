/**
 * コーディングタイム機能のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  getGitHubCodingTimeData,
} from "../../src/services/github";
import { calculateCodingTime } from "../../src/utils/metrics";
import { setupTestContainer, teardownTestContainer, type TestContainer } from "../helpers/setup";
import type { GitHubRepository, GitHubIssueCodingTime } from "../../src/types";

describe("GitHub Coding Time", () => {
  let container: TestContainer;

  beforeEach(() => {
    container = setupTestContainer();
  });

  afterEach(() => {
    teardownTestContainer();
  });

  const testRepo: GitHubRepository = {
    owner: "test-owner",
    name: "test-repo",
    fullName: "test-owner/test-repo",
  };

  describe("getGitHubCodingTimeData", () => {
    it("IssueとリンクPRからコーディングタイムを計算する", () => {
      // Issue一覧を取得
      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues?state=all&per_page=100&page=1",
        200,
        [
          {
            id: 1,
            number: 1,
            title: "Feature request",
            state: "closed",
            created_at: "2024-01-01T10:00:00Z",
            closed_at: "2024-01-05T12:00:00Z",
            labels: [{ name: "feature" }],
          },
        ]
      );

      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues?state=all&per_page=100&page=2",
        200,
        []
      );

      // Issue #1 のタイムライン（リンクPR検出用）
      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues/1/timeline?per_page=100&page=1",
        200,
        [
          {
            event: "cross-referenced",
            source: {
              issue: {
                number: 10,
                pull_request: { url: "https://api.github.com/pulls/10" },
                repository: { full_name: "test-owner/test-repo" },
              },
            },
          },
        ]
      );

      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues/1/timeline?per_page=100&page=2",
        200,
        []
      );

      // PR #10 の詳細
      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/pulls/10",
        200,
        {
          id: 100,
          number: 10,
          title: "Implement feature",
          state: "closed",
          draft: false,
          created_at: "2024-01-02T14:00:00Z", // Issue作成から28時間後
          merged_at: "2024-01-03T12:00:00Z",
          user: { login: "developer" },
          base: { ref: "main" },
          head: { ref: "feature/new" },
          merge_commit_sha: "abc123",
        }
      );

      const result = getGitHubCodingTimeData([testRepo], "test-token");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].issueNumber).toBe(1);
      expect(result.data![0].prNumber).toBe(10);
      expect(result.data![0].codingTimeHours).toBe(28); // 28時間
    });

    it("リンクPRがないIssueはcodingTimeHoursがnull", () => {
      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues?state=all&per_page=100&page=1",
        200,
        [
          {
            id: 1,
            number: 1,
            title: "Feature request without PR",
            state: "open",
            created_at: "2024-01-01T10:00:00Z",
            closed_at: null,
            labels: [],
          },
        ]
      );

      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues?state=all&per_page=100&page=2",
        200,
        []
      );

      // Issue #1 のタイムライン（リンクPRなし）
      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues/1/timeline?per_page=100&page=1",
        200,
        [
          { event: "labeled", label: { name: "enhancement" } },
        ]
      );

      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues/1/timeline?per_page=100&page=2",
        200,
        []
      );

      const result = getGitHubCodingTimeData([testRepo], "test-token");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].issueNumber).toBe(1);
      expect(result.data![0].prNumber).toBeNull();
      expect(result.data![0].codingTimeHours).toBeNull();
    });

    it("複数のリンクPRがある場合は最も早く作成されたPRを使用する", () => {
      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues?state=all&per_page=100&page=1",
        200,
        [
          {
            id: 1,
            number: 1,
            title: "Feature with multiple PRs",
            state: "closed",
            created_at: "2024-01-01T10:00:00Z",
            closed_at: "2024-01-05T12:00:00Z",
            labels: [],
          },
        ]
      );

      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues?state=all&per_page=100&page=2",
        200,
        []
      );

      // Issue #1 のタイムライン（複数のリンクPR）
      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues/1/timeline?per_page=100&page=1",
        200,
        [
          {
            event: "cross-referenced",
            source: {
              issue: {
                number: 10,
                pull_request: { url: "https://api.github.com/pulls/10" },
                repository: { full_name: "test-owner/test-repo" },
              },
            },
          },
          {
            event: "cross-referenced",
            source: {
              issue: {
                number: 20,
                pull_request: { url: "https://api.github.com/pulls/20" },
                repository: { full_name: "test-owner/test-repo" },
              },
            },
          },
        ]
      );

      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/issues/1/timeline?per_page=100&page=2",
        200,
        []
      );

      // PR #10（後で作成）
      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/pulls/10",
        200,
        {
          id: 100,
          number: 10,
          title: "Second PR",
          state: "closed",
          draft: false,
          created_at: "2024-01-03T10:00:00Z", // 後で作成
          merged_at: "2024-01-04T12:00:00Z",
          user: { login: "developer" },
          base: { ref: "main" },
          head: { ref: "feature/v2" },
          merge_commit_sha: "def456",
        }
      );

      // PR #20（先に作成）
      container.httpClient.setJsonResponse(
        "https://api.github.com/repos/test-owner/test-repo/pulls/20",
        200,
        {
          id: 200,
          number: 20,
          title: "First PR",
          state: "closed",
          draft: false,
          created_at: "2024-01-02T10:00:00Z", // 先に作成
          merged_at: "2024-01-02T14:00:00Z",
          user: { login: "developer" },
          base: { ref: "main" },
          head: { ref: "feature/v1" },
          merge_commit_sha: "abc123",
        }
      );

      const result = getGitHubCodingTimeData([testRepo], "test-token");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].prNumber).toBe(20); // 最も早く作成されたPR
      expect(result.data![0].codingTimeHours).toBe(24); // 24時間
    });
  });

  describe("calculateCodingTime", () => {
    it("コーディングタイムを正しく計算する", () => {
      const codingTimeData: GitHubIssueCodingTime[] = [
        {
          issueNumber: 1,
          issueTitle: "Issue 1",
          repository: "test-owner/test-repo",
          issueCreatedAt: "2024-01-01T00:00:00Z",
          prCreatedAt: "2024-01-01T08:00:00Z", // 8時間後
          prNumber: 10,
          codingTimeHours: 8,
        },
        {
          issueNumber: 2,
          issueTitle: "Issue 2",
          repository: "test-owner/test-repo",
          issueCreatedAt: "2024-01-02T00:00:00Z",
          prCreatedAt: "2024-01-03T00:00:00Z", // 24時間後
          prNumber: 20,
          codingTimeHours: 24,
        },
        {
          issueNumber: 3,
          issueTitle: "Issue 3 (PRなし)",
          repository: "test-owner/test-repo",
          issueCreatedAt: "2024-01-03T00:00:00Z",
          prCreatedAt: null,
          prNumber: null,
          codingTimeHours: null,
        },
      ];

      const result = calculateCodingTime(codingTimeData, "2024-01");

      expect(result.issueCount).toBe(2); // PRがリンクされたIssueのみ
      expect(result.avgCodingTimeHours).toBe(16); // (8 + 24) / 2
      expect(result.medianCodingTimeHours).toBe(16); // (8 + 24) / 2
      expect(result.minCodingTimeHours).toBe(8);
      expect(result.maxCodingTimeHours).toBe(24);
      expect(result.issueDetails).toHaveLength(2);
    });

    it("PRがリンクされたIssueがない場合は空の結果を返す", () => {
      const codingTimeData: GitHubIssueCodingTime[] = [
        {
          issueNumber: 1,
          issueTitle: "Issue 1 (PRなし)",
          repository: "test-owner/test-repo",
          issueCreatedAt: "2024-01-01T00:00:00Z",
          prCreatedAt: null,
          prNumber: null,
          codingTimeHours: null,
        },
      ];

      const result = calculateCodingTime(codingTimeData, "2024-01");

      expect(result.issueCount).toBe(0);
      expect(result.avgCodingTimeHours).toBeNull();
      expect(result.issueDetails).toHaveLength(0);
    });

    it("負のコーディングタイムは除外される", () => {
      const codingTimeData: GitHubIssueCodingTime[] = [
        {
          issueNumber: 1,
          issueTitle: "Issue 1 (正常)",
          repository: "test-owner/test-repo",
          issueCreatedAt: "2024-01-01T00:00:00Z",
          prCreatedAt: "2024-01-01T10:00:00Z",
          prNumber: 10,
          codingTimeHours: 10,
        },
        {
          issueNumber: 2,
          issueTitle: "Issue 2 (負のコーディングタイム)",
          repository: "test-owner/test-repo",
          issueCreatedAt: "2024-01-02T00:00:00Z",
          prCreatedAt: "2024-01-01T00:00:00Z", // Issue作成前にPRが存在
          prNumber: 20,
          codingTimeHours: -24, // 負の値
        },
      ];

      const result = calculateCodingTime(codingTimeData, "2024-01");

      expect(result.issueCount).toBe(1); // 負の値は除外
      expect(result.avgCodingTimeHours).toBe(10);
      expect(result.issueDetails).toHaveLength(1);
      expect(result.issueDetails[0].issueNumber).toBe(1);
    });

    it("中央値を正しく計算する（奇数個）", () => {
      const codingTimeData: GitHubIssueCodingTime[] = [
        {
          issueNumber: 1,
          issueTitle: "Issue 1",
          repository: "test-owner/test-repo",
          issueCreatedAt: "2024-01-01T00:00:00Z",
          prCreatedAt: "2024-01-01T02:00:00Z",
          prNumber: 10,
          codingTimeHours: 2,
        },
        {
          issueNumber: 2,
          issueTitle: "Issue 2",
          repository: "test-owner/test-repo",
          issueCreatedAt: "2024-01-02T00:00:00Z",
          prCreatedAt: "2024-01-02T04:00:00Z",
          prNumber: 20,
          codingTimeHours: 4,
        },
        {
          issueNumber: 3,
          issueTitle: "Issue 3",
          repository: "test-owner/test-repo",
          issueCreatedAt: "2024-01-03T00:00:00Z",
          prCreatedAt: "2024-01-03T10:00:00Z",
          prNumber: 30,
          codingTimeHours: 10,
        },
      ];

      const result = calculateCodingTime(codingTimeData, "2024-01");

      expect(result.issueCount).toBe(3);
      expect(result.medianCodingTimeHours).toBe(4); // ソートして中央の値
    });
  });
});

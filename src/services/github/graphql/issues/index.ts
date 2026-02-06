/**
 * GitHub GraphQL API - Issue 操作
 *
 * REST APIからの移行:
 * - getIssues: 同等（ただしPRフィルタリング不要）
 * - getLinkedPRsForIssue: Timeline取得 → 1リクエストでPR情報も取得
 *
 * 効率化ポイント:
 * - IssueとリンクPRを1リクエストで取得
 * - サイクルタイム計測に必要なPRブランチ情報も同時取得
 */

// Issue取得
export { getIssuesGraphQL } from './fetch';

// リンクPR取得
export { getLinkedPRsForIssueGraphQL } from './linkedPRs';

// PR追跡
export {
  findPRContainingCommitGraphQL,
  trackToProductionMergeGraphQL,
  type TrackToProductionGraphQLOptions,
} from './tracking';

// サイクルタイム計算
export { getCycleTimeDataGraphQL } from './cycleTime';

// コーディングタイム計算
export { getCodingTimeDataGraphQL } from './codingTime';

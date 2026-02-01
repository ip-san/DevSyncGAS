/**
 * GitHub REST API 基盤モジュール
 *
 * GitHub APIへのHTTPリクエストを行う低レベル関数を提供。
 * 認証ヘッダーの付与、エラーハンドリング、ページネーションの基盤となる。
 */

import type { ApiResponse } from '../../types';
import { getContainer } from '../../container';
import { sanitizeGitHubError, sanitizeErrorMessage } from '../../utils/errorSanitizer';
import {
  DEFAULT_MAX_PAGES,
  PER_PAGE,
  STATUS_FETCH_WARNING_THRESHOLD,
  MAX_RETRIES,
  RETRY_DELAY_MS,
} from '../../config/apiConfig';

// =============================================================================
// 定数
// =============================================================================

/** GitHub API のベースURL */
export const GITHUB_API_BASE = 'https://api.github.com';

// ページネーション・しきい値設定は apiConfig.ts からインポート
export { DEFAULT_MAX_PAGES, PER_PAGE, STATUS_FETCH_WARNING_THRESHOLD };

// =============================================================================
// 型定義
// =============================================================================

/**
 * 期間フィルタ
 */
export interface DateRange {
  /** 開始日（この日以降を取得） */
  since?: Date;
  /** 終了日（この日以前を取得） */
  until?: Date;
}

/**
 * Issue取得用の日付範囲（文字列形式）
 */
export interface IssueDateRange {
  /** 開始日（YYYY-MM-DD形式） */
  start?: string;
  /** 終了日（YYYY-MM-DD形式） */
  end?: string;
}

// =============================================================================
// API呼び出し基盤
// =============================================================================

/**
 * GitHub REST APIを呼び出すヘルパー関数
 *
 * @param endpoint - APIエンドポイント（例: "/repos/owner/repo/pulls"）
 * @param token - GitHub Personal Access Token
 * @returns APIレスポンス
 */
export function fetchGitHub<T>(endpoint: string, token: string): ApiResponse<T> {
  const { httpClient } = getContainer();
  const url = `${GITHUB_API_BASE}${endpoint}`;

  try {
    const response = httpClient.fetch<T>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevSyncGAS',
      },
      muteHttpExceptions: true,
    });

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return { success: true, data: response.data };
    }
    return {
      success: false,
      error: sanitizeGitHubError(response.statusCode, response.data),
    };
  } catch (error) {
    return {
      success: false,
      error: `Request failed: ${sanitizeErrorMessage(error)}`,
    };
  }
}

/**
 * リトライ付きでGitHub REST APIを呼び出す
 *
 * @param endpoint - APIエンドポイント（例: "/repos/owner/repo/pulls"）
 * @param token - GitHub Personal Access Token
 * @param maxRetries - 最大リトライ回数（デフォルト: MAX_RETRIES）
 * @returns APIレスポンス
 */
export function fetchGitHubWithRetry<T>(
  endpoint: string,
  token: string,
  maxRetries: number = MAX_RETRIES
): ApiResponse<T> {
  const { logger } = getContainer();
  let lastError = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      logger.log(`  🔄 Retry attempt ${attempt}/${maxRetries}...`);
      Utilities.sleep(RETRY_DELAY_MS * attempt);
    }

    const result = fetchGitHub<T>(endpoint, token);

    if (result.success) {
      return result;
    }

    lastError = result.error ?? 'Unknown error';

    // レート制限エラーの場合は長めに待つ
    if (lastError.includes('rate limit') || lastError.includes('403')) {
      logger.log('  ⏳ Rate limited, waiting longer...');
      Utilities.sleep(RETRY_DELAY_MS * 10);
    }

    // リトライ不可能なエラーの場合は即座に終了
    if (
      lastError.includes('404') ||
      lastError.includes('401') ||
      lastError.includes('Unauthorized')
    ) {
      return result;
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} retries: ${lastError}`,
  };
}

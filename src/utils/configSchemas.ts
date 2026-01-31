/**
 * 設定データのZodスキーマ定義
 *
 * JSON.parse()で取得したデータの型安全性を確保するためのスキーマ。
 * PropertiesServiceから取得したJSON文字列を安全にパースします。
 */

import { z } from 'zod';
import type { LoggerClient } from '../interfaces';

/**
 * GitHubリポジトリのスキーマ
 */
export const GitHubRepositorySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
});

/**
 * GitHubリポジトリ配列のスキーマ
 */
export const GitHubRepositoriesSchema = z.array(GitHubRepositorySchema);

/**
 * プロジェクトグループ内のリポジトリスキーマ
 */
export const ProjectRepositorySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
});

/**
 * プロジェクトグループのスキーマ
 */
export const ProjectGroupSchema = z.object({
  name: z.string().min(1),
  spreadsheetId: z.string().min(1),
  sheetName: z.string().min(1),
  repositories: z.array(ProjectRepositorySchema),
});

/**
 * プロジェクトグループ配列のスキーマ
 */
export const ProjectGroupsSchema = z.array(ProjectGroupSchema);

/**
 * サイクルタイム設定のスキーマ
 */
export const CycleTimeConfigSchema = z.object({
  startEvents: z.array(z.string()).optional(),
  endEvents: z.array(z.string()).optional(),
});

/**
 * コーディング時間設定のスキーマ
 */
export const CodingTimeConfigSchema = z.object({
  startEvents: z.array(z.string()).optional(),
  endEvents: z.array(z.string()).optional(),
});

/**
 * JSONを安全にパースするヘルパー関数
 *
 * @param jsonString - パースするJSON文字列
 * @param schema - Zodスキーマ
 * @param defaultValue - パース失敗時のデフォルト値
 * @param logger - オプションのロガー（警告出力用）
 * @returns パース済みのデータ、または失敗時はデフォルト値
 *
 * @example
 * ```typescript
 * const repos = safeParseJSON(
 *   reposJson,
 *   GitHubRepositoriesSchema,
 *   []
 * );
 * ```
 */
export function safeParseJSON<T>(
  jsonString: string | null,
  schema: z.ZodSchema<T>,
  defaultValue: T,
  logger?: Pick<LoggerClient, 'log'>
): T {
  if (!jsonString) {
    return defaultValue;
  }

  try {
    const parsed: unknown = JSON.parse(jsonString);
    const result = schema.safeParse(parsed);

    if (!result.success) {
      logger?.log(`⚠️ Invalid JSON data structure: ${result.error.message}`);
      return defaultValue;
    }

    return result.data;
  } catch (error) {
    logger?.log(
      `⚠️ Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`
    );
    return defaultValue;
  }
}

/**
 * JSONを厳密にパースする（失敗時はエラーをthrow）
 *
 * @param jsonString - パースするJSON文字列
 * @param schema - Zodスキーマ
 * @param errorContext - エラーメッセージに含める文脈情報
 * @returns パース済みのデータ
 * @throws パースまたはバリデーションに失敗した場合
 *
 * @example
 * ```typescript
 * try {
 *   const repos = strictParseJSON(
 *     reposJson,
 *     GitHubRepositoriesSchema,
 *     'GitHub repositories configuration'
 *   );
 * } catch (error) {
 *   // エラーハンドリング
 * }
 * ```
 */
export function strictParseJSON<T>(
  jsonString: string | null,
  schema: z.ZodSchema<T>,
  errorContext: string
): T {
  if (!jsonString) {
    throw new Error(`${errorContext}: JSON string is empty or null`);
  }

  try {
    const parsed: unknown = JSON.parse(jsonString);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((e) => `  - ${String(e.path.join('.'))}: ${e.message}`)
        .join('\n');
      throw new Error(`${errorContext}: Invalid data structure\n${errorMessages}`);
    }
    throw new Error(
      `${errorContext}: JSON parse failed - ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

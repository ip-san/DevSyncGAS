/**
 * カスタムエラークラスのテスト
 */

import { describe, test, expect } from 'bun:test';
import {
  AppError,
  GitHubAPIError,
  ValidationError,
  ConfigurationError,
  SecretManagerError,
  SpreadsheetError,
  ErrorCode,
  isRetryableError,
  formatErrorMessage,
} from '../../src/utils/errors';

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    test('基本的なプロパティが正しく設定される', () => {
      const error = new AppError('Test error', ErrorCode.UNKNOWN_ERROR, {
        isRetryable: true,
        statusCode: 500,
        context: { key: 'value' },
      });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(error.isRetryable).toBe(true);
      expect(error.statusCode).toBe(500);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.name).toBe('AppError');
    });

    test('デフォルト値が正しく設定される', () => {
      const error = new AppError('Test error', ErrorCode.UNKNOWN_ERROR);

      expect(error.isRetryable).toBe(false);
      expect(error.statusCode).toBeUndefined();
      expect(error.context).toBeUndefined();
    });
  });

  describe('GitHubAPIError', () => {
    test('fromStatusCodeで401エラーを生成', () => {
      const error = GitHubAPIError.fromStatusCode(401);

      expect(error.code).toBe(ErrorCode.GITHUB_AUTH_FAILED);
      expect(error.statusCode).toBe(401);
      expect(error.isRetryable).toBe(false);
      expect(error.message).toBe('GitHub authentication failed');
    });

    test('fromStatusCodeで429エラーを生成（リトライ可能）', () => {
      const error = GitHubAPIError.fromStatusCode(429);

      expect(error.code).toBe(ErrorCode.GITHUB_RATE_LIMIT);
      expect(error.statusCode).toBe(429);
      expect(error.isRetryable).toBe(true);
    });

    test('fromStatusCodeで500エラーを生成（リトライ可能）', () => {
      const error = GitHubAPIError.fromStatusCode(500);

      expect(error.code).toBe(ErrorCode.GITHUB_SERVER_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.isRetryable).toBe(true);
    });

    test('fromStatusCodeでカスタムメッセージとコンテキストを設定', () => {
      const error = GitHubAPIError.fromStatusCode(404, 'Custom message', { repo: 'test/repo' });

      expect(error.message).toBe('Custom message');
      expect(error.context).toEqual({ repo: 'test/repo' });
    });

    test('コンストラクタで明示的に設定', () => {
      const error = new GitHubAPIError('API error', {
        code: ErrorCode.GITHUB_NOT_FOUND,
        statusCode: 404,
        isRetryable: false,
      });

      expect(error.code).toBe(ErrorCode.GITHUB_NOT_FOUND);
      expect(error.isRetryable).toBe(false);
    });
  });

  describe('ValidationError', () => {
    test('検証エラーが正しく生成される', () => {
      const error = new ValidationError('Invalid input');

      expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(error.isRetryable).toBe(false);
      expect(error.message).toBe('Invalid input');
    });

    test('カスタムコードとコンテキストを設定', () => {
      const error = new ValidationError('Invalid repository', {
        code: ErrorCode.INVALID_REPOSITORY,
        context: { owner: 'invalid-owner' },
      });

      expect(error.code).toBe(ErrorCode.INVALID_REPOSITORY);
      expect(error.context).toEqual({ owner: 'invalid-owner' });
    });
  });

  describe('ConfigurationError', () => {
    test('設定エラーが正しく生成される', () => {
      const error = new ConfigurationError('Container not initialized');

      expect(error.code).toBe(ErrorCode.CONFIG_NOT_INITIALIZED);
      expect(error.isRetryable).toBe(false);
    });
  });

  describe('SecretManagerError', () => {
    test('Secret Managerエラーが正しく生成される', () => {
      const error = new SecretManagerError('Failed to access secret');

      expect(error.code).toBe(ErrorCode.SECRET_MANAGER_ACCESS_FAILED);
      expect(error.isRetryable).toBe(false);
    });

    test('リトライ可能なSecretManagerErrorを生成', () => {
      const error = new SecretManagerError('Temporary failure', {
        isRetryable: true,
      });

      expect(error.isRetryable).toBe(true);
    });
  });

  describe('SpreadsheetError', () => {
    test('スプレッドシートエラーが正しく生成される', () => {
      const error = new SpreadsheetError('Access denied', {
        code: ErrorCode.SPREADSHEET_ACCESS_DENIED,
      });

      expect(error.code).toBe(ErrorCode.SPREADSHEET_ACCESS_DENIED);
      expect(error.isRetryable).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    test('リトライ可能なエラーをtrueと判定', () => {
      const error = new GitHubAPIError('Rate limit', {
        isRetryable: true,
      });

      expect(isRetryableError(error)).toBe(true);
    });

    test('リトライ不可能なエラーをfalseと判定', () => {
      const error = new ValidationError('Invalid input');

      expect(isRetryableError(error)).toBe(false);
    });

    test('非AppErrorをfalseと判定', () => {
      const error = new Error('Regular error');

      expect(isRetryableError(error)).toBe(false);
    });

    test('文字列をfalseと判定', () => {
      expect(isRetryableError('error')).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    test('AppErrorを適切にフォーマット', () => {
      const error = new GitHubAPIError('API failed', {
        code: ErrorCode.GITHUB_SERVER_ERROR,
        statusCode: 500,
      });

      const formatted = formatErrorMessage(error);
      expect(formatted).toBe('[GITHUB_SERVER_ERROR] API failed (HTTP 500)');
    });

    test('ステータスコードなしのAppErrorをフォーマット', () => {
      const error = new ValidationError('Validation failed');

      const formatted = formatErrorMessage(error);
      expect(formatted).toBe('[VALIDATION_FAILED] Validation failed');
    });

    test('通常のErrorをフォーマット', () => {
      const error = new Error('Regular error');

      const formatted = formatErrorMessage(error);
      expect(formatted).toBe('Regular error');
    });

    test('文字列をフォーマット', () => {
      const formatted = formatErrorMessage('Simple error');
      expect(formatted).toBe('Simple error');
    });
  });
});

/**
 * 入力バリデーションのユニットテスト
 *
 * セキュリティ関連のバリデーション機能をテスト
 */

import { describe, it, expect } from 'bun:test';
import {
  validateRepositoryOwner,
  validateRepositoryName,
  validateProjectName,
  validateSpreadsheetId,
  validateGitHubToken,
  validateGitHubAppId,
  validateGitHubInstallationId,
  validatePrivateKey,
} from '../../src/utils/validation';
import { ValidationError } from '../../src/utils/errors';

describe('Input Validation', () => {
  describe('validateRepositoryOwner', () => {
    it('should accept valid owner names', () => {
      expect(() => validateRepositoryOwner('github')).not.toThrow();
      expect(() => validateRepositoryOwner('microsoft')).not.toThrow();
      expect(() => validateRepositoryOwner('test-user')).not.toThrow();
      expect(() => validateRepositoryOwner('user123')).not.toThrow();
      expect(() => validateRepositoryOwner('a')).not.toThrow(); // 1文字もOK
    });

    it('should reject invalid owner names', () => {
      expect(() => validateRepositoryOwner('')).toThrow(ValidationError);
      expect(() => validateRepositoryOwner('-invalid')).toThrow(ValidationError); // 先頭ハイフン
      expect(() => validateRepositoryOwner('invalid-')).toThrow(ValidationError); // 末尾ハイフン
      expect(() => validateRepositoryOwner('a'.repeat(40))).toThrow(ValidationError); // 40文字
      expect(() => validateRepositoryOwner('user@example')).toThrow(ValidationError); // 不正文字
      expect(() => validateRepositoryOwner('user name')).toThrow(ValidationError); // スペース
    });

    it('should reject non-string values', () => {
      expect(() => validateRepositoryOwner(null as unknown as string)).toThrow(ValidationError);
      expect(() => validateRepositoryOwner(undefined as unknown as string)).toThrow(
        ValidationError
      );
      expect(() => validateRepositoryOwner(123 as unknown as string)).toThrow(ValidationError);
    });
  });

  describe('validateRepositoryName', () => {
    it('should accept valid repository names', () => {
      expect(() => validateRepositoryName('repo')).not.toThrow();
      expect(() => validateRepositoryName('my-repo')).not.toThrow();
      expect(() => validateRepositoryName('my_repo')).not.toThrow();
      expect(() => validateRepositoryName('my.repo')).not.toThrow();
      expect(() => validateRepositoryName('repo-123')).not.toThrow();
      expect(() => validateRepositoryName('a')).not.toThrow();
    });

    it('should reject repository names with dangerous patterns', () => {
      expect(() => validateRepositoryName('../etc/passwd')).toThrow(ValidationError);
      expect(() => validateRepositoryName('..\\windows')).toThrow(ValidationError);
      expect(() => validateRepositoryName('repo<script>')).toThrow(ValidationError);
      expect(() => validateRepositoryName('repo>output')).toThrow(ValidationError);
      expect(() => validateRepositoryName('repo"test"')).toThrow(ValidationError);
      expect(() => validateRepositoryName("repo'test")).toThrow(ValidationError);
      expect(() => validateRepositoryName('repo`cmd`')).toThrow(ValidationError);
    });

    it('should reject invalid repository names', () => {
      expect(() => validateRepositoryName('')).toThrow(ValidationError);
      expect(() => validateRepositoryName('a'.repeat(101))).toThrow(ValidationError); // 101文字
      expect(() => validateRepositoryName('repo name')).toThrow(ValidationError); // スペース
      expect(() => validateRepositoryName('repo@example')).toThrow(ValidationError); // 不正文字
    });
  });

  describe('validateProjectName', () => {
    it('should accept valid project names', () => {
      expect(() => validateProjectName('Project A')).not.toThrow();
      expect(() => validateProjectName('my-project')).not.toThrow();
      expect(() => validateProjectName('my_project')).not.toThrow();
      expect(() => validateProjectName('Project 123')).not.toThrow();
      expect(() => validateProjectName('a')).not.toThrow();
    });

    it('should reject invalid project names', () => {
      expect(() => validateProjectName('')).toThrow(ValidationError);
      expect(() => validateProjectName('a'.repeat(101))).toThrow(ValidationError); // 101文字
      expect(() => validateProjectName('project@example')).toThrow(ValidationError); // 不正文字
      expect(() => validateProjectName('project.test')).toThrow(ValidationError); // ピリオド不可
    });
  });

  describe('validateSpreadsheetId', () => {
    it('should accept valid spreadsheet IDs (44 characters)', () => {
      const validId = '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t';
      expect(() => validateSpreadsheetId(validId)).not.toThrow();
    });

    it('should accept IDs in valid range (20-100 characters)', () => {
      const id20 = 'a'.repeat(20);
      const id50 = 'a'.repeat(50);
      const id100 = 'a'.repeat(100);

      expect(() => validateSpreadsheetId(id20)).not.toThrow();
      expect(() => validateSpreadsheetId(id50)).not.toThrow();
      expect(() => validateSpreadsheetId(id100)).not.toThrow();
    });

    it('should reject IDs that are too short or too long', () => {
      expect(() => validateSpreadsheetId('a'.repeat(19))).toThrow(ValidationError); // 19文字
      expect(() => validateSpreadsheetId('a'.repeat(101))).toThrow(ValidationError); // 101文字
    });

    it('should reject IDs with invalid characters', () => {
      const invalidId = '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s@t';
      expect(() => validateSpreadsheetId(invalidId)).toThrow(ValidationError);
      expect(() => validateSpreadsheetId('id with spaces')).toThrow(ValidationError);
    });

    it('should reject empty or non-string values', () => {
      expect(() => validateSpreadsheetId('')).toThrow(ValidationError);
      expect(() => validateSpreadsheetId(null as unknown as string)).toThrow(ValidationError);
      expect(() => validateSpreadsheetId(undefined as unknown as string)).toThrow(ValidationError);
    });
  });

  describe('validateGitHubToken', () => {
    it('should accept valid Classic PAT tokens', () => {
      const classicPAT = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      expect(() => validateGitHubToken(classicPAT)).not.toThrow();
    });

    it('should accept valid Fine-grained PAT tokens', () => {
      const fineGrainedPAT = 'github_pat_1234567890abcdefghijklmnopqrstuvwxyz';
      expect(() => validateGitHubToken(fineGrainedPAT)).not.toThrow();
    });

    it('should reject tokens that are too short', () => {
      expect(() => validateGitHubToken('short')).toThrow(ValidationError);
    });

    it('should reject empty or non-string values', () => {
      expect(() => validateGitHubToken('')).toThrow(ValidationError);
      expect(() => validateGitHubToken(null as unknown as string)).toThrow(ValidationError);
      expect(() => validateGitHubToken(undefined as unknown as string)).toThrow(ValidationError);
    });
  });

  describe('validateGitHubAppId', () => {
    it('should accept valid App IDs', () => {
      expect(() => validateGitHubAppId('123456')).not.toThrow();
      expect(() => validateGitHubAppId('1')).not.toThrow();
      expect(() => validateGitHubAppId('9876543210')).not.toThrow(); // 10文字
    });

    it('should reject non-numeric App IDs', () => {
      expect(() => validateGitHubAppId('abc123')).toThrow(ValidationError);
      expect(() => validateGitHubAppId('123abc')).toThrow(ValidationError);
    });

    it('should reject App IDs with invalid length', () => {
      expect(() => validateGitHubAppId('')).toThrow(ValidationError);
      expect(() => validateGitHubAppId('12345678901')).toThrow(ValidationError); // 11文字
    });
  });

  describe('validateGitHubInstallationId', () => {
    it('should accept valid Installation IDs', () => {
      expect(() => validateGitHubInstallationId('12345678')).not.toThrow();
      expect(() => validateGitHubInstallationId('1')).not.toThrow();
      expect(() => validateGitHubInstallationId('123456789012')).not.toThrow(); // 12文字
    });

    it('should reject non-numeric Installation IDs', () => {
      expect(() => validateGitHubInstallationId('abc123')).toThrow(ValidationError);
      expect(() => validateGitHubInstallationId('123abc')).toThrow(ValidationError);
    });

    it('should reject Installation IDs with invalid length', () => {
      expect(() => validateGitHubInstallationId('')).toThrow(ValidationError);
      expect(() => validateGitHubInstallationId('1234567890123')).toThrow(ValidationError); // 13文字
    });
  });

  describe('validatePrivateKey', () => {
    const validKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP
QRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
-----END RSA PRIVATE KEY-----`;

    it('should accept valid RSA private keys', () => {
      expect(() => validatePrivateKey(validKey)).not.toThrow();
    });

    it('should accept valid PRIVATE KEY format', () => {
      const pkcs8Key = validKey
        .replace('RSA PRIVATE KEY', 'PRIVATE KEY')
        .replace('RSA PRIVATE KEY', 'PRIVATE KEY');
      expect(() => validatePrivateKey(pkcs8Key)).not.toThrow();
    });

    it('should reject keys without proper BEGIN marker', () => {
      const invalidKey = validKey.replace('-----BEGIN RSA PRIVATE KEY-----', '');
      expect(() => validatePrivateKey(invalidKey)).toThrow(ValidationError);
    });

    it('should reject keys without proper END marker', () => {
      const invalidKey = validKey.replace('-----END RSA PRIVATE KEY-----', '');
      expect(() => validatePrivateKey(invalidKey)).toThrow(ValidationError);
    });

    it('should reject keys that are too short', () => {
      const shortKey = '-----BEGIN RSA PRIVATE KEY-----\nshort\n-----END RSA PRIVATE KEY-----';
      expect(() => validatePrivateKey(shortKey)).toThrow(ValidationError);
    });

    it('should reject empty or non-string values', () => {
      expect(() => validatePrivateKey('')).toThrow(ValidationError);
      expect(() => validatePrivateKey(null as unknown as string)).toThrow(ValidationError);
      expect(() => validatePrivateKey(undefined as unknown as string)).toThrow(ValidationError);
    });
  });

  describe('Error context', () => {
    it('should include context in ValidationError (owner length)', () => {
      try {
        validateRepositoryOwner('a'.repeat(40));
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.context).toBeDefined();
        expect(validationError.context?.owner).toBe('a'.repeat(40));
        expect(validationError.context?.length).toBe(40);
      }
    });

    it('should include context in ValidationError (spreadsheet ID length)', () => {
      try {
        validateSpreadsheetId('a'.repeat(19));
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.context).toBeDefined();
        expect(validationError.context?.id).toBe('a'.repeat(19));
        expect(validationError.context?.length).toBe(19);
      }
    });

    it('should include context in ValidationError (invalid App ID)', () => {
      try {
        validateGitHubAppId('abc123');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.context).toBeDefined();
        expect(validationError.context?.appId).toBe('abc123');
      }
    });
  });
});

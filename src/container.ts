/**
 * サービスコンテナ（依存性注入）
 * 本番環境ではGAS実装、テスト環境ではモック実装を注入する
 */

import type { ServiceContainer } from './interfaces';
import { ConfigurationError, ErrorCode } from './utils/errors';

let container: ServiceContainer | null = null;

/**
 * サービスコンテナを初期化する
 * アプリケーション起動時に一度だけ呼び出す
 */
export function initializeContainer(services: ServiceContainer): void {
  container = services;
}

/**
 * サービスコンテナを取得する
 * initializeContainer が呼ばれていない場合はエラー
 */
export function getContainer(): ServiceContainer {
  if (!container) {
    throw new ConfigurationError(
      'Service container not initialized. Call initializeContainer() first.',
      {
        code: ErrorCode.CONTAINER_NOT_INITIALIZED,
      }
    );
  }
  return container;
}

/**
 * サービスコンテナをリセットする（テスト用）
 */
export function resetContainer(): void {
  container = null;
}

/**
 * コンテナが初期化済みかどうかを確認
 */
export function isContainerInitialized(): boolean {
  return container !== null;
}

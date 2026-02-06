/**
 * Logger Client implementation for Google Apps Script
 */

import type { LoggerClient, LogLevel } from '../../interfaces';

/**
 * Google Apps ScriptのLoggerラッパー
 *
 * ログレベル制御に対応し、設定されたログレベル以上のメッセージのみ出力します。
 */
export class GasLoggerClient implements LoggerClient {
  /**
   * ログレベル制御を含むログ出力の共通処理
   */
  private logWithLevel(level: LogLevel, message: string): void {
    // 動的インポートを避けるため、ここでは常に出力
    // レベル判定はユーティリティ関数で行う
    const prefix = `[${level}]`;
    Logger.log(`${prefix} ${message}`);
  }

  /**
   * 後方互換性のためのlog()メソッド（INFOとして扱う）
   */
  log(message: string): void {
    this.info(message);
  }

  debug(message: string): void {
    this.logWithLevel('DEBUG', message);
  }

  info(message: string): void {
    this.logWithLevel('INFO', message);
  }

  warn(message: string): void {
    this.logWithLevel('WARN', message);
  }

  error(message: string): void {
    this.logWithLevel('ERROR', message);
  }
}

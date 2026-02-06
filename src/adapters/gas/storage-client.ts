/**
 * Storage Client implementation for Google Apps Script
 */

import type { StorageClient } from '../../interfaces';

export class GasStorageClient implements StorageClient {
  private props = PropertiesService.getScriptProperties();

  getProperty(key: string): string | null {
    return this.props.getProperty(key);
  }

  setProperty(key: string, value: string): void {
    this.props.setProperty(key, value);
  }

  deleteProperty(key: string): void {
    this.props.deleteProperty(key);
  }

  getProperties(): Record<string, string> {
    return this.props.getProperties();
  }
}

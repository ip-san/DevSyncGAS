/**
 * Trigger implementation for Google Apps Script
 */

import type { Trigger } from '../../../interfaces';

export class GasTrigger implements Trigger {
  // Symbol to identify GasTrigger instances
  private readonly _isGasTrigger = true;

  constructor(private trigger: GoogleAppsScript.Script.Trigger) {}

  getHandlerFunction(): string {
    return this.trigger.getHandlerFunction();
  }

  getUnderlyingTrigger(): GoogleAppsScript.Script.Trigger {
    return this.trigger;
  }

  static isGasTrigger(trigger: Trigger): trigger is GasTrigger {
    return (trigger as GasTrigger)._isGasTrigger === true;
  }
}

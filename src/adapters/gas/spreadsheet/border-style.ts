/**
 * Border style mapping utility for Google Apps Script Spreadsheet
 */

import type { BorderStyle } from '../../../interfaces';

/**
 * BorderStyleをGASのBorderStyleにマップ
 */
export function toGasBorderStyle(
  style: BorderStyle | null | undefined
): GoogleAppsScript.Spreadsheet.BorderStyle | null {
  if (!style) {
    return null;
  }
  const styleMap: Record<BorderStyle, GoogleAppsScript.Spreadsheet.BorderStyle> = {
    dotted: SpreadsheetApp.BorderStyle.DOTTED,
    dashed: SpreadsheetApp.BorderStyle.DASHED,
    solid: SpreadsheetApp.BorderStyle.SOLID,
    solid_medium: SpreadsheetApp.BorderStyle.SOLID_MEDIUM,
    solid_thick: SpreadsheetApp.BorderStyle.SOLID_THICK,
    double: SpreadsheetApp.BorderStyle.DOUBLE,
  };
  return styleMap[style];
}

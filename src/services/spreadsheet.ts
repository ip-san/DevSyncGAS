import type { DevOpsMetrics } from "../types";

const HEADERS = [
  "Date",
  "Repository",
  "Deployment Count",
  "Deployment Frequency",
  "Lead Time (hours)",
  "Total Deployments",
  "Failed Deployments",
  "Change Failure Rate (%)",
  "MTTR (hours)",
];

export function writeMetricsToSheet(
  spreadsheetId: string,
  sheetName: string,
  metrics: DevOpsMetrics[]
): void {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  const rows = metrics.map((m) => [
    m.date,
    m.repository,
    m.deploymentCount,
    m.deploymentFrequency,
    m.leadTimeForChangesHours,
    m.totalDeployments,
    m.failedDeployments,
    m.changeFailureRate,
    m.meanTimeToRecoveryHours ?? "N/A",
  ]);

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, HEADERS.length).setValues(rows);

  formatSheet(sheet);
}

function formatSheet(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  // 数値列のフォーマット
  sheet.getRange(2, 3, lastRow - 1, 1).setNumberFormat("#,##0");
  sheet.getRange(2, 5, lastRow - 1, 1).setNumberFormat("#,##0.0");
  sheet.getRange(2, 8, lastRow - 1, 1).setNumberFormat("#,##0.0");

  // 列幅の自動調整
  for (let i = 1; i <= lastCol; i++) {
    sheet.autoResizeColumn(i);
  }
}

export function clearOldData(
  spreadsheetId: string,
  sheetName: string,
  daysToKeep = 90
): void {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const data = sheet.getDataRange().getValues();
  const rowsToDelete: number[] = [];

  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = new Date(data[i][0]);
    if (rowDate < cutoffDate) {
      rowsToDelete.push(i + 1);
    }
  }

  for (const row of rowsToDelete) {
    sheet.deleteRow(row);
  }
}

export function createSummarySheet(
  spreadsheetId: string,
  sourceSheetName: string
): void {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const summarySheetName = `${sourceSheetName} - Summary`;
  
  let summarySheet = spreadsheet.getSheetByName(summarySheetName);
  if (!summarySheet) {
    summarySheet = spreadsheet.insertSheet(summarySheetName);
  } else {
    summarySheet.clear();
  }

  const sourceSheet = spreadsheet.getSheetByName(sourceSheetName);
  if (!sourceSheet) return;

  const summaryHeaders = [
    "Repository",
    "Avg Deployment Freq",
    "Avg Lead Time (hours)",
    "Avg Change Failure Rate (%)",
    "Avg MTTR (hours)",
    "Last Updated",
  ];

  summarySheet.getRange(1, 1, 1, summaryHeaders.length).setValues([summaryHeaders]);
  summarySheet.getRange(1, 1, 1, summaryHeaders.length).setFontWeight("bold");
}

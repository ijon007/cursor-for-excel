import { getWorkbookApi, useAppStore } from "./store";

type UniverRangeLike = {
  setValue: (value: unknown) => void;
  setValues: (values: unknown[][]) => void;
  setFormula: (formula: string) => void;
  setFontWeight: (fontWeight: "bold" | "normal" | null) => void;
  setBackgroundColor: (color: string) => void;
  setFontColor: (color: string | null) => void;
  merge: (options?: { defaultMerge?: boolean; isForceMerge?: boolean }) => void;
  clear: () => void;
  getValue: () => unknown;
  activate?: () => void;
  activateAsCurrentCell?: () => void;
};

type UniverWorksheetLike = {
  getRange: (
    row: number,
    column: number,
    numRows?: number,
    numColumns?: number
  ) => UniverRangeLike;
  insertRowsBefore: (beforePosition: number, howMany: number) => void;
  insertColumnsBefore: (beforePosition: number, howMany: number) => void;
  setName: (name: string) => void;
  setColumnWidth: (columnPosition: number, width: number) => void;
  setFrozenRows: (rows: number) => void;
  setFrozenColumns: (columns: number) => void;
  activate?: () => void;
};

type UniverWorkbookLike = {
  getActiveSheet: () => UniverWorksheetLike;
  insertSheet: (sheetName?: string) => UniverWorksheetLike;
  undo: () => void;
  redo: () => void;
};

type UniverApiLike = {
  getActiveWorkbook?: () => UniverWorkbookLike | null;
};

function getActiveWorkbook(): UniverWorkbookLike | null {
  const api = getWorkbookApi() as UniverApiLike | null;
  return api?.getActiveWorkbook?.() ?? null;
}

function getActiveSheet(): UniverWorksheetLike | null {
  return getActiveWorkbook()?.getActiveSheet() ?? null;
}

function colLabel(c: number): string {
  let label = "";
  let n = c;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function highlightCells(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
) {
  const sheet = getActiveSheet();
  if (!sheet) return;
  try {
    const rows = endRow - startRow + 1;
    const cols = endCol - startCol + 1;
    sheet.getRange(startRow, startCol, rows, cols).activate?.();
  } catch {
    // Ignore UI-only highlighting failures.
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function executeToolOnClient(toolName: string, args: Record<string, any>) {
  // Chart tool doesn't need the spreadsheet API
  if (toolName === "add_chart") {
    useAppStore.getState().addChart({
      id: args.chartId || Math.random().toString(36).slice(2, 10),
      type: args.type,
      title: args.title,
      xLabels: args.xLabels,
      series: args.series,
    });
    return;
  }

  const workbook = getActiveWorkbook();
  const sheet = workbook?.getActiveSheet();
  if (!sheet || !workbook) return;

  try {
    switch (toolName) {
      case "write_cell": {
        sheet.getRange(args.row, args.col).setValue(args.value);
        highlightCells(args.row, args.col, args.row, args.col);
        break;
      }
      case "write_range": {
        const { startRow, startCol, values } = args;
        if (!values || values.length === 0) break;
        const maxCols = Math.max(...values.map((r: unknown[]) => r?.length ?? 0));
        if (maxCols === 0) break;
        // Pad rows to uniform length so setCellValuesByRange doesn't crash
        const padded = values.map((r: unknown[]) => {
          const row = Array.isArray(r) ? [...r] : [];
          while (row.length < maxCols) row.push(null);
          return row;
        });
        const endRow = startRow + padded.length - 1;
        const endCol = startCol + maxCols - 1;
        try {
          sheet
            .getRange(startRow, startCol, padded.length, maxCols)
            .setValues(padded);
        } catch {
          // Fallback: write cell by cell
          for (let r = 0; r < padded.length; r++) {
            for (let c = 0; c < padded[r].length; c++) {
              if (padded[r][c] != null) {
                sheet
                  .getRange(startRow + r, startCol + c)
                  .setValue(padded[r][c]);
              }
            }
          }
        }
        highlightCells(startRow, startCol, endRow, endCol);
        break;
      }
      case "set_formula": {
        sheet.getRange(args.row, args.col).setFormula(args.formula);
        highlightCells(args.row, args.col, args.row, args.col);
        break;
      }
      case "format_cells": {
        const { startRow, startCol, endRow, endCol } = args;
        const range = sheet.getRange(
          startRow,
          startCol,
          endRow - startRow + 1,
          endCol - startCol + 1
        );
        if (args.bold !== undefined) {
          range.setFontWeight(args.bold ? "bold" : "normal");
        }
        if (args.backgroundColor) {
          range.setBackgroundColor(args.backgroundColor);
        }
        if (args.textColor) {
          range.setFontColor(args.textColor);
        }
        break;
      }
      case "insert_row": {
        sheet.insertRowsBefore(args.index, args.count ?? 1);
        break;
      }
      case "insert_column": {
        sheet.insertColumnsBefore(args.index, args.count ?? 1);
        break;
      }
      case "add_sheet": {
        const newSheet = workbook.insertSheet(args.name);
        if (args.name) newSheet.setName(args.name);
        newSheet.activate?.();
        break;
      }
      case "rename_sheet": {
        sheet.setName(args.name);
        break;
      }
      case "clear_range": {
        sheet
          .getRange(
            args.startRow,
            args.startCol,
            args.endRow - args.startRow + 1,
            args.endCol - args.startCol + 1
          )
          .clear();
        break;
      }
      case "set_column_width": {
        for (const [col, width] of Object.entries(args.columns ?? {})) {
          const columnIndex = Number(col);
          if (!Number.isFinite(columnIndex)) continue;
          sheet.setColumnWidth(columnIndex, Number(width));
        }
        break;
      }
      case "merge_cells": {
        sheet
          .getRange(
            args.startRow,
            args.startCol,
            args.endRow - args.startRow + 1,
            args.endCol - args.startCol + 1
          )
          .merge({ defaultMerge: true, isForceMerge: true });
        break;
      }
      case "freeze_panes": {
        if (args.type === "row" || args.type === "both") {
          sheet.setFrozenRows((args.row ?? 0) + 1);
        }
        if (args.type === "column" || args.type === "both") {
          sheet.setFrozenColumns((args.column ?? 0) + 1);
        }
        break;
      }
      case "conditional_format": {
        applyConditionalFormat(sheet, args);
        break;
      }
    }
  } catch (e) {
    console.error(`Tool execution error (${toolName}):`, e);
  }
}

function readNumericCell(
  sheet: UniverWorksheetLike,
  row: number,
  col: number
): number | null {
  const raw = sheet.getRange(row, col).getValue();
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (raw === null || raw === undefined || raw === "") return null;
  const parsed = Number.parseFloat(String(raw).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyConditionalFormat(sheet: UniverWorksheetLike, args: any) {
  const { startRow, startCol, endRow, endCol, rule, threshold = 0, colorHigh = "#c8e6c9", colorLow = "#ffcdd2" } = args;

  let min = Infinity;
  let max = -Infinity;
  if (rule === "color_scale") {
    for (let rr = startRow; rr <= endRow; rr++) {
      for (let cc = startCol; cc <= endCol; cc++) {
        const n = readNumericCell(sheet, rr, cc);
        if (n == null) continue;
        min = Math.min(min, n);
        max = Math.max(max, n);
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return;
  }

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      try {
        const num = readNumericCell(sheet, r, c);
        if (num == null) continue;

        let bg: string | undefined;
        switch (rule) {
          case "highlight_above":
            bg = num > threshold ? colorHigh : undefined;
            break;
          case "highlight_below":
            bg = num < threshold ? colorLow : undefined;
            break;
          case "highlight_negative":
            bg = num < 0 ? colorLow : num > 0 ? colorHigh : undefined;
            break;
          case "color_scale": {
            const pct = (num - min) / (max - min);
            bg = pct > 0.5 ? colorHigh : colorLow;
            break;
          }
        }
        if (bg) sheet.getRange(r, c).setBackgroundColor(bg);
      } catch { /* ignore individual cell errors */ }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getToolDescription(toolName: string, args: Record<string, any>): string {
  switch (toolName) {
    case "write_cell":
      return `Writing "${args.value}" to ${colLabel(args.col)}${args.row + 1}`;
    case "write_range": {
      const rows = args.values?.length ?? 0;
      const cols = args.values?.[0]?.length ?? 0;
      return `Writing ${rows}×${cols} range at ${colLabel(args.startCol)}${args.startRow + 1}`;
    }
    case "set_formula":
      return `Formula ${args.formula} → ${colLabel(args.col)}${args.row + 1}`;
    case "format_cells":
      return `Formatting ${colLabel(args.startCol)}${args.startRow + 1}:${colLabel(args.endCol)}${args.endRow + 1}`;
    case "insert_row":
      return `Inserting ${args.count ?? 1} row(s) at row ${args.index + 1}`;
    case "insert_column":
      return `Inserting ${args.count ?? 1} column(s) at ${colLabel(args.index)}`;
    case "add_sheet":
      return `Adding sheet "${args.name || "new"}"`;
    case "rename_sheet":
      return `Renaming sheet to "${args.name}"`;
    case "read_range":
      return `Reading ${colLabel(args.startCol)}${args.startRow + 1}:${colLabel(args.endCol)}${args.endRow + 1}`;
    case "clear_range":
      return `Clearing ${colLabel(args.startCol)}${args.startRow + 1}:${colLabel(args.endCol)}${args.endRow + 1}`;
    case "set_column_width":
      return `Setting column widths`;
    case "merge_cells":
      return `Merging ${colLabel(args.startCol)}${args.startRow + 1}:${colLabel(args.endCol)}${args.endRow + 1}`;
    case "add_chart":
      return `Creating ${args.type} chart: "${args.title}"`;
    case "freeze_panes":
      return `Freezing ${args.type} panes`;
    case "conditional_format":
      return `Conditional formatting ${colLabel(args.startCol)}${args.startRow + 1}:${colLabel(args.endCol)}${args.endRow + 1}`;
    default:
      return `${toolName}...`;
  }
}

export function handleUndo() {
  getActiveWorkbook()?.undo();
}

export function handleRedo() {
  getActiveWorkbook()?.redo();
}

export function selectCell(cellRef: string) {
  const sheet = getActiveSheet();
  if (!sheet) return;
  const match = cellRef.match(/^([A-Z]+)(\d+)$/);
  if (!match) return;
  const colStr = match[1];
  const row = parseInt(match[2]) - 1;
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col -= 1;
  try {
    const range = sheet.getRange(row, col);
    range.activateAsCurrentCell?.();
    range.activate?.();
  } catch { /* ignore */ }
}

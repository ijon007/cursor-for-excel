import { getWorkbookApi, useAppStore } from "./store";

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
  const api = getWorkbookApi();
  if (!api) return;
  const color = "#d4f5f0";
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      try { api.setCellFormat(r, c, "bg", color); } catch { /* */ }
    }
  }
  setTimeout(() => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        try { api.setCellFormat(r, c, "bg", undefined); } catch { /* */ }
      }
    }
  }, 1500);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function executeToolOnClient(toolName: string, args: Record<string, any>) {
  const api = getWorkbookApi();

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

  if (!api) return;

  try {
    switch (toolName) {
      case "write_cell": {
        api.setCellValue(args.row, args.col, args.value);
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
          api.setCellValuesByRange(padded, {
            row: [startRow, endRow],
            column: [startCol, endCol],
          });
        } catch {
          // Fallback: write cell by cell
          for (let r = 0; r < padded.length; r++) {
            for (let c = 0; c < padded[r].length; c++) {
              if (padded[r][c] != null) {
                api.setCellValue(startRow + r, startCol + c, padded[r][c]);
              }
            }
          }
        }
        highlightCells(startRow, startCol, endRow, endCol);
        break;
      }
      case "set_formula": {
        api.setCellValue(args.row, args.col, args.formula);
        highlightCells(args.row, args.col, args.row, args.col);
        break;
      }
      case "format_cells": {
        const { startRow, startCol, endRow, endCol } = args;
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            try {
              if (args.bold !== undefined)
                api.setCellFormat(r, c, "bl", args.bold ? 1 : 0);
              if (args.backgroundColor)
                api.setCellFormat(r, c, "bg", args.backgroundColor);
              if (args.textColor)
                api.setCellFormat(r, c, "fc", args.textColor);
            } catch {
              /* skip cells that don't exist yet */
            }
          }
        }
        break;
      }
      case "insert_row": {
        api.insertRowOrColumn("row", args.index, args.count ?? 1);
        break;
      }
      case "insert_column": {
        api.insertRowOrColumn("column", args.index, args.count ?? 1);
        break;
      }
      case "add_sheet": {
        api.addSheet();
        if (args.name) {
          setTimeout(() => {
            try { api.setSheetName(args.name); } catch { /* */ }
          }, 150);
        }
        break;
      }
      case "rename_sheet": {
        api.setSheetName(args.name);
        break;
      }
      case "clear_range": {
        for (let r = args.startRow; r <= args.endRow; r++) {
          for (let c = args.startCol; c <= args.endCol; c++) {
            api.clearCell(r, c);
          }
        }
        break;
      }
      case "set_column_width": {
        api.setColumnWidth(args.columns);
        break;
      }
      case "merge_cells": {
        api.mergeCells(
          [{ row: [args.startRow, args.endRow], column: [args.startCol, args.endCol] }],
          "merge-all"
        );
        break;
      }
      case "freeze_panes": {
        api.freeze(args.type, {
          row: args.row ?? 0,
          column: args.column ?? 0,
        });
        break;
      }
      case "conditional_format": {
        applyConditionalFormat(api, args);
        break;
      }
    }
  } catch (e) {
    console.error(`Tool execution error (${toolName}):`, e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyConditionalFormat(api: any, args: any) {
  const { startRow, startCol, endRow, endCol, rule, threshold = 0, colorHigh = "#c8e6c9", colorLow = "#ffcdd2" } = args;

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      try {
        const raw = api.getCellValue(r, c, { type: "v" });
        const num = typeof raw === "number" ? raw : parseFloat(raw);
        if (isNaN(num)) continue;

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
            // Collect all values in range to find min/max
            let min = Infinity, max = -Infinity;
            for (let rr = startRow; rr <= endRow; rr++) {
              for (let cc = startCol; cc <= endCol; cc++) {
                const v = api.getCellValue(rr, cc, { type: "v" });
                const n = typeof v === "number" ? v : parseFloat(v);
                if (!isNaN(n)) { min = Math.min(min, n); max = Math.max(max, n); }
              }
            }
            if (min === max) break;
            const pct = (num - min) / (max - min);
            bg = pct > 0.5 ? colorHigh : colorLow;
            break;
          }
        }
        if (bg) api.setCellFormat(r, c, "bg", bg);
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
  const api = getWorkbookApi();
  if (api) api.handleUndo();
}

export function handleRedo() {
  const api = getWorkbookApi();
  if (api) api.handleRedo();
}

export function selectCell(cellRef: string) {
  const api = getWorkbookApi();
  if (!api) return;
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
    api.setSelection([{ row: [row, row], column: [col, col] }]);
    api.scroll({ targetRow: row, targetColumn: col });
  } catch { /* ignore */ }
}

import { getWorkbookApi } from "./store";

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
  const range = [{ row: [startRow, endRow], column: [startCol, endCol] }];

  try {
    api.setCellFormatByRange("bg", color, range);
  } catch {
    /* ignore */
  }

  setTimeout(() => {
    try {
      api.setCellFormatByRange("bg", undefined, range);
    } catch {
      /* ignore */
    }
  }, 1500);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function executeToolOnClient(toolName: string, args: Record<string, any>) {
  const api = getWorkbookApi();
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
        const endRow = startRow + values.length - 1;
        const endCol =
          startCol + Math.max(...values.map((r: unknown[]) => r.length)) - 1;
        api.setCellValuesByRange(values, {
          row: [startRow, endRow],
          column: [startCol, endCol],
        });
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
        const range = [
          { row: [startRow, endRow], column: [startCol, endCol] },
        ];
        if (args.bold !== undefined)
          api.setCellFormatByRange("bl", args.bold ? 1 : 0, range);
        if (args.backgroundColor)
          api.setCellFormatByRange("bg", args.backgroundColor, range);
        if (args.textColor)
          api.setCellFormatByRange("fc", args.textColor, range);
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
            try {
              api.setSheetName(args.name);
            } catch {
              /* ignore */
            }
          }, 150);
        }
        break;
      }

      case "rename_sheet": {
        api.setSheetName(args.name);
        break;
      }

      case "clear_range": {
        const { startRow, startCol, endRow, endCol } = args;
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
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
        const { startRow, startCol, endRow, endCol } = args;
        api.mergeCells(
          [{ row: [startRow, endRow], column: [startCol, endCol] }],
          "merge-all"
        );
        break;
      }
    }
  } catch (e) {
    console.error(`Tool execution error (${toolName}):`, e);
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
    default:
      return `${toolName}...`;
  }
}

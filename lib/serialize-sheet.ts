import { getWorkbookApi } from "./store";

const MAX_TOKEN_ESTIMATE = 6000;
const AVG_CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKEN_ESTIMATE * AVG_CHARS_PER_TOKEN;

type UniverRangeLike = {
  getValues: () => (string | number | boolean | null)[][];
  getFormulas: () => string[][];
  getValue: () => string | number | boolean | null;
  getFormula: () => string;
};

type UniverWorksheetLike = {
  getSheetName: () => string;
  getLastRow: () => number;
  getLastColumn: () => number;
  getRange: (
    row: number,
    col: number,
    numRows?: number,
    numCols?: number
  ) => UniverRangeLike;
};

type UniverWorkbookLike = {
  getSheets: () => UniverWorksheetLike[];
};

type UniverApiLike = {
  getActiveWorkbook?: () => UniverWorkbookLike | null;
};

function colLabel(c: number): string {
  let label = "";
  let n = c;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export function serializeSheetToString(): string {
  const api = getWorkbookApi() as UniverApiLike | null;
  const workbook = api?.getActiveWorkbook?.();
  if (!workbook) return "Empty spreadsheet.";

  try {
    const allSheets = workbook.getSheets();
    if (!allSheets || allSheets.length === 0) return "Empty spreadsheet.";

    const lines: string[] = [];
    let totalChars = 0;

    for (let si = 0; si < allSheets.length; si++) {
      const sheet = allSheets[si];
      const sheetName = sheet.getSheetName?.() || `Sheet${si + 1}`;
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();

      if (lastRow < 0 || lastCol < 0) {
        lines.push(`Sheet "${sheetName}": empty`);
        continue;
      }

      const firstCell = sheet.getRange(0, 0);
      const isSingleEmptyCell =
        lastRow === 0 &&
        lastCol === 0 &&
        firstCell.getValue() == null &&
        !firstCell.getFormula();
      if (isSingleEmptyCell) {
        lines.push(`Sheet "${sheetName}": empty`);
        continue;
      }

      const maxRow = Math.max(lastRow, 0);
      const maxCol = Math.max(lastCol, 0);
      const range = sheet.getRange(0, 0, maxRow + 1, maxCol + 1);
      const values = range.getValues();
      const formulas = range.getFormulas();

      lines.push(
        `Sheet "${sheetName}" (${maxRow + 1} rows × ${maxCol + 1} cols):`
      );

      // Output as compact CSV-like rows (only rows that have data)
      for (let r = 0; r <= Math.min(maxRow, 200); r++) {
        const cells: string[] = [];
        let hasData = false;
        for (let c = 0; c <= maxCol; c++) {
          const formula = formulas[r]?.[c];
          const rawValue = values[r]?.[c];
          const v = formula || (rawValue == null ? "" : String(rawValue));
          cells.push(v);
          if (v) hasData = true;
        }
        if (!hasData) continue;

        const header = `  ${colLabel(0)}${r + 1}:`;
        const row = `${header} ${cells.join(" | ")}`;
        totalChars += row.length;
        if (totalChars > MAX_CHARS) {
          lines.push("  ... (truncated for context limit)");
          break;
        }
        lines.push(row);
      }

      if (totalChars > MAX_CHARS) break;
    }

    return lines.join("\n") || "Empty spreadsheet.";
  } catch {
    return "Empty spreadsheet.";
  }
}

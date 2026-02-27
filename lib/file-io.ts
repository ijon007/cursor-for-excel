import { getWorkbookApi } from "./store";
import * as XLSX from "xlsx";

type CellPrimitive = string | number | boolean | null;

type UniverRangeLike = {
  setValues: (values: CellPrimitive[][]) => void;
  getValues: () => CellPrimitive[][];
  getFormulas: () => string[][];
  getValue: () => CellPrimitive;
  getFormula: () => string;
};

type UniverWorksheetLike = {
  setName: (name: string) => void;
  clear: () => void;
  setRowCount: (rowCount: number) => void;
  setColumnCount: (columnCount: number) => void;
  getRange: (
    row: number,
    col: number,
    numRows?: number,
    numCols?: number
  ) => UniverRangeLike;
  getSheetName: () => string;
  getLastRow: () => number;
  getLastColumn: () => number;
  activate?: () => void;
};

type UniverWorkbookLike = {
  getSheets: () => UniverWorksheetLike[];
  insertSheet: (sheetName?: string) => UniverWorksheetLike;
  deleteSheet: (sheet: UniverWorksheetLike) => boolean;
};

type UniverApiLike = {
  getActiveWorkbook?: () => UniverWorkbookLike | null;
};

function getActiveWorkbook(): UniverWorkbookLike | null {
  const api = getWorkbookApi() as UniverApiLike | null;
  return api?.getActiveWorkbook?.() ?? null;
}

function toRectangular(values: CellPrimitive[][]): { grid: CellPrimitive[][]; cols: number } {
  const cols = values.reduce((max, row) => Math.max(max, row.length), 0);
  if (cols === 0) return { grid: [], cols: 0 };
  return {
    cols,
    grid: values.map((row) => {
      const next = [...row];
      while (next.length < cols) next.push(null);
      return next;
    }),
  };
}

function sheetToAoa(sheet: UniverWorksheetLike): CellPrimitive[][] {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 0 || lastCol < 0) return [[]];

  const topLeft = sheet.getRange(0, 0);
  const isSingleEmptyCell =
    lastRow === 0 &&
    lastCol === 0 &&
    topLeft.getValue() == null &&
    !topLeft.getFormula();
  if (isSingleEmptyCell) return [[]];

  const range = sheet.getRange(0, 0, lastRow + 1, lastCol + 1);
  const values = range.getValues();
  const formulas = range.getFormulas();

  return values.map((row, r) =>
    row.map((value, c) => {
      const formula = formulas[r]?.[c];
      if (formula) return formula;
      return value ?? null;
    })
  );
}

export async function importXlsx(file: File): Promise<void> {
  const workbook = getActiveWorkbook();
  if (!workbook) return;

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const parsedSheets = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
    }) as CellPrimitive[][];
    const { grid, cols } = toRectangular(rows);
    return {
      name,
      values: grid,
      rowCount: Math.max(rows.length + 20, 84),
      columnCount: Math.max(cols + 10, 60),
      cols,
    };
  });

  if (parsedSheets.length === 0) return;

  let workbookSheets = workbook.getSheets();
  while (workbookSheets.length < parsedSheets.length) {
    workbook.insertSheet();
    workbookSheets = workbook.getSheets();
  }

  parsedSheets.forEach((parsed, idx) => {
    const targetSheet = workbookSheets[idx];
    targetSheet.clear();
    targetSheet.setName(parsed.name || `Sheet${idx + 1}`);
    targetSheet.setRowCount(parsed.rowCount);
    targetSheet.setColumnCount(parsed.columnCount);
    if (parsed.values.length > 0 && parsed.cols > 0) {
      targetSheet
        .getRange(0, 0, parsed.values.length, parsed.cols)
        .setValues(parsed.values);
    }
  });

  workbookSheets = workbook.getSheets();
  for (let i = workbookSheets.length - 1; i >= parsedSheets.length; i--) {
    if (workbookSheets.length <= 1) break;
    workbook.deleteSheet(workbookSheets[i]);
    workbookSheets = workbook.getSheets();
  }

  workbook.getSheets()[0]?.activate?.();
}

export function exportXlsx(): void {
  const workbook = getActiveWorkbook();
  if (!workbook) return;

  const allSheets = workbook.getSheets();
  if (!allSheets || allSheets.length === 0) return;

  const wb = XLSX.utils.book_new();

  for (const sheet of allSheets) {
    const aoa = sheetToAoa(sheet);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, sheet.getSheetName() || "Sheet");
  }

  XLSX.writeFile(wb, "spreadsheet.xlsx");
}

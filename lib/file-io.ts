import { getWorkbookApi } from "./store";
import * as XLSX from "xlsx";

export async function importXlsx(file: File): Promise<void> {
  const api = getWorkbookApi();
  if (!api) return;

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheets: any[] = [];

  wb.SheetNames.forEach((name, idx) => {
    const ws = wb.Sheets[name];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as (
      | string
      | number
      | null
    )[][];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const celldata: any[] = [];

    for (let r = 0; r < jsonData.length; r++) {
      for (let c = 0; c < jsonData[r].length; c++) {
        const val = jsonData[r][c];
        if (val === null || val === undefined || val === "") continue;

        celldata.push({
          r,
          c,
          v: {
            v: val,
            m: String(val),
            ct: {
              fa: "General",
              t: typeof val === "number" ? "n" : "g",
            },
          },
        });
      }
    }

    sheets.push({
      name,
      id: `imported_${idx}`,
      order: idx,
      status: idx === 0 ? 1 : 0,
      celldata,
      row: Math.max(jsonData.length + 20, 84),
      column: Math.max(
        jsonData.reduce((max, row) => Math.max(max, row.length), 0) + 10,
        60
      ),
      config: {},
    });
  });

  if (sheets.length > 0) {
    api.updateSheet(sheets);
  }
}

export function exportXlsx(): void {
  const api = getWorkbookApi();
  if (!api) return;

  const allSheets = api.getAllSheets();
  if (!allSheets || allSheets.length === 0) return;

  const wb = XLSX.utils.book_new();

  for (const sheet of allSheets) {
    const celldata = sheet.celldata || [];
    let maxRow = 0;
    let maxCol = 0;

    for (const cd of celldata) {
      if (cd.r > maxRow) maxRow = cd.r;
      if (cd.c > maxCol) maxCol = cd.c;
    }

    const aoa: (string | number | null)[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      aoa[r] = new Array(maxCol + 1).fill(null);
    }

    for (const cd of celldata) {
      if (!cd.v && cd.v !== 0) continue;
      const val =
        typeof cd.v === "object" && cd.v !== null
          ? cd.v.f
            ? cd.v.f
            : cd.v.v !== undefined
              ? cd.v.v
              : cd.v.m
          : cd.v;
      aoa[cd.r][cd.c] = val ?? null;
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name || "Sheet");
  }

  XLSX.writeFile(wb, "spreadsheet.xlsx");
}

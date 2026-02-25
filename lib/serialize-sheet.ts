import { getWorkbookApi } from "./store";

interface SerializedCell {
  r: number;
  c: number;
  v?: string | number | boolean;
  f?: string;
  bold?: boolean;
  bg?: string;
}

interface SerializedSheet {
  name: string;
  index: number;
  cells: SerializedCell[];
}

interface SerializedWorkbook {
  sheets: SerializedSheet[];
  activeSheet: number;
}

const MAX_TOKEN_ESTIMATE = 6000;
const AVG_CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKEN_ESTIMATE * AVG_CHARS_PER_TOKEN;

export function serializeSheet(): SerializedWorkbook | null {
  const api = getWorkbookApi();
  if (!api) return null;

  try {
    const allSheets = api.getAllSheets();
    if (!allSheets || allSheets.length === 0) return null;

    const serialized: SerializedWorkbook = {
      sheets: [],
      activeSheet: 0,
    };

    let totalChars = 0;

    for (let si = 0; si < allSheets.length; si++) {
      const sheet = allSheets[si];
      const cells: SerializedCell[] = [];

      if (sheet.status === 1) {
        serialized.activeSheet = si;
      }

      const celldata = sheet.celldata || [];
      for (const cd of celldata) {
        if (!cd.v && cd.v !== 0) continue;

        const cell: SerializedCell = { r: cd.r, c: cd.c };

        if (typeof cd.v === "object" && cd.v !== null) {
          if (cd.v.f) cell.f = cd.v.f;
          if (cd.v.v !== undefined && cd.v.v !== null && cd.v.v !== "")
            cell.v = cd.v.v;
          if (cd.v.bl === 1) cell.bold = true;
          if (cd.v.bg) cell.bg = cd.v.bg;
        } else {
          cell.v = cd.v;
        }

        if (cell.v === undefined && !cell.f) continue;

        cells.push(cell);
        totalChars += JSON.stringify(cell).length;
      }

      serialized.sheets.push({
        name: sheet.name || `Sheet${si + 1}`,
        index: si,
        cells,
      });

      if (totalChars > MAX_CHARS) break;
    }

    return serialized;
  } catch {
    return null;
  }
}

export function serializeSheetToString(): string {
  const data = serializeSheet();
  if (!data) return "{}";

  let result = JSON.stringify(data);

  if (result.length > MAX_CHARS) {
    for (const sheet of data.sheets) {
      sheet.cells = sheet.cells.slice(0, Math.floor(sheet.cells.length * 0.7));
    }
    result = JSON.stringify(data);
  }

  return result;
}

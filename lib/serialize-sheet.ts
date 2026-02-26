import { getWorkbookApi } from "./store";

const MAX_TOKEN_ESTIMATE = 6000;
const AVG_CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKEN_ESTIMATE * AVG_CHARS_PER_TOKEN;

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
  const api = getWorkbookApi();
  if (!api) return "Empty spreadsheet.";

  try {
    const allSheets = api.getAllSheets();
    if (!allSheets || allSheets.length === 0) return "Empty spreadsheet.";

    const lines: string[] = [];
    let totalChars = 0;

    for (let si = 0; si < allSheets.length; si++) {
      const sheet = allSheets[si];
      const celldata = sheet.celldata || [];

      if (celldata.length === 0) {
        lines.push(`Sheet "${sheet.name || `Sheet${si + 1}`}": empty`);
        continue;
      }

      let maxRow = 0;
      let maxCol = 0;
      for (const cd of celldata) {
        if (cd.r > maxRow) maxRow = cd.r;
        if (cd.c > maxCol) maxCol = cd.c;
      }

      lines.push(
        `Sheet "${sheet.name || `Sheet${si + 1}`}" (${maxRow + 1} rows × ${maxCol + 1} cols):`
      );

      // Build a sparse map for efficient lookup
      const cellMap = new Map<string, string>();
      for (const cd of celldata) {
        if (!cd.v && cd.v !== 0) continue;
        const val =
          typeof cd.v === "object" && cd.v !== null
            ? cd.v.f
              ? cd.v.f
              : cd.v.v !== undefined && cd.v.v !== null
                ? String(cd.v.v)
                : cd.v.m !== undefined
                  ? String(cd.v.m)
                  : ""
            : String(cd.v);
        if (val === "") continue;
        cellMap.set(`${cd.r},${cd.c}`, val);
      }

      // Output as compact CSV-like rows (only rows that have data)
      for (let r = 0; r <= Math.min(maxRow, 200); r++) {
        const cells: string[] = [];
        let hasData = false;
        for (let c = 0; c <= maxCol; c++) {
          const v = cellMap.get(`${r},${c}`) || "";
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

import { google } from "@ai-sdk/google";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";

function colLabel(c: number): string {
  let label = "";
  let n = c;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, sheetSnapshot } = body;

  const systemPrompt = `You are a financial modeling expert AI assistant operating a spreadsheet. You manipulate the spreadsheet using tool calls.

RULES:
1. Always use tool calls to make changes — never just describe what you would do, actually do it.
2. Use = prefix for Excel formulas (e.g. =SUM(A1:A10)).
3. Rows and columns are 0-based integers: row 0 = spreadsheet row 1, col 0 = column A, col 1 = column B, etc.
4. Format headers with bold and background colors for readability.
5. Set appropriate column widths so content is visible (typical widths: 80-140 pixels).
6. Work step by step, making one logical group of changes at a time.
7. After completing all changes, briefly summarize what you built.

Column mapping: A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12

Current spreadsheet state:
${sheetSnapshot || "Empty spreadsheet — no data yet."}`;

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: systemPrompt,
    messages,
    stopWhen: stepCountIs(20),
    tools: {
      write_cell: tool({
        description:
          "Write a value or formula to a single cell. Use = prefix for formulas.",
        inputSchema: z.object({
          row: z.number().describe("0-based row index"),
          col: z.number().describe("0-based column index"),
          value: z
            .union([z.string(), z.number()])
            .describe("Value or formula to write"),
        }),
        execute: async ({ row, col, value }) => ({
          success: true,
          cell: `${colLabel(col)}${row + 1}`,
          value: String(value),
        }),
      }),

      write_range: tool({
        description: "Write a 2D array of values/formulas to a rectangular range.",
        inputSchema: z.object({
          startRow: z.number().describe("0-based start row"),
          startCol: z.number().describe("0-based start column"),
          values: z
            .array(z.array(z.union([z.string(), z.number(), z.null()])))
            .describe("2D array of values, row-major order"),
        }),
        execute: async ({ startRow, startCol, values }) => ({
          success: true,
          range: `${colLabel(startCol)}${startRow + 1}:${colLabel(startCol + (values[0]?.length ?? 1) - 1)}${startRow + values.length}`,
          size: `${values.length} rows × ${values[0]?.length ?? 0} cols`,
        }),
      }),

      set_formula: tool({
        description: "Write an Excel formula to a cell. The formula must start with =.",
        inputSchema: z.object({
          row: z.number().describe("0-based row index"),
          col: z.number().describe("0-based column index"),
          formula: z.string().describe("Excel formula starting with ="),
        }),
        execute: async ({ row, col, formula }) => ({
          success: true,
          cell: `${colLabel(col)}${row + 1}`,
          formula,
        }),
      }),

      format_cells: tool({
        description: "Apply formatting (bold, background color, text color) to a range.",
        inputSchema: z.object({
          startRow: z.number().describe("0-based start row"),
          startCol: z.number().describe("0-based start column"),
          endRow: z.number().describe("0-based end row (inclusive)"),
          endCol: z.number().describe("0-based end column (inclusive)"),
          bold: z.boolean().optional().describe("Set text bold"),
          backgroundColor: z
            .string()
            .optional()
            .describe("Hex background color, e.g. #e8f5e9"),
          textColor: z
            .string()
            .optional()
            .describe("Hex text color, e.g. #333333"),
        }),
        execute: async ({ startRow, startCol, endRow, endCol, ...fmt }) => ({
          success: true,
          range: `${colLabel(startCol)}${startRow + 1}:${colLabel(endCol)}${endRow + 1}`,
          formatting: fmt,
        }),
      }),

      insert_row: tool({
        description: "Insert one or more rows at a given index.",
        inputSchema: z.object({
          index: z.number().describe("0-based row index to insert before"),
          count: z.number().describe("Number of rows to insert").default(1),
        }),
        execute: async ({ index, count }) => ({
          success: true,
          message: `Inserted ${count} row(s) at row ${index + 1}`,
        }),
      }),

      insert_column: tool({
        description: "Insert one or more columns at a given index.",
        inputSchema: z.object({
          index: z.number().describe("0-based column index to insert before"),
          count: z.number().describe("Number of columns to insert").default(1),
        }),
        execute: async ({ index, count }) => ({
          success: true,
          message: `Inserted ${count} column(s) at column ${colLabel(index)}`,
        }),
      }),

      add_sheet: tool({
        description: "Add a new sheet to the workbook.",
        inputSchema: z.object({
          name: z.string().optional().describe("Name for the new sheet"),
        }),
        execute: async ({ name }) => ({
          success: true,
          message: `Added sheet "${name || "new sheet"}"`,
        }),
      }),

      rename_sheet: tool({
        description: "Rename the current active sheet.",
        inputSchema: z.object({
          name: z.string().describe("New name for the sheet"),
        }),
        execute: async ({ name }) => ({
          success: true,
          message: `Renamed sheet to "${name}"`,
        }),
      }),

      read_range: tool({
        description:
          "Read current cell values from a range. Values are in the sheet snapshot above.",
        inputSchema: z.object({
          startRow: z.number().describe("0-based start row"),
          startCol: z.number().describe("0-based start column"),
          endRow: z.number().describe("0-based end row (inclusive)"),
          endCol: z.number().describe("0-based end column (inclusive)"),
        }),
        execute: async ({ startRow, startCol, endRow, endCol }) => ({
          success: true,
          range: `${colLabel(startCol)}${startRow + 1}:${colLabel(endCol)}${endRow + 1}`,
          note: "Cell values available in sheet snapshot.",
        }),
      }),

      clear_range: tool({
        description: "Clear all values and formatting in a range of cells.",
        inputSchema: z.object({
          startRow: z.number().describe("0-based start row"),
          startCol: z.number().describe("0-based start column"),
          endRow: z.number().describe("0-based end row (inclusive)"),
          endCol: z.number().describe("0-based end column (inclusive)"),
        }),
        execute: async ({ startRow, startCol, endRow, endCol }) => ({
          success: true,
          range: `${colLabel(startCol)}${startRow + 1}:${colLabel(endCol)}${endRow + 1}`,
        }),
      }),

      set_column_width: tool({
        description:
          "Set the pixel width of columns. Pass a map of column index (string) to width (number).",
        inputSchema: z.object({
          columns: z
            .record(z.string(), z.number())
            .describe('Map of column index to width, e.g. {"0": 120, "1": 90}'),
        }),
        execute: async ({ columns }) => ({
          success: true,
          message: `Set widths for column(s) ${Object.keys(columns).map((c) => colLabel(Number(c))).join(", ")}`,
        }),
      }),

      merge_cells: tool({
        description: "Merge a rectangular range of cells into one.",
        inputSchema: z.object({
          startRow: z.number().describe("0-based start row"),
          startCol: z.number().describe("0-based start column"),
          endRow: z.number().describe("0-based end row (inclusive)"),
          endCol: z.number().describe("0-based end column (inclusive)"),
        }),
        execute: async ({ startRow, startCol, endRow, endCol }) => ({
          success: true,
          range: `${colLabel(startCol)}${startRow + 1}:${colLabel(endCol)}${endRow + 1}`,
        }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

import { google } from "@ai-sdk/google";
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
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

  const systemPrompt = `You are a general-purpose spreadsheet AI assistant. You help users build any kind of spreadsheet: finance, fitness, recipes, travel, project tracking, inventory, and more. You manipulate the spreadsheet using tool calls.

Honor the user's request regardless of domain. If they ask for a workout table, create a workout table; if they ask for a budget, create a budget; if they ask for a recipe list, create a recipe list. Never refuse or redirect based on domain.

RULES:
1. Always use tool calls to make changes — never just describe what you would do, actually do it.
2. Use = prefix for Excel formulas (e.g. =SUM(A1:A10)).
3. Rows and columns are 0-based integers: row 0 = spreadsheet row 1, col 0 = column A, col 1 = column B, etc.
4. Work step by step, making one logical group of changes at a time.
5. After completing all changes, briefly summarize what you built using markdown formatting.
6. When asked to create a chart, use the add_chart tool with actual numeric data (not formulas).
7. For conditional formatting, use the conditional_format tool to color-code data ranges.

STYLING — THIS IS THE MOST IMPORTANT PART. You MUST style every spreadsheet so it looks polished. Unstyled tables are UNACCEPTABLE. Adapt section names and structure to the user's domain (e.g., "Exercises" and "Sets" for fitness, "Ingredients" for recipes, "Revenue" for finance). Follow this sequence after writing all data:

STEP 1 — Column widths: Always call set_column_width first. Label columns 120-160px, data columns 100-120px.

STEP 2 — Title row (row 0): Write the title, then ALWAYS format it with:
  - format_cells: bold=true, backgroundColor with a DARK color, textColor="#ffffff"
  - Use one of these dark title colors: #1565c0 (blue), #2e7d32 (green), #6a1b9a (purple), #00695c (teal), #e65100 (orange)
  - Merge the title across all used columns with merge_cells.

STEP 3 — Column headers row (usually row 1 or 2): format with bold=true and a MEDIUM background:
  - Blue=#bbdefb  Green=#c8e6c9  Purple=#e1bee7  Teal=#b2dfdb  Orange=#ffe0b2

STEP 4 — Section headers: format with bold=true and a LIGHT tint. Use domain-appropriate names (e.g., "Exercises", "Ingredients", "Revenue"):
  - Blue=#e3f2fd  Green=#f1f8e9  Purple=#f3e5f5  Teal=#e0f2f1  Orange=#fff3e0

STEP 5 — Subtotal rows: format with bold=true and a distinct background:
  - Blue=#e1f5fe  Green=#e8f5e9  Purple=#ede7f6  Teal=#e0f7fa  Orange=#fff8e1

STEP 6 — Grand total / bottom-line row: format with bold=true, DARK background + white text, same as the title color.

STEP 7 — Key metric or highlight rows: format with bold=true and a highlight color like #fff9c4 (light yellow).

Pick ONE color theme and use it consistently throughout. Make at LEAST 6-8 format_cells calls per table. If you only make 1-2 formatting calls, the result will look terrible — so be thorough.

Column mapping: A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12

Current spreadsheet state:
${sheetSnapshot || "Empty spreadsheet — no data yet."}`;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(50),
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
        description:
          "Write a 2D array of values/formulas to a rectangular range.",
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
        description:
          "Write an Excel formula to a cell. The formula must start with =.",
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
        description:
          "Apply formatting (bold, background color, text color) to a range.",
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
          index: z
            .number()
            .describe("0-based column index to insert before"),
          count: z
            .number()
            .describe("Number of columns to insert")
            .default(1),
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
          startRow: z.number(),
          startCol: z.number(),
          endRow: z.number(),
          endCol: z.number(),
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
          startRow: z.number(),
          startCol: z.number(),
          endRow: z.number(),
          endCol: z.number(),
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
          columns: z.record(z.string(), z.number()),
        }),
        execute: async ({ columns }) => ({
          success: true,
          message: `Set widths for column(s) ${Object.keys(columns).map((c) => colLabel(Number(c))).join(", ")}`,
        }),
      }),

      merge_cells: tool({
        description: "Merge a rectangular range of cells into one.",
        inputSchema: z.object({
          startRow: z.number(),
          startCol: z.number(),
          endRow: z.number(),
          endCol: z.number(),
        }),
        execute: async ({ startRow, startCol, endRow, endCol }) => ({
          success: true,
          range: `${colLabel(startCol)}${startRow + 1}:${colLabel(endCol)}${endRow + 1}`,
        }),
      }),

      add_chart: tool({
        description:
          "Create a chart visualization. Provide actual numeric data, not formulas. The chart renders in the chat panel.",
        inputSchema: z.object({
          type: z
            .enum(["bar", "line", "pie", "area"])
            .describe("Chart type"),
          title: z.string().describe("Chart title"),
          xLabels: z.array(z.string()).describe("Labels for the x-axis / categories"),
          series: z
            .array(
              z.object({
                name: z.string(),
                values: z.array(z.number()),
              })
            )
            .describe("Data series to plot"),
        }),
        execute: async ({ type, title, xLabels, series }) => ({
          success: true,
          chartId: Math.random().toString(36).slice(2, 10),
          type,
          title,
          xLabels,
          series,
        }),
      }),

      freeze_panes: tool({
        description: "Freeze rows and/or columns so they stay visible when scrolling.",
        inputSchema: z.object({
          type: z
            .enum(["row", "column", "both"])
            .describe("What to freeze"),
          row: z
            .number()
            .optional()
            .describe("Row index to freeze at (0-based)"),
          column: z
            .number()
            .optional()
            .describe("Column index to freeze at (0-based)"),
        }),
        execute: async ({ type, row, column }) => ({
          success: true,
          message: `Froze ${type} at row=${row ?? "none"}, col=${column ?? "none"}`,
        }),
      }),

      conditional_format: tool({
        description:
          "Apply conditional formatting to a range. Colors cells based on their values relative to a threshold or as a color scale.",
        inputSchema: z.object({
          startRow: z.number(),
          startCol: z.number(),
          endRow: z.number(),
          endCol: z.number(),
          rule: z
            .enum([
              "color_scale",
              "highlight_above",
              "highlight_below",
              "highlight_negative",
            ])
            .describe("Formatting rule type"),
          threshold: z
            .number()
            .optional()
            .describe("Threshold for highlight rules"),
          colorHigh: z
            .string()
            .optional()
            .describe("Color for high/matching values, e.g. #c8e6c9"),
          colorLow: z
            .string()
            .optional()
            .describe("Color for low/non-matching values, e.g. #ffcdd2"),
        }),
        execute: async (params) => ({
          success: true,
          range: `${colLabel(params.startCol)}${params.startRow + 1}:${colLabel(params.endCol)}${params.endRow + 1}`,
          rule: params.rule,
        }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

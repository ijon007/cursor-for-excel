import {
  useAppStore,
  getWorkbookApi,
  type ChatMessage,
} from "./store";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function uid() {
  return Math.random().toString(36).slice(2, 10);
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

function cellRef(r: number, c: number): string {
  return `${colLabel(c)}${r + 1}`;
}

async function runStep(
  msgId: string,
  toolName: string,
  description: string,
  action: () => void
) {
  const store = useAppStore.getState();
  const stepId = uid();
  store.addToolCallToMessage(msgId, {
    id: stepId,
    toolName,
    description,
    status: "running",
  });
  await delay(350);
  action();
  store.updateToolCallStatus(msgId, stepId, "completed");
  await delay(150);
}

function highlightRange(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
) {
  const api = getWorkbookApi();
  if (!api) return;

  const highlightColor = "#d4f5f0";
  const range = [{ row: [startRow, endRow], column: [startCol, endCol] }];

  try {
    api.setCellFormatByRange("bg", highlightColor, range);
  } catch {
    // ignore if format fails
  }

  setTimeout(() => {
    try {
      api.setCellFormatByRange("bg", undefined, range);
    } catch {
      // ignore
    }
  }, 1500);
}

function writeCellValue(
  row: number,
  col: number,
  value: string | number
): void {
  const api = getWorkbookApi();
  if (!api) return;
  api.setCellValue(row, col, value);
  highlightRange(row, col, row, col);
}

function writeRangeValues(
  startRow: number,
  startCol: number,
  values: (string | number | null)[][]
): void {
  const api = getWorkbookApi();
  if (!api) return;

  const endRow = startRow + values.length - 1;
  const endCol =
    startCol + Math.max(...values.map((r) => r.length)) - 1;

  const range = {
    row: [startRow, endRow],
    column: [startCol, endCol],
  };

  api.setCellValuesByRange(values, range);
  highlightRange(startRow, startCol, endRow, endCol);
}

function formatRange(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  attr: string,
  value: unknown
): void {
  const api = getWorkbookApi();
  if (!api) return;
  const range = [{ row: [startRow, endRow], column: [startCol, endCol] }];
  api.setCellFormatByRange(attr, value, range);
}

function setColWidths(widths: Record<string, number>): void {
  const api = getWorkbookApi();
  if (!api) return;
  api.setColumnWidth(widths);
}

// ─── Mock template executors ─────────────────────────────────

async function executeBudgetTemplate(msgId: string) {
  const headers = [
    "Month",
    "Income",
    "Rent",
    "Utilities",
    "Food",
    "Transport",
    "Entertainment",
    "Savings",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const incomes = [5000, 5000, 5200, 5200, 5400, 5400, 5600, 5600, 5800, 5800, 6000, 6000];
  const rents = Array(12).fill(1500);
  const utilities = [150, 160, 140, 130, 120, 180, 200, 190, 160, 150, 140, 170];
  const food = [400, 380, 420, 390, 410, 430, 450, 440, 400, 380, 360, 500];
  const transport = [200, 200, 180, 190, 210, 220, 200, 200, 190, 200, 210, 230];
  const entertainment = [150, 120, 180, 160, 200, 250, 300, 280, 200, 180, 150, 350];

  await runStep(msgId, "set_column_width", "Setting column widths...", () => {
    setColWidths({ "0": 110, "1": 90, "2": 80, "3": 90, "4": 80, "5": 90, "6": 120, "7": 90 });
  });

  await runStep(msgId, "write_range", "Writing column headers...", () => {
    writeRangeValues(0, 0, [headers]);
  });

  await runStep(msgId, "format_cells", "Formatting headers...", () => {
    formatRange(0, 0, 0, 7, "bl", 1);
    formatRange(0, 0, 0, 7, "bg", "#e8f5e9");
  });

  await runStep(msgId, "write_range", "Adding month names...", () => {
    writeRangeValues(1, 0, months.map((m) => [m]));
  });

  await runStep(msgId, "write_range", "Filling in income data...", () => {
    writeRangeValues(
      1,
      1,
      incomes.map((inc, i) => [inc, rents[i], utilities[i], food[i], transport[i], entertainment[i]])
    );
  });

  await runStep(msgId, "set_formula", "Adding savings formulas...", () => {
    for (let r = 1; r <= 12; r++) {
      writeCellValue(r, 7, `=B${r + 1}-SUM(C${r + 1}:G${r + 1})`);
    }
  });

  await runStep(msgId, "write_range", "Adding totals row...", () => {
    writeCellValue(13, 0, "Total");
    for (let c = 1; c <= 7; c++) {
      const col = colLabel(c);
      writeCellValue(13, c, `=SUM(${col}2:${col}13)`);
    }
  });

  await runStep(msgId, "format_cells", "Formatting totals...", () => {
    formatRange(13, 0, 13, 7, "bl", 1);
    formatRange(13, 0, 13, 7, "bg", "#fff3e0");
  });
}

async function executeDCFTemplate(msgId: string) {
  const headers = ["", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];
  const rows = [
    "Revenue",
    "Growth Rate",
    "COGS (% of Rev)",
    "Gross Profit",
    "OpEx",
    "EBITDA",
    "D&A",
    "EBIT",
    "Tax Rate",
    "Taxes",
    "Net Income",
    "",
    "CapEx",
    "Change in WC",
    "Free Cash Flow",
    "",
    "Discount Rate",
    "PV of FCF",
    "Terminal Value",
    "Enterprise Value",
  ];

  await runStep(msgId, "set_column_width", "Setting column widths...", () => {
    setColWidths({ "0": 140, "1": 100, "2": 100, "3": 100, "4": 100, "5": 100 });
  });

  await runStep(msgId, "write_range", "Writing headers...", () => {
    writeRangeValues(0, 0, [headers]);
  });

  await runStep(msgId, "format_cells", "Formatting headers...", () => {
    formatRange(0, 0, 0, 5, "bl", 1);
    formatRange(0, 0, 0, 5, "bg", "#e3f2fd");
  });

  await runStep(msgId, "write_range", "Writing row labels...", () => {
    writeRangeValues(1, 0, rows.map((r) => [r]));
  });

  await runStep(msgId, "write_range", "Adding financial data...", () => {
    writeRangeValues(1, 1, [
      [1000000, 1150000, 1322500, 1521875, 1750156],
      ["15%", "15%", "15%", "15%", "15%"],
      ["40%", "40%", "40%", "40%", "40%"],
    ]);
  });

  await runStep(msgId, "set_formula", "Adding formulas...", () => {
    for (let c = 1; c <= 5; c++) {
      const col = colLabel(c);
      writeCellValue(4, c, `=${col}2*(1-${col}4)`);
      writeCellValue(5, c, `=${col}2*0.25`);
      writeCellValue(6, c, `=${col}5-${col}6`);
      writeCellValue(7, c, `=${col}2*0.05`);
      writeCellValue(8, c, `=${col}7-${col}8`);
    }
  });

  await runStep(msgId, "format_cells", "Highlighting key rows...", () => {
    formatRange(4, 0, 4, 5, "bg", "#f1f8e9");
    formatRange(6, 0, 6, 5, "bg", "#f1f8e9");
    formatRange(15, 0, 15, 5, "bg", "#fff3e0");
    formatRange(15, 0, 15, 5, "bl", 1);
  });
}

async function executePLTemplate(msgId: string) {
  const headers = ["", "Q1", "Q2", "Q3", "Q4", "FY Total"];
  const labels = [
    "Revenue",
    "Cost of Goods Sold",
    "Gross Profit",
    "",
    "Operating Expenses",
    "  Salaries & Wages",
    "  Marketing",
    "  Rent & Utilities",
    "  Other OpEx",
    "Total Operating Expenses",
    "",
    "Operating Income (EBIT)",
    "Interest Expense",
    "Income Before Tax",
    "Income Tax (25%)",
    "Net Income",
  ];

  await runStep(msgId, "set_column_width", "Setting column widths...", () => {
    setColWidths({ "0": 180, "1": 100, "2": 100, "3": 100, "4": 100, "5": 100 });
  });

  await runStep(msgId, "write_range", "Writing headers & labels...", () => {
    writeRangeValues(0, 0, [headers]);
    writeRangeValues(1, 0, labels.map((l) => [l]));
  });

  await runStep(msgId, "format_cells", "Formatting headers...", () => {
    formatRange(0, 0, 0, 5, "bl", 1);
    formatRange(0, 0, 0, 5, "bg", "#e8eaf6");
  });

  await runStep(msgId, "write_range", "Adding quarterly data...", () => {
    writeRangeValues(1, 1, [
      [250000, 280000, 310000, 350000],
      [100000, 112000, 124000, 140000],
    ]);
  });

  await runStep(msgId, "set_formula", "Adding formulas...", () => {
    for (let c = 1; c <= 4; c++) {
      const col = colLabel(c);
      writeCellValue(3, c, `=${col}2-${col}3`);
    }
    writeRangeValues(6, 1, [
      [80000, 85000, 88000, 95000],
      [15000, 18000, 20000, 25000],
      [12000, 12000, 12000, 12000],
      [8000, 9000, 8500, 10000],
    ]);
    for (let c = 1; c <= 4; c++) {
      const col = colLabel(c);
      writeCellValue(10, c, `=SUM(${col}7:${col}10)`);
      writeCellValue(12, c, `=${col}4-${col}11`);
      writeCellValue(13, c, 5000);
      writeCellValue(14, c, `=${col}13-${col}14`);
      writeCellValue(15, c, `=${col}15*0.25`);
      writeCellValue(16, c, `=${col}15-${col}16`);
    }
    for (let r = 1; r <= 16; r++) {
      if ([4, 11].includes(r)) continue;
      writeCellValue(r, 5, `=SUM(B${r + 1}:E${r + 1})`);
    }
  });

  await runStep(msgId, "format_cells", "Formatting totals...", () => {
    formatRange(3, 0, 3, 5, "bl", 1);
    formatRange(3, 0, 3, 5, "bg", "#e8f5e9");
    formatRange(16, 0, 16, 5, "bl", 1);
    formatRange(16, 0, 16, 5, "bg", "#fff3e0");
  });
}

async function executeCapTableTemplate(msgId: string) {
  const headers = [
    "Shareholder",
    "Share Class",
    "Shares",
    "Price/Share",
    "Investment",
    "Ownership %",
  ];
  const data: (string | number)[][] = [
    ["Founder A", "Common", 4000000, 0.001, 4000, ""],
    ["Founder B", "Common", 3000000, 0.001, 3000, ""],
    ["Employee Pool", "Options", 1500000, 0.001, 1500, ""],
    ["Angel Investor", "Seed Preferred", 1000000, 0.5, 500000, ""],
    ["VC Fund Alpha", "Series A", 2500000, 2.0, 5000000, ""],
  ];

  await runStep(msgId, "set_column_width", "Setting column widths...", () => {
    setColWidths({ "0": 140, "1": 130, "2": 100, "3": 100, "4": 110, "5": 110 });
  });

  await runStep(msgId, "write_range", "Writing headers...", () => {
    writeRangeValues(0, 0, [headers]);
  });

  await runStep(msgId, "format_cells", "Formatting headers...", () => {
    formatRange(0, 0, 0, 5, "bl", 1);
    formatRange(0, 0, 0, 5, "bg", "#fce4ec");
  });

  await runStep(msgId, "write_range", "Adding shareholder data...", () => {
    writeRangeValues(1, 0, data);
  });

  await runStep(msgId, "set_formula", "Calculating ownership percentages...", () => {
    const totalRow = data.length + 1;
    writeCellValue(totalRow, 0, "Total");
    writeCellValue(totalRow, 2, `=SUM(C2:C${totalRow})`);
    writeCellValue(totalRow, 4, `=SUM(E2:E${totalRow})`);

    for (let r = 1; r <= data.length; r++) {
      writeCellValue(r, 5, `=C${r + 1}/C${totalRow + 1}`);
    }
    writeCellValue(totalRow, 5, `=SUM(F2:F${totalRow})`);
  });

  await runStep(msgId, "format_cells", "Formatting totals...", () => {
    const totalRow = data.length + 1;
    formatRange(totalRow, 0, totalRow, 5, "bl", 1);
    formatRange(totalRow, 0, totalRow, 5, "bg", "#f3e5f5");
  });
}

async function executeAmortizationTemplate(msgId: string) {
  await runStep(msgId, "set_column_width", "Setting column widths...", () => {
    setColWidths({ "0": 140, "1": 110, "2": 110, "3": 110, "4": 110 });
  });

  await runStep(msgId, "write_range", "Writing loan parameters...", () => {
    writeRangeValues(0, 0, [
      ["Loan Amount", 250000],
      ["Annual Rate", "5.5%"],
      ["Term (Years)", 30],
      ["Monthly Payment", ""],
    ]);
  });

  await runStep(msgId, "set_formula", "Adding payment formula...", () => {
    writeCellValue(3, 1, "=ROUND(-PMT(B2/12,B3*12,B1),2)");
  });

  await runStep(msgId, "format_cells", "Formatting parameters...", () => {
    formatRange(0, 0, 3, 0, "bl", 1);
    formatRange(0, 0, 3, 1, "bg", "#e0f7fa");
  });

  const schedHeaders = ["Payment #", "Payment", "Principal", "Interest", "Balance"];
  await runStep(msgId, "write_range", "Writing schedule headers...", () => {
    writeRangeValues(5, 0, [schedHeaders]);
  });

  await runStep(msgId, "format_cells", "Formatting schedule headers...", () => {
    formatRange(5, 0, 5, 4, "bl", 1);
    formatRange(5, 0, 5, 4, "bg", "#e8eaf6");
  });

  await runStep(msgId, "write_range", "Generating first 12 payments...", () => {
    for (let i = 1; i <= 12; i++) {
      const r = 5 + i;
      writeCellValue(r, 0, i);
      writeCellValue(r, 1, `=$B$4`);

      if (i === 1) {
        writeCellValue(r, 3, `=ROUND($B$1*($B$2/12),2)`);
        writeCellValue(r, 2, `=B${r + 1}-D${r + 1}`);
        writeCellValue(r, 4, `=$B$1-C${r + 1}`);
      } else {
        writeCellValue(r, 3, `=ROUND(E${r}*($B$2/12),2)`);
        writeCellValue(r, 2, `=B${r + 1}-D${r + 1}`);
        writeCellValue(r, 4, `=E${r}-C${r + 1}`);
      }
    }
  });
}

async function executeGenericDemo(msgId: string) {
  await runStep(msgId, "write_cell", `Writing to ${cellRef(0, 0)}...`, () => {
    writeCellValue(0, 0, "Hello from Cursor for Excel!");
  });

  await runStep(msgId, "format_cells", "Making it bold...", () => {
    formatRange(0, 0, 0, 0, "bl", 1);
  });

  await runStep(msgId, "write_range", "Adding sample data...", () => {
    writeRangeValues(2, 0, [
      ["Item", "Quantity", "Price", "Total"],
      ["Widget A", 10, 25.99, ""],
      ["Widget B", 5, 49.99, ""],
      ["Widget C", 20, 12.5, ""],
    ]);
  });

  await runStep(msgId, "set_formula", "Adding total formulas...", () => {
    for (let r = 3; r <= 5; r++) {
      writeCellValue(r, 3, `=B${r + 1}*C${r + 1}`);
    }
    writeCellValue(6, 2, "Grand Total:");
    writeCellValue(6, 3, "=SUM(D4:D6)");
  });

  await runStep(msgId, "format_cells", "Formatting table...", () => {
    formatRange(2, 0, 2, 3, "bl", 1);
    formatRange(2, 0, 2, 3, "bg", "#e3f2fd");
    formatRange(6, 2, 6, 3, "bl", 1);
    formatRange(6, 2, 6, 3, "bg", "#fff3e0");
  });

  await runStep(msgId, "set_column_width", "Adjusting columns...", () => {
    setColWidths({ "0": 120, "1": 90, "2": 80, "3": 90 });
  });
}

// ─── Public entry point ──────────────────────────────────────

export async function executeMockAgent(userMessage: string) {
  const store = useAppStore.getState();

  const userMsg: ChatMessage = {
    id: uid(),
    role: "user",
    content: userMessage,
  };
  store.addMessage(userMsg);
  store.setAgentLoading(true);

  await delay(400);

  const assistantMsg: ChatMessage = {
    id: uid(),
    role: "assistant",
    content: "",
    toolCalls: [],
  };
  store.addMessage(assistantMsg);

  const lower = userMessage.toLowerCase();

  try {
    if (lower.includes("budget")) {
      await executeBudgetTemplate(assistantMsg.id);
      store.updateMessage(assistantMsg.id, {
        content: "Monthly budget tracker created! I've set up 12 months of income and expense tracking with automatic savings calculations and a totals row.",
      });
    } else if (lower.includes("dcf")) {
      await executeDCFTemplate(assistantMsg.id);
      store.updateMessage(assistantMsg.id, {
        content: "DCF model created! I've built a 5-year projection with revenue, costs, and profitability metrics. You can adjust the growth assumptions in row 2.",
      });
    } else if (lower.includes("p&l") || lower.includes("profit") || lower.includes("loss")) {
      await executePLTemplate(assistantMsg.id);
      store.updateMessage(assistantMsg.id, {
        content: "P&L statement created! Quarterly breakdown with revenue, COGS, operating expenses, and net income. All formulas are linked so changes propagate automatically.",
      });
    } else if (lower.includes("cap table") || lower.includes("captable")) {
      await executeCapTableTemplate(assistantMsg.id);
      store.updateMessage(assistantMsg.id, {
        content: "Cap table created! Shows ownership breakdown across founders, employees, and investors with automatic percentage calculations.",
      });
    } else if (lower.includes("amortization") || lower.includes("loan")) {
      await executeAmortizationTemplate(assistantMsg.id);
      store.updateMessage(assistantMsg.id, {
        content: "Amortization schedule created! Shows a $250K loan at 5.5% over 30 years. Modify the loan parameters at the top to recalculate.",
      });
    } else {
      await executeGenericDemo(assistantMsg.id);
      store.updateMessage(assistantMsg.id, {
        content: "Done! I've created a sample table with formulas. Try one of the template prompts for a more complex example.",
      });
    }
  } catch {
    store.updateMessage(assistantMsg.id, {
      content: "Something went wrong while executing the changes. Please try again.",
    });
  }

  store.setAgentLoading(false);
}

// ─── Tool definitions for the agent API ──────────────────────

export const toolDefinitions = [
  {
    name: "write_cell",
    description: "Writes a value or formula to a single cell",
    parameters: {
      sheet: { type: "number", description: "Sheet index" },
      row: { type: "number", description: "Row index (0-based)" },
      col: { type: "number", description: "Column index (0-based)" },
      value: { type: "string", description: "Value or formula to write" },
    },
  },
  {
    name: "write_range",
    description: "Writes a 2D array of values to a range",
    parameters: {
      sheet: { type: "number" },
      startRow: { type: "number" },
      startCol: { type: "number" },
      values: { type: "array", description: "2D array of values" },
    },
  },
  {
    name: "set_formula",
    description: "Writes an Excel formula string to a cell",
    parameters: {
      sheet: { type: "number" },
      row: { type: "number" },
      col: { type: "number" },
      formula: { type: "string" },
    },
  },
  {
    name: "format_cells",
    description: "Applies formatting to a range",
    parameters: {
      range: { type: "object", description: "{ startRow, startCol, endRow, endCol }" },
      format: { type: "object", description: "{ bold, color, background, numberFormat }" },
    },
  },
  {
    name: "insert_row",
    description: "Inserts N rows at a given index",
    parameters: {
      sheet: { type: "number" },
      index: { type: "number" },
      count: { type: "number" },
    },
  },
  {
    name: "insert_column",
    description: "Inserts N columns at a given index",
    parameters: {
      sheet: { type: "number" },
      index: { type: "number" },
      count: { type: "number" },
    },
  },
  {
    name: "add_sheet",
    description: "Adds a new sheet with a given name",
    parameters: { name: { type: "string" } },
  },
  {
    name: "rename_sheet",
    description: "Renames a sheet by index",
    parameters: {
      sheet: { type: "number" },
      name: { type: "string" },
    },
  },
  {
    name: "read_range",
    description: "Reads current values from a range",
    parameters: {
      sheet: { type: "number" },
      startRow: { type: "number" },
      startCol: { type: "number" },
      endRow: { type: "number" },
      endCol: { type: "number" },
    },
  },
  {
    name: "clear_range",
    description: "Clears all values and formatting in a range",
    parameters: {
      sheet: { type: "number" },
      startRow: { type: "number" },
      startCol: { type: "number" },
      endRow: { type: "number" },
      endCol: { type: "number" },
    },
  },
  {
    name: "set_column_width",
    description: "Sets the width of a column",
    parameters: {
      sheet: { type: "number" },
      col: { type: "number" },
      width: { type: "number" },
    },
  },
  {
    name: "merge_cells",
    description: "Merges a cell range",
    parameters: {
      sheet: { type: "number" },
      startRow: { type: "number" },
      startCol: { type: "number" },
      endRow: { type: "number" },
      endCol: { type: "number" },
    },
  },
];

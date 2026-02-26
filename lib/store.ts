import { create } from "zustand";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
}

export interface CellHighlight {
  id: string;
  sheetIndex: number;
  row: number;
  col: number;
  endRow: number;
  endCol: number;
}

export interface ChartConfig {
  id: string;
  type: "bar" | "line" | "pie" | "area";
  title: string;
  xLabels: string[];
  series: { name: string; values: number[] }[];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const initialSessionId = uid();

interface AppState {
  sessions: ChatSession[];
  activeSessionId: string;
  highlightedCells: CellHighlight[];
  isDarkMode: boolean;
  chatPanelWidth: number;
  isSidebarOpen: boolean;
  charts: ChartConfig[];
  tokenEstimate: number;
  expandedChartId: string | null;

  createSession: () => string;
  switchSession: (id: string) => void;
  updateSessionTitle: (id: string, title: string) => void;
  deleteSession: (id: string) => void;

  addHighlight: (h: CellHighlight) => void;
  removeHighlight: (id: string) => void;

  toggleDarkMode: () => void;
  setChatPanelWidth: (w: number) => void;
  toggleSidebar: () => void;

  addChart: (chart: ChartConfig) => void;
  removeChart: (id: string) => void;
  clearCharts: () => void;
  setExpandedChart: (id: string | null) => void;

  addTokens: (n: number) => void;
  resetTokens: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: [
    { id: initialSessionId, title: "New Chat", createdAt: Date.now() },
  ],
  activeSessionId: initialSessionId,
  highlightedCells: [],
  isDarkMode: false,
  chatPanelWidth: 380,
  isSidebarOpen: true,
  charts: [],
  tokenEstimate: 0,
  expandedChartId: null,

  createSession: () => {
    const id = uid();
    set({
      sessions: [
        { id, title: "New Chat", createdAt: Date.now() },
        ...get().sessions,
      ],
      activeSessionId: id,
    });
    return id;
  },

  switchSession: (id) => set({ activeSessionId: id }),

  updateSessionTitle: (id, title) =>
    set({
      sessions: get().sessions.map((s) =>
        s.id === id ? { ...s, title } : s
      ),
    }),

  deleteSession: (id) => {
    const remaining = get().sessions.filter((s) => s.id !== id);
    if (remaining.length === 0) {
      const newId = uid();
      set({
        sessions: [{ id: newId, title: "New Chat", createdAt: Date.now() }],
        activeSessionId: newId,
      });
    } else {
      set({
        sessions: remaining,
        activeSessionId:
          get().activeSessionId === id
            ? remaining[0].id
            : get().activeSessionId,
      });
    }
  },

  addHighlight: (h) =>
    set({ highlightedCells: [...get().highlightedCells, h] }),
  removeHighlight: (id) =>
    set({
      highlightedCells: get().highlightedCells.filter((h) => h.id !== id),
    }),

  toggleDarkMode: () => {
    const next = !get().isDarkMode;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next);
    }
    set({ isDarkMode: next });
  },

  setChatPanelWidth: (w) =>
    set({ chatPanelWidth: Math.max(300, Math.min(600, w)) }),

  toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),

  addChart: (chart) => set({ charts: [...get().charts, chart] }),
  removeChart: (id) =>
    set({ charts: get().charts.filter((c) => c.id !== id) }),
  clearCharts: () => set({ charts: [] }),
  setExpandedChart: (id) => set({ expandedChartId: id }),

  addTokens: (n) => set({ tokenEstimate: get().tokenEstimate + n }),
  resetTokens: () => set({ tokenEstimate: 0 }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let workbookApi: any = null;

export function setWorkbookApi(api: unknown) {
  workbookApi = api;
}

export function getWorkbookApi() {
  return workbookApi;
}

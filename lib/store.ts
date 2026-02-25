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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const initialSessionId = uid();

interface AppState {
  sessions: ChatSession[];
  activeSessionId: string;
  highlightedCells: CellHighlight[];

  createSession: () => string;
  switchSession: (id: string) => void;
  updateSessionTitle: (id: string, title: string) => void;
  deleteSession: (id: string) => void;

  addHighlight: (h: CellHighlight) => void;
  removeHighlight: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: [
    { id: initialSessionId, title: "New Chat", createdAt: Date.now() },
  ],
  activeSessionId: initialSessionId,
  highlightedCells: [],

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
          get().activeSessionId === id ? remaining[0].id : get().activeSessionId,
      });
    }
  },

  addHighlight: (h) =>
    set({ highlightedCells: [...get().highlightedCells, h] }),
  removeHighlight: (id) =>
    set({
      highlightedCells: get().highlightedCells.filter((h) => h.id !== id),
    }),
}));

// Module-level ref to the FortuneSheet Workbook imperative API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let workbookApi: any = null;

export function setWorkbookApi(api: unknown) {
  workbookApi = api;
}

export function getWorkbookApi() {
  return workbookApi;
}

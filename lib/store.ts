import { create } from "zustand";

export interface ToolCallStep {
  id: string;
  toolName: string;
  description: string;
  status: "running" | "completed" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallStep[];
}

export interface CellHighlight {
  id: string;
  sheetIndex: number;
  row: number;
  col: number;
  endRow: number;
  endCol: number;
}

interface AppState {
  messages: ChatMessage[];
  isAgentLoading: boolean;
  highlightedCells: CellHighlight[];
  activeSheetIndex: number;

  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  addToolCallToMessage: (msgId: string, step: ToolCallStep) => void;
  updateToolCallStatus: (
    msgId: string,
    stepId: string,
    status: ToolCallStep["status"]
  ) => void;
  setAgentLoading: (loading: boolean) => void;
  clearMessages: () => void;

  addHighlight: (h: CellHighlight) => void;
  removeHighlight: (id: string) => void;

  setActiveSheetIndex: (index: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  messages: [],
  isAgentLoading: false,
  highlightedCells: [],
  activeSheetIndex: 0,

  addMessage: (msg) => set({ messages: [...get().messages, msg] }),

  updateMessage: (id, updates) =>
    set({
      messages: get().messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }),

  addToolCallToMessage: (msgId, step) =>
    set({
      messages: get().messages.map((m) =>
        m.id === msgId
          ? { ...m, toolCalls: [...(m.toolCalls || []), step] }
          : m
      ),
    }),

  updateToolCallStatus: (msgId, stepId, status) =>
    set({
      messages: get().messages.map((m) =>
        m.id === msgId
          ? {
              ...m,
              toolCalls: m.toolCalls?.map((tc) =>
                tc.id === stepId ? { ...tc, status } : tc
              ),
            }
          : m
      ),
    }),

  setAgentLoading: (loading) => set({ isAgentLoading: loading }),
  clearMessages: () => set({ messages: [] }),

  addHighlight: (h) =>
    set({ highlightedCells: [...get().highlightedCells, h] }),
  removeHighlight: (id) =>
    set({
      highlightedCells: get().highlightedCells.filter((h) => h.id !== id),
    }),

  setActiveSheetIndex: (index) => set({ activeSheetIndex: index }),
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

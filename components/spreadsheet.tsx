"use client";

import { useEffect, useRef, useCallback } from "react";
import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import { setWorkbookApi, useAppStore } from "@/lib/store";
import type { Sheet } from "@fortune-sheet/core";

const defaultSheetData: Sheet[] = [
  {
    name: "Sheet1",
    id: "sheet_01",
    order: 0,
    status: 1,
    celldata: [],
    row: 84,
    column: 60,
    config: {},
  },
];

export default function Spreadsheet() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workbookRef = useRef<any>(null);
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);
  const chatPanelWidth = useAppStore((s) => s.chatPanelWidth);

  useEffect(() => {
    if (workbookRef.current) {
      setWorkbookApi(workbookRef.current);
    }
    return () => {
      setWorkbookApi(null);
    };
  }, []);

  // Force FortuneSheet to recalculate layout when sidebar toggles or resizes
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
    return () => clearTimeout(timer);
  }, [isSidebarOpen, chatPanelWidth]);

  const handleChange = useCallback(() => {}, []);

  return (
    <div className="fortune-sheet-container w-full h-full">
      <Workbook
        ref={workbookRef}
        data={defaultSheetData}
        onChange={handleChange}
        showToolbar={true}
        showFormulaBar={true}
        showSheetTabs={true}
        allowEdit={true}
        column={60}
        row={84}
      />
    </div>
  );
}

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
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Tell FortuneSheet to recalculate size when the container resizes
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    return () => clearTimeout(t);
  }, [isSidebarOpen, chatPanelWidth]);

  // Shift+Scroll: convert vertical wheel to horizontal scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.shiftKey && e.deltaY !== 0) {
      const scrollbarX = containerRef.current?.querySelector(
        ".luckysheet-scrollbar-x"
      ) as HTMLDivElement | null;
      if (scrollbarX) {
        e.preventDefault();
        e.stopPropagation();
        scrollbarX.scrollLeft += e.deltaY;
      }
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { capture: true });
    return () => el.removeEventListener("wheel", handleWheel, { capture: true });
  }, [handleWheel]);

  const handleChange = useCallback(() => {}, []);

  return (
    <div ref={containerRef} className="fortune-sheet-container w-full h-full">
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
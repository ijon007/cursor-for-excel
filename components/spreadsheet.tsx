"use client";

import { useEffect, useRef, useCallback } from "react";
import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import { setWorkbookApi, useAppStore, getWorkbookApi } from "@/lib/store";
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
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.shiftKey && e.deltaY !== 0) {
        const api = getWorkbookApi();
        const scrollbarX = el.querySelector(
          ".luckysheet-scrollbar-x"
        ) as HTMLDivElement | null;
        if (api && scrollbarX) {
          e.preventDefault();
          e.stopPropagation();
          const newScroll = Math.max(0, scrollbarX.scrollLeft + e.deltaY);
          api.scroll({ scrollLeft: newScroll });
        }
      }
    };
    el.addEventListener("wheel", handler, { capture: true });
    return () => el.removeEventListener("wheel", handler, { capture: true });
  }, []);

  const handleChange = useCallback(() => {}, []);

  return (
    <div ref={containerRef} className="fortune-sheet-container w-full h-full">
      <Workbook
        ref={workbookRef}
        data={defaultSheetData}
        onChange={handleChange}
        showToolbar={true}
        showFormulaBar={true}
        showSheetTabs={false}
        allowEdit={true}
        column={60}
        row={84}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
import { setWorkbookApi, useAppStore } from "@/lib/store";

type UniverApiLike = {
  createWorkbook: (data: Record<string, unknown>) => void;
  getActiveWorkbook: () => {
    getActiveSheet: () => {
      setRowCount: (rows: number) => void;
      setColumnCount: (cols: number) => void;
    } | null;
  } | null;
  toggleDarkMode: (enabled: boolean) => void;
  dispose: () => void;
};

export default function Spreadsheet() {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerApiRef = useRef<UniverApiLike | null>(null);
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);
  const chatPanelWidth = useAppStore((s) => s.chatPanelWidth);
  const isDarkMode = useAppStore((s) => s.isDarkMode);

  useEffect(() => {
    if (!containerRef.current) return;

    const { univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      },
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
        }),
      ],
    });

    univerAPI.createWorkbook({});
    const activeSheet = univerAPI.getActiveWorkbook()?.getActiveSheet();
    activeSheet?.setRowCount(200);
    activeSheet?.setColumnCount(60);
    univerAPI.toggleDarkMode(useAppStore.getState().isDarkMode);

    univerApiRef.current = univerAPI;
    setWorkbookApi(univerAPI);

    return () => {
      univerApiRef.current = null;
      setWorkbookApi(null);
      univerAPI.dispose();
    };
    // Mount once; dark-mode and layout reactions are handled in dedicated effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    univerApiRef.current?.toggleDarkMode(isDarkMode);
  }, [isDarkMode]);

  // Trigger layout recalculation when chat panel size changes.
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    return () => clearTimeout(t);
  }, [isSidebarOpen, chatPanelWidth]);

  return <div ref={containerRef} className="univer-sheet-container h-full w-full" />;
}
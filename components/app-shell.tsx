"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";
import {
  Moon,
  Sun,
  ArrowCounterClockwise,
  ArrowClockwise,
  SidebarSimple,
  Sparkle,
} from "@phosphor-icons/react";
import ChatPanel from "@/components/chat-panel";
import { useAppStore } from "@/lib/store";
import { handleUndo, handleRedo } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import ChartModal from "@/components/chart-modal";

const Spreadsheet = dynamic(() => import("@/components/spreadsheet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-background">
      <p className="text-xs text-muted-foreground">Loading spreadsheet...</p>
    </div>
  ),
});

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const dragging = useRef(false);
  const startX = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = startX.current - ev.clientX;
        startX.current = ev.clientX;
        onResize(delta);
      };
      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onResize]
  );

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1.5 shrink-0 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors relative group"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
    </div>
  );
}

export default function AppShell() {
  const {
    isDarkMode,
    toggleDarkMode,
    chatPanelWidth,
    setChatPanelWidth,
    isSidebarOpen,
    toggleSidebar,
  } = useAppStore();

  const handleResize = useCallback(
    (delta: number) => {
      setChatPanelWidth(chatPanelWidth + delta);
    },
    [chatPanelWidth, setChatPanelWidth]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* ─── Top toolbar ────────────────────────────── */}
      <div
        className="h-9 shrink-0 border-b border-border bg-card flex items-center justify-between px-3 gap-2"
        data-print-hide
      >
        {/* Left: app identity */}
        <div className="flex items-center gap-2">
          <div className="size-5 rounded bg-primary flex items-center justify-center">
            <Sparkle weight="fill" className="size-3 text-primary-foreground" />
          </div>
          <span className="text-xs font-medium">Cursor for Excel</span>
        </div>

        {/* Center: undo / redo */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleUndo}
            title="Undo (Ctrl+Z)"
          >
            <ArrowCounterClockwise weight="bold" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleRedo}
            title="Redo (Ctrl+Y)"
          >
            <ArrowClockwise weight="bold" />
          </Button>
        </div>

        {/* Right: dark mode + sidebar toggle */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleDarkMode}
            title="Toggle dark mode"
          >
            {isDarkMode ? (
              <Sun weight="bold" />
            ) : (
              <Moon weight="bold" />
            )}
          </Button>
          <Button
            variant={isSidebarOpen ? "ghost" : "outline"}
            size="icon-xs"
            onClick={toggleSidebar}
            title={isSidebarOpen ? "Close AI panel" : "Open AI panel"}
          >
            <SidebarSimple weight="bold" />
          </Button>
        </div>
      </div>

      {/* ─── Main content ───────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Spreadsheet */}
        <div className="flex-1 min-w-0 h-full">
          <Spreadsheet />
        </div>

        {/* Resize handle + Chat panel */}
        {isSidebarOpen && (
          <>
            <ResizeHandle onResize={handleResize} />
            <div
              className="h-full border-l border-border shrink-0"
              style={{ width: chatPanelWidth }}
            >
              <ChatPanel />
            </div>
          </>
        )}
      </div>

      {/* Chart expand modal */}
      <ChartModal />
    </div>
  );
}

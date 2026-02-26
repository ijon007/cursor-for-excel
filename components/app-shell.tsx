"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useEffect } from "react";
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
      e.stopPropagation();
      dragging.current = true;
      startX.current = e.clientX;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        ev.preventDefault();
        const delta = startX.current - ev.clientX;
        startX.current = ev.clientX;
        onResize(delta);
      };
      const onUp = () => {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
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
      className="w-2 shrink-0 cursor-col-resize relative z-30 group"
      style={{ touchAction: "none" }}
    >
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:w-0.5 group-hover:bg-primary/50 group-active:w-1 group-active:bg-primary transition-all" />
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

  // Fire resize after sidebar toggle so FortuneSheet recalculates
  const prevOpen = useRef(isSidebarOpen);
  useEffect(() => {
    if (prevOpen.current !== isSidebarOpen) {
      prevOpen.current = isSidebarOpen;
      setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
    }
  }, [isSidebarOpen]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* ─── Top toolbar ────────────────────────────── */}
      <div
        className="h-9 shrink-0 border-b border-border bg-card flex items-center justify-between px-3 gap-2 z-40 relative"
        data-print-hide
      >
        <div className="flex items-center gap-2">
          <div className="size-5 rounded bg-primary flex items-center justify-center">
            <Sparkle weight="fill" className="size-3 text-primary-foreground" />
          </div>
          <span className="text-xs font-medium">Cursor for Excel</span>
        </div>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-xs" onClick={handleUndo} title="Undo (Ctrl+Z)">
            <ArrowCounterClockwise weight="bold" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={handleRedo} title="Redo (Ctrl+Y)">
            <ArrowClockwise weight="bold" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" onClick={toggleDarkMode} title="Toggle dark mode">
            {isDarkMode ? <Sun weight="bold" /> : <Moon weight="bold" />}
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
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Spreadsheet — always full width, sidebar overlays on top */}
        <div className="absolute inset-0">
          <Spreadsheet />
        </div>

        {/* Sidebar overlay */}
        {isSidebarOpen && (
          <div
            className="absolute top-0 right-0 bottom-0 z-30 flex"
            style={{ width: chatPanelWidth + 8 }}
          >
            <ResizeHandle onResize={handleResize} />
            <div className="flex-1 h-full bg-card border-l border-border shadow-xl">
              <ChatPanel />
            </div>
          </div>
        )}
      </div>

      <ChartModal />
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";
import {
  Moon,
  Sun,
  ArrowCounterClockwise,
  ArrowClockwise,
} from "@phosphor-icons/react";
import ChatPanel from "@/components/chat-panel";
import { useAppStore } from "@/lib/store";
import { handleUndo, handleRedo } from "@/lib/tools";
import { Button } from "@/components/ui/button";

const Spreadsheet = dynamic(() => import("@/components/spreadsheet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-background">
      <p className="text-xs text-muted-foreground">Loading spreadsheet...</p>
    </div>
  ),
});

function ResizeHandle({
  onResize,
}: {
  onResize: (delta: number) => void;
}) {
  const dragging = useRef(false);
  const startX = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
      className="w-1 shrink-0 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors relative group"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

export default function AppShell() {
  const { isDarkMode, toggleDarkMode, chatPanelWidth, setChatPanelWidth } =
    useAppStore();

  const handleResize = useCallback(
    (delta: number) => {
      setChatPanelWidth(chatPanelWidth + delta);
    },
    [chatPanelWidth, setChatPanelWidth]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Spreadsheet pane */}
      <div className="flex-1 min-w-0 h-full relative">
        <Spreadsheet />
        {/* Floating toolbar */}
        <div className="absolute top-1 right-2 z-10 flex gap-0.5 bg-card/80 backdrop-blur-sm rounded-md border border-border p-0.5 shadow-sm" data-print-hide>
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
          <div className="w-px bg-border mx-0.5" />
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
        </div>
      </div>

      {/* Resize handle */}
      <ResizeHandle onResize={handleResize} />

      {/* Chat pane */}
      <div
        className="h-full border-l border-border shrink-0"
        style={{ width: chatPanelWidth }}
      >
        <ChatPanel />
      </div>
    </div>
  );
}

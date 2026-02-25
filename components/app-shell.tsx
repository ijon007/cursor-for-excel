"use client";

import dynamic from "next/dynamic";
import ChatPanel from "@/components/chat-panel";

const Spreadsheet = dynamic(() => import("@/components/spreadsheet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-background">
      <p className="text-xs text-muted-foreground">Loading spreadsheet...</p>
    </div>
  ),
});

export default function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 min-w-0 h-full">
        <Spreadsheet />
      </div>
      <div className="w-[380px] h-full border-l border-border shrink-0">
        <ChatPanel />
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import {
  PaperPlaneTilt,
  UploadSimple,
  DownloadSimple,
  CheckCircle,
  CircleNotch,
  Sparkle,
  Plus,
  CaretDown,
  Wallet,
  ChartLineUp,
  CurrencyDollar,
  CalendarDots,
  Receipt,
  Table as TableIcon,
  Chat as ChatIcon,
} from "@phosphor-icons/react";
import { useAppStore } from "@/lib/store";
import { executeToolOnClient, getToolDescription } from "@/lib/tools";
import { serializeSheetToString } from "@/lib/serialize-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { importXlsx, exportXlsx } from "@/lib/file-io";
import type { UIMessage } from "ai";

const TEMPLATES = [
  { label: "Monthly Budget", prompt: "Build a monthly budget tracker with 12 months of income and common expense categories. Include formulas for savings and totals.", icon: Wallet },
  { label: "DCF Model", prompt: "Build a 5-year DCF (Discounted Cash Flow) model with revenue projections, costs, EBITDA, and free cash flow calculations.", icon: ChartLineUp },
  { label: "P&L Statement", prompt: "Create a quarterly P&L (Profit & Loss) statement with revenue, COGS, operating expenses, and net income. Include FY totals.", icon: Receipt },
  { label: "Cap Table", prompt: "Make a cap table showing founders, employee pool, and investor ownership with share counts and percentage calculations.", icon: CurrencyDollar },
  { label: "Amortization", prompt: "Create a loan amortization schedule for a $250,000 loan at 5.5% annual rate over 30 years. Show first 12 monthly payments.", icon: CalendarDots },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isToolPart(part: any): boolean {
  if (!part || typeof part !== "object") return false;
  const t = part.type as string;
  return t === "dynamic-tool" || (typeof t === "string" && t.startsWith("tool-"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getToolPartInfo(part: any): { toolName: string; args: any; state: string } | null {
  if (!part || typeof part !== "object") return null;
  const t = part.type as string;
  if (t === "dynamic-tool") {
    return { toolName: part.toolName, args: part.input, state: part.state };
  }
  if (typeof t === "string" && t.startsWith("tool-")) {
    const toolInv = part.toolInvocation ?? part;
    return {
      toolName: toolInv.toolName ?? t.slice(5),
      args: toolInv.args ?? toolInv.input ?? {},
      state: toolInv.state ?? "output-available",
    };
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolCallItem({ part }: { part: any }) {
  const info = getToolPartInfo(part);
  if (!info) return null;

  const done = info.state === "output-available" || info.state === "result";
  const errored = info.state === "output-error" || info.state === "error";
  const description = getToolDescription(info.toolName, info.args ?? {});

  return (
    <div className="flex items-center gap-1.5 mt-1">
      {done ? (
        <CheckCircle weight="fill" className="size-3 text-primary shrink-0" />
      ) : errored ? (
        <CheckCircle weight="fill" className="size-3 text-destructive shrink-0" />
      ) : (
        <CircleNotch weight="bold" className="size-3 text-muted-foreground shrink-0 animate-spin" />
      )}
      <span className="text-[0.625rem] text-muted-foreground truncate">{description}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const textParts = (message.parts ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.type === "text" && p.text
  );
  const toolParts = (message.parts ?? []).filter(isToolPart);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textContent = textParts.map((p: any) => p.text).join("");

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "px-3 py-2 max-w-[85%] text-xs/relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-lg rounded-br-sm"
            : "bg-muted text-foreground rounded-lg rounded-bl-sm"
        )}
      >
        {!isUser && toolParts.length > 0 && (
          <div className="mb-2 space-y-0.5">
            {toolParts.map((part, i) => (
              <ToolCallItem key={i} part={part} />
            ))}
          </div>
        )}
        {textContent && (
          <p className="whitespace-pre-wrap">{textContent}</p>
        )}
        {!isUser && !textContent && toolParts.length === 0 && (
          <div className="flex items-center gap-1.5">
            <CircleNotch weight="bold" className="size-3 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionDropdown({
  onClose,
}: {
  onClose: () => void;
}) {
  const { sessions, activeSessionId, switchSession, deleteSession } =
    useAppStore();

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-[240px] overflow-y-auto">
      {sessions.map((s) => (
        <button
          key={s.id}
          onClick={() => {
            switchSession(s.id);
            onClose();
          }}
          className={cn(
            "w-full text-left px-3 py-2 text-xs/relaxed hover:bg-accent transition-colors flex items-center gap-2",
            s.id === activeSessionId && "bg-accent"
          )}
        >
          <ChatIcon weight="bold" className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate flex-1">{s.title}</span>
          {sessions.length > 1 && s.id !== activeSessionId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(s.id);
              }}
              className="text-[0.625rem] text-muted-foreground hover:text-destructive shrink-0"
            >
              ×
            </button>
          )}
        </button>
      ))}
    </div>
  );
}

export default function ChatPanel() {
  const [localInput, setLocalInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const {
    sessions,
    activeSessionId,
    createSession,
    updateSessionTitle,
  } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const executedToolCalls = useRef(new Set<string>());

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: activeSessionId,
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Execute tool calls on the client as they arrive
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts ?? []) {
        if (!isToolPart(part)) continue;
        const info = getToolPartInfo(part);
        if (!info) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolCallId = (part as any).toolCallId;
        if (!toolCallId || executedToolCalls.current.has(toolCallId)) continue;
        if (
          info.state === "input-available" ||
          info.state === "output-available" ||
          info.state === "result" ||
          info.state === "call"
        ) {
          executeToolOnClient(info.toolName, info.args ?? {});
          executedToolCalls.current.add(toolCallId);
        }
      }
    }
  }, [messages]);

  // Update session title from first user message
  useEffect(() => {
    const firstUserMsg = messages.find((m) => m.role === "user");
    if (firstUserMsg && activeSession?.title === "New Chat") {
      const content =
        firstUserMsg.parts
          ?.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => p.type === "text"
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => p.text)
          .join("") || "";
      if (content) {
        const title =
          content.slice(0, 50) + (content.length > 50 ? "..." : "");
        updateSessionTitle(activeSessionId, title);
      }
    }
  }, [messages, activeSessionId, activeSession?.title, updateSessionTitle]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      setLocalInput("");
      const snapshot = serializeSheetToString();
      await sendMessage({
        text: text.trim(),
      }, {
        body: { sheetSnapshot: snapshot },
      });
    },
    [isLoading, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(localInput);
      }
    },
    [handleSend, localInput]
  );

  const handleNewChat = useCallback(() => {
    createSession();
    executedToolCalls.current.clear();
    setMessages([]);
  }, [createSession, setMessages]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await importXlsx(file);
        e.target.value = "";
      }
    },
    []
  );

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-primary flex items-center justify-center">
            <TableIcon weight="bold" className="size-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-medium leading-none">Cursor for Excel</h1>
            <p className="text-[0.625rem] text-muted-foreground mt-0.5">AI-powered spreadsheet</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" onClick={handleImport} title="Import .xlsx">
            <UploadSimple weight="bold" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={exportXlsx} title="Export .xlsx">
            <DownloadSimple weight="bold" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleNewChat} title="New chat">
            <Plus weight="bold" />
          </Button>
        </div>
      </div>

      {/* Session Picker */}
      <div className="px-3 pt-2 pb-1 shrink-0 relative">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs/relaxed",
            "bg-input/20 dark:bg-input/30 border border-input hover:bg-input/40 transition-colors text-left"
          )}
        >
          <ChatIcon weight="bold" className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate flex-1">{activeSession?.title ?? "New Chat"}</span>
          <CaretDown
            weight="bold"
            className={cn(
              "size-3 shrink-0 text-muted-foreground transition-transform",
              showHistory && "rotate-180"
            )}
          />
        </button>
        {showHistory && (
          <SessionDropdown onClose={() => setShowHistory(false)} />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkle weight="fill" className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Welcome to Cursor for Excel</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                Describe what you want to build and the AI agent will create it in the spreadsheet.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground px-3 py-2 rounded-lg rounded-bl-sm text-xs/relaxed">
              <div className="flex items-center gap-1.5">
                <CircleNotch weight="bold" className="size-3 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Templates */}
      <div className="px-3 py-2 border-t border-border shrink-0">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {TEMPLATES.map((t) => (
            <Button
              key={t.label}
              variant="outline"
              size="xs"
              className="shrink-0 gap-1"
              disabled={isLoading}
              onClick={() => handleSend(t.prompt)}
            >
              <t.icon weight="bold" className="size-3" />
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what to build..."
            rows={1}
            disabled={isLoading}
            className={cn(
              "bg-input/20 dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/30",
              "flex-1 min-h-[2rem] max-h-[6rem] resize-none rounded-md border px-2.5 py-1.5 text-xs/relaxed",
              "placeholder:text-muted-foreground outline-none focus-visible:ring-2 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <Button
            size="icon"
            disabled={!localInput.trim() || isLoading}
            onClick={() => handleSend(localInput)}
          >
            {isLoading ? (
              <CircleNotch weight="bold" className="animate-spin" />
            ) : (
              <PaperPlaneTilt weight="fill" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

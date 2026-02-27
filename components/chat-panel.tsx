"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  PaperPlaneTilt,
  UploadSimple,
  DownloadSimple,
  CheckCircle,
  CircleNotch,
  Sparkle,
  Plus,
  Wallet,
  ChartLineUp,
  CurrencyDollar,
  CalendarDots,
  Receipt,
  Chat as ChatIcon,
  ArrowCounterClockwise,
  MagnifyingGlass,
  ChartBar,
  Lightning,
  Buildings,
  Calculator,
  Users,
  TrendUp,
  Coins,
  FileText,
  Scales,
  Printer,
} from "@phosphor-icons/react";
import { useAppStore } from "@/lib/store";
import { executeToolOnClient, getToolDescription } from "@/lib/tools";
import { serializeSheetToString } from "@/lib/serialize-sheet";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { importXlsx, exportXlsx } from "@/lib/file-io";
import MarkdownContent from "@/components/markdown-content";
import InlineChart from "@/components/inline-chart";
import type { UIMessage } from "ai";

// ─── Templates ────────────────────────────────────────────

const TEMPLATES = [
  { label: "Monthly Budget", prompt: "Build a monthly budget tracker with 12 months of income and common expense categories. Include formulas for savings and totals.", icon: Wallet },
  { label: "DCF Model", prompt: "Build a 5-year DCF model with revenue projections, COGS, EBITDA, and free cash flow calculations.", icon: ChartLineUp },
  { label: "P&L Statement", prompt: "Create a quarterly P&L statement with revenue, COGS, operating expenses, and net income. Include FY totals.", icon: Receipt },
  { label: "Cap Table", prompt: "Make a cap table with founders, employee pool, and investor ownership with share counts and percentages.", icon: CurrencyDollar },
  { label: "Amortization", prompt: "Create a loan amortization schedule for a $250,000 loan at 5.5% over 30 years. Show first 12 payments.", icon: CalendarDots },
  { label: "Sales Forecast", prompt: "Build a 12-month sales forecast with 3 product lines, growth rates, and seasonal adjustments.", icon: TrendUp },
  { label: "Balance Sheet", prompt: "Create a balance sheet with assets, liabilities, and equity sections. Include common line items and formulas.", icon: Scales },
  { label: "Cash Flow", prompt: "Build a cash flow statement with operating, investing, and financing activities for 4 quarters.", icon: Coins },
  { label: "Invoice", prompt: "Create a professional invoice template with company info, line items, subtotal, tax, and total.", icon: FileText },
  { label: "KPI Dashboard", prompt: "Build a KPI dashboard with revenue, costs, margins, customer metrics, and month-over-month changes.", icon: ChartBar },
  { label: "Break-Even", prompt: "Create a break-even analysis with fixed costs, variable costs per unit, selling price, and a break-even chart.", icon: Calculator },
  { label: "Headcount Plan", prompt: "Build a headcount plan with departments, roles, salaries, start dates, and monthly/annual cost projections.", icon: Users },
  { label: "Pricing Model", prompt: "Create a SaaS pricing calculator with tiers, user counts, feature comparison, and revenue projections.", icon: Buildings },
  { label: "Unit Economics", prompt: "Build a unit economics model with CAC, LTV, payback period, churn rate, and margins.", icon: Lightning },
];

const FOLLOW_UP_SUGGESTIONS = [
  { label: "Add a chart", prompt: "Create a chart visualizing the key data in this spreadsheet." },
  { label: "Format as currency", prompt: "Format all number cells as currency with $ sign and 2 decimal places." },
  { label: "Add conditional formatting", prompt: "Apply conditional formatting to highlight the best and worst performing values." },
  { label: "Explain formulas", prompt: "Explain what each formula in this spreadsheet does." },
];

// ─── Tool part helpers ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isToolPart(part: any): boolean {
  if (!part || typeof part !== "object") return false;
  const t = part.type as string;
  return t === "dynamic-tool" || (typeof t === "string" && t.startsWith("tool-"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getToolPartInfo(part: any): { toolName: string; args: any; state: string; output?: any } | null {
  if (!part || typeof part !== "object") return null;
  const t = part.type as string;
  if (t === "dynamic-tool") {
    return { toolName: part.toolName, args: part.input, state: part.state, output: part.output };
  }
  if (typeof t === "string" && t.startsWith("tool-")) {
    const toolInv = part.toolInvocation ?? part;
    return {
      toolName: toolInv.toolName ?? t.slice(5),
      args: toolInv.args ?? toolInv.input ?? {},
      state: toolInv.state ?? "output-available",
      output: toolInv.output ?? toolInv.result,
    };
  }
  return null;
}

// ─── Sub-components ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolCallItem({ part }: { part: any }) {
  const info = getToolPartInfo(part);
  if (!info) return null;

  const done = info.state === "output-available" || info.state === "result";
  const errored = info.state === "output-error" || info.state === "error";

  // Render inline chart for add_chart
  if (info.toolName === "add_chart" && done && info.output) {
    return <InlineChart data={info.output} />;
  }

  const description = getToolDescription(info.toolName, info.args ?? {});

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      {done ? (
        <CheckCircle weight="fill" className="size-3 text-primary shrink-0" />
      ) : errored ? (
        <CheckCircle weight="fill" className="size-3 text-destructive shrink-0" />
      ) : (
        <CircleNotch weight="bold" className="size-3 text-muted-foreground shrink-0 animate-spin" />
      )}
      <span className="text-[0.625rem] text-muted-foreground truncate">
        {description}
      </span>
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
        {textContent ? (
          isUser ? (
            <p className="whitespace-pre-wrap">{textContent}</p>
          ) : (
            <MarkdownContent content={textContent} />
          )
        ) : (
          !isUser &&
          toolParts.length === 0 && (
            <div className="flex items-center gap-1.5">
              <CircleNotch weight="bold" className="size-3 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Thinking...</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────

export default function ChatPanel() {
  const [localInput, setLocalInput] = useState("");
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const {
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
    tokenEstimate,
    addTokens,
  } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const executedToolCalls = useRef(new Set<string>());

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        body: () => ({ sheetSnapshot: serializeSheetToString() }),
      })
  );

  const { messages, sendMessage, status, setMessages, regenerate } = useChat({
    id: activeSessionId,
    transport,
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const hasError = status === "error";

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
        const canExecute =
          info.state === "input-available" ||
          info.state === "output-available" ||
          info.state === "result" ||
          info.state === "call";
        const hasChartOutput = info.toolName === "add_chart" && info.output;
        if (canExecute && (info.toolName !== "add_chart" || hasChartOutput)) {
          const output = info.toolName === "add_chart" && info.output ? info.output : undefined;
          executeToolOnClient(info.toolName, info.args ?? {}, output);
          executedToolCalls.current.add(toolCallId);
        }
      }
    }
  }, [messages]);

  // Update session title from first user message
  useEffect(() => {
    const firstUserMsg = messages.find((m) => m.role === "user");
    if (firstUserMsg && activeSession?.title === "New Chat") {
      const content = firstUserMsg.parts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.filter((p: any) => p.type === "text")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) => p.text)
        .join("") || "";
      if (content) {
        updateSessionTitle(activeSessionId, content.slice(0, 50) + (content.length > 50 ? "..." : ""));
      }
    }
  }, [messages, activeSessionId, activeSession?.title, updateSessionTitle]);

  // Estimate tokens
  useEffect(() => {
    let total = 0;
    for (const msg of messages) {
      for (const part of msg.parts ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((part as any).type === "text" && (part as any).text) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          total += Math.ceil((part as any).text.length / 4);
        }
      }
    }
    addTokens(total);
  // only on message count changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      setLocalInput("");
      await sendMessage({ text: text.trim() });
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

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const visibleTemplates = showAllTemplates ? TEMPLATES : TEMPLATES.slice(0, 5);
  const showFollowUps = !isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "assistant";

  return (
    <div className="flex flex-col h-full bg-card" data-print-hide>
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">AI Chat</span>
          {tokenEstimate > 0 && (
            <span className="text-[0.625rem] text-muted-foreground opacity-60">· ~{tokenEstimate.toLocaleString()} tok</span>
          )}
        </div>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon-xs" onClick={handlePrint} title="Print">
            <Printer weight="bold" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => fileInputRef.current?.click()} title="Import .xlsx">
            <UploadSimple weight="bold" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={exportXlsx} title="Export .xlsx">
            <DownloadSimple weight="bold" />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon-xs" onClick={handleNewChat} title="New chat">
            <Plus weight="bold" />
          </Button>
        </div>
      </div>

      {/* Session Picker */}
      <div className="px-2 pb-1 shrink-0">
        <Combobox
          value={activeSessionId}
          onValueChange={(id) => id != null && switchSession(id)}
          items={sessions.map((s) => ({ value: s.id, label: s.title }))}
          filter={() => true}
        >
          <ComboboxInput
            placeholder="New Chat"
            showClear={false}
            className="w-full bg-input/20 dark:bg-input/30 border-input"
          />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxCollection>
                {(item) => (
                  <ComboboxItem
                    key={item.value}
                    value={item.value}
                    className="gap-2"
                  >
                    <ChatIcon weight="bold" className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{item.label}</span>
                    {sessions.length > 1 && item.value !== activeSessionId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          deleteSession(item.value);
                        }}
                        className="text-[0.625rem] text-muted-foreground hover:text-destructive shrink-0 -mr-1"
                      >
                        ×
                      </button>
                    )}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await importXlsx(f); e.target.value = ""; } }} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 no-scrollbar">
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
              <p className="text-[0.625rem] text-muted-foreground mt-2 opacity-60">
                Press <kbd className="px-1 py-0.5 rounded bg-muted text-[0.5625rem]">⌘K</kbd> to focus chat
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

        {/* Error retry */}
        {hasError && (
          <div className="flex justify-start">
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-xs/relaxed flex items-center gap-2">
              <span>Something went wrong.</span>
              <Button variant="outline" size="xs" onClick={() => regenerate()} className="text-destructive border-destructive/30">
                <ArrowCounterClockwise weight="bold" className="size-3" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Follow-up suggestions */}
        {showFollowUps && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {FOLLOW_UP_SUGGESTIONS.map((s) => (
              <Button
                key={s.label}
                variant="outline"
                size="xs"
                className="text-[0.625rem] gap-1 opacity-70 hover:opacity-100"
                onClick={() => handleSend(s.prompt)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Templates */}
      <div className="px-3 py-2 border-t border-border shrink-0">
        {messages.length === 0 && (
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[0.625rem] font-medium text-muted-foreground">Templates</span>
            <button
              onClick={() => setShowAllTemplates(!showAllTemplates)}
              className="text-[0.625rem] text-primary hover:underline"
            >
              {showAllTemplates ? "Show less" : `Show all (${TEMPLATES.length})`}
            </button>
          </div>
        )}
        <div className={cn(
          "flex gap-1.5 overflow-x-auto no-scrollbar",
          messages.length === 0 && showAllTemplates && "flex-wrap"
        )}>
          {(messages.length === 0 ? visibleTemplates : TEMPLATES.slice(0, 5)).map((t) => (
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
          {messages.length === 0 && !showAllTemplates && (
            <Button variant="ghost" size="xs" className="shrink-0 text-muted-foreground" onClick={() => setShowAllTemplates(true)}>
              +{TEMPLATES.length - 5} more
            </Button>
          )}
        </div>
      </div>

      {/* Explain button + Input */}
      <div className="px-3 pb-3 pt-2 shrink-0">
        {messages.length > 0 && (
          <div className="flex gap-1.5 mb-2">
            <Button
              variant="ghost"
              size="xs"
              className="text-[0.625rem] gap-1 text-muted-foreground"
              disabled={isLoading}
              onClick={() => handleSend("Analyze the current spreadsheet and explain what it contains, what the formulas do, and any issues you notice.")}
            >
              <MagnifyingGlass weight="bold" className="size-3" />
              Explain this sheet
            </Button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what to build... (⌘K)"
            rows={1}
            disabled={isLoading}
            className={cn(
              "bg-input/20 dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/30",
              "flex-1 min-h-8 max-h-24 resize-none rounded-md border px-2.5 py-1.5 text-xs/relaxed",
              "placeholder:text-muted-foreground outline-none focus-visible:ring-2 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <Button size="icon" disabled={!localInput.trim() || isLoading} onClick={() => handleSend(localInput)}>
            {isLoading ? <CircleNotch weight="bold" className="animate-spin" /> : <PaperPlaneTilt weight="fill" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  PaperPlaneTilt,
  UploadSimple,
  DownloadSimple,
  CheckCircle,
  CircleNotch,
  Sparkle,
  Eraser,
  Table as TableIcon,
  ChartLineUp,
  CurrencyDollar,
  Wallet,
  CalendarDots,
  Receipt,
} from "@phosphor-icons/react";
import { useAppStore, type ChatMessage } from "@/lib/store";
import { executeMockAgent } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { importXlsx, exportXlsx } from "@/lib/file-io";

const TEMPLATES = [
  { label: "Monthly Budget", prompt: "Build a monthly budget tracker", icon: Wallet },
  { label: "DCF Model", prompt: "Build a DCF model", icon: ChartLineUp },
  { label: "P&L Statement", prompt: "Create a P&L statement", icon: Receipt },
  { label: "Cap Table", prompt: "Make a cap table", icon: CurrencyDollar },
  { label: "Amortization", prompt: "Create an amortization schedule", icon: CalendarDots },
];

function ToolCallItem({ step }: { step: ChatMessage["toolCalls"] extends (infer T)[] | undefined ? T : never }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      {step.status === "completed" ? (
        <CheckCircle weight="fill" className="size-3 text-primary shrink-0" />
      ) : step.status === "error" ? (
        <CheckCircle weight="fill" className="size-3 text-destructive shrink-0" />
      ) : (
        <CircleNotch weight="bold" className="size-3 text-muted-foreground shrink-0 animate-spin" />
      )}
      <span className="text-[0.625rem] text-muted-foreground">{step.description}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

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
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 space-y-0.5">
            {message.toolCalls.map((tc) => (
              <ToolCallItem key={tc.id} step={tc} />
            ))}
          </div>
        )}
        {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
        {!isUser && !message.content && (!message.toolCalls || message.toolCalls.length === 0) && (
          <div className="flex items-center gap-1.5">
            <CircleNotch weight="bold" className="size-3 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const { messages, isAgentLoading, clearMessages } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isAgentLoading) return;
    setInput("");
    await executeMockAgent(text);
  }, [input, isAgentLoading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

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
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
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
          {messages.length > 0 && (
            <Button variant="ghost" size="icon-sm" onClick={clearMessages} title="Clear chat">
              <Eraser weight="bold" />
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
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
              disabled={isAgentLoading}
              onClick={() => executeMockAgent(t.prompt)}
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what to build..."
            rows={1}
            disabled={isAgentLoading}
            className={cn(
              "bg-input/20 dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/30",
              "flex-1 min-h-[2rem] max-h-[6rem] resize-none rounded-md border px-2.5 py-1.5 text-xs/relaxed",
              "placeholder:text-muted-foreground outline-none focus-visible:ring-2 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <Button
            size="icon"
            disabled={!input.trim() || isAgentLoading}
            onClick={handleSend}
          >
            {isAgentLoading ? (
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

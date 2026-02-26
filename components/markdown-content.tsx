"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { selectCell } from "@/lib/tools";

const CELL_REF_REGEX = /\b([A-Z]{1,3}\d{1,5}(?::[A-Z]{1,3}\d{1,5})?)\b/g;

function processTextWithCellRefs(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  CELL_REF_REGEX.lastIndex = 0;
  while ((match = CELL_REF_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const ref = match[1];
    const baseRef = ref.includes(":") ? ref.split(":")[0] : ref;
    parts.push(
      <button
        key={`${match.index}-${ref}`}
        onClick={() => selectCell(baseRef)}
        className="inline text-primary hover:underline cursor-pointer font-mono text-[0.6875rem]"
      >
        {ref}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-1.5 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => (
          <ul className="list-disc ml-3.5 mb-1.5 space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal ml-3.5 mb-1.5 space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-background/50 rounded px-1 py-0.5 text-[0.625rem] font-mono">
              {children}
            </code>
          ) : (
            <code className={className}>{children}</code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-background/50 rounded-md p-2 overflow-x-auto text-[0.625rem] mb-1.5">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-1.5">
            <table className="text-[0.625rem] border-collapse w-full">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border/50 px-1.5 py-0.5 text-left font-semibold bg-muted/50">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border/50 px-1.5 py-0.5">{children}</td>
        ),
        // Intercept text nodes to add cell reference links
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        text: ({ children }: any) => {
          if (typeof children === "string" && CELL_REF_REGEX.test(children)) {
            return <>{processTextWithCellRefs(children)}</>;
          }
          return <>{children}</>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

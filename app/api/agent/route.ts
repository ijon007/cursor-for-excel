import { NextResponse } from "next/server";
import { toolDefinitions } from "@/lib/tools";

export async function POST(req: Request) {
  const body = await req.json();
  const { message, sheetSnapshot } = body;

  // Stub: return a placeholder response.
  // When AI is connected, this will use the Vercel AI SDK to stream
  // Claude responses with tool calls against the sheet state.
  return NextResponse.json({
    message:
      "AI agent is not connected yet. The UI is running in demo mode with mock tool execution.",
    toolDefinitions: toolDefinitions.map((t) => t.name),
    receivedMessage: message,
    snapshotSize: sheetSnapshot ? JSON.stringify(sheetSnapshot).length : 0,
  });
}

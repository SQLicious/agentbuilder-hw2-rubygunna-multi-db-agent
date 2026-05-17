import axios from "axios";

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: Record<string, unknown> | string;
}

export interface ChatResponse {
  answer: string;
  tool_calls: ToolCall[];
  warnings: string[];
  elapsed_ms: number;
}

export async function sendMessage(message: string): Promise<ChatResponse> {
  const res = await axios.post<ChatResponse>("http://localhost:8000/chat", {
    message,
  });
  return res.data;
}

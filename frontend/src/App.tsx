import { useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { ToolTrace } from "./components/ToolTrace";
import type { ChatResponse, ToolCall } from "./api";

function App() {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const handleResponse = (res: ChatResponse) => {
    setToolCalls(res.tool_calls);
    setElapsedMs(res.elapsed_ms);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Left: Chat */}
      <div className="flex flex-col w-1/2 border-r bg-white">
        <div className="border-b px-4 py-3 font-semibold text-gray-800 bg-gray-50">
          🛍️ Electronics Store Agent
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatPanel onResponse={handleResponse} />
        </div>
      </div>

      {/* Right: Tool Trace */}
      <div className="flex flex-col w-1/2 bg-white overflow-y-auto">
        <div className="border-b px-4 py-3 font-semibold text-gray-800 bg-gray-50 flex justify-between items-center">
          <span>🔍 Tool Trace</span>
          {elapsedMs !== null && (
            <span className="text-xs text-gray-400 font-normal">
              {elapsedMs}ms
            </span>
          )}
        </div>
        <div className="p-4">
          <ToolTrace toolCalls={toolCalls} />
        </div>
      </div>
    </div>
  );
}

export default App;

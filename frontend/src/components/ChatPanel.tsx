import { useState } from "react";
import type { ChatResponse } from "../api";
import { sendMessage } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  onResponse: (res: ChatResponse) => void;
}

export function ChatPanel({ onResponse }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendMessage(text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer },
      ]);
      onResponse(res);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: could not reach the agent." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm italic text-center mt-8">
            Ask the electronics store agent anything...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${
              msg.role === "user"
                ? "self-end bg-blue-600 text-white"
                : "self-start bg-green-50 border border-green-200 text-gray-800"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="self-start bg-gray-100 px-4 py-2 rounded-xl text-sm text-gray-500 animate-pulse">
            Thinking...
          </div>
        )}
      </div>
      <div className="border-t p-3 flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={loading}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          onClick={submit}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}

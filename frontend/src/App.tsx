import { useState, useRef, useEffect } from "react";
import type { ChatResponse, ToolCall } from "./api";
import { sendMessage } from "./api";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  elapsedMs?: number;
}

const SAMPLE_QUESTIONS = [
  "How many products do we have in stock?",
  "Show me the 5 cheapest laptops",
  "What are customers saying about the Samsung TV?",
  "Show open support tickets",
  "What is the return policy for electronics?",
];

const SOURCES = [
  { icon: "🗄️", label: "Products & Orders", db: "Postgres" },
  { icon: "💬", label: "Reviews & Tickets", db: "Mongo" },
  { icon: "📖", label: "Policy Handbook", db: "pgvector" },
];

function ToolCallCard({ tc }: { tc: ToolCall }) {
  const [open, setOpen] = useState(false);
  const colors: Record<string, string> = {
    sql_query: "bg-blue-50 border-blue-200 text-blue-800",
    mongo_query: "bg-green-50 border-green-200 text-green-800",
    handbook_search: "bg-amber-50 border-amber-200 text-amber-800",
  };
  const cls = colors[tc.tool] ?? "bg-gray-50 border-gray-200 text-gray-800";
  return (
    <div className={`border rounded-lg p-3 text-xs mt-2 ${cls}`}>
      <button
        className="w-full flex items-center justify-between font-semibold"
        onClick={() => setOpen((o) => !o)}
      >
        <span>⚙ {tc.tool}</span>
        <span className="opacity-60">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          <div>
            <span className="opacity-60">Args: </span>
            <code className="break-all">{JSON.stringify(tc.args)}</code>
          </div>
          <div>
            <span className="opacity-60">Result: </span>
            <pre className="mt-1 bg-white/60 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {typeof tc.result === "string"
                ? tc.result
                : JSON.stringify(tc.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDbs, setActiveDbs] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submit = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res: ChatResponse = await sendMessage(question);
      const usedDbs = new Set(
        res.tool_calls.map((tc) =>
          tc.tool === "sql_query"
            ? "POSTGRES"
            : tc.tool === "mongo_query"
            ? "MONGO"
            : "RAG"
        )
      );
      setActiveDbs(usedDbs);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          toolCalls: res.tool_calls,
          elapsedMs: res.elapsed_ms,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: could not reach the agent." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex h-screen font-sans text-sm overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-72 shrink-0 bg-[#1c1c1c] text-white flex flex-col">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C8603A] flex items-center justify-center text-xl">
            🛍️
          </div>
          <div>
            <div className="font-bold tracking-wide">ElectroAgent</div>
            <div className="text-xs text-white/50 uppercase tracking-widest">
              Internal AI Agent
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={() => {
              setMessages([]);
              setActiveDbs(new Set());
            }}
            className="w-full flex items-center gap-2 bg-white/10 hover:bg-white/20 transition rounded-lg px-4 py-2 text-sm font-medium"
          >
            <span className="text-lg">+</span> New conversation
          </button>
        </div>

        <div className="px-4 flex-1 overflow-y-auto">
          {/* Sample questions */}
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3">
            Try asking
          </p>
          <ul className="space-y-1">
            {SAMPLE_QUESTIONS.map((q) => (
              <li key={q}>
                <button
                  onClick={() => submit(q)}
                  className="w-full text-left text-white/70 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2 text-xs leading-snug transition"
                >
                  · {q}
                </button>
              </li>
            ))}
          </ul>

          {/* Sources */}
          <p className="text-[10px] uppercase tracking-widest text-white/40 mt-6 mb-3">
            Sources
          </p>
          <ul className="space-y-1">
            {SOURCES.map((s) => (
              <li
                key={s.db}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-white/60 text-xs"
              >
                <span className="flex items-center gap-2">
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </span>
                <span className="text-white/30 text-[10px]">{s.db}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 text-[10px] text-white/30 border-t border-white/10">
          {today} · GPT-4o-mini
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 bg-[#F5F0E8] overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-black/10 bg-[#F5F0E8]/80 backdrop-blur">
          <span className="font-semibold text-[#1c1c1c]">Conversation</span>
          <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider">
            {(["POSTGRES", "MONGO", "RAG"] as const).map((db) => (
              <span key={db} className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    activeDbs.has(db) ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
                <span className="text-gray-500">{db}</span>
              </span>
            ))}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center select-none">
              <div className="w-16 h-16 rounded-2xl bg-[#C8603A] flex items-center justify-center text-3xl mb-6">
                🛍️
              </div>
              <h1 className="text-3xl font-serif font-semibold text-[#1c1c1c] mb-3 leading-snug">
                What can ElectroAgent<br />pull together for you?
              </h1>
              <p className="text-gray-500 max-w-md mb-4">
                Ask anything across products, orders, customer reviews, support
                tickets, or store policy. The agent will pick the right tool and
                show you the trace.
              </p>
              <p className="text-[11px] uppercase tracking-widest text-gray-400">
                ✦ Pick a suggestion from the sidebar, or just type
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-[#C8603A] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[75%] text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="bg-white border border-black/8 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[90%] text-sm leading-relaxed text-[#1c1c1c] shadow-sm">
                        {msg.content}
                        {msg.elapsedMs !== undefined && (
                          <div className="text-[10px] text-gray-400 mt-1">
                            {msg.elapsedMs}ms
                          </div>
                        )}
                      </div>
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="max-w-[90%] space-y-1">
                          {msg.toolCalls.map((tc, j) => (
                            <ToolCallCard key={j} tc={tc} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-1.5 px-4 py-3">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 pb-5 pt-3">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-black/10 rounded-2xl shadow-sm flex flex-col">
              <textarea
                className="flex-1 px-4 pt-4 pb-2 text-sm resize-none focus:outline-none bg-transparent rounded-2xl leading-relaxed"
                placeholder="Ask ElectroAgent about products, orders, reviews, or policy..."
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                disabled={loading}
              />
              <div className="flex items-center justify-between px-4 pb-3">
                <div className="text-[10px] text-gray-400 flex gap-3">
                  <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">Enter</kbd> to send</span>
                  <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">Shift ↵</kbd> for newline</span>
                </div>
                <button
                  onClick={() => submit()}
                  disabled={loading || !input.trim()}
                  className="w-8 h-8 rounded-full bg-[#C8603A] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#b05530] transition"
                >
                  ↑
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-2 uppercase tracking-widest">
              ElectroAgent may write SQL or query Mongo · Always verifiable in the trace
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

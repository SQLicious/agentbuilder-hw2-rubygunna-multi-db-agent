import React, { useState, useRef, useEffect } from "react";
import type { ChatResponse, ToolCall } from "./api";
import { sendMessage } from "./api";
import Landing from "./Landing";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  elapsedMs?: number;
  timestamp?: string;
}

const QUICK_QUERIES = [
  "Open support tickets today",
  "Top products by revenue",
  "Low stock alerts",
  "Return policy for laptops",
];

const NAV_ITEMS = [
  { icon: "💬", label: "Ask" },
  { icon: "⏱️", label: "History" },
  { icon: "🔖", label: "Saved Queries" },
  { icon: "🗄️", label: "Sources" },
  { icon: "⚙️", label: "Settings" },
];

const CONNECTED_SOURCES = [
  { icon: "⚡", iconBgVar: "var(--ds-postgres-bg)", name: "Supabase Postgres", sub: "Inventory & Orders" },
  { icon: "🍃", iconBgVar: "var(--ds-mongo-bg)", name: "MongoDB Atlas", sub: "Reviews & Tickets" },
  { icon: "🔷", iconBgVar: "var(--ds-vector-bg)", name: "pgvector (Supabase)", sub: "Policies & Procedures" },
];

function nowStr(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } {
  const dataLines = lines.filter((l) => !/^\|[\s\-:|]+\|$/.test(l.trim()));
  const headers = dataLines[0]?.split("|").map((c) => c.trim()).filter(Boolean) ?? [];
  const rows = dataLines.slice(1).map((l) => l.split("|").map((c) => c.trim()).filter(Boolean));
  return { headers, rows };
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        return part;
      })}
    </>
  );
}

function renderAnswer(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const blocks: Array<{ type: "text" | "table"; lines: string[] }> = [];
  let current: { type: "text" | "table"; lines: string[] } | null = null;

  for (const line of lines) {
    const isTable = line.trim().startsWith("|") && line.trim().endsWith("|");
    const type: "text" | "table" = isTable ? "table" : "text";
    if (!current || current.type !== type) {
      if (current) blocks.push(current);
      current = { type, lines: [] };
    }
    current.lines.push(line);
  }
  if (current) blocks.push(current);

  return blocks.map((block, i) => {
    if (block.type === "table") {
      const { headers, rows } = parseMarkdownTable(block.lines);
      return (
        <div key={i} style={{ overflowX: "auto", margin: "10px 0", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <table style={{ borderCollapse: "collapse", minWidth: "100%", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--bg-item)" }}>
                {headers.map((h, j) => (
                  <th key={j} style={{ padding: "9px 14px", borderBottom: "2px solid var(--accent)", color: "var(--accent)", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j} style={{ borderBottom: "1px solid var(--border)", background: j % 2 === 1 ? "var(--bg-item)" : "transparent" }}>
                  {row.map((cell, k) => (
                    <td key={k} style={{ padding: "8px 14px", color: "var(--text-1)", whiteSpace: "nowrap", fontSize: "13px" }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    const txtLines = block.lines.map((l) => l.trim()).filter(Boolean);
    if (txtLines.length === 0) return null;
    return (
      <div key={i}>
        {txtLines.map((line, j) => {
          if (line.startsWith("### "))
            return <h3 key={j} style={{ fontSize: "15px", fontWeight: 700, margin: "10px 0 6px", color: "var(--text-1)" }}>{renderInline(line.slice(4))}</h3>;
          if (line.startsWith("## "))
            return <h2 key={j} style={{ fontSize: "17px", fontWeight: 700, margin: "12px 0 6px", color: "var(--text-1)" }}>{renderInline(line.slice(3))}</h2>;
          if (line.startsWith("# "))
            return <h1 key={j} style={{ fontSize: "19px", fontWeight: 700, margin: "14px 0 8px", color: "var(--text-1)" }}>{renderInline(line.slice(2))}</h1>;
          return <p key={j} style={{ margin: "0 0 6px", lineHeight: 1.65, color: "var(--text-1)", fontSize: "14px" }}>{renderInline(line)}</p>;
        })}
      </div>
    );
  });
}

function extractSqlQuery(toolCalls: ToolCall[]): string | null {
  const tc = toolCalls.find((t) => t.tool === "sql_query");
  if (!tc) return null;
  if (typeof tc.args === "object" && tc.args !== null)
    return (tc.args as Record<string, string>).query ?? null;
  return null;
}

function ToolTracePanel({
  messages,
  loading,
  width,
  onWidthChange,
}: {
  messages: Message[];
  loading: boolean;
  width: number;
  onWidthChange: (w: number) => void;
}) {
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: width };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - ev.clientX;
      onWidthChange(Math.max(240, Math.min(680, dragRef.current.startW + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  const lastAsst = [...messages].reverse().find((m) => m.role === "assistant");
  const toolCalls = lastAsst?.toolCalls ?? [];
  const elapsedMs = lastAsst?.elapsedMs;
  const sqlQuery = toolCalls.length > 0 ? extractSqlQuery(toolCalls) : null;
  const [sqlOpen, setSqlOpen] = useState(true);

  const hasSql = toolCalls.some((t) => t.tool === "sql_query");
  const hasMongo = toolCalls.some((t) => t.tool === "mongo_query");
  const hasHandbook = toolCalls.some((t) => t.tool === "handbook_search");

  const steps = toolCalls.map((tc) => ({
    name:
      tc.tool === "sql_query" ? "SQL Query" :
      tc.tool === "mongo_query" ? "Mongo Query" : "Handbook Search",
    sub:
      tc.tool === "sql_query" ? "Postgres (Supabase)" :
      tc.tool === "mongo_query" ? "MongoDB Atlas" : "pgvector (Supabase)",
  }));

  return (
    <aside
      style={{
        width: `${width}px`,
        minWidth: "240px",
        maxWidth: "680px",
        flexShrink: 0,
        background: "var(--bg-sub)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        title="Drag to resize"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "5px",
          cursor: "col-resize",
          zIndex: 10,
          background: "transparent",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--accent)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
      />
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>Tool Trace</span>
        <button
          style={{
            fontSize: "11px",
            color: "var(--text-2)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Hide ▲
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {["Planner", "SQL Query", "Postgres (Supabase)", "Grounded Answer"].map((s) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  background: "var(--bg-item)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    border: "2px solid var(--accent)",
                    borderTopColor: "transparent",
                    animation: "spin 0.8s linear infinite",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "12px", color: "var(--text-2)" }}>{s}</span>
              </div>
            ))}
          </div>
        ) : steps.length > 0 ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
              {steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 10px",
                    background: "var(--bg-item)",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "var(--green)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-1)" }}>{step.name}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-2)" }}>{step.sub}</div>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      background: "var(--green-bg)",
                      color: "var(--green)",
                      borderRadius: "4px",
                      padding: "1px 5px",
                      flexShrink: 0,
                    }}
                  >
                    Executed
                  </span>
                </div>
              ))}
              {lastAsst && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 10px",
                    background: "var(--accent-bg)",
                    borderRadius: "8px",
                    border: "1px solid var(--accent-border)",
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      color: "#000",
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-1)" }}>
                      Grounded Answer
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-2)" }}>
                      Synthesize and ground the answer
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      background: "var(--accent-bg)",
                      color: "var(--accent)",
                      borderRadius: "4px",
                      padding: "1px 5px",
                      flexShrink: 0,
                    }}
                  >
                    Grounded
                  </span>
                </div>
              )}
            </div>

            {elapsedMs !== undefined && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-2)",
                  textAlign: "center",
                  marginBottom: "14px",
                }}
              >
                ⏱ Completed in {elapsedMs} ms
              </div>
            )}

            {/* SQL Query */}
            {hasSql && (
              <div
                style={{
                  marginBottom: "6px",
                  background: "var(--bg-item)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setSqlOpen((o) => !o)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-1)",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  SQL Query
                  <span style={{ fontSize: "10px", color: "var(--text-2)" }}>{sqlOpen ? "▲" : "▼"}</span>
                </button>
                {sqlOpen && sqlQuery && (
                  <div style={{ padding: "0 12px 10px" }}>
                    <pre
                      style={{
                        fontSize: "11px",
                        color: "var(--code-text)",
                        background: "var(--code-bg)",
                        borderRadius: "6px",
                        padding: "10px",
                        margin: 0,
                        overflowX: "auto",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                      }}
                    >
                      {sqlQuery}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Mongo / Handbook / Warnings / Elapsed */}
            {[
              {
                label: "Mongo Query",
                note: hasMongo ? null : "No data used",
                active: hasMongo,
              },
              {
                label: "Handbook Search",
                note: hasHandbook ? null : "No handbook entries used",
                active: hasHandbook,
              },
              { label: "Warnings", note: "0 warnings", active: false },
              {
                label: "Elapsed Time",
                note: elapsedMs !== undefined ? `${elapsedMs} ms` : null,
                active: false,
              },
            ].map((row) =>
              row.note !== null ? (
                <div
                  key={row.label}
                  style={{
                    marginBottom: "6px",
                    background: "var(--bg-item)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      color: "var(--text-1)",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    {row.label}
                    <span
                      style={{
                        fontSize: "10px",
                        color: row.active ? "var(--green)" : "var(--text-2)",
                      }}
                    >
                      {row.note}
                    </span>
                  </div>
                </div>
              ) : null
            )}
          </>
        ) : (
          <div
            style={{
              color: "var(--text-2)",
              fontSize: "12px",
              textAlign: "center",
              paddingTop: "24px",
            }}
          >
            Ask a question to see the tool trace
          </div>
        )}

        {/* Connected Sources */}
        <div style={{ marginTop: "16px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-2)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Connected Sources
          </div>
          {CONNECTED_SOURCES.map((src) => (
            <div
              key={src.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 6px",
                borderRadius: "8px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: src.iconBgVar,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                  flexShrink: 0,
                }}
              >
                {src.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-1)" }}>{src.name}</div>
                <div style={{ fontSize: "10px", color: "var(--text-2)" }}>{src.sub}</div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  color: "var(--green)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: "var(--green)",
                    display: "inline-block",
                  }}
                />
                Connected
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [showChat, setShowChat] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("voltiq-theme");
    return (saved === "light" ? "light" : "dark") as "dark" | "light";
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("Ask");
  const [traceWidth, setTraceWidth] = useState(300);
  const [openSources, setOpenSources] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  const toggleSources = (idx: number) =>
    setOpenSources((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("voltiq-theme", theme);
  }, [theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const submit = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput("");
    const ts = nowStr();
    setMessages((prev) => [...prev, { role: "user", content: question, timestamp: ts }]);
    setLoading(true);
    try {
      const res: ChatResponse = await sendMessage(question);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          toolCalls: res.tool_calls,
          elapsedMs: res.elapsed_ms,
          timestamp: nowStr(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: could not reach the agent.", timestamp: nowStr() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!showChat)
    return <Landing onEnter={() => setShowChat(true)} theme={theme} onToggleTheme={toggleTheme} />;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--bg-main)",
        color: "var(--text-1)",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        transition: "background 0.2s, color 0.2s",
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: sidebarCollapsed ? "60px" : "260px",
          flexShrink: 0,
          background: "var(--bg-sub)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* Logo + collapse */}
        <div
          style={{
            padding: "14px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            minHeight: "60px",
          }}
        >
          {!sidebarCollapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  background: "var(--accent)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "17px",
                  flexShrink: 0,
                }}
              >
                ⚡
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--text-1)",
                    whiteSpace: "nowrap",
                    lineHeight: 1.2,
                  }}
                >
                  VoltIQ Concierge
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>
                  Internal AI Agent
                </div>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div
              style={{
                width: "34px",
                height: "34px",
                background: "var(--accent)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "17px",
              }}
            >
              ⚡
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            style={{
              background: "var(--bg-item)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-2)",
              fontSize: "11px",
              flexShrink: 0,
              marginLeft: sidebarCollapsed ? "auto" : "8px",
            }}
          >
            {sidebarCollapsed ? ">>" : "<<"}
          </button>
        </div>

        {/* Nav */}
        <div style={{ padding: "10px 8px", flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveNav(item.label)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background:
                  activeNav === item.label ? "var(--bg-nav-active)" : "transparent",
                color:
                  activeNav === item.label ? "var(--nav-active-text)" : "var(--text-2)",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: "2px",
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: "15px", flexShrink: 0 }}>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* User + status */}
        {!sidebarCollapsed && (
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px",
                borderRadius: "8px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "var(--user-bubble)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                RG
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-1)" }}>Ruby G.</div>
                <div style={{ fontSize: "11px", color: "var(--text-2)" }}>Store Operations</div>
              </div>
              <span style={{ color: "var(--text-2)", fontSize: "12px" }}>▾</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--green-bg)",
                border: "1px solid var(--green-border)",
                borderRadius: "8px",
                padding: "8px 10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--green)",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: 500 }}>
                  All systems operational
                </span>
              </div>
              <span style={{ fontSize: "10px", color: "var(--text-2)" }}>›</span>
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-2)",
                textAlign: "center",
                marginTop: "6px",
              }}
            >
              3 data sources connected
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Header */}
        <header
          style={{
            padding: "0 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "60px",
            flexShrink: 0,
            background: "var(--bg-main)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-1)" }}>Ask the store</span>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--accent-bg)",
                border: "1px solid var(--accent-border)",
                borderRadius: "12px",
                padding: "3px 10px",
                fontSize: "11px",
                color: "var(--accent)",
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "inline-block",
                }}
              />
              Internal Demo
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {["🔍", "?", "🔔"].map((ic) => (
              <button
                key={ic}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "var(--bg-item)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                {ic}
              </button>
            ))}
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--bg-item)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--bg-item)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "4px 10px 4px 4px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "var(--user-bubble)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                RG
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-2)" }}>▾</span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {messages.length === 0 && !loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  background: "var(--accent)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  marginBottom: "20px",
                }}
              >
                ⚡
              </div>
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: 600,
                  marginBottom: "10px",
                  color: "var(--text-1)",
                }}
              >
                What can I help you with?
              </h2>
              <p
                style={{
                  color: "var(--text-2)",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  maxWidth: "400px",
                }}
              >
                Ask about inventory, orders, customer reviews, support tickets, or store
                policy. VoltIQ Concierge picks the right tool and shows you the trace.
              </p>
            </div>
          ) : (
            <div
              style={{
                maxWidth: "760px",
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div
                        style={{
                          background: "var(--user-bubble)",
                          borderRadius: "16px 16px 2px 16px",
                          padding: "12px 16px",
                          maxWidth: "75%",
                          color: "#fff",
                        }}
                      >
                        <p style={{ fontSize: "14px", lineHeight: 1.5, margin: 0 }}>{msg.content}</p>
                        {msg.timestamp && (
                          <p
                            style={{
                              fontSize: "10px",
                              color: "rgba(255,255,255,0.55)",
                              margin: "5px 0 0",
                              textAlign: "right",
                            }}
                          >
                            {msg.timestamp} ✓
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            width: "26px",
                            height: "26px",
                            background: "var(--accent)",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "13px",
                          }}
                        >
                          ⚡
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
                          VoltIQ Concierge
                        </span>
                        {msg.timestamp && (
                          <span style={{ fontSize: "11px", color: "var(--text-2)" }}>{msg.timestamp}</span>
                        )}
                      </div>
                      <div
                        style={{
                          background: "var(--agent-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "2px 16px 16px 16px",
                          padding: "16px 18px",
                          width: "100%",
                          overflowX: "hidden",
                        }}
                      >
                        <div style={{ marginBottom: "12px" }}>
                          {renderAnswer(msg.content)}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingTop: "10px",
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "11px",
                              color: "var(--text-2)",
                            }}
                          >
                            <span>🛡️</span>
                            <span>Results grounded in inventory and product data.</span>
                          </div>
                          <button
                            onClick={() => toggleSources(i)}
                            style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}
                          >
                            View sources {openSources.has(i) ? "▴" : "▾"}
                          </button>
                        </div>

                        {/* Sources panel */}
                        {openSources.has(i) && msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div style={{ marginTop: "10px", borderTop: "1px solid var(--border)", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-2)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                              Sources used · {msg.toolCalls.length} tool call{msg.toolCalls.length !== 1 ? "s" : ""}
                            </div>
                            {msg.toolCalls.map((tc, ti) => {
                              const isSQL = tc.tool === "sql_query";
                              const isMongo = tc.tool === "mongo_query";
                              const srcName = isSQL ? "Supabase Postgres" : isMongo ? "MongoDB Atlas" : "pgvector (Supabase)";
                              const srcIcon = isSQL ? "⚡" : isMongo ? "🍃" : "🔷";
                              const srcSub = isSQL ? "Inventory & Orders" : isMongo ? "Reviews & Tickets" : "Policies & Procedures";
                              const srcColor = isSQL ? "var(--ds-postgres-bg)" : isMongo ? "var(--ds-mongo-bg)" : "var(--ds-vector-bg)";
                              const queryStr = isSQL
                                ? (tc.args as Record<string, string>)?.query ?? ""
                                : isMongo
                                ? `collection: ${(tc.args as Record<string, unknown>)?.collection ?? ""}`
                                : `query: "${(tc.args as Record<string, string>)?.query ?? ""}"`;
                              return (
                                <div key={ti} style={{ display: "flex", gap: "10px", padding: "8px 10px", background: "var(--bg-item)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                  <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: srcColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
                                    {srcIcon}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-1)" }}>{srcName}</div>
                                    <div style={{ fontSize: "10px", color: "var(--text-2)", marginBottom: "4px" }}>{srcSub}</div>
                                    <code style={{ fontSize: "10px", color: "var(--code-text)", background: "var(--code-bg)", padding: "3px 6px", borderRadius: "4px", display: "block", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                                      {queryStr}
                                    </code>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        {["👍", "👎", "🏳️"].map((icon) => (
                          <button
                            key={icon}
                            style={{
                              background: "var(--bg-item)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              padding: "4px 8px",
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      background: "var(--accent)",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                    }}
                  >
                    ⚡
                  </div>
                  <div style={{ display: "flex", gap: "5px" }}>
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: "var(--text-2)",
                          animation: `bounce 1s ${d}ms infinite`,
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div
          style={{
            padding: "14px 24px 18px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
            background: "var(--bg-main)",
          }}
        >
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-strong)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-end",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "var(--text-2)",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                📎
              </button>
              <textarea
                placeholder="Ask about orders, inventory, reviews, tickets, or policy..."
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
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "var(--text-1)",
                  fontSize: "14px",
                  resize: "none",
                  outline: "none",
                  lineHeight: 1.5,
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={() => submit()}
                disabled={loading || !input.trim()}
                style={{
                  background:
                    input.trim() && !loading ? "var(--accent)" : "var(--bg-item)",
                  color:
                    input.trim() && !loading ? "var(--accent-text)" : "var(--text-2)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                ✈ Send
                <span
                  style={{
                    background: "rgba(0,0,0,0.15)",
                    borderRadius: "4px",
                    padding: "1px 5px",
                    fontSize: "10px",
                  }}
                >
                  ⌘ Enter
                </span>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {QUICK_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  disabled={loading}
                  style={{
                    background: "var(--bg-item)",
                    border: "1px solid var(--border)",
                    borderRadius: "20px",
                    padding: "5px 12px",
                    fontSize: "11px",
                    color: "var(--text-2)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  ⚡ {q}
                </button>
              ))}
              <button
                style={{
                  background: "var(--bg-item)",
                  border: "1px solid var(--border)",
                  borderRadius: "20px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  color: "var(--text-2)",
                  cursor: "pointer",
                }}
              >
                ⊞ View all
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tool Trace ── */}
      <ToolTracePanel messages={messages} loading={loading} width={traceWidth} onWidthChange={setTraceWidth} />
    </div>
  );
}

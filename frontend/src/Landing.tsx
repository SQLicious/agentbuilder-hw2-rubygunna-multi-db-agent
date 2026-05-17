interface Props {
  onEnter: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

const EXAMPLE_QUERIES = [
  { icon: "🛒", text: "How many orders were placed today?" },
  { icon: "💻", text: "Show me the 5 cheapest laptops in stock" },
  { icon: "💬", text: "What are customers saying about the Samsung TV?" },
  { icon: "🎧", text: "Show open support tickets for product ID 42" },
  { icon: "🔒", text: "What is the return policy for electronics?" },
];

const DATA_SOURCES = [
  {
    icon: "⚡",
    iconBgVar: "var(--ds-postgres-bg)",
    name: "Supabase Postgres",
    sub: "Inventory & Orders",
    items: ["Product catalog", "Inventory levels", "Orders & shipments", "Pricing & availability"],
    note: null,
  },
  {
    icon: "🍃",
    iconBgVar: "var(--ds-mongo-bg)",
    name: "MongoDB Atlas",
    sub: "Reviews & Tickets",
    items: ["Customer reviews", "Support tickets", "Ticket status & SLAs", "Customer feedback"],
    note: null,
  },
  {
    icon: "🔷",
    iconBgVar: "var(--ds-vector-bg)",
    name: "pgvector (Supabase)",
    sub: "Policies & Procedures",
    items: ["Return & exchange policy", "Warranty information", "Store procedures", "Operational guidelines"],
    note: "via Supabase extension",
  },
];

const CAPABILITIES = [
  { icon: "🛡️", title: "Grounded answers you can trust", desc: "Every response is backed by your data and knowledge." },
  { icon: "⚡", title: "Full tool trace, always", desc: "See the queries, sources, and steps behind every answer." },
  { icon: "↕️", title: "One question in, one answer out", desc: "Clear, concise, and action-ready responses." },
  { icon: "👥", title: "Built for store teams, by store teams", desc: "Internal-only agent for operations and support analysts." },
];

const MINI_ROWS = [
  ["1", "HP 14 Celeron 4GB 64GB", "HP", "$130"],
  ["2", "HP Chromebook 14", "HP", "$140"],
  ["3", "Lenovo IdeaPad 3i 15.6", "Lenovo", "$164"],
  ["4", "Acer Aspire 3 Ryzen 3", "Acer", "$238"],
  ["5", "HP Pavilion 15.6 Touch", "HP", "$279"],
];

export default function Landing({ onEnter, theme, onToggleTheme }: Props) {
  const isDark = theme === "dark";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-main)",
        color: "var(--text-1)",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        overflowX: "hidden",
        transition: "background 0.2s, color 0.2s",
        scrollBehavior: "smooth",
      }}
    >
      {/* ── Navigation ── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border)",
          background: isDark ? "rgba(8,15,30,0.92)" : "rgba(240,244,248,0.92)",
          backdropFilter: "blur(12px)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "60px",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "var(--accent)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.2 }}>
                VoltIQ Concierge
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-2)" }}>Internal AI Agent</div>
            </div>
            <div
              style={{
                width: "1px",
                height: "24px",
                background: "var(--border-strong)",
                margin: "0 8px",
              }}
            />
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            {[
              { label: "Features",     href: "#features" },
              { label: "Use Cases",    href: "#use-cases" },
              { label: "Data Sources", href: "#data-sources" },
              { label: "Security",     href: "#security" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                style={{ fontSize: "13px", color: "var(--text-2)", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#docs"
              style={{
                fontSize: "13px",
                color: "var(--text-2)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              Docs <span style={{ fontSize: "10px" }}>▾</span>
            </a>
          </div>

          {/* Theme toggle + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={onToggleTheme}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "var(--bg-item)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={onEnter}
              style={{
                background: "var(--accent)",
                color: "var(--accent-text)",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Begin a conversation →
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: "72px 24px 60px", maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "64px",
            alignItems: "center",
          }}
        >
          {/* Left */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                background: "var(--accent-bg)",
                border: "1px solid var(--accent-border)",
                borderRadius: "20px",
                padding: "5px 14px",
                marginBottom: "28px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--accent)",
                  letterSpacing: "0.07em",
                }}
              >
                INTERNAL DEMO
              </span>
            </div>

            <h1
              style={{
                fontSize: "52px",
                fontWeight: 700,
                lineHeight: 1.08,
                marginBottom: "20px",
                letterSpacing: "-0.02em",
                color: "var(--text-1)",
              }}
            >
              Fast answers across
              <br />
              your{" "}
              <span style={{ color: "var(--accent)" }}>electronics store data.</span>
            </h1>

            <p
              style={{
                color: "var(--text-2)",
                fontSize: "15px",
                lineHeight: 1.65,
                marginBottom: "36px",
                maxWidth: "460px",
              }}
            >
              VoltIQ Concierge is your internal AI agent for store operations and
              support teams. Ask anything about inventory, orders, reviews, tickets, or
              policies. It orchestrates SQL, MongoDB, and handbook search to deliver a
              single, grounded answer with full traceability.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "40px" }}>
              <button
                onClick={onEnter}
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-text)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "13px 26px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Begin a conversation →
              </button>
              <button
                style={{
                  background: "transparent",
                  color: "var(--text-1)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "8px",
                  padding: "13px 26px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                What can it do?
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {[
                { icon: "⚡", label: "One question in" },
                { icon: "🛡️", label: "Grounded & verified" },
                { icon: "⏱️", label: "One answer out" },
                { icon: "🔒", label: "Internal only" },
              ].map((f) => (
                <div
                  key={f.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    color: "var(--text-2)",
                    fontSize: "13px",
                  }}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — always-dark app mockup */}
          <div>
            <div
              className="mockup-dark"
              style={{
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
                boxShadow: "var(--shadow)",
              }}
            >
              {/* Mockup header */}
              <div
                className="mockup-dark-sub"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  padding: "11px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>VoltIQ Concierge</span>
                  <span
                    style={{
                      background: "rgba(245,200,58,0.12)",
                      color: "#F5C83A",
                      fontSize: "10px",
                      borderRadius: "10px",
                      padding: "2px 8px",
                      border: "1px solid rgba(245,200,58,0.25)",
                    }}
                  >
                    ● Internal Demo
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {["🔍", "?", "🔔"].map((ic) => (
                    <div
                      key={ic}
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        color: "#fff",
                      }}
                    >
                      {ic}
                    </div>
                  ))}
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: "#2563EB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    RG
                  </div>
                </div>
              </div>

              {/* Mockup body */}
              <div style={{ display: "flex", height: "360px" }}>
                {/* Chat */}
                <div
                  style={{
                    flex: 1,
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div
                      style={{
                        background: "#2563EB",
                        borderRadius: "12px 12px 2px 12px",
                        padding: "8px 12px",
                        maxWidth: "80%",
                      }}
                    >
                      <p style={{ fontSize: "11px", margin: 0, color: "#fff" }}>
                        Show me the 5 cheapest laptops in stock
                      </p>
                      <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.6)", margin: "3px 0 0", textAlign: "right" }}>
                        10:42 AM ✓
                      </p>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          background: "#F5C83A",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                        }}
                      >
                        ⚡
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#fff" }}>VoltIQ Concierge</span>
                      <span style={{ fontSize: "9px", color: "#8B9CB6" }}>10:42 AM</span>
                    </div>
                    <p style={{ fontSize: "11px", color: "#CBD5E1", marginBottom: "8px" }}>
                      Here are the 5 cheapest laptops currently in stock, sorted by price (ascending).
                    </p>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.06)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "18px 1fr 48px 38px",
                          gap: "0 8px",
                          padding: "5px 10px",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          fontSize: "9px",
                          fontWeight: 600,
                          color: "#F5C83A",
                        }}
                      >
                        <span>#</span>
                        <span>Product</span>
                        <span>Brand</span>
                        <span>Price</span>
                      </div>
                      {MINI_ROWS.map(([n, prod, brand, price]) => (
                        <div
                          key={n}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "18px 1fr 48px 38px",
                            gap: "0 8px",
                            padding: "4px 10px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            fontSize: "9px",
                            color: "#CBD5E1",
                          }}
                        >
                          <span style={{ color: "#8B9CB6" }}>{n}</span>
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {prod}
                          </span>
                          <span style={{ color: "#8B9CB6" }}>{brand}</span>
                          <span style={{ color: "#22C55E" }}>{price}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: "9px", color: "#8B9CB6", marginTop: "6px" }}>
                      🛡️ Results grounded in inventory and product data.
                    </p>
                  </div>
                </div>

                {/* Tool trace */}
                <div
                  style={{
                    width: "180px",
                    borderLeft: "1px solid rgba(255,255,255,0.07)",
                    padding: "12px",
                    background: "#0A1222",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#fff", marginBottom: "10px" }}>
                    Tool Trace
                  </div>
                  {[
                    { name: "Postgres", desc: "Inventory query (laptops)", status: "Executed", ms: "128 ms", ok: true },
                    { name: "Postgres", desc: "Sort by price (asc)", status: "Executed", ms: "96 ms", ok: true },
                    { name: "Postgres", desc: "Stock quantity lookup", status: "Executed", ms: "111 ms", ok: true },
                    { name: "MongoDB", desc: "No review data used", status: "Skipped", ms: "—", ok: false },
                    { name: "pgvector", desc: "No handbook entries", status: "Skipped", ms: "—", ok: false },
                  ].map((step, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: "6px",
                        padding: "5px 7px",
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ fontSize: "9px", fontWeight: 600, color: "#fff" }}>{step.name}</span>
                        <span
                          style={{
                            fontSize: "8px",
                            color: step.ok ? "#22C55E" : "#8B9CB6",
                            background: step.ok ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)",
                            borderRadius: "4px",
                            padding: "1px 4px",
                          }}
                        >
                          {step.status}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span
                          style={{
                            fontSize: "8px",
                            color: "#8B9CB6",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "100px",
                          }}
                        >
                          {step.desc}
                        </span>
                        <span style={{ fontSize: "8px", color: "#8B9CB6" }}>{step.ms}</span>
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "6px 7px",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: "6px",
                    }}
                  >
                    <div style={{ fontSize: "8px", color: "#8B9CB6", marginBottom: "4px" }}>SQL Query</div>
                    <code style={{ fontSize: "7px", color: "#93C5FD", lineHeight: 1.6, display: "block" }}>
                      SELECT name, brand,
                      <br />
                      price, stock_qty
                      <br />
                      FROM products
                      <br />
                      WHERE category
                      <br />
                      ILIKE &apos;laptop&apos;
                      <br />
                      ORDER BY price ASC
                      <br />
                      LIMIT 5;
                    </code>
                  </div>
                  <div
                    style={{ marginTop: "8px", fontSize: "8px", color: "#22C55E", textAlign: "center" }}
                  >
                    ● Completed in 640 ms
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Example queries ── */}
      <section
        id="use-cases"
        style={{
          borderTop: "1px solid var(--border)",
          background: isDark ? "#060C18" : "#E8EEF5",
          padding: "64px 24px",
          transition: "background 0.2s",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            style={{
              textAlign: "center",
              fontSize: "22px",
              fontWeight: 600,
              marginBottom: "32px",
              color: "var(--text-1)",
            }}
          >
            Ask anything. Get grounded answers.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "12px",
            }}
          >
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q.text}
                onClick={onEnter}
                style={{
                  background: "var(--bg-item)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "18px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-item-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-item)";
                }}
              >
                <span style={{ fontSize: "22px" }}>{q.icon}</span>
                <p style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.45, margin: 0 }}>
                  {q.text}
                </p>
                <span style={{ fontSize: "16px", color: "var(--accent)" }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Data sources + capabilities ── */}
      <section id="data-sources" style={{ padding: "64px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: "48px",
            alignItems: "start",
            marginBottom: "48px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "26px",
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: "12px",
                color: "var(--text-1)",
              }}
            >
              Connected to the systems
              <br />
              that power your business
            </h2>
            <p style={{ color: "var(--text-2)", fontSize: "14px", lineHeight: 1.6 }}>
              VoltIQ Concierge securely connects to your operational data and knowledge
              sources to deliver accurate, contextual answers.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {DATA_SOURCES.map((ds) => (
              <div
                key={ds.name}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: ds.iconBgVar,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    marginBottom: "10px",
                  }}
                >
                  {ds.icon}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "2px",
                    color: "var(--text-1)",
                  }}
                >
                  {ds.name}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: ds.note ? "4px" : "10px" }}>
                  {ds.sub}
                </div>
                {ds.note && (
                  <div style={{ fontSize: "10px", color: "#818CF8", marginBottom: "8px" }}>{ds.note}</div>
                )}
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px" }}>
                  {ds.items.map((item) => (
                    <li key={item} style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
                      • {item}
                    </li>
                  ))}
                </ul>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "var(--green-bg)",
                    border: "1px solid var(--green-border)",
                    borderRadius: "12px",
                    padding: "3px 9px",
                    fontSize: "11px",
                    color: "var(--green)",
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

        <div id="features" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "18px",
              }}
            >
              <div style={{ fontSize: "22px", marginBottom: "10px" }}>{cap.icon}</div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "7px",
                  lineHeight: 1.3,
                  color: "var(--text-1)",
                }}
              >
                {cap.title}
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        id="security"
        style={{
          borderTop: "1px solid var(--border)",
          background: isDark ? "#060C18" : "#E2E8F0",
          padding: "16px 24px",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--green)",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--green)",
                  display: "inline-block",
                }}
              />
              All systems operational
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-2)" }}>
              Connected to:
              <span style={{ marginLeft: "4px" }}>⚡ Supabase Postgres</span>
              <span style={{ marginLeft: "12px" }}>🍃 MongoDB Atlas</span>
              <span style={{ marginLeft: "12px" }}>🔷 pgvector (Supabase)</span>
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-2)" }}>
            🔒 Internal use only • Protected data
          </div>
        </div>
      </footer>
    </div>
  );
}

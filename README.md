# HW2 — Multi-DB Electronics Store Agent

**Ruby Gunna · Agent Builder 2026 · HW2 Submission**

A full-stack AI agent that answers questions about an electronics store by routing across three data sources: a SQL database (Supabase Postgres), a NoSQL database (MongoDB Atlas), and a vector handbook (pgvector RAG). Built with FastAPI, LangChain v1, and a React split-panel chat UI.

---

## Quick Start

```bash
# 1. Install dependencies
uv sync --extra dev

# 2. Copy and fill in credentials
cp .env.example .env

# 3. Verify database connections
.venv/Scripts/python.exe check_connectivity.py

# 4. Seed all three stores (only needed once)
.venv/Scripts/python.exe -m backend.seed.seed_postgres
.venv/Scripts/python.exe -m backend.seed.seed_mongo
.venv/Scripts/python.exe -m backend.seed.seed_handbook

# 5. Start backend
.venv/Scripts/python.exe -m uvicorn backend.main:app --reload --port 8000

# 6. Start frontend (new terminal)
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`. Backend health check: `http://localhost:8000/health`.

### Run tests

```bash
# Unit tests (no DB required)
.venv/Scripts/python.exe -m pytest tests/unit/ -v

# Integration tests (requires seeded DBs)
.venv/Scripts/python.exe -m pytest tests/integration/ -v

# E2E tests (requires running backend + seeded DBs + OpenAI key)
.venv/Scripts/python.exe -m pytest tests/e2e/ -v
```

### Environment variables required

```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=sb_secret_...
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ecommerce
```

> **Note on DATABASE_URL:** Use the Supabase **Session Pooler** URL (from dashboard → Connect button), not the direct connection. Direct port 5432 is blocked on many networks. If your password contains `@`, URL-encode it as `%40`.

---

## Architecture

```
Browser
  └─► React / Vite / TypeScript
        Split panel: chat (left) + tool trace (right)
        └─► POST /chat  →  FastAPI (port 8000)
                              └─► LangChain v1 agent  (gpt-4o-mini)
                                  create_agent() — fresh instance per request
                                    │
                                    ├─► sql_query(query)
                                    │     └─► Supabase Postgres (psycopg2)
                                    │         tables: products, orders, customers
                                    │
                                    ├─► mongo_query(collection, filter, limit)
                                    │     └─► MongoDB Atlas (pymongo)
                                    │         collections: reviews, support_tickets,
                                    │                      activity_logs
                                    │
                                    └─► handbook_search(query, k)
                                          └─► pgvector on Supabase
                                              table: handbook_chunks (1536-dim)
                                              model: text-embedding-3-small

Response: { answer, tool_calls, warnings, elapsed_ms }
```

The agent **never** connects to any data store directly. Every read goes through one of the three typed tools. Tool wrappers in `agent.py` call through to the validated implementations in `backend/tools/`.

**Schema strategy:** Pattern A — full SQL and MongoDB schema injected into the system prompt at startup (~500 tokens). Pattern B (describe_schema tool) would be preferable at larger schema sizes but adds a round-trip per query.

**Handbook storage:** Python strings in `handbook_docs.py` → chunked by paragraph → embedded with `text-embedding-3-small` → stored in `handbook_chunks` table. Chose this over PDF ingestion because: (1) no extraction artifacts, (2) deterministic chunking that's testable, (3) readable git diffs, (4) no extra dependency. Trade-off: a production system with non-technical policy authors would need real PDF ingestion.

---

## Why I Chose X

**Domain — Electronics Store**
Rich enough that all three tools get exercised naturally. "How many laptops in stock?" hits SQL. "What are customers saying about the Samsung TV?" hits MongoDB reviews. "What's the return policy?" hits the handbook. An airline domain was excluded per assignment constraints.

**Model — gpt-4o-mini**
Assignment default. Fast, cheap, and sufficient for tool-calling over structured schemas. For production I would evaluate `gpt-4o` on the cases where `gpt-4o-mini` picks the wrong tool or generates invalid SQL.

**SQL DB — Supabase (Postgres + pgvector)**
One service covers both the relational store and the vector store for RAG. This avoids running a separate vector DB (Pinecone, Weaviate) and keeps the infrastructure surface small. The pgvector `<=>` cosine operator integrates directly with psycopg2.

**NoSQL DB — MongoDB Atlas**
Cloud-hosted, free tier, straightforward Python driver. The document model fits unstructured data like support ticket message threads and activity event logs that would be awkward to normalise into Postgres.

**LangChain version — 1.x (`create_agent`)**
Installed version was LangChain 1.3.1. The old `create_react_agent` + `AgentExecutor` pattern (0.1.x) is removed. LangChain 1.x uses `langchain.agents.create_agent` which delegates to LangGraph under the hood and uses native tool-calling instead of the text-based ReAct prompt format. This is more reliable — the model no longer needs to format `Action / Action Input / Observation` strings correctly.

---

## What Broke and How I Fixed It

**1. Supabase direct connection timed out**

Direct TCP to `db.<project>.supabase.co:5432` timed out immediately — the ISP blocks outbound port 5432. The error looked like a flaky network issue but was completely deterministic.

Fix: switched `DATABASE_URL` to the Supabase **Session Pooler** endpoint (`aws-1-us-east-2.pooler.supabase.com:5432`). The pooler URL also requires the username to include the project ref: `postgres.<project-ref>` instead of just `postgres`. Found this in the dashboard under the green **Connect** button, not under Settings → Database where I was originally looking.

**2. LangChain 1.x removed `create_react_agent` and `AgentExecutor`**

The plan used the LangChain 0.1.x API (`create_react_agent` + `AgentExecutor`). The installed version (1.3.1) removed both. A compatibility shim (`langchain_classic`) exists but it passes the raw JSON `Action Input` string directly to the tool function without parsing it through the Pydantic schema — so every query arrived as `'{"query": "SELECT..."}'` instead of `'SELECT...'`, and `validate_sql` rejected it with "Only SELECT statements are allowed."

Fix: rewrote `agent.py` using `langchain.agents.create_agent` (LangChain 1.x native), which uses tool-calling (function calling) instead of the ReAct text format. The agent now sends structured JSON directly to each tool's Pydantic schema — no string-parsing issues. Also restructured to match the instructor's pattern: `@tool` wrappers in `agent.py` calling through to the underlying validated functions, `build_agent()` returning a fresh agent per request.

**3. DATABASE_URL password with a special character broke the connection string**

The Supabase database password contained `@`. A PostgreSQL connection URL uses `@` as the delimiter between credentials and host, so `postgresql://postgres:pass@word@host` is parsed as username `postgres`, password `pass`, host `word@host` — which doesn't resolve.

Fix: URL-encode the `@` as `%40`. Diagnosed by printing the parsed host from the connection string, not from the error message (which just said "could not connect"). Added the pooler hint with URL-encoding note to `check_connectivity.py` so the next person hits this immediately instead of after 30 minutes of debugging.

---

## What I Would Change With Another Week

**1. Agent instance caching per session**
`build_agent()` is called fresh on every `/chat` request. Building the compiled LangGraph object takes ~100ms and re-initialises the LLM client each time. With session identifiers, a cached agent per user would eliminate that overhead and enable multi-turn memory without rebuilding the graph.

**2. PDF ingestion pipeline for the handbook**
The handbook is currently maintained as Python strings in `handbook_docs.py`. A document manager who isn't a developer can't update policy without a code change. I would add a `scripts/ingest_pdf.py` that takes a PDF path, extracts text with `pdfplumber`, chunks by section heading, embeds, and upserts into `handbook_chunks`. This makes the RAG pipeline usable by non-technical staff.

**3. Streaming responses**
The UI waits for the full agent response before showing anything. For questions that chain multiple tool calls, this can take 10-15 seconds of silence. Adding `StreamingResponse` from FastAPI and `useEventSource` in React would show each tool result as it arrives, which is dramatically better UX and makes the agent's reasoning visible during the wait.

**4. Evaluation harness on CI**
The five sample questions from `SPEC.md` are tested in `tests/e2e/test_e2e.py` but only assert that the correct tool was called — not that the answer is correct. I would add an LLM-as-judge step that scores the answer against an expected schema (e.g., "must contain a number", "must mention 30 days"), and track pass/fail per question across commits so regressions in answer quality are caught automatically.

---

## Project Structure

```
backend/
  config.py          — pydantic-settings, loads .env
  main.py            — FastAPI app + /chat endpoint
  agent.py           — LangChain v1 agent (build_agent + @tool wrappers)
  tools/
    sql_tool.py      — sql_query: read-only SELECT, auto-LIMIT, 5s timeout
    mongo_tool.py    — mongo_query: collection whitelist, operator blacklist
    handbook_tool.py — handbook_search: pgvector cosine similarity
  db/
    postgres.py      — psycopg2 connection context manager
    mongo.py         — PyMongo singleton (thread-safe)
  seed/
    seed_postgres.py — schema + 10 products, 5 customers, 20 orders
    seed_mongo.py    — 10 reviews, 5 support tickets, 6 activity logs
    seed_handbook.py — chunk + embed 5 policy sections → pgvector
    handbook_docs.py — raw policy text (Return Policy, Warranty, etc.)
tests/
  unit/              — pure-function tests, no DB (21 tests)
  integration/       — real DB reads (9 tests)
  e2e/               — full agent loop via TestClient (7 tests)
frontend/
  src/
    App.tsx          — split-panel layout
    components/
      ChatPanel.tsx  — chat input + message history
      ToolTrace.tsx  — collapsible tool call cards
    api.ts           — axios POST to /chat
check_connectivity.py — smoke test both DBs, prints PASS/FAIL
SPEC.md              — written before any code (tool contracts, routing rules, sample Qs)
```

---

## Test Results

```
tests/unit/         21 passed   (validate_sql, inject_limit, validate_mongo,
                                 clamp_limit, clamp_k, handbook mock)
tests/integration/   9 passed   (real Supabase + Atlas reads)
tests/e2e/           7 passed   (full agent loop, all 5 sample questions)
─────────────────────────────
Total               37 passed
```

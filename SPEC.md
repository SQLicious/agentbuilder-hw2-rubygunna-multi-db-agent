# SPEC.md — Multi-DB Electronics Agent (HW2)

## 1. Problem Statement

**User:** A customer support analyst or store manager who needs to answer questions about the electronics store — inventory, orders, customer reviews, support tickets, and store policies.

**Questions the agent answers:**
- "How many orders were placed today?" → SQL
- "Show me the 5 cheapest laptops in stock" → SQL
- "What are customers saying about the Samsung TV?" → MongoDB
- "Show open support tickets for product ID 42" → MongoDB
- "What is the return policy for electronics?" → RAG handbook

The agent is a single-turn ReAct loop. One question in, one grounded answer out, with a full tool-call trace.

---

## 2. Architecture

```
Browser
  └─► React/Vite/TS UI  (chat panel + tool trace panel, split layout)
        └─► POST /chat  →  FastAPI
                              └─► LangChain v1 ReAct Agent (gpt-4o-mini)
                                    ├─► sql_query ──────────────────────► Supabase (Postgres)
                                    │                                      tables: products, orders, customers
                                    ├─► mongo_query ────────────────────► MongoDB Atlas
                                    │                                      db: ecommerce
                                    └─► handbook_search ────────────────► Supabase (pgvector extension)
                                                                           table: handbook_chunks
                                                                           same DB, same connection as sql_query

Response shape: { answer, tool_calls, warnings, elapsed_ms }
```

The agent never connects to any data store directly. Every read goes through one of the three typed tools.

**pgvector implementation decision:** The homework specification calls for `handbook_search` to use pgvector. pgvector is a Postgres extension — it cannot run independently; it requires a Postgres host. The specification also calls for `sql_query` to run against Supabase Postgres. Since Supabase enables pgvector natively on all projects at no extra cost, running both tools against the same Supabase instance was the correct choice. This means:

- `sql_query` and `handbook_search` share the same `DATABASE_URL` and the same psycopg2 connection — zero extra credentials, zero extra service
- The `handbook_chunks` table (vector store) lives in the same Postgres database as `products`, `orders`, and `customers` — one schema, one backup, one connection pool
- No separate vector database (Pinecone, Weaviate, Qdrant, Chroma) is introduced — each would add cloud credentials, a new SDK, extra latency, and a separate failure point without satisfying the pgvector requirement any better

The only truly separate data store in this project is MongoDB Atlas. We have two cloud services total, serving three logical tool routes.

**Schema strategy:** Pattern A (static system-prompt context). The full SQL and MongoDB schema is injected into the system prompt at startup. Schema is small enough (~500 tokens) that in-context grounding is cheaper and more deterministic than a describe_schema tool round-trip. Pattern B would be preferable at larger schema sizes.

**Handbook storage: Python strings over PDF files.** Policy documents are defined as structured Python strings in `backend/seed/handbook_docs.py` rather than loaded from PDFs. Four concrete reasons:

1. **Clean text, no extraction noise.** PDF parsing libraries (pdfplumber, pypdf) introduce extraction artifacts — broken hyphenation, merged words, misread tables, stripped formatting. Policy text stored as Python strings is exactly what gets embedded, with no silent corruption between authoring and retrieval.

2. **Deterministic, testable chunking.** The paragraph-boundary chunker in `seed_handbook.py` produces identical chunks on every run. PDF-derived text varies by library version, font encoding, and page layout, making chunking non-reproducible and hard to test.

3. **Version-controlled diffs.** Python string changes produce readable git diffs — a reviewer can see exactly what policy text changed. PDFs are binary blobs: a one-word edit produces a multi-kilobyte binary diff with no semantic signal.

4. **No added dependency.** PDF parsing requires an additional library that adds install weight and potential CVEs. For a self-contained homework project with five policy sections, the overhead is not justified.

**Trade-off acknowledged:** In a production system where non-technical staff author policy documents in Word or Acrobat, PDF ingestion is the correct choice — it meets the authors where they are. The Python-string approach would force a developer to act as intermediary for every policy update, which does not scale. This implementation is the right fit for a controlled, developer-owned dataset.

---

## 3. The Three Tools and Their Contracts

### 3.1 `sql_query(query: str) → dict`

**Input:**
- `query: str` — a SQL SELECT statement

**Validation (rejects with error string):**
- Any non-SELECT keyword: INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE
- Multi-statements (`;` mid-string)
- Missing LIMIT → auto-injects `LIMIT 50`
- Statement timeout: 5 seconds

**Return shape:**
```json
{ "rows": [...], "count": 3 }
```

**Error surface:** Returns `{ "error": "reason" }` — never raises, never crashes the agent loop.

---

### 3.2 `mongo_query(collection: str, filter: dict, limit: int = 20) → dict`

**Input:**
- `collection: str` — must be in whitelist: `["reviews", "support_tickets", "activity_logs"]`
- `filter: dict` — MongoDB filter document
- `limit: int` — capped at 50

**Validation (rejects with error string):**
- Collection not in whitelist
- Filter contains `$where` or `$function` (no server-side JS)
- Limit > 50 → clamped to 50

**Return shape:**
```json
{ "documents": [...], "count": 5 }
```

**Error surface:** Returns `{ "error": "reason" }` — never raises.

---

### 3.3 `handbook_search(query: str, k: int = 3) → dict`

**Input:**
- `query: str` — natural language search query
- `k: int` — number of chunks to return (default 3, max 5)

**Process:**
1. Embed query with `text-embedding-3-small`
2. Cosine similarity search over `handbook_chunks` in pgvector
3. Return top-k chunks with section labels and scores

**Return shape:**
```json
{ "chunks": [{ "content": "...", "section": "Return Policy", "score": 0.91 }] }
```

**Error surface:** Returns `{ "error": "reason" }` — never raises.

---

## 4. Routing Rules (System Prompt)

```
You are an electronics store assistant. You have three tools:

- sql_query: Use for structured data — product inventory, orders, customers, 
  pricing, stock counts. Always use SELECT only.

- mongo_query: Use for unstructured/activity data — customer reviews, 
  support tickets, user activity logs.

- handbook_search: Use for policy and procedural questions — return policy, 
  warranty terms, shipping policy, tech support FAQ.

## SQL Schema
Table: products (id, name, category, price, stock_qty, brand)
Table: orders (id, customer_id, product_id, qty, status, created_at)
Table: customers (id, name, email, created_at)

## MongoDB Schema
Collection: reviews (product_id, rating, body, created_at)
Collection: support_tickets (customer_id, subject, status, messages[])
Collection: activity_logs (customer_id, event_type, metadata, timestamp)
```

---

## 5. Data Model

### Postgres (Supabase)
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id),
  product_id INT REFERENCES products(id),
  qty INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### MongoDB Atlas (`ecommerce` database)
- `reviews`: `{ product_id, rating (1-5), body, author, created_at }`
- `support_tickets`: `{ customer_id, subject, status, priority, messages: [{role, body, ts}] }`
- `activity_logs`: `{ customer_id, event_type, metadata, timestamp }`

### pgvector (Supabase)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE handbook_chunks (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536)
);
```

**Handbook documents to embed:**
1. Return & Refund Policy
2. Warranty Terms
3. Shipping Policy
4. Tech Support FAQ
5. Product Care Guide

---

## 6. API

### `POST /chat`
**Request:** `{ "message": "string" }`

**Response:**
```json
{
  "answer": "string",
  "tool_calls": [
    { "tool": "sql_query", "args": {...}, "result": {...} }
  ],
  "warnings": [],
  "elapsed_ms": 1243
}
```

---

## 7. Frontend

- Vite + React + TypeScript
- Split panel layout: chat on left, tool trace on right
- Tool trace shows: tool name, args, result (collapsed by default, expandable)
- No auth, no streaming, no multi-turn memory

---

## 8. Tests

### Unit (mock LLM + mock DB)
- `test_sql_tool.py`: valid SELECT, missing LIMIT auto-inject, INSERT rejected, DROP rejected
- `test_mongo_tool.py`: valid query, unknown collection rejected, `$where` rejected
- `test_handbook_tool.py`: valid search, embedding called once, k capped at 5

### Integration (real test DBs)
- `test_sql_integration.py`: real Supabase query returns rows
- `test_mongo_integration.py`: real Atlas query returns documents
- `test_handbook_integration.py`: real pgvector search returns chunks

### E2E
- `test_e2e.py`: runs all 5 sample questions from Section 9 through the full agent loop

---

## 9. Definition of Done — 5 Sample Questions

| # | Question | Expected tool | Expected answer shape |
|---|---|---|---|
| 1 | "How many orders were placed today?" | `sql_query` | Count integer, date-filtered |
| 2 | "Show me the 5 cheapest laptops in stock" | `sql_query` | List of products with price |
| 3 | "What are customers saying about the Samsung TV?" | `mongo_query` | Review bodies + ratings |
| 4 | "Show open support tickets for the last 7 days" | `mongo_query` | Ticket list with status |
| 5 | "What is the return policy for electronics?" | `handbook_search` | Policy text with section label |

---

## 10. Project Structure

```
DATA-ANALYSIS-AGENT/
├── backend/
│   ├── main.py              # FastAPI app + /chat endpoint
│   ├── agent.py             # LangChain ReAct agent setup
│   ├── tools/
│   │   ├── sql_tool.py
│   │   ├── mongo_tool.py
│   │   └── handbook_tool.py
│   ├── db/
│   │   ├── postgres.py      # Supabase/psycopg2 connection
│   │   └── mongo.py         # PyMongo Atlas connection
│   └── seed/
│       ├── seed_postgres.py
│       ├── seed_mongo.py
│       └── seed_handbook.py
├── frontend/                # Vite + React + TS
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   └── superpowers/specs/
├── .env
├── .env.example
├── SPEC.md
└── pyproject.toml
```

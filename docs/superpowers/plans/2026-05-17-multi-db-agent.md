# Multi-DB Electronics Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a FastAPI + LangChain ReAct agent with three typed tools (SQL, MongoDB, RAG) and a React split-panel chat UI for an electronics store.

**Architecture:** FastAPI `POST /chat` endpoint → LangChain v1 ReAct agent (gpt-4o-mini) → three Pydantic-typed tools → Supabase Postgres (SQL + pgvector) and MongoDB Atlas. Frontend is Vite + React + TypeScript with split panel (chat left, tool trace right).

**Tech Stack:** Python 3.11+, FastAPI, LangChain 0.1+, langchain-openai, psycopg2-binary, pgvector, pymongo, pydantic-settings, python-dotenv, pytest, Vite, React, TypeScript, axios

---

## File Map

```
backend/
  __init__.py
  config.py              ← pydantic-settings, loads .env
  main.py                ← FastAPI app + /chat endpoint
  agent.py               ← LangChain ReAct executor
  tools/
    __init__.py
    sql_tool.py          ← sql_query tool + validate_sql + inject_limit helpers
    mongo_tool.py        ← mongo_query tool + validate_mongo + clamp_limit helpers
    handbook_tool.py     ← handbook_search tool + clamp_k helper
  db/
    __init__.py
    postgres.py          ← psycopg2 context manager
    mongo.py             ← PyMongo singleton
  seed/
    seed_postgres.py     ← create schema + insert 10 products, 5 customers, 20 orders
    seed_mongo.py        ← insert reviews, support_tickets, activity_logs
    seed_handbook.py     ← chunk handbook docs + embed + store in pgvector
    handbook_docs.py     ← raw handbook text sections
tests/
  unit/
    test_sql_tool.py
    test_mongo_tool.py
    test_handbook_tool.py
  integration/
    test_sql_integration.py
    test_mongo_integration.py
    test_handbook_integration.py
  e2e/
    test_e2e.py
frontend/                ← Vite + React + TS (created via npm create vite)
  src/
    App.tsx
    components/
      ChatPanel.tsx
      ToolTrace.tsx
    api.ts
.env.example
```

---

## Task 1: Dependencies and Project Setup

**Files:**
- Modify: `pyproject.toml`
- Create: `.env.example`

- [ ] **Step 1: Update pyproject.toml**

Replace the entire file:

```toml
[project]
name = "data-analysis-agent"
version = "0.1.0"
description = "Multi-DB Electronics Store AI Agent"
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.27.0",
    "langchain>=0.1.16",
    "langchain-openai>=0.1.6",
    "langchain-community>=0.0.38",
    "openai>=1.12.0",
    "psycopg2-binary>=2.9.9",
    "pgvector>=0.2.4",
    "pymongo>=4.6.1",
    "python-dotenv>=1.0.0",
    "pydantic>=2.6.0",
    "pydantic-settings>=2.2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.26.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

- [ ] **Step 2: Install dependencies**

```bash
uv sync --extra dev
```

Expected: packages install without error. If uv not available: `pip install -e ".[dev]"`

- [ ] **Step 3: Create .env.example**

```bash
# .env.example — copy to ..env and fill in values
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=sb_secret_...
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ecommerce
```

- [ ] **Step 4: Create backend package structure**

```bash
mkdir -p backend/tools backend/db backend/seed
touch backend/__init__.py backend/tools/__init__.py backend/db/__init__.py backend/seed/__init__.py
mkdir -p tests/unit tests/integration tests/e2e
touch tests/__init__.py tests/unit/__init__.py tests/integration/__init__.py tests/e2e/__init__.py
```

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml .env.example backend/ tests/
git commit -m "chore: add dependencies and package structure"
```

---

## Task 2: Config and DB Connections

**Files:**
- Create: `backend/config.py`
- Create: `backend/db/postgres.py`
- Create: `backend/db/mongo.py`

- [ ] **Step 1: Write backend/config.py**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: str
    database_url: str
    supabase_url: str
    supabase_key: str
    mongodb_uri: str

    model_config = SettingsConfigDict(
        env_file="..env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
```

- [ ] **Step 2: Write backend/db/postgres.py**

```python
from contextlib import contextmanager
import psycopg2
from backend.config import settings


@contextmanager
def get_connection():
    conn = psycopg2.connect(settings.database_url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
```

- [ ] **Step 3: Write backend/db/mongo.py**

```python
from pymongo import MongoClient
from backend.config import settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_uri)
    return _client


def get_db():
    return get_client()["ecommerce"]
```

- [ ] **Step 4: Smoke-test config loads**

```bash
python -c "from backend.config import settings; print('OK:', settings.openai_api_key[:8])"
```

Expected: `OK: sk-proj-`

- [ ] **Step 5: Commit**

```bash
git add backend/config.py backend/db/
git commit -m "feat: add config and DB connection helpers"
```

---

## Task 3: sql_query Tool (TDD)

**Files:**
- Create: `tests/unit/test_sql_tool.py`
- Create: `backend/tools/sql_tool.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/unit/test_sql_tool.py
import pytest
from backend.tools.sql_tool import validate_sql, inject_limit


def test_valid_select_passes():
    assert validate_sql("SELECT * FROM products") is None


def test_non_select_rejected():
    assert validate_sql("INSERT INTO products VALUES (1)") is not None


def test_update_keyword_rejected():
    err = validate_sql("UPDATE products SET price = 0")
    assert err is not None


def test_drop_keyword_rejected():
    err = validate_sql("SELECT 1; DROP TABLE products")
    assert err is not None


def test_delete_keyword_rejected():
    err = validate_sql("DELETE FROM products WHERE id=1")
    assert err is not None


def test_multi_statement_rejected():
    err = validate_sql("SELECT 1; SELECT 2")
    assert err is not None


def test_inject_limit_adds_limit_when_missing():
    result = inject_limit("SELECT * FROM products")
    assert "LIMIT 50" in result


def test_inject_limit_preserves_existing_limit():
    result = inject_limit("SELECT * FROM products LIMIT 10")
    assert "LIMIT 10" in result
    assert result.count("LIMIT") == 1


def test_inject_limit_case_insensitive():
    result = inject_limit("SELECT * FROM products limit 5")
    assert result.count("LIMIT") + result.count("limit") == 1
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
python -m pytest tests/unit/test_sql_tool.py -v
```

Expected: `ImportError` or `ModuleNotFoundError` — file does not exist yet.

- [ ] **Step 3: Implement backend/tools/sql_tool.py**

```python
import re
from langchain.tools import tool
from pydantic import BaseModel
import psycopg2
import psycopg2.extras
from backend.db.postgres import get_connection

_DANGEROUS = re.compile(
    r"\b(insert|update|delete|drop|create|alter|truncate|grant|revoke)\b",
    re.IGNORECASE,
)


class SQLInput(BaseModel):
    query: str


def validate_sql(query: str) -> str | None:
    """Return error string if query is invalid, None if valid."""
    if not query.strip().lower().startswith("select"):
        return "Only SELECT statements are allowed"
    if _DANGEROUS.search(query):
        return "Write operations and DDL are not allowed"
    cleaned = re.sub(r"'[^']*'", "", query)
    if ";" in cleaned.rstrip(";"):
        return "Multi-statements are not allowed"
    return None


def inject_limit(query: str) -> str:
    """Append LIMIT 50 if no LIMIT clause present."""
    if re.search(r"\blimit\b", query, re.IGNORECASE):
        return query
    return query.rstrip().rstrip(";") + " LIMIT 50"


@tool("sql_query", args_schema=SQLInput)
def sql_query(query: str) -> dict:
    """Run a read-only SELECT query against the electronics store Postgres database.
    Tables: products(id,name,category,brand,price,stock_qty),
            orders(id,customer_id,product_id,qty,status,created_at),
            customers(id,name,email,created_at)"""
    error = validate_sql(query)
    if error:
        return {"error": error}

    query = inject_limit(query)

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SET statement_timeout = '5s'")
                cur.execute(query)
                rows = [dict(r) for r in cur.fetchall()]
                return {"rows": rows, "count": len(rows)}
    except Exception as e:
        return {"error": str(e)}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
python -m pytest tests/unit/test_sql_tool.py -v
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tools/sql_tool.py tests/unit/test_sql_tool.py
git commit -m "feat: add sql_query tool with validation (TDD)"
```

---

## Task 4: mongo_query Tool (TDD)

**Files:**
- Create: `tests/unit/test_mongo_tool.py`
- Create: `backend/tools/mongo_tool.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/unit/test_mongo_tool.py
from backend.tools.mongo_tool import validate_mongo, clamp_limit


def test_valid_collection_passes():
    assert validate_mongo("reviews", {}, 10) is None


def test_invalid_collection_rejected():
    err = validate_mongo("users", {}, 10)
    assert err is not None


def test_where_operator_rejected():
    err = validate_mongo("reviews", {"$where": "1==1"}, 10)
    assert err is not None


def test_function_operator_rejected():
    err = validate_mongo("reviews", {"$function": {}}, 10)
    assert err is not None


def test_limit_clamped_at_50():
    assert clamp_limit(100) == 50


def test_limit_below_50_unchanged():
    assert clamp_limit(20) == 20


def test_limit_exactly_50_unchanged():
    assert clamp_limit(50) == 50
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
python -m pytest tests/unit/test_mongo_tool.py -v
```

Expected: `ImportError` — file does not exist yet.

- [ ] **Step 3: Implement backend/tools/mongo_tool.py**

```python
from langchain.tools import tool
from pydantic import BaseModel
from backend.db.mongo import get_db

ALLOWED_COLLECTIONS = ["reviews", "support_tickets", "activity_logs"]
FORBIDDEN_OPERATORS = {"$where", "$function", "$accumulator"}


class MongoInput(BaseModel):
    collection: str
    filter: dict = {}
    limit: int = 20


def validate_mongo(collection: str, filter: dict, limit: int) -> str | None:
    """Return error string if invalid, None if valid."""
    if collection not in ALLOWED_COLLECTIONS:
        return f"Collection '{collection}' not allowed. Allowed: {ALLOWED_COLLECTIONS}"
    filter_str = str(filter)
    for op in FORBIDDEN_OPERATORS:
        if op in filter_str:
            return f"Forbidden operator: {op}"
    return None


def clamp_limit(limit: int) -> int:
    return min(limit, 50)


@tool("mongo_query", args_schema=MongoInput)
def mongo_query(collection: str, filter: dict = {}, limit: int = 20) -> dict:
    """Query MongoDB for reviews, support tickets, or activity logs.
    Collections: reviews(product_id,rating,body,author,created_at),
                 support_tickets(customer_id,subject,status,priority,messages),
                 activity_logs(customer_id,event_type,metadata,timestamp)"""
    error = validate_mongo(collection, filter, limit)
    if error:
        return {"error": error}

    limit = clamp_limit(limit)

    try:
        db = get_db()
        docs = list(db[collection].find(filter, {"_id": 0}).limit(limit))
        return {"documents": docs, "count": len(docs)}
    except Exception as e:
        return {"error": str(e)}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
python -m pytest tests/unit/test_mongo_tool.py -v
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tools/mongo_tool.py tests/unit/test_mongo_tool.py
git commit -m "feat: add mongo_query tool with validation (TDD)"
```

---

## Task 5: handbook_search Tool (TDD)

**Files:**
- Create: `tests/unit/test_handbook_tool.py`
- Create: `backend/tools/handbook_tool.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/unit/test_handbook_tool.py
from unittest.mock import patch, MagicMock
from backend.tools.handbook_tool import clamp_k


def test_clamp_k_above_5():
    assert clamp_k(10) == 5


def test_clamp_k_below_5():
    assert clamp_k(3) == 3


def test_clamp_k_exactly_5():
    assert clamp_k(5) == 5


def test_handbook_search_returns_chunks():
    mock_embedding = [0.1] * 1536

    with patch("backend.tools.handbook_tool.OpenAI") as mock_openai_cls, \
         patch("backend.tools.handbook_tool.get_connection") as mock_conn, \
         patch("backend.tools.handbook_tool.settings") as mock_settings:

        mock_settings.openai_api_key = "sk-test"
        mock_client = MagicMock()
        mock_client.embeddings.create.return_value.data = [MagicMock(embedding=mock_embedding)]
        mock_openai_cls.return_value = mock_client

        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = [
            ("Return Policy", "You may return items within 30 days.", 0.95)
        ]
        mock_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cur

        from backend.tools.handbook_tool import handbook_search
        result = handbook_search.invoke({"query": "return policy", "k": 3})

        assert "chunks" in result
        assert len(result["chunks"]) == 1
        assert result["chunks"][0]["section"] == "Return Policy"


def test_handbook_search_calls_embedding_once():
    mock_embedding = [0.1] * 1536

    with patch("backend.tools.handbook_tool.OpenAI") as mock_openai_cls, \
         patch("backend.tools.handbook_tool.get_connection") as mock_conn, \
         patch("backend.tools.handbook_tool.settings") as mock_settings:

        mock_settings.openai_api_key = "sk-test"
        mock_client = MagicMock()
        mock_client.embeddings.create.return_value.data = [MagicMock(embedding=mock_embedding)]
        mock_openai_cls.return_value = mock_client

        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = []
        mock_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cur

        from backend.tools.handbook_tool import handbook_search
        handbook_search.invoke({"query": "warranty", "k": 2})

        mock_client.embeddings.create.assert_called_once()
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
python -m pytest tests/unit/test_handbook_tool.py -v
```

Expected: `ImportError` — file does not exist yet.

- [ ] **Step 3: Implement backend/tools/handbook_tool.py**

```python
from openai import OpenAI
from langchain.tools import tool
from pydantic import BaseModel
from backend.db.postgres import get_connection
from backend.config import settings


class HandbookInput(BaseModel):
    query: str
    k: int = 3


def clamp_k(k: int) -> int:
    return min(k, 5)


@tool("handbook_search", args_schema=HandbookInput)
def handbook_search(query: str, k: int = 3) -> dict:
    """Search the electronics store policy handbook using semantic similarity.
    Covers: return policy, warranty terms, shipping policy, tech support FAQ, product care."""
    k = clamp_k(k)

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=query,
        )
        embedding = response.data[0].embedding

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT section, content,
                           1 - (embedding <=> %s::vector) AS score
                    FROM handbook_chunks
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (embedding, embedding, k),
                )
                rows = cur.fetchall()
                chunks = [
                    {"section": r[0], "content": r[1], "score": round(float(r[2]), 4)}
                    for r in rows
                ]
                return {"chunks": chunks}
    except Exception as e:
        return {"error": str(e)}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
python -m pytest tests/unit/test_handbook_tool.py -v
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Run all unit tests together**

```bash
python -m pytest tests/unit/ -v
```

Expected: all 21 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/tools/handbook_tool.py tests/unit/test_handbook_tool.py
git commit -m "feat: add handbook_search tool with pgvector RAG (TDD)"
```

---

## Task 6: FastAPI Stub Endpoint

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Write backend/main.py with stub**

```python
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Electronics Store Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ToolCall(BaseModel):
    tool: str
    args: dict
    result: dict | str


class ChatResponse(BaseModel):
    answer: str
    tool_calls: list[ToolCall]
    warnings: list[str]
    elapsed_ms: int


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    return ChatResponse(
        answer=f"[stub] You asked: {req.message}",
        tool_calls=[],
        warnings=[],
        elapsed_ms=0,
    )
```

- [ ] **Step 2: Start the server and verify**

```bash
uvicorn backend.main:app --reload --port 8000
```

In a second terminal:

```bash
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}' | python -m json.tool
```

Expected:
```json
{
  "answer": "[stub] You asked: hello",
  "tool_calls": [],
  "warnings": [],
  "elapsed_ms": 0
}
```

- [ ] **Step 3: Stop the server (Ctrl+C) and commit**

```bash
git add backend/main.py
git commit -m "feat: add FastAPI stub /chat endpoint"
```

---

## Task 7: Seed Postgres (Schema + Data)

**Files:**
- Create: `backend/seed/seed_postgres.py`

- [ ] **Step 1: Write backend/seed/seed_postgres.py**

```python
import psycopg2
from backend.config import settings

SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    product_id INT REFERENCES products(id),
    qty INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handbook_chunks (
    id SERIAL PRIMARY KEY,
    section TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536)
);
"""

CUSTOMERS = [
    ("Alice Johnson", "alice@example.com"),
    ("Bob Smith", "bob@example.com"),
    ("Carol White", "carol@example.com"),
    ("David Brown", "david@example.com"),
    ("Eva Martinez", "eva@example.com"),
]

PRODUCTS = [
    ("MacBook Pro 14", "Laptop", "Apple", 1999.99, 15),
    ("Dell XPS 15", "Laptop", "Dell", 1499.99, 23),
    ("Samsung 65\" 4K TV", "TV", "Samsung", 899.99, 8),
    ("Sony WH-1000XM5", "Headphones", "Sony", 349.99, 42),
    ("iPhone 15 Pro", "Smartphone", "Apple", 1099.99, 31),
    ("Samsung Galaxy S24", "Smartphone", "Samsung", 899.99, 27),
    ("iPad Air", "Tablet", "Apple", 749.99, 19),
    ("LG OLED 55\"", "TV", "LG", 1299.99, 5),
    ("Bose QuietComfort 45", "Headphones", "Bose", 279.99, 34),
    ("Asus ROG Gaming Laptop", "Laptop", "Asus", 1799.99, 11),
]

ORDERS = [
    (1, 1, 1, "delivered"),
    (2, 3, 2, "delivered"),
    (3, 5, 1, "shipped"),
    (4, 2, 2, "pending"),
    (5, 4, 1, "delivered"),
    (1, 6, 1, "delivered"),
    (2, 7, 1, "shipped"),
    (3, 4, 3, "pending"),
    (4, 9, 1, "delivered"),
    (5, 10, 1, "cancelled"),
    (1, 3, 2, "delivered"),
    (2, 8, 1, "pending"),
    (3, 2, 1, "delivered"),
    (4, 5, 2, "shipped"),
    (5, 1, 1, "delivered"),
    (1, 4, 1, "pending"),
    (2, 6, 1, "delivered"),
    (3, 7, 1, "shipped"),
    (4, 3, 1, "delivered"),
    (5, 9, 2, "pending"),
]


def seed():
    conn = psycopg2.connect(settings.database_url)
    cur = conn.cursor()

    print("Creating schema...")
    cur.execute(SCHEMA_SQL)

    print("Inserting customers...")
    for name, email in CUSTOMERS:
        cur.execute(
            "INSERT INTO customers (name, email) VALUES (%s, %s) ON CONFLICT (email) DO NOTHING",
            (name, email),
        )

    print("Inserting products...")
    for name, category, brand, price, stock in PRODUCTS:
        cur.execute(
            """INSERT INTO products (name, category, brand, price, stock_qty)
               VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT DO NOTHING""",
            (name, category, brand, price, stock),
        )

    print("Inserting orders...")
    cur.execute("SELECT id FROM customers ORDER BY id")
    customer_ids = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT id FROM products ORDER BY id")
    product_ids = [r[0] for r in cur.fetchall()]

    for c_idx, p_idx, qty, status in ORDERS:
        if c_idx <= len(customer_ids) and p_idx <= len(product_ids):
            cur.execute(
                """INSERT INTO orders (customer_id, product_id, qty, status)
                   VALUES (%s, %s, %s, %s)""",
                (customer_ids[c_idx - 1], product_ids[p_idx - 1], qty, status),
            )

    conn.commit()
    cur.close()
    conn.close()
    print("Postgres seed complete.")


if __name__ == "__main__":
    seed()
```

- [ ] **Step 2: Run the seed script**

```bash
python -m backend.seed.seed_postgres
```

Expected:
```
Creating schema...
Inserting customers...
Inserting products...
Inserting orders...
Postgres seed complete.
```

- [ ] **Step 3: Verify data in Supabase Table Editor**

In Supabase dashboard → Table Editor → `products`. Should see 10 rows.

- [ ] **Step 4: Commit**

```bash
git add backend/seed/seed_postgres.py
git commit -m "feat: add Postgres seed script (schema + electronics data)"
```

---

## Task 8: Seed MongoDB

**Files:**
- Create: `backend/seed/seed_mongo.py`

- [ ] **Step 1: Write backend/seed/seed_mongo.py**

```python
from datetime import datetime, timedelta
import random
from backend.db.mongo import get_db

REVIEWS = [
    {"product_id": 1, "rating": 5, "body": "The MacBook Pro is incredibly fast. Best laptop I've owned.", "author": "Alice J.", "created_at": datetime.utcnow() - timedelta(days=5)},
    {"product_id": 1, "rating": 4, "body": "Great performance but very expensive.", "author": "Bob S.", "created_at": datetime.utcnow() - timedelta(days=10)},
    {"product_id": 2, "rating": 3, "body": "Dell XPS runs hot under load. Otherwise good build quality.", "author": "Carol W.", "created_at": datetime.utcnow() - timedelta(days=2)},
    {"product_id": 3, "rating": 5, "body": "Samsung TV picture quality is stunning. 4K is worth it.", "author": "David B.", "created_at": datetime.utcnow() - timedelta(days=7)},
    {"product_id": 3, "rating": 2, "body": "Samsung TV remote stopped working after 2 weeks.", "author": "Eva M.", "created_at": datetime.utcnow() - timedelta(days=3)},
    {"product_id": 4, "rating": 5, "body": "Sony headphones have the best noise cancellation on the market.", "author": "Alice J.", "created_at": datetime.utcnow() - timedelta(days=1)},
    {"product_id": 5, "rating": 4, "body": "iPhone 15 Pro camera is exceptional. Battery life improved.", "author": "Bob S.", "created_at": datetime.utcnow() - timedelta(days=14)},
    {"product_id": 6, "rating": 4, "body": "Galaxy S24 is a great Android phone, smooth performance.", "author": "Carol W.", "created_at": datetime.utcnow() - timedelta(days=6)},
    {"product_id": 8, "rating": 1, "body": "LG OLED arrived with a cracked screen. Packaging was terrible.", "author": "David B.", "created_at": datetime.utcnow() - timedelta(days=4)},
    {"product_id": 9, "rating": 5, "body": "Bose headphones are comfortable for all-day use.", "author": "Eva M.", "created_at": datetime.utcnow() - timedelta(days=8)},
]

SUPPORT_TICKETS = [
    {
        "customer_id": 1, "subject": "MacBook Pro won't charge", "status": "open",
        "priority": "high",
        "messages": [
            {"role": "customer", "body": "My MacBook Pro stopped charging overnight.", "ts": datetime.utcnow() - timedelta(hours=5)},
            {"role": "agent", "body": "Have you tried a different cable and power adapter?", "ts": datetime.utcnow() - timedelta(hours=4)},
        ],
    },
    {
        "customer_id": 2, "subject": "Wrong item delivered", "status": "resolved",
        "priority": "medium",
        "messages": [
            {"role": "customer", "body": "I ordered the Dell XPS but received a different laptop.", "ts": datetime.utcnow() - timedelta(days=3)},
            {"role": "agent", "body": "We apologize. We will send the correct item immediately.", "ts": datetime.utcnow() - timedelta(days=3, hours=-2)},
        ],
    },
    {
        "customer_id": 3, "subject": "Samsung TV remote not working", "status": "open",
        "priority": "low",
        "messages": [
            {"role": "customer", "body": "Remote stopped responding. New batteries did not help.", "ts": datetime.utcnow() - timedelta(days=1)},
        ],
    },
    {
        "customer_id": 4, "subject": "Return request for LG OLED", "status": "open",
        "priority": "high",
        "messages": [
            {"role": "customer", "body": "TV arrived with cracked screen. I need a full refund.", "ts": datetime.utcnow() - timedelta(days=2)},
            {"role": "agent", "body": "We are so sorry. Please keep the item and we will ship a replacement.", "ts": datetime.utcnow() - timedelta(days=2, hours=-3)},
        ],
    },
    {
        "customer_id": 5, "subject": "Bose headphones Bluetooth pairing issue", "status": "resolved",
        "priority": "low",
        "messages": [
            {"role": "customer", "body": "Headphones won't connect to my phone.", "ts": datetime.utcnow() - timedelta(days=7)},
            {"role": "agent", "body": "Try holding the power button for 10 seconds to reset.", "ts": datetime.utcnow() - timedelta(days=7, hours=-1)},
            {"role": "customer", "body": "That worked! Thank you.", "ts": datetime.utcnow() - timedelta(days=6)},
        ],
    },
]

ACTIVITY_LOGS = [
    {"customer_id": 1, "event_type": "page_view", "metadata": {"page": "/products/macbook-pro"}, "timestamp": datetime.utcnow() - timedelta(hours=2)},
    {"customer_id": 1, "event_type": "add_to_cart", "metadata": {"product_id": 1, "qty": 1}, "timestamp": datetime.utcnow() - timedelta(hours=1)},
    {"customer_id": 2, "event_type": "purchase", "metadata": {"order_id": 3, "total": 1499.99}, "timestamp": datetime.utcnow() - timedelta(hours=6)},
    {"customer_id": 3, "event_type": "search", "metadata": {"query": "4K TV under 1000"}, "timestamp": datetime.utcnow() - timedelta(minutes=30)},
    {"customer_id": 4, "event_type": "return_request", "metadata": {"order_id": 4, "reason": "damaged"}, "timestamp": datetime.utcnow() - timedelta(days=1)},
    {"customer_id": 5, "event_type": "page_view", "metadata": {"page": "/products/bose-qc45"}, "timestamp": datetime.utcnow() - timedelta(hours=3)},
]


def seed():
    db = get_db()

    print("Clearing existing data...")
    db.reviews.delete_many({})
    db.support_tickets.delete_many({})
    db.activity_logs.delete_many({})

    print("Inserting reviews...")
    db.reviews.insert_many(REVIEWS)

    print("Inserting support tickets...")
    db.support_tickets.insert_many(SUPPORT_TICKETS)

    print("Inserting activity logs...")
    db.activity_logs.insert_many(ACTIVITY_LOGS)

    print(f"MongoDB seed complete: {len(REVIEWS)} reviews, {len(SUPPORT_TICKETS)} tickets, {len(ACTIVITY_LOGS)} logs.")


if __name__ == "__main__":
    seed()
```

- [ ] **Step 2: Run the seed script**

```bash
python -m backend.seed.seed_mongo
```

Expected:
```
Clearing existing data...
Inserting reviews...
Inserting support tickets...
Inserting activity logs...
MongoDB seed complete: 10 reviews, 5 tickets, 6 logs.
```

- [ ] **Step 3: Verify in MongoDB Atlas → Browse Collections**

Should see `ecommerce` database with 3 collections.

- [ ] **Step 4: Commit**

```bash
git add backend/seed/seed_mongo.py
git commit -m "feat: add MongoDB seed script (reviews, tickets, activity logs)"
```

---

## Task 9: Seed Handbook (Chunk + Embed → pgvector)

**Files:**
- Create: `backend/seed/handbook_docs.py`
- Create: `backend/seed/seed_handbook.py`

- [ ] **Step 1: Write backend/seed/handbook_docs.py**

```python
HANDBOOK_SECTIONS = [
    {
        "section": "Return Policy",
        "content": """Electronics Store Return Policy

You may return most items within 30 days of delivery for a full refund. Items must be in original condition with all accessories and packaging.

Non-returnable items: opened software, digital downloads, gift cards, and hazardous materials.

To initiate a return, contact support with your order number. We will provide a prepaid return label within 24 hours.

Refunds are processed within 5-7 business days of receiving the returned item. Original shipping charges are non-refundable unless the return is due to our error.""",
    },
    {
        "section": "Warranty Terms",
        "content": """Warranty Coverage

All products sold by Electronics Store come with the manufacturer's standard warranty.

Laptops and Computers: 1-year limited warranty covering manufacturing defects.
Smartphones and Tablets: 1-year limited warranty. Screen damage from drops is not covered.
TVs and Monitors: 2-year limited warranty. Pixel defects exceeding manufacturer thresholds are covered.
Headphones and Audio: 1-year limited warranty covering driver and cable defects.

Extended warranty plans are available for purchase within 30 days of buying the product. Extended plans add 1 or 2 additional years of coverage and include accidental damage protection.

Warranty claims require proof of purchase. Contact support@electronicsstore.com with your order number and a description of the defect.""",
    },
    {
        "section": "Shipping Policy",
        "content": """Shipping and Delivery

Standard Shipping: 5-7 business days. Free on orders over $50.
Expedited Shipping: 2-3 business days. $12.99 flat rate.
Overnight Shipping: Next business day. $24.99 flat rate. Orders must be placed before 2 PM EST.

Large items (TVs over 55 inches, desktop computers): Require signature on delivery. White-glove delivery available for $49.99 — includes in-home setup and packaging removal.

International shipping is not currently available.

You will receive a tracking number via email within 24 hours of shipment. If your package is lost or damaged in transit, contact us within 7 days of the expected delivery date.""",
    },
    {
        "section": "Tech Support FAQ",
        "content": """Frequently Asked Technical Questions

Q: My laptop won't turn on. What should I do?
A: Hold the power button for 10 seconds to force a restart. If that fails, try a different power adapter. If the issue persists, contact support — it may be a battery or motherboard issue covered under warranty.

Q: How do I connect Bluetooth headphones to a new device?
A: Put the headphones in pairing mode by holding the power button for 10 seconds until the LED flashes rapidly. On your device, open Bluetooth settings and select the headphone name.

Q: My TV remote is not responding.
A: Replace the batteries first. If that does not help, try resetting the remote by holding the power and volume-down buttons simultaneously for 5 seconds. If the TV has a SmartThings app, you can use your phone as a remote while troubleshooting.

Q: How do I back up my phone before trading it in?
A: iPhone: Use iCloud Backup under Settings → [your name] → iCloud → iCloud Backup, or connect to a Mac and use Finder. Android: Use Google One backup under Settings → System → Backup.""",
    },
    {
        "section": "Product Care Guide",
        "content": """Caring for Your Electronics

Laptops: Keep vents clear of dust. Use a soft cloth for the screen — avoid paper towels. Store in a case when traveling. Do not leave in a hot car.

Smartphones: Use a tempered glass screen protector and a case. Avoid extreme temperatures. Charge between 20% and 80% for best long-term battery health.

TVs: Dust the screen with a dry microfiber cloth. Do not spray cleaner directly on the screen. Leave 2-4 inches of clearance around the back for ventilation.

Headphones: Store in the included case when not in use. Clean ear cushions monthly with a lightly damp cloth. Do not expose to rain or excessive sweat without a waterproof rating.""",
    },
]
```

- [ ] **Step 2: Write backend/seed/seed_handbook.py**

```python
from openai import OpenAI
import psycopg2
from backend.config import settings
from backend.seed.handbook_docs import HANDBOOK_SECTIONS


def chunk_text(text: str, max_chars: int = 600) -> list[str]:
    """Split text into chunks at paragraph boundaries."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) > max_chars and current:
            chunks.append(current.strip())
            current = para
        else:
            current = current + "\n\n" + para if current else para
    if current:
        chunks.append(current.strip())
    return chunks


def seed():
    client = OpenAI(api_key=settings.openai_api_key)
    conn = psycopg2.connect(settings.database_url)
    cur = conn.cursor()

    print("Clearing existing handbook chunks...")
    cur.execute("DELETE FROM handbook_chunks")

    for section_data in HANDBOOK_SECTIONS:
        section = section_data["section"]
        chunks = chunk_text(section_data["content"])
        print(f"Embedding {len(chunks)} chunks for section: {section}")

        for chunk in chunks:
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=chunk,
            )
            embedding = response.data[0].embedding
            cur.execute(
                "INSERT INTO handbook_chunks (section, content, embedding) VALUES (%s, %s, %s::vector)",
                (section, chunk, embedding),
            )

    conn.commit()
    cur.close()
    conn.close()
    print("Handbook seed complete.")


if __name__ == "__main__":
    seed()
```

- [ ] **Step 3: Run the handbook seed**

```bash
python -m backend.seed.seed_handbook
```

Expected output (may take 30-60 seconds due to OpenAI API calls):
```
Clearing existing handbook chunks...
Embedding 2 chunks for section: Return Policy
Embedding 3 chunks for section: Warranty Terms
Embedding 3 chunks for section: Shipping Policy
Embedding 3 chunks for section: Tech Support FAQ
Embedding 2 chunks for section: Product Care Guide
Handbook seed complete.
```

- [ ] **Step 4: Verify in Supabase**

Run in Supabase SQL Editor:
```sql
SELECT section, LEFT(content, 60) FROM handbook_chunks ORDER BY id;
```

Should see ~13 rows across 5 sections.

- [ ] **Step 5: Commit**

```bash
git add backend/seed/handbook_docs.py backend/seed/seed_handbook.py
git commit -m "feat: add handbook seed with chunk+embed pipeline"
```

---

## Task 10: LangChain Agent

**Files:**
- Create: `backend/agent.py`

- [ ] **Step 1: Write backend/agent.py**

```python
from langchain_openai import ChatOpenAI
from langchain.agents import create_react_agent, AgentExecutor
from langchain.prompts import PromptTemplate
from backend.config import settings
from backend.tools.sql_tool import sql_query
from backend.tools.mongo_tool import mongo_query
from backend.tools.handbook_tool import handbook_search

_SYSTEM_PROMPT = """\
You are a helpful electronics store assistant. Answer questions about products, \
orders, customers, reviews, and store policies using your available tools.

Tool routing rules:
- sql_query: inventory, orders, customers, pricing, stock counts, date-based queries
- mongo_query: reviews, support tickets, activity logs
- handbook_search: return policy, warranty, shipping, tech support FAQ, product care

{tools}

Use EXACTLY this format:

Question: the input question you must answer
Thought: reason about which tool to call and why
Action: the tool name (one of [{tool_names}])
Action Input: the tool input as JSON
Observation: the result of the action
... (repeat Thought/Action/Action Input/Observation as needed)
Thought: I now know the final answer
Final Answer: the complete answer to the question

Begin!

Question: {input}
{agent_scratchpad}"""


def build_agent_executor() -> AgentExecutor:
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=settings.openai_api_key,
    )
    tools = [sql_query, mongo_query, handbook_search]
    prompt = PromptTemplate.from_template(_SYSTEM_PROMPT)
    agent = create_react_agent(llm, tools, prompt)

    return AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        handle_parsing_errors=True,
        max_iterations=5,
        return_intermediate_steps=True,
    )
```

- [ ] **Step 2: Smoke-test the agent with a real question**

```bash
python -c "
from backend.agent import build_agent_executor
ex = build_agent_executor()
result = ex.invoke({'input': 'How many products do we have in stock?'})
print('Answer:', result['output'])
print('Steps:', len(result['intermediate_steps']))
"
```

Expected: agent calls `sql_query`, returns a count of products. No exceptions.

- [ ] **Step 3: Commit**

```bash
git add backend/agent.py
git commit -m "feat: add LangChain ReAct agent with 3 tools"
```

---

## Task 11: Wire Agent to /chat Endpoint

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Replace stub with real agent in backend/main.py**

```python
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.agent import build_agent_executor

app = FastAPI(title="Electronics Store Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ToolCall(BaseModel):
    tool: str
    args: dict | str
    result: dict | str


class ChatResponse(BaseModel):
    answer: str
    tool_calls: list[ToolCall]
    warnings: list[str]
    elapsed_ms: int


_executor = build_agent_executor()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty")

    start = time.time()

    try:
        result = _executor.invoke({"input": req.message})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    tool_calls = []
    for action, observation in result.get("intermediate_steps", []):
        tool_calls.append(
            ToolCall(
                tool=action.tool,
                args=action.tool_input,
                result=observation,
            )
        )

    return ChatResponse(
        answer=result["output"],
        tool_calls=tool_calls,
        warnings=[],
        elapsed_ms=int((time.time() - start) * 1000),
    )
```

- [ ] **Step 2: Start the server and test all 5 sample questions**

```bash
uvicorn backend.main:app --reload --port 8000
```

Run each curl in a separate terminal:

```bash
# Q1 — SQL
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How many products do we have in stock?"}' | python -m json.tool

# Q2 — SQL
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me the 5 cheapest laptops in stock"}' | python -m json.tool

# Q3 — MongoDB
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are customers saying about the Samsung TV?"}' | python -m json.tool

# Q4 — MongoDB
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show open support tickets"}' | python -m json.tool

# Q5 — RAG
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the return policy for electronics?"}' | python -m json.tool
```

Expected: each response has a non-empty `answer` and at least one entry in `tool_calls`.

- [ ] **Step 3: Commit**

```bash
git add backend/main.py
git commit -m "feat: wire LangChain agent to /chat endpoint"
```

---

## Task 12: Integration Tests

**Files:**
- Create: `tests/integration/test_sql_integration.py`
- Create: `tests/integration/test_mongo_integration.py`
- Create: `tests/integration/test_handbook_integration.py`

- [ ] **Step 1: Write tests/integration/test_sql_integration.py**

```python
# tests/integration/test_sql_integration.py
import pytest
from backend.tools.sql_tool import sql_query


def test_sql_returns_products():
    result = sql_query.invoke({"query": "SELECT id, name, price FROM products"})
    assert "rows" in result
    assert result["count"] > 0
    assert "name" in result["rows"][0]


def test_sql_limit_enforced():
    result = sql_query.invoke({"query": "SELECT * FROM products LIMIT 3"})
    assert result["count"] <= 3


def test_sql_rejects_write():
    result = sql_query.invoke({"query": "DELETE FROM products WHERE id = 1"})
    assert "error" in result
```

- [ ] **Step 2: Write tests/integration/test_mongo_integration.py**

```python
# tests/integration/test_mongo_integration.py
import pytest
from backend.tools.mongo_tool import mongo_query


def test_mongo_returns_reviews():
    result = mongo_query.invoke({"collection": "reviews", "filter": {}, "limit": 5})
    assert "documents" in result
    assert result["count"] > 0


def test_mongo_filter_by_rating():
    result = mongo_query.invoke({"collection": "reviews", "filter": {"rating": 5}, "limit": 10})
    assert "documents" in result
    for doc in result["documents"]:
        assert doc["rating"] == 5


def test_mongo_rejects_unknown_collection():
    result = mongo_query.invoke({"collection": "users", "filter": {}, "limit": 5})
    assert "error" in result
```

- [ ] **Step 3: Write tests/integration/test_handbook_integration.py**

```python
# tests/integration/test_handbook_integration.py
import pytest
from backend.tools.handbook_tool import handbook_search


def test_handbook_returns_chunks():
    result = handbook_search.invoke({"query": "return policy", "k": 3})
    assert "chunks" in result
    assert len(result["chunks"]) > 0


def test_handbook_chunk_has_required_fields():
    result = handbook_search.invoke({"query": "warranty coverage", "k": 2})
    chunk = result["chunks"][0]
    assert "section" in chunk
    assert "content" in chunk
    assert "score" in chunk


def test_handbook_k_limits_results():
    result = handbook_search.invoke({"query": "shipping", "k": 2})
    assert len(result["chunks"]) <= 2
```

- [ ] **Step 4: Run integration tests**

```bash
python -m pytest tests/integration/ -v
```

Expected: all 9 tests PASS. These hit real databases — they require the seed data from Tasks 7-9.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/
git commit -m "test: add integration tests for all three tools"
```

---

## Task 13: E2E Test

**Files:**
- Create: `tests/e2e/test_e2e.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: Write tests/conftest.py**

```python
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
```

- [ ] **Step 2: Write tests/e2e/test_e2e.py**

```python
# tests/e2e/test_e2e.py
import pytest


def test_e2e_sql_product_count(client):
    response = client.post("/chat", json={"message": "How many products do we have in stock?"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    tools_used = [t["tool"] for t in data["tool_calls"]]
    assert "sql_query" in tools_used


def test_e2e_sql_cheapest_laptops(client):
    response = client.post("/chat", json={"message": "Show me the 5 cheapest laptops in stock"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    tools_used = [t["tool"] for t in data["tool_calls"]]
    assert "sql_query" in tools_used


def test_e2e_mongo_samsung_reviews(client):
    response = client.post("/chat", json={"message": "What are customers saying about the Samsung TV?"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    tools_used = [t["tool"] for t in data["tool_calls"]]
    assert "mongo_query" in tools_used


def test_e2e_mongo_open_tickets(client):
    response = client.post("/chat", json={"message": "Show open support tickets"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    tools_used = [t["tool"] for t in data["tool_calls"]]
    assert "mongo_query" in tools_used


def test_e2e_rag_return_policy(client):
    response = client.post("/chat", json={"message": "What is the return policy for electronics?"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    tools_used = [t["tool"] for t in data["tool_calls"]]
    assert "handbook_search" in tools_used


def test_e2e_response_shape(client):
    response = client.post("/chat", json={"message": "How many laptops do we have?"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "tool_calls" in data
    assert "warnings" in data
    assert "elapsed_ms" in data
    assert isinstance(data["elapsed_ms"], int)


def test_e2e_empty_message_rejected(client):
    response = client.post("/chat", json={"message": ""})
    assert response.status_code == 400
```

- [ ] **Step 3: Run e2e tests**

```bash
python -m pytest tests/e2e/ -v
```

Expected: all 7 tests PASS. These make real LLM calls — takes ~30-60 seconds.

- [ ] **Step 4: Run the full test suite**

```bash
python -m pytest tests/ -v --tb=short
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/test_e2e.py tests/conftest.py
git commit -m "test: add e2e tests covering all 5 sample questions"
```

---

## Task 14: Frontend (Vite + React + TypeScript)

**Files:**
- Create: `frontend/` (via npm create vite)
- Create: `frontend/src/api.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/ChatPanel.tsx`
- Create: `frontend/src/components/ToolTrace.tsx`

- [ ] **Step 1: Scaffold the frontend**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Configure Tailwind — update frontend/tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 3: Update frontend/src/index.css**

Replace entire file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Write frontend/src/api.ts**

```typescript
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
```

- [ ] **Step 5: Write frontend/src/components/ToolTrace.tsx**

```tsx
import { ToolCall } from "../api";

interface Props {
  toolCalls: ToolCall[];
}

export function ToolTrace({ toolCalls }: Props) {
  if (toolCalls.length === 0) {
    return (
      <div className="text-gray-400 text-sm italic mt-4">
        No tool calls yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 mt-2">
      {toolCalls.map((tc, i) => (
        <div key={i} className="border border-yellow-300 bg-yellow-50 rounded-lg p-3 text-sm">
          <div className="font-semibold text-yellow-800 mb-1">
            🔧 {tc.tool}
          </div>
          <div className="text-xs text-gray-600 mb-1">
            <span className="font-medium">Args:</span>{" "}
            <code className="bg-gray-100 px-1 rounded">
              {JSON.stringify(tc.args)}
            </code>
          </div>
          <details className="text-xs text-gray-600">
            <summary className="cursor-pointer font-medium text-green-700">
              Result ▸
            </summary>
            <pre className="mt-1 bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(tc.result, null, 2)}
            </pre>
          </details>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Write frontend/src/components/ChatPanel.tsx**

```tsx
import { useState } from "react";
import { ChatResponse, sendMessage } from "../api";

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
```

- [ ] **Step 7: Replace frontend/src/App.tsx**

```tsx
import { useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { ToolTrace } from "./components/ToolTrace";
import { ChatResponse, ToolCall } from "./api";

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
```

- [ ] **Step 8: Start backend and frontend, verify in browser**

Terminal 1:
```bash
uvicorn backend.main:app --reload --port 8000
```

Terminal 2:
```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`. Ask: "What is the return policy?" — should see answer + tool trace on the right.

- [ ] **Step 9: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add React split-panel chat UI with tool trace"
```

---

## Task 15: Final Cleanup and Push

**Files:**
- Modify: `README.md` (add setup + architecture sections)
- Add: `.env.example` (already done in Task 1 — verify it's committed)

- [ ] **Step 1: Verify .env.example is committed and has no real secrets**

```bash
git show HEAD:".env.example"
```

Expected: placeholder values only (sk-..., not a real key).

- [ ] **Step 2: Run the full test suite one final time**

```bash
python -m pytest tests/ -v --tb=short
```

Expected: all tests PASS.

- [ ] **Step 3: Final push**

```bash
git push origin main
```

- [ ] **Step 4: Verify GitHub repo**

Open `https://github.com/SQLicious/agentbuilder-hw2-rubygunna-multi-db-agent` — confirm SPEC.md, README, backend/, frontend/, tests/ are all present and the commit log shows incremental work.

---

## Quick-Start Reference (for README)

```bash
# 1. Install dependencies
uv sync --extra dev

# 2. Copy and fill in env
cp .env.example ..env   # fill in real values

# 3. Seed databases
python -m backend.seed.seed_postgres
python -m backend.seed.seed_mongo
python -m backend.seed.seed_handbook

# 4. Start backend
uvicorn backend.main:app --reload --port 8000

# 5. Start frontend
cd frontend && npm run dev

# 6. Run tests
python -m pytest tests/ -v
```

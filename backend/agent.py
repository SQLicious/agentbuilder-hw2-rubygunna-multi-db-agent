"""LangChain v1 ReAct agent for the Electronics Store.

A fresh agent instance is built per /chat request. This is cheap (it's just
wiring) and keeps the codebase free of long-lived shared state.
"""
from __future__ import annotations
from datetime import date
from typing import Any

from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

from backend.config import settings
from backend.tools.sql_tool import sql_query as _sql_query
from backend.tools.mongo_tool import mongo_query as _mongo_query
from backend.tools.handbook_tool import handbook_search as _handbook_search


def _system_prompt() -> str:
    today = date.today().isoformat()
    return f"""You are an electronics store assistant.

Today's date is {today}.

You have three tools:
- sql_query(query: str)                  — read-only SELECT against Postgres for
                                           structured data: products, orders, customers.
- mongo_query(collection, filter, limit) — MongoDB. Collections: reviews,
                                           support_tickets, activity_logs.
- handbook_search(query, k=3)            — semantic search over store policy docs.
                                           ALWAYS use for policy questions (returns,
                                           warranty, shipping, tech support, care).

Postgres schema (use EXACT column names):
  products:  id, name, category, brand, price, stock_qty
  orders:    id, customer_id, product_id, qty, status, created_at
  customers: id, name, email, created_at

  IMPORTANT — category values are Title Case: 'Laptop', 'TV', 'Smartphone',
  'Tablet', 'Headphones'. Always use ILIKE for filtering:
    WHERE category ILIKE 'laptop'

  Product names are exact strings like 'Samsung 65" 4K TV', 'MacBook Pro 14'.
  ALWAYS use ILIKE with wildcards when searching by product name:
    WHERE name ILIKE '%samsung%tv%'   -- NOT WHERE name = 'Samsung TV'
    WHERE name ILIKE '%macbook%'

MongoDB collections and key fields:
  reviews:         product_id (INT, matches products.id), rating, body, author, created_at
  support_tickets: customer_id, subject, status, priority, messages[]
  activity_logs:   customer_id, event_type, metadata, timestamp

  IMPORTANT — MongoDB product_id is an INTEGER that matches the id column in the
  SQL products table. To find reviews for a product by name (e.g. "Samsung TV"),
  you MUST first run sql_query to get the product's id, then use that integer in
  the MongoDB filter: {{"product_id": <integer id>}}.
  NEVER filter reviews by product name string — product names are not stored in MongoDB.

Rules:
1. Pick the right tool. SQL for structured/aggregate questions; Mongo for reviews,
   tickets, or activity; handbook for any policy text.
2. Policy questions (returns, warranty, shipping, care) MUST use handbook_search.
3. For reviews by product name: sql_query first to get product id → mongo_query with that id.
4. Multi-part questions may need more than one tool — use all that are needed.
5. If a tool returns an error, do NOT retry the same call. Fix the query or skip.
6. Be concise. Give the user the answer, not your reasoning.
"""


@tool
def sql_query(query: str) -> Any:
    """Run a read-only SELECT query against the electronics store Postgres database.

    Tables: products, orders, customers. Returns a dict with rows and count.
    A LIMIT 50 is injected automatically if your query has none.
    """
    return _sql_query.invoke({"query": query})


@tool
def mongo_query(collection: str, filter: dict | None = None, limit: int = 20) -> Any:
    """Query MongoDB. `collection` must be one of: reviews, support_tickets,
    activity_logs.

    Use `filter` to narrow results (e.g. {"rating": 5} or {"status": "open"}).
    """
    return _mongo_query.invoke({
        "collection": collection,
        "filter": filter or {},
        "limit": limit,
    })


@tool
def handbook_search(query: str, k: int = 3) -> Any:
    """Semantic search over the electronics store policy handbook.

    Returns top-k chunks with section labels and similarity scores.
    Use for return policy, warranty, shipping, tech support FAQ, product care.
    """
    return _handbook_search.invoke({"query": query, "k": k})


# Stable module-level references so that test patches on the module attribute
# do not silently break create_agent's captured tool list.
_SQL_TOOL = sql_query
_MONGO_TOOL = mongo_query
_HANDBOOK_TOOL = handbook_search


def _build_chat_model() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        temperature=0,
    )


def build_agent():
    """Construct a fresh LangChain v1 agent with the three electronics store tools."""
    return create_agent(
        model=_build_chat_model(),
        tools=[_SQL_TOOL, _MONGO_TOOL, _HANDBOOK_TOOL],
        system_prompt=_system_prompt(),
    )

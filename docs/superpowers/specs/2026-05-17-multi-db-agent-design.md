# Design Doc — Multi-DB Electronics Agent
**Date:** 2026-05-17
**Project:** HW2 — Multi-DB Agent

## Summary

E-commerce electronics store agent. FastAPI backend with LangChain v1 ReAct agent (gpt-4o-mini). Three tools: sql_query (Supabase Postgres), mongo_query (MongoDB Atlas), handbook_search (pgvector RAG). Vite + React + TS split-panel chat UI.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Domain | Electronics store | Rich natural variety across all 3 tools |
| LLM | gpt-4o-mini | Homework default, cost-effective |
| Schema strategy | Pattern A (static system prompt) | Schema small enough (~500 tokens), no extra round-trips |
| UI layout | Split panel (chat left, tool trace right) | Tool activity always visible for demo |
| SQL DB | Supabase Postgres | Doubles as pgvector host for RAG |
| NoSQL DB | MongoDB Atlas (agent-builder cluster) | Cloud, no local setup needed |

## Architecture

```
Browser → React/Vite/TS → POST /chat → FastAPI → LangChain ReAct
                                                      ├── sql_query → Supabase Postgres
                                                      ├── mongo_query → MongoDB Atlas
                                                      └── handbook_search → pgvector (Supabase)
```

## See Also

Full spec: `SPEC.md` in repo root.

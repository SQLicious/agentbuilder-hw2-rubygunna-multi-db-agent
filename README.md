# Homework 2: Build the Multi-DB Agent

**Due: Friday, 17 May 2026, 11:59 PM your local time.**
Current date : 17 May 2026 

## What this homework is about

In class, we built the **SkyNova Airlines** customer-service agent end to end. A single ReAct loop that can pull from a **SQL** database (passengers, flights, bookings), a **NoSQL** database (support tickets, reviews, activity logs), and a **vector handbook** (RAG over policy documents). One question in, one grounded answer out, with the receipts.

Your homework is to **build the same project yourself, from scratch**. Run it against real databases, write tests for it, and demo it.

This is the homework where the cohort splits into two groups: people who can ship an agent, and people who can talk about agents. Pick which group you want to be in.

## What you are building

A small full-stack app with three parts.

### 1. Backend

- **FastAPI** server with a single `POST /chat` endpoint.
- **LangChain v1** ReAct agent (`create_agent`), using **OpenAI `gpt-4o-mini`** by default. You may swap models, but document the swap.
- **Three tools**, each with Pydantic-typed arguments:
  1. `sql_query`: read-only SELECT against **Supabase Postgres** (or any Postgres). Must reject writes, multi-statements, and dangerous keywords. Auto-injects a `LIMIT` if missing. Has a statement timeout.
  2. `mongo_query`: typed args against **MongoDB Atlas** (or local Mongo). Has a collection whitelist. Caps the result count. If aggregation is allowed, restrict it to safe stages (`$match`, `$group`, `$sort`, `$limit`, `$project`). No server-side JS.
  3. `handbook_search`: vector RAG over **pgvector** using `text-embedding-3-small`. Returns top-k chunks with their section labels.
- The endpoint returns `{answer, tool_calls, warnings, elapsed_ms}`. Yes, you must include `tool_calls` in the response so the frontend can show what the agent actually did.

### 2. Frontend

- **Vite + React + TypeScript** chat UI. Tailwind is optional but recommended.
- The UI must show three things: the user's question, the agent's final answer, and the **tool call trace** (which tool was called, with what arguments, and what came back).
- No auth required. No streaming required. No multi-turn memory required. Single turn is fine.

### 3. Data

- Seed data for all three stores. You can pick your own domain (does not have to be airlines), but pick a domain with enough variety that all three tools get exercised.
- A handful of handbook documents to chunk and embed.

### 4. Tests

- **pytest**, organized into `unit/`, `integration/`, and `e2e/` folders.
- Mock the LLM at the unit level. LangChain's `GenericFakeChatModel` works well for this.
- At least one e2e test that runs a real question through the full agent loop.

## Reference architecture (what we built in class)

```
Browser -> React UI -> FastAPI -> LangChain v1 ReAct agent -> [sql_query | mongo_query | handbook_search] -> live store
```

The agent **never** connects to the data stores directly. Every read goes through one of the three typed tools. This is the part most students get wrong on the first attempt. If your agent has a `psycopg` connection in its hand, you have broken the pattern.

## What to do

### Step 1. Spec before code (30 minutes, mandatory)

Before you run `uv init`, write a `SPEC.md` in your repo. It should contain:

1. **Problem statement.** Who is the user, and what kinds of questions do they ask the agent?
2. **The 3 tools and their contracts.** For each tool: input arguments (with types), return shape, and how errors are surfaced.
3. **Routing rules.** What does the system prompt tell the agent about when to call which tool?
4. **Definition of done.** Five sample questions you will test against, with the expected answer shape (which tool gets called, what fields appear in the answer).

This file gets committed to your repo. Reviewers will read it first. If your spec is "build an agent like in class", you have already lost the homework.

### Step 2. Build it incrementally

Do not try to wire everything at once. Stand it up in this order:

1. FastAPI hello world. `POST /chat` returning a stub response.
2. One tool working in isolation. Start with `sql_query` because it is the simplest.
3. Wire a LangChain ReAct agent that uses just that one tool. Get a real question answered end to end.
4. Add the second tool, then the third.
5. Frontend last. It is the easy part once the backend works.

Commit after each step. Reviewers will read your `git log`.

### Step 3. Test it

Minimum bar:

- One unit test per tool. Cover good inputs, malformed inputs, and dangerous inputs.
- One integration test per tool that hits a real test database.
- One e2e test that runs your five sample questions from `SPEC.md` end to end.

If you can write more, great. The goal is "I actually verified this works", not "I have 90% coverage".

### Step 4. Demo it

Record a short screen capture (2 to 4 minutes is plenty) showing:

1. The UI loading.
2. A question that hits the **SQL** tool. Show the tool trace.
3. A question that hits the **NoSQL** tool. Show the tool trace.
4. A question that hits the **RAG** tool. Show the tool trace.
5. One question that the agent gets **wrong** or partially wrong, and your reaction to it.

That last one is the most important. Anyone can demo a happy path. Show us you have actually used the thing.

If you genuinely cannot record video, post 4 to 5 screenshots that cover the same five flows. Video is strongly preferred.

### Step 5. Write up your findings

In your repo's main `README.md`, include sections for:

1. **Architecture.** Your version of the diagram above. A hand-drawn sketch is fine.
2. **Why I chose X.** Your model, your databases, your domain.
3. **What broke and how I fixed it.** The three best war stories from the build.
4. **What I would change if I had another week.** Be specific. "Add caching" is not specific. "Cache the embedding for repeat questions, since I noticed I re-embed the same query twice per session" is specific.

### Step 6. Submit

In this order:

1. Push everything to your public GitHub repo. Confirm the README, `SPEC.md`, code, tests, and demo links are all present.
2. Create a post in the Skool community in the **Homework** category. Title format: `HW2 Submission - YourName`. The post must include:
   - One-line summary of what you built
   - Link to your public repo
   - The demo video, embedded or linked (Loom, YouTube unlisted, Google Drive, your call)
   - 2 to 3 sentences on what was the hardest part of the build
3. Drop the link to your Skool post as a comment under the **HW2 Assignment Thread** in Skool.

If any of these three steps is missing, the submission is incomplete.

## Deliverables checklist

Before you hit submit, confirm all of the following:

- [ ] Public GitHub repo (your own; not a fork of the class repo)
- [ ] `SPEC.md` written **before** any code, committed near the start of your `git log`
- [ ] Working backend (FastAPI + LangChain v1 + 3 tools)
- [ ] Working frontend (chat UI showing the tool-call trace)
- [ ] Seed data and load scripts for all three stores
- [ ] At least one unit test per tool, plus one e2e test
- [ ] `.env.example` listing required keys (no real secrets in git)
- [ ] `README.md` covering setup, architecture, decisions, and findings
- [ ] Demo video or screenshots showing all three tools in action **and** one failure case
- [ ] Skool post in the Homework category with everything above
- [ ] Skool post link added as a comment on the HW2 Assignment Thread

## How this gets reviewed

| Area | Weight | What we check |
|---|---|---|
| Spec quality | 20% | `SPEC.md` shows real thinking before coding. Tool contracts are concrete. Sample questions are realistic. |
| It runs | 25% | Fresh clone, follow your README, working agent. Reviewers will actually do this. |
| Tool design | 20% | Read-only is enforced. Inputs are validated. Errors do not crash the agent loop. The agent never bypasses a tool. |
| Tests | 10% | At least the minimum bar (one per tool plus one e2e). They actually pass. |
| Demo + write-up | 15% | Demo covers all three tools and one failure case. Findings are specific to your build. |
| Hygiene | 10% | No secrets in git. Clean `git log` showing iterative work. README is friendly to a stranger trying to run it. |

## Common mistakes to avoid

1. Skipping `SPEC.md` and diving into code. The empty file in your repo will cost you 20% off the top.
2. Letting the agent run raw SQL the LLM wrote, with no validation. One `DROP TABLE` and your demo is over.
3. Hardcoding `.env` values in `settings.py` to "make it easier for the grader". This will cost you points.
4. Submitting a single `feat: initial commit` with thousands of lines. We want to see the build, not the final state.
5. Having Claude, Cursor, or Codex generate the whole project in one shot and submitting without reading it. We may ask you to walk through any file in your demo, and you will need to be able to.
6. Skipping the demo because "it works locally". If we cannot see it work, it does not.

## Stretch goals (optional, for the showcase round)

If you finish early and want to push further:

1. **Streaming responses** so the UI shows the agent's reasoning as it goes.
2. **Multi-turn memory** with proper conversation summarization.
3. **Auth.** Even a minimal JWT flow, just to see the pattern.
4. **A fourth tool.** File search, web search, or anything that makes sense for your domain.
5. **Eval harness.** Run your five sample questions on every commit and track pass/fail over time.

These are not required. Get the base build solid first, then attempt these only if you have time.


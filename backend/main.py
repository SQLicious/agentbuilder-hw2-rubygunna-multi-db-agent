import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.agent import run_agent

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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty")

    start = time.time()
    try:
        result = run_agent(req.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ChatResponse(
        answer=result["answer"],
        tool_calls=result["tool_calls"],
        warnings=result["warnings"],
        elapsed_ms=int((time.time() - start) * 1000),
    )

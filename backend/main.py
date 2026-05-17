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

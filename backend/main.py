import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import AIMessage, ToolMessage
from pydantic import BaseModel

from backend.agent import build_agent

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
        agent = build_agent()
        result = agent.invoke({"messages": [("human", req.message)]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    messages = result.get("messages", [])

    # Extract final answer from the last AI message with content
    answer = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content:
            answer = msg.content
            break

    # Extract tool calls with their results from the message history
    tool_calls: list[ToolCall] = []
    for i, msg in enumerate(messages):
        if isinstance(msg, AIMessage) and getattr(msg, "tool_calls", None):
            for tc in msg.tool_calls:
                result_content: dict | str = ""
                for j in range(i + 1, len(messages)):
                    if (
                        isinstance(messages[j], ToolMessage)
                        and messages[j].tool_call_id == tc["id"]
                    ):
                        result_content = messages[j].content
                        break
                tool_calls.append(
                    ToolCall(tool=tc["name"], args=tc["args"], result=result_content)
                )

    return ChatResponse(
        answer=answer,
        tool_calls=tool_calls,
        warnings=[],
        elapsed_ms=int((time.time() - start) * 1000),
    )

from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from backend.config import settings
from backend.tools.sql_tool import sql_query
from backend.tools.mongo_tool import mongo_query
from backend.tools.handbook_tool import handbook_search

_SYSTEM_PROMPT = (
    "You are a helpful electronics store assistant. "
    "Answer questions about products, orders, customers, reviews, and store policies.\n\n"
    "Tool routing rules:\n"
    "- sql_query: inventory, orders, customers, pricing, stock counts, date-based queries\n"
    "- mongo_query: reviews, support tickets, activity logs\n"
    "- handbook_search: return policy, warranty, shipping, tech support FAQ, product care\n\n"
    "SQL Schema: products(id,name,category,brand,price,stock_qty), "
    "orders(id,customer_id,product_id,qty,status,created_at), "
    "customers(id,name,email,created_at)\n\n"
    "MongoDB Collections: reviews(product_id,rating,body,author,created_at), "
    "support_tickets(customer_id,subject,status,priority,messages), "
    "activity_logs(customer_id,event_type,metadata,timestamp)"
)


def build_agent():
    """Return the compiled LangGraph agent."""
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=settings.openai_api_key,
    )
    tools = [sql_query, mongo_query, handbook_search]
    return create_agent(llm, tools, system_prompt=_SYSTEM_PROMPT)


def run_agent(question: str) -> dict:
    """Run a question through the agent. Returns {answer, tool_calls, warnings}."""
    app = build_agent()
    result = app.invoke({"messages": [HumanMessage(content=question)]})

    messages = result.get("messages", [])

    # Extract final answer from last AI message
    answer = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content:
            answer = msg.content
            break

    # Extract tool calls from messages
    tool_calls = []
    for i, msg in enumerate(messages):
        if isinstance(msg, AIMessage) and getattr(msg, "tool_calls", None):
            for tc in msg.tool_calls:
                # Find matching ToolMessage result
                result_content = ""
                for j in range(i + 1, len(messages)):
                    if isinstance(messages[j], ToolMessage) and messages[j].tool_call_id == tc["id"]:
                        result_content = messages[j].content
                        break
                tool_calls.append({
                    "tool": tc["name"],
                    "args": tc["args"],
                    "result": result_content,
                })

    return {"answer": answer, "tool_calls": tool_calls, "warnings": []}

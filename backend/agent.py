from langchain_openai import ChatOpenAI
from langchain_classic.agents import create_react_agent, AgentExecutor
from langchain_classic.prompts import PromptTemplate
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

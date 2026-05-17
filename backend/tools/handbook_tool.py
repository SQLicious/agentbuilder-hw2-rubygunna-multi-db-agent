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

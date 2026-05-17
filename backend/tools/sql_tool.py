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

from langchain.tools import tool
from pydantic import BaseModel

ALLOWED_COLLECTIONS = ["reviews", "support_tickets", "activity_logs"]
FORBIDDEN_OPERATORS = {"$where", "$function", "$accumulator"}


class MongoInput(BaseModel):
    collection: str
    filter: dict = {}
    limit: int = 20


def validate_mongo(collection: str, filter: dict, limit: int) -> str | None:
    """Return error string if invalid, None if valid."""
    if collection not in ALLOWED_COLLECTIONS:
        return f"Collection '{collection}' not allowed. Allowed: {ALLOWED_COLLECTIONS}"
    filter_str = str(filter)
    for op in FORBIDDEN_OPERATORS:
        if op in filter_str:
            return f"Forbidden operator: {op}"
    return None


def clamp_limit(limit: int) -> int:
    return min(limit, 50)


@tool("mongo_query", args_schema=MongoInput)
def mongo_query(collection: str, filter: dict = {}, limit: int = 20) -> dict:
    """Query MongoDB for reviews, support tickets, or activity logs.
    Collections: reviews(product_id,rating,body,author,created_at),
                 support_tickets(customer_id,subject,status,priority,messages),
                 activity_logs(customer_id,event_type,metadata,timestamp)"""
    error = validate_mongo(collection, filter, limit)
    if error:
        return {"error": error}

    limit = clamp_limit(limit)

    try:
        from backend.db.mongo import get_db
        db = get_db()
        docs = list(db[collection].find(filter, {"_id": 0}).limit(limit))
        return {"documents": docs, "count": len(docs)}
    except Exception as e:
        return {"error": str(e)}

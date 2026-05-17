from langchain.tools import tool
from pydantic import BaseModel

ALLOWED_COLLECTIONS = ["reviews", "support_tickets", "activity_logs"]
FORBIDDEN_OPERATORS = {"$where", "$function", "$accumulator"}


class MongoInput(BaseModel):
    collection: str
    filter: dict = {}
    limit: int = 20
    sort: dict = {}


def validate_mongo(collection: str, filter: dict, limit: int, sort: dict) -> str | None:
    """Return error string if invalid, None if valid."""
    if collection not in ALLOWED_COLLECTIONS:
        return f"Collection '{collection}' not allowed. Allowed: {ALLOWED_COLLECTIONS}"
    for target in (filter, sort):
        target_str = str(target)
        for op in FORBIDDEN_OPERATORS:
            if op in target_str:
                return f"Forbidden operator: {op}"
    if sort and not all(v in (1, -1) for v in sort.values()):
        return "Sort values must be 1 (ascending) or -1 (descending)"
    return None


def clamp_limit(limit: int) -> int:
    return min(limit, 50)


@tool("mongo_query", args_schema=MongoInput)
def mongo_query(collection: str, filter: dict | None = None, limit: int = 20, sort: dict | None = None) -> dict:
    """Query MongoDB for reviews, support tickets, or activity logs.
    Collections: reviews(product_id,rating,body,author,created_at),
                 support_tickets(customer_id,subject,status,priority,messages),
                 activity_logs(customer_id,event_type,metadata,timestamp)"""
    filter = filter or {}
    sort = sort or {}
    error = validate_mongo(collection, filter, limit, sort)
    if error:
        return {"error": error}

    limit = clamp_limit(limit)

    try:
        from backend.db.mongo import get_db
        db = get_db()
        cursor = db[collection].find(filter, {"_id": 0})
        if sort:
            cursor = cursor.sort(list(sort.items()))
        docs = list(cursor.limit(limit))
        return {"documents": docs, "count": len(docs)}
    except Exception as e:
        return {"error": str(e)}

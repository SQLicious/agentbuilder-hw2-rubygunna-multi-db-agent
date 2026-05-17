# tests/integration/test_mongo_integration.py
from backend.tools.mongo_tool import mongo_query


def test_mongo_returns_reviews():
    result = mongo_query.invoke({"collection": "reviews", "filter": {}, "limit": 5})
    assert "documents" in result
    assert result["count"] > 0


def test_mongo_filter_by_rating():
    result = mongo_query.invoke({"collection": "reviews", "filter": {"rating": 5}, "limit": 10})
    assert "documents" in result
    for doc in result["documents"]:
        assert doc["rating"] == 5


def test_mongo_rejects_unknown_collection():
    result = mongo_query.invoke({"collection": "users", "filter": {}, "limit": 5})
    assert "error" in result

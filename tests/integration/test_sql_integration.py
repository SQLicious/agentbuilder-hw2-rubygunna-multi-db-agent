# tests/integration/test_sql_integration.py
from backend.tools.sql_tool import sql_query


def test_sql_returns_products():
    result = sql_query.invoke({"query": "SELECT id, name, price FROM products"})
    assert "rows" in result
    assert result["count"] > 0
    assert "name" in result["rows"][0]


def test_sql_limit_enforced():
    result = sql_query.invoke({"query": "SELECT * FROM products LIMIT 3"})
    assert result["count"] <= 3


def test_sql_rejects_write():
    result = sql_query.invoke({"query": "DELETE FROM products WHERE id = 1"})
    assert "error" in result

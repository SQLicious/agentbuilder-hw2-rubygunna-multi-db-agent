import pytest
from backend.tools.sql_tool import validate_sql, inject_limit


def test_valid_select_passes():
    assert validate_sql("SELECT * FROM products") is None


def test_non_select_rejected():
    assert validate_sql("INSERT INTO products VALUES (1)") is not None


def test_update_keyword_rejected():
    err = validate_sql("UPDATE products SET price = 0")
    assert err is not None


def test_drop_keyword_rejected():
    err = validate_sql("SELECT 1; DROP TABLE products")
    assert err is not None


def test_delete_keyword_rejected():
    err = validate_sql("DELETE FROM products WHERE id=1")
    assert err is not None


def test_multi_statement_rejected():
    err = validate_sql("SELECT 1; SELECT 2")
    assert err is not None


def test_inject_limit_adds_limit_when_missing():
    result = inject_limit("SELECT * FROM products")
    assert "LIMIT 50" in result


def test_inject_limit_preserves_existing_limit():
    result = inject_limit("SELECT * FROM products LIMIT 10")
    assert "LIMIT 10" in result
    assert result.count("LIMIT") == 1


def test_inject_limit_case_insensitive():
    result = inject_limit("SELECT * FROM products limit 5")
    assert result.count("LIMIT") + result.count("limit") == 1

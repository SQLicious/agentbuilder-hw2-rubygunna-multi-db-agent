from unittest.mock import MagicMock, patch

from backend.tools.mongo_tool import validate_mongo, clamp_limit, mongo_query


def test_valid_collection_passes():
    assert validate_mongo("reviews", {}, 10, {}) is None


def test_invalid_collection_rejected():
    err = validate_mongo("users", {}, 10, {})
    assert err is not None


def test_where_operator_rejected():
    err = validate_mongo("reviews", {"$where": "1==1"}, 10, {})
    assert err is not None


def test_function_operator_rejected():
    err = validate_mongo("reviews", {"$function": {}}, 10, {})
    assert err is not None


def test_forbidden_operator_in_sort_rejected():
    err = validate_mongo("reviews", {}, 10, {"$where": "1==1"})
    assert err is not None


def test_invalid_sort_direction_rejected():
    err = validate_mongo("reviews", {}, 10, {"rating": 2})
    assert err is not None
    assert "Sort values" in err


def test_valid_sort_ascending_passes():
    assert validate_mongo("reviews", {}, 10, {"rating": 1}) is None


def test_valid_sort_descending_passes():
    assert validate_mongo("reviews", {}, 10, {"created_at": -1}) is None


def test_limit_clamped_at_50():
    assert clamp_limit(100) == 50


def test_limit_below_50_unchanged():
    assert clamp_limit(20) == 20


def test_limit_exactly_50_unchanged():
    assert clamp_limit(50) == 50


def test_sort_applied_when_provided():
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.limit.return_value = [{"rating": 5}, {"rating": 3}]
    mock_db = MagicMock()
    mock_db["reviews"].find.return_value = mock_cursor

    with patch("backend.db.mongo.get_db", return_value=mock_db):
        result = mongo_query.invoke({"collection": "reviews", "filter": {}, "limit": 10, "sort": {"rating": -1}})

    mock_cursor.sort.assert_called_once_with([("rating", -1)])
    assert "documents" in result


def test_sort_skipped_when_empty():
    mock_cursor = MagicMock()
    mock_cursor.limit.return_value = [{"rating": 4}]
    mock_db = MagicMock()
    mock_db["reviews"].find.return_value = mock_cursor

    with patch("backend.db.mongo.get_db", return_value=mock_db):
        result = mongo_query.invoke({"collection": "reviews", "filter": {}, "limit": 10, "sort": {}})

    mock_cursor.sort.assert_not_called()
    assert "documents" in result

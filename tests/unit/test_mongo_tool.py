from backend.tools.mongo_tool import validate_mongo, clamp_limit


def test_valid_collection_passes():
    assert validate_mongo("reviews", {}, 10) is None


def test_invalid_collection_rejected():
    err = validate_mongo("users", {}, 10)
    assert err is not None


def test_where_operator_rejected():
    err = validate_mongo("reviews", {"$where": "1==1"}, 10)
    assert err is not None


def test_function_operator_rejected():
    err = validate_mongo("reviews", {"$function": {}}, 10)
    assert err is not None


def test_limit_clamped_at_50():
    assert clamp_limit(100) == 50


def test_limit_below_50_unchanged():
    assert clamp_limit(20) == 20


def test_limit_exactly_50_unchanged():
    assert clamp_limit(50) == 50

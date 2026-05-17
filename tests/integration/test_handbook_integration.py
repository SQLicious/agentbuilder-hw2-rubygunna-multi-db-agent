# tests/integration/test_handbook_integration.py
from backend.tools.handbook_tool import handbook_search


def test_handbook_returns_chunks():
    result = handbook_search.invoke({"query": "return policy", "k": 3})
    assert "chunks" in result
    assert len(result["chunks"]) > 0


def test_handbook_chunk_has_required_fields():
    result = handbook_search.invoke({"query": "warranty coverage", "k": 2})
    chunk = result["chunks"][0]
    assert "section" in chunk
    assert "content" in chunk
    assert "score" in chunk


def test_handbook_k_limits_results():
    result = handbook_search.invoke({"query": "shipping", "k": 2})
    assert len(result["chunks"]) <= 2

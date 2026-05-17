from unittest.mock import patch, MagicMock
from backend.tools.handbook_tool import clamp_k


def test_clamp_k_above_5():
    assert clamp_k(10) == 5


def test_clamp_k_below_5():
    assert clamp_k(3) == 3


def test_clamp_k_exactly_5():
    assert clamp_k(5) == 5


def test_handbook_search_returns_chunks():
    mock_embedding = [0.1] * 1536

    with patch("backend.tools.handbook_tool.OpenAI") as mock_openai_cls, \
         patch("backend.tools.handbook_tool.get_connection") as mock_conn, \
         patch("backend.tools.handbook_tool.settings") as mock_settings:

        mock_settings.openai_api_key = "sk-test"
        mock_client = MagicMock()
        mock_client.embeddings.create.return_value.data = [MagicMock(embedding=mock_embedding)]
        mock_openai_cls.return_value = mock_client

        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = [
            ("Return Policy", "You may return items within 30 days.", 0.95)
        ]
        mock_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cur

        from backend.tools.handbook_tool import handbook_search
        result = handbook_search.invoke({"query": "return policy", "k": 3})

        assert "chunks" in result
        assert len(result["chunks"]) == 1
        assert result["chunks"][0]["section"] == "Return Policy"


def test_handbook_search_calls_embedding_once():
    mock_embedding = [0.1] * 1536

    with patch("backend.tools.handbook_tool.OpenAI") as mock_openai_cls, \
         patch("backend.tools.handbook_tool.get_connection") as mock_conn, \
         patch("backend.tools.handbook_tool.settings") as mock_settings:

        mock_settings.openai_api_key = "sk-test"
        mock_client = MagicMock()
        mock_client.embeddings.create.return_value.data = [MagicMock(embedding=mock_embedding)]
        mock_openai_cls.return_value = mock_client

        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = []
        mock_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cur

        from backend.tools.handbook_tool import handbook_search
        handbook_search.invoke({"query": "warranty", "k": 2})

        mock_client.embeddings.create.assert_called_once()

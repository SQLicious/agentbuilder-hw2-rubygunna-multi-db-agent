# tests/e2e/test_e2e.py
import pytest


def test_e2e_sql_product_count(client):
    response = client.post("/chat", json={"message": "How many products do we have in stock?"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    tools_used = [t["tool"] for t in data["tool_calls"]]
    assert "sql_query" in tools_used


def test_e2e_sql_cheapest_laptops(client):
    response = client.post("/chat", json={"message": "Show me the 5 cheapest laptops in stock"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    tools_used = [t["tool"] for t in data["tool_calls"]]
    assert "sql_query" in tools_used


def test_e2e_mongo_samsung_reviews(client):
    response = client.post("/chat", json={"message": "What are customers saying about the Samsung TV?"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    tools_used = [t["tool"] for t in data["tool_calls"]]
    assert "mongo_query" in tools_used


def test_e2e_mongo_open_tickets(client):
    response = client.post("/chat", json={"message": "Show open support tickets"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    tools_used = [t["tool"] for t in data["tool_calls"]]
    assert "mongo_query" in tools_used


def test_e2e_rag_return_policy(client):
    response = client.post("/chat", json={"message": "What is the return policy for electronics?"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    tools_used = [t["tool"] for t in data["tool_calls"]]
    assert "handbook_search" in tools_used


def test_e2e_response_shape(client):
    response = client.post("/chat", json={"message": "How many laptops do we have?"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "tool_calls" in data
    assert "warnings" in data
    assert "elapsed_ms" in data
    assert isinstance(data["elapsed_ms"], int)


def test_e2e_empty_message_rejected(client):
    response = client.post("/chat", json={"message": ""})
    assert response.status_code == 400

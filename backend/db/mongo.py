import threading
from pymongo import MongoClient
from pymongo.database import Database
from backend.config import settings

_client: MongoClient | None = None
_lock = threading.Lock()


def get_client() -> MongoClient:
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                _client = MongoClient(settings.mongodb_uri)
    return _client


def get_db() -> Database:
    return get_client()["ecommerce"]

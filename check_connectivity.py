"""Smoke test for MongoDB Atlas + Supabase connectivity.

Reads credentials from .env, attempts a basic ping + listing on each
store, and prints a per-store PASS/FAIL summary.

Usage:
    .venv/Scripts/python.exe check_connectivity.py
"""
from __future__ import annotations
import os
import sys
import traceback

from dotenv import load_dotenv

load_dotenv()


def check_mongodb() -> bool:
    print("\n[MongoDB Atlas]")
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        print("  FAIL: MONGODB_URI not set in .env")
        return False

    try:
        from pymongo import MongoClient
        client = MongoClient(uri, serverSelectionTimeoutMS=8000)
        info = client.server_info()
        print(f"  connected: server v{info.get('version')}")

        db = client["ecommerce"]
        collections = db.list_collection_names()
        print(f"  db 'ecommerce' collections: {collections or '(empty — run seed_mongo.py)'}")
        for coll in ("reviews", "support_tickets", "activity_logs"):
            if coll in collections:
                print(f"    - {coll}: {db[coll].count_documents({})} docs")
        return True
    except Exception:
        print("  FAIL:")
        traceback.print_exc()
        return False


def check_supabase() -> bool:
    print("\n[Supabase / Postgres]")
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("  FAIL: DATABASE_URL not set in .env")
        return False

    try:
        import psycopg2
        conn = psycopg2.connect(url, connect_timeout=10)
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"  connected: {version.split(',')[0]}")

        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' ORDER BY table_name;"
        )
        tables = [row[0] for row in cur.fetchall()]
        print(f"  public tables: {tables or '(empty — run seed_postgres.py)'}")
        for t in ("customers", "products", "orders", "handbook_chunks"):
            if t in tables:
                cur.execute(f"SELECT COUNT(*) FROM {t};")
                print(f"    - {t}: {cur.fetchone()[0]} rows")

        conn.close()
        return True
    except Exception:
        print("  FAIL:")
        traceback.print_exc()
        print(
            "\n  HINT: if this is a timeout/network error, switch DATABASE_URL to the"
            " Supabase Session Pooler:\n"
            "    postgresql://postgres.<project-ref>:<password>"
            "@aws-1-us-east-2.pooler.supabase.com:5432/postgres\n"
            "  Get this URL from: Supabase dashboard → Connect button → Session pooler"
        )
        return False


def main() -> int:
    mongo_ok = check_mongodb()
    pg_ok = check_supabase()

    print("\n=== Summary ===")
    print(f"  MongoDB Atlas : {'PASS' if mongo_ok else 'FAIL'}")
    print(f"  Supabase/PG   : {'PASS' if pg_ok else 'FAIL'}")
    return 0 if (mongo_ok and pg_ok) else 1


if __name__ == "__main__":
    sys.exit(main())

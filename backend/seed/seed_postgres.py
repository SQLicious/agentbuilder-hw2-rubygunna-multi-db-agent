import psycopg2
from backend.config import settings

SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    product_id INT REFERENCES products(id),
    qty INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handbook_chunks (
    id SERIAL PRIMARY KEY,
    section TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536)
);
"""

CUSTOMERS = [
    ("Alice Johnson", "alice@example.com"),
    ("Bob Smith", "bob@example.com"),
    ("Carol White", "carol@example.com"),
    ("David Brown", "david@example.com"),
    ("Eva Martinez", "eva@example.com"),
]

PRODUCTS = [
    ("MacBook Pro 14", "Laptop", "Apple", 1999.99, 15),
    ("Dell XPS 15", "Laptop", "Dell", 1499.99, 23),
    ('Samsung 65" 4K TV', "TV", "Samsung", 899.99, 8),
    ("Sony WH-1000XM5", "Headphones", "Sony", 349.99, 42),
    ("iPhone 15 Pro", "Smartphone", "Apple", 1099.99, 31),
    ("Samsung Galaxy S24", "Smartphone", "Samsung", 899.99, 27),
    ("iPad Air", "Tablet", "Apple", 749.99, 19),
    ('LG OLED 55"', "TV", "LG", 1299.99, 5),
    ("Bose QuietComfort 45", "Headphones", "Bose", 279.99, 34),
    ("Asus ROG Gaming Laptop", "Laptop", "Asus", 1799.99, 11),
]

ORDERS = [
    (1, 1, 1, "delivered"),
    (2, 3, 2, "delivered"),
    (3, 5, 1, "shipped"),
    (4, 2, 2, "pending"),
    (5, 4, 1, "delivered"),
    (1, 6, 1, "delivered"),
    (2, 7, 1, "shipped"),
    (3, 4, 3, "pending"),
    (4, 9, 1, "delivered"),
    (5, 10, 1, "cancelled"),
    (1, 3, 2, "delivered"),
    (2, 8, 1, "pending"),
    (3, 2, 1, "delivered"),
    (4, 5, 2, "shipped"),
    (5, 1, 1, "delivered"),
    (1, 4, 1, "pending"),
    (2, 6, 1, "delivered"),
    (3, 7, 1, "shipped"),
    (4, 3, 1, "delivered"),
    (5, 9, 2, "pending"),
]


def seed():
    conn = psycopg2.connect(settings.database_url)
    cur = conn.cursor()

    print("Creating schema...")
    cur.execute(SCHEMA_SQL)

    print("Inserting customers...")
    for name, email in CUSTOMERS:
        cur.execute(
            "INSERT INTO customers (name, email) VALUES (%s, %s) ON CONFLICT (email) DO NOTHING",
            (name, email),
        )

    print("Inserting products...")
    for name, category, brand, price, stock in PRODUCTS:
        cur.execute(
            """INSERT INTO products (name, category, brand, price, stock_qty)
               VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT DO NOTHING""",
            (name, category, brand, price, stock),
        )

    print("Inserting orders...")
    cur.execute("SELECT id FROM customers ORDER BY id")
    customer_ids = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT id FROM products ORDER BY id")
    product_ids = [r[0] for r in cur.fetchall()]

    for c_idx, p_idx, qty, status in ORDERS:
        if c_idx <= len(customer_ids) and p_idx <= len(product_ids):
            cur.execute(
                """INSERT INTO orders (customer_id, product_id, qty, status)
                   VALUES (%s, %s, %s, %s)""",
                (customer_ids[c_idx - 1], product_ids[p_idx - 1], qty, status),
            )

    conn.commit()
    cur.close()
    conn.close()
    print("Postgres seed complete.")


if __name__ == "__main__":
    seed()

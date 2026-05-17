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
    # Original (IDs 1–5)
    ("Alice Johnson",       "alice@example.com"),
    ("Bob Smith",           "bob@example.com"),
    ("Carol White",         "carol@example.com"),
    ("David Brown",         "david@example.com"),
    ("Eva Martinez",        "eva@example.com"),
    # Bridgerton Season 4 (IDs 6–11)
    ("Benedict Bridgerton", "benedict.bridgerton@voltiq-demo.test"),
    ("Sophie Baek",         "sophie.baek@voltiq-demo.test"),
    ("Eloise Bridgerton",   "eloise.bridgerton@voltiq-demo.test"),
    ("Araminta Gun",        "araminta.gun@voltiq-demo.test"),
    ("Rosamund Li",         "rosamund.li@voltiq-demo.test"),
    ("Posy Li",             "posy.li@voltiq-demo.test"),
    # Devil Wears Prada (IDs 12–17)
    ("Miranda Priestly",    "miranda.priestly@voltiq-demo.test"),
    ("Andy Sachs",          "andy.sachs@voltiq-demo.test"),
    ("Emily Charlton",      "emily.charlton@voltiq-demo.test"),
    ("Nigel Kipling",       "nigel.kipling@voltiq-demo.test"),
    ("Christian Thompson",  "christian.thompson@voltiq-demo.test"),
    ("Nate Cooper",         "nate.cooper@voltiq-demo.test"),
    # Avengers (IDs 18–23)
    ("Tony Stark",          "tony.stark@voltiq-demo.test"),
    ("Steve Rogers",        "steve.rogers@voltiq-demo.test"),
    ("Natasha Romanoff",    "natasha.romanoff@voltiq-demo.test"),
    ("Bruce Banner",        "bruce.banner@voltiq-demo.test"),
    ("Thor Odinson",        "thor.odinson@voltiq-demo.test"),
    ("Clint Barton",        "clint.barton@voltiq-demo.test"),
    # Harry Potter (IDs 24–29)
    ("Harry Potter",        "harry.potter@voltiq-demo.test"),
    ("Hermione Granger",    "hermione.granger@voltiq-demo.test"),
    ("Ron Weasley",         "ron.weasley@voltiq-demo.test"),
    ("Draco Malfoy",        "draco.malfoy@voltiq-demo.test"),
    ("Ginny Weasley",       "ginny.weasley@voltiq-demo.test"),
    ("Luna Lovegood",       "luna.lovegood@voltiq-demo.test"),
    # Game of Thrones (IDs 30–35)
    ("Jon Snow",            "jon.snow@voltiq-demo.test"),
    ("Arya Stark",          "arya.stark@voltiq-demo.test"),
    ("Sansa Stark",         "sansa.stark@voltiq-demo.test"),
    ("Daenerys Targaryen",  "daenerys.targaryen@voltiq-demo.test"),
    ("Tyrion Lannister",    "tyrion.lannister@voltiq-demo.test"),
    ("Cersei Lannister",    "cersei.lannister@voltiq-demo.test"),
]

PRODUCTS = [
    # Original products (IDs 1–10)
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
    # Budget laptops under $400 (IDs 11–18)
    ("HP 14 Laptop Intel Celeron N4020 4GB 64GB", "Laptop", "HP", 130.00, 38),
    ("Acer Aspire 3 A315-24P Ryzen 3 7320U 8GB 128GB", "Laptop", "Acer", 237.59, 26),
    ("HP Chromebook 14 Intel Celeron N4120 4GB 64GB", "Laptop", "HP", 139.98, 44),
    ("Lenovo IdeaPad 3i Chromebook 15.6 FHD 8GB 64GB", "Laptop", "Lenovo", 164.26, 31),
    ("HP Pavilion 15.6 Touchscreen 16GB 1TB SSD", "Laptop", "HP", 279.00, 22),
    ("Lenovo IdeaPad 1 Gen 7 15.6 Touch i3 16GB 1TB", "Laptop", "Lenovo", 307.00, 18),
    ("HP 2025 Student Business Laptop Intel N150 16GB 384GB", "Laptop", "HP", 389.99, 25),
    ("Lenovo 15.6 FHD Business Student Laptop 32GB 1TB", "Laptop", "Lenovo", 398.99, 16),
    # Business / productivity laptops $700–$1000 (IDs 19–25)
    ("Apple MacBook Air 13 M4 16GB 256GB Midnight", "Laptop", "Apple", 789.57, 14),
    ("Apple MacBook Air 13 M4 16GB 256GB Sky Blue", "Laptop", "Apple", 786.84, 12),
    ("Apple MacBook Air 13 M4 16GB 256GB Starlight", "Laptop", "Apple", 823.53, 10),
    ("Lenovo ThinkPad E16 Business i5 16GB 512GB", "Laptop", "Lenovo", 799.99, 19),
    ("Lenovo ThinkPad E16 Ryzen 7 16GB 512GB", "Laptop", "Lenovo", 899.00, 13),
    ("Lenovo ThinkPad E16 Gen 2 Ryzen 7 16GB 1TB", "Laptop", "Lenovo", 856.99, 11),
    ("Dell 16 Touchscreen Business Laptop Core 7 16GB 1TB", "Laptop", "Dell", 897.90, 15),
    # Budget/mid TVs (IDs 26–28)
    ('Insignia 55" Class F50 Series LED 4K UHD Smart Fire TV', "TV", "Insignia", 199.99, 36),
    ('Samsung 55" Class U7900 Series UHD 4K Smart Tizen TV 2025', "TV", "Samsung", 249.99, 28),
    ('Samsung 55" Class Q6F Series QLED 4K UHD Smart Tizen TV 2025', "TV", "Samsung", 349.99, 21),
    # Premium headphones (IDs 29–36)
    ("Beats Studio Pro Wireless Noise Cancelling Headphones", "Headphones", "Beats", 199.99, 32),
    ("Beats Solo 4 Wireless On-Ear Headphones", "Headphones", "Beats", 129.95, 45),
    ("Sony WH-1000XM5 Wireless Noise Cancelling Headphones", "Headphones", "Sony", 299.99, 24),
    ("Sony WH-CH720N Wireless Noise Cancelling Headphones", "Headphones", "Sony", 149.99, 38),
    ("Sony ULT WEAR Wireless Noise Cancelling Headphones", "Headphones", "Sony", 179.99, 27),
    ("Sennheiser Momentum 4 Wireless ANC Headphones", "Headphones", "Sennheiser", 279.99, 18),
    ("Sennheiser Accentum Plus Wireless ANC Headphones", "Headphones", "Sennheiser", 199.95, 21),
    ("Bose QuietComfort Ultra Wireless Headphones", "Headphones", "Bose", 329.99, 16),
    # Earbuds (IDs 37–40)
    ("Apple AirPods Pro 2 USB-C", "Earbuds", "Apple", 189.99, 40),
    ("Beats Studio Buds Plus True Wireless Earbuds", "Earbuds", "Beats", 129.99, 36),
    ("Samsung Galaxy Buds3 Pro True Wireless Earbuds", "Earbuds", "Samsung", 219.99, 23),
    ("Sony WF-1000XM5 True Wireless Noise Cancelling Earbuds", "Earbuds", "Sony", 229.99, 19),
    # Monitors (IDs 41–44)
    ('LG 27" IPS FHD 120Hz Monitor with HDR10', "Monitor", "LG", 124.99, 34),
    ('Dell S2725QC 27" 4K UHD 120Hz USB-C Monitor', "Monitor", "Dell", 279.99, 21),
    ('Samsung Odyssey G5 32" QHD Curved Gaming Monitor', "Monitor", "Samsung", 249.99, 17),
    ('Alienware AW2726DM 27" QD-OLED QHD Gaming Monitor', "Monitor", "Alienware", 349.99, 9),
    # Gaming accessories (IDs 45–48)
    ("Logitech G502 X PLUS LIGHTSPEED Wireless Gaming Mouse", "Gaming Accessory", "Logitech", 149.99, 28),
    ("Razer BlackWidow V4 X Mechanical Gaming Keyboard", "Gaming Accessory", "Razer", 129.99, 22),
    ("SteelSeries Apex Pro TKL Gen 3 Gaming Keyboard", "Gaming Accessory", "SteelSeries", 179.99, 14),
    ("Xbox Wireless Controller Carbon Black", "Gaming Accessory", "Microsoft", 59.99, 41),
    # Smartwatches (IDs 49–52)
    ("Apple Watch SE 3 GPS 40mm Midnight Aluminum", "Smartwatch", "Apple", 219.00, 26),
    ("Garmin Forerunner 165 GPS Smartwatch 43mm", "Smartwatch", "Garmin", 205.99, 19),
    ("Google Pixel Watch 4 41mm Wi-Fi", "Smartwatch", "Google", 349.99, 16),
    ("Samsung Galaxy Watch7 44mm Bluetooth", "Smartwatch", "Samsung", 229.99, 24),
    # Bluetooth speakers (IDs 53–56)
    ("JBL Charge 6 Portable Bluetooth Speaker", "Bluetooth Speaker", "JBL", 199.95, 31),
    ("Bose SoundLink Flex 2nd Gen Portable Bluetooth Speaker", "Bluetooth Speaker", "Bose", 139.00, 27),
    ("Sonos Era 100 SL Wi-Fi and Bluetooth Speaker", "Bluetooth Speaker", "Sonos", 189.00, 18),
    ("Sony ULT FIELD 1 Portable Bluetooth Speaker", "Bluetooth Speaker", "Sony", 129.99, 23),
    # Cameras (IDs 57–60)
    ("Canon EOS R50 Mirrorless Camera with 18-45mm Lens", "Camera", "Canon", 749.99, 8),
    ("Sony Alpha ZV-E10 Mirrorless Vlog Camera Kit", "Camera", "Sony", 699.99, 11),
    ("GoPro HERO13 Black Action Camera", "Camera", "GoPro", 399.99, 20),
    ("Nikon Z30 Mirrorless Camera with 16-50mm Lens", "Camera", "Nikon", 649.99, 7),
    # Webcams (IDs 61–64)
    ("Logitech Brio 100 1080p Full HD Webcam", "Webcam", "Logitech", 24.99, 45),
    ("EMEET S600 4K Webcam for Streaming", "Webcam", "EMEET", 54.99, 33),
    ("Razer Kiyo Pro Ultra 4K Webcam", "Webcam", "Razer", 299.99, 10),
    ("Logitech Brio 305 Full HD 1080p Webcam", "Webcam", "Logitech", 47.99, 29),
    # Chargers & cables (IDs 65–68)
    ("Anker 140W 4-Port USB-C PD 3.1 Laptop Charger", "Charger & Cable", "Anker", 59.99, 36),
    ("Anker Prime 100W 3-Port GaN USB-C Charger", "Charger & Cable", "Anker", 74.99, 24),
    ("Apple 20W USB-C Power Adapter", "Charger & Cable", "Apple", 19.99, 52),
    ("Insignia 6ft USB-C to USB-C Charging Cable", "Charger & Cable", "Insignia", 12.99, 61),
    # Routers / networking (IDs 69–72)
    ("TP-Link Archer BE9700 Tri-Band Wi-Fi 7 Router", "Router", "TP-Link", 249.99, 15),
    ("ASUS RT-BE82U BE6500 Dual-Band Wi-Fi 7 Router", "Router", "ASUS", 167.99, 18),
    ("NETGEAR Nighthawk AX1800 Dual-Band Wi-Fi Router", "Router", "NETGEAR", 88.99, 30),
    ("TP-Link Deco BE5000 Wi-Fi 7 Mesh System 3-Pack", "Router", "TP-Link", 209.99, 13),
    # External storage (IDs 73–76)
    ("Crucial X9 1TB External USB-C SSD", "External Storage", "Crucial", 119.99, 32),
    ("Crucial X10 Pro 1TB USB-C External SSD", "External Storage", "Crucial", 161.99, 21),
    ("SanDisk Extreme Portable 1TB USB-C NVMe SSD", "External Storage", "SanDisk", 179.99, 18),
    ("Seagate Expansion 2TB USB 3.0 Portable Hard Drive", "External Storage", "Seagate", 119.99, 26),
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
    # Bridgerton customers (IDs 6–11)
    (6,  7,  1, "delivered"),
    (6,  55, 1, "delivered"),
    (7,  15, 1, "shipped"),
    (8,  22, 1, "delivered"),
    (8,  73, 1, "delivered"),
    (9,  5,  1, "pending"),
    (10, 28, 1, "shipped"),
    (11, 64, 1, "delivered"),
    # Devil Wears Prada customers (IDs 12–17)
    (12, 1,  1, "delivered"),
    (12, 37, 1, "delivered"),
    (13, 21, 1, "shipped"),
    (13, 31, 1, "shipped"),
    (14, 49, 1, "delivered"),
    (15, 57, 1, "pending"),
    (15, 42, 1, "pending"),
    (16, 58, 1, "delivered"),
    (17, 53, 1, "delivered"),
    # Avengers customers (IDs 18–23)
    (18, 44, 1, "delivered"),
    (18, 46, 1, "delivered"),
    (19, 50, 1, "delivered"),
    (20, 31, 1, "shipped"),
    (21, 23, 1, "delivered"),
    (21, 72, 1, "delivered"),
    (22, 3,  1, "pending"),
    (23, 59, 1, "shipped"),
    # Harry Potter customers (IDs 24–29)
    (24, 10, 1, "delivered"),
    (25, 24, 1, "delivered"),
    (25, 65, 1, "delivered"),
    (26, 48, 2, "shipped"),
    (27, 19, 1, "pending"),
    (28, 59, 1, "delivered"),
    (29, 56, 1, "delivered"),
    # Game of Thrones customers (IDs 30–35)
    (30, 69, 1, "delivered"),
    (31, 40, 1, "shipped"),
    (31, 75, 1, "shipped"),
    (32, 34, 1, "delivered"),
    (33, 8,  1, "pending"),
    (34, 2,  1, "delivered"),
    (34, 9,  1, "delivered"),
    (35, 5,  1, "pending"),
    (35, 29, 1, "pending"),
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

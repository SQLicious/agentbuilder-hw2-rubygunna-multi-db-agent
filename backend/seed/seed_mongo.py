from datetime import datetime, timedelta
from backend.db.mongo import get_db

REVIEWS = [
    {"product_id": 1, "rating": 5, "body": "The MacBook Pro is incredibly fast. Best laptop I've owned.", "author": "Alice J.", "created_at": datetime.utcnow() - timedelta(days=5)},
    {"product_id": 1, "rating": 4, "body": "Great performance but very expensive.", "author": "Bob S.", "created_at": datetime.utcnow() - timedelta(days=10)},
    {"product_id": 2, "rating": 3, "body": "Dell XPS runs hot under load. Otherwise good build quality.", "author": "Carol W.", "created_at": datetime.utcnow() - timedelta(days=2)},
    {"product_id": 3, "rating": 5, "body": "Samsung TV picture quality is stunning. 4K is worth it.", "author": "David B.", "created_at": datetime.utcnow() - timedelta(days=7)},
    {"product_id": 3, "rating": 2, "body": "Samsung TV remote stopped working after 2 weeks.", "author": "Eva M.", "created_at": datetime.utcnow() - timedelta(days=3)},
    {"product_id": 4, "rating": 5, "body": "Sony headphones have the best noise cancellation on the market.", "author": "Alice J.", "created_at": datetime.utcnow() - timedelta(days=1)},
    {"product_id": 5, "rating": 4, "body": "iPhone 15 Pro camera is exceptional. Battery life improved.", "author": "Bob S.", "created_at": datetime.utcnow() - timedelta(days=14)},
    {"product_id": 6, "rating": 4, "body": "Galaxy S24 is a great Android phone, smooth performance.", "author": "Carol W.", "created_at": datetime.utcnow() - timedelta(days=6)},
    {"product_id": 8, "rating": 1, "body": "LG OLED arrived with a cracked screen. Packaging was terrible.", "author": "David B.", "created_at": datetime.utcnow() - timedelta(days=4)},
    {"product_id": 9, "rating": 5, "body": "Bose headphones are comfortable for all-day use.", "author": "Eva M.", "created_at": datetime.utcnow() - timedelta(days=8)},
]

SUPPORT_TICKETS = [
    {
        "customer_id": 1, "subject": "MacBook Pro won't charge", "status": "open",
        "priority": "high",
        "messages": [
            {"role": "customer", "body": "My MacBook Pro stopped charging overnight.", "ts": datetime.utcnow() - timedelta(hours=5)},
            {"role": "agent", "body": "Have you tried a different cable and power adapter?", "ts": datetime.utcnow() - timedelta(hours=4)},
        ],
    },
    {
        "customer_id": 2, "subject": "Wrong item delivered", "status": "resolved",
        "priority": "medium",
        "messages": [
            {"role": "customer", "body": "I ordered the Dell XPS but received a different laptop.", "ts": datetime.utcnow() - timedelta(days=3)},
            {"role": "agent", "body": "We apologize. We will send the correct item immediately.", "ts": datetime.utcnow() - timedelta(days=3, hours=-2)},
        ],
    },
    {
        "customer_id": 3, "subject": "Samsung TV remote not working", "status": "open",
        "priority": "low",
        "messages": [
            {"role": "customer", "body": "Remote stopped responding. New batteries did not help.", "ts": datetime.utcnow() - timedelta(days=1)},
        ],
    },
    {
        "customer_id": 4, "subject": "Return request for LG OLED", "status": "open",
        "priority": "high",
        "messages": [
            {"role": "customer", "body": "TV arrived with cracked screen. I need a full refund.", "ts": datetime.utcnow() - timedelta(days=2)},
            {"role": "agent", "body": "We are so sorry. Please keep the item and we will ship a replacement.", "ts": datetime.utcnow() - timedelta(days=2, hours=-3)},
        ],
    },
    {
        "customer_id": 5, "subject": "Bose headphones Bluetooth pairing issue", "status": "resolved",
        "priority": "low",
        "messages": [
            {"role": "customer", "body": "Headphones won't connect to my phone.", "ts": datetime.utcnow() - timedelta(days=7)},
            {"role": "agent", "body": "Try holding the power button for 10 seconds to reset.", "ts": datetime.utcnow() - timedelta(days=7, hours=-1)},
            {"role": "customer", "body": "That worked! Thank you.", "ts": datetime.utcnow() - timedelta(days=6)},
        ],
    },
]

ACTIVITY_LOGS = [
    {"customer_id": 1, "event_type": "page_view", "metadata": {"page": "/products/macbook-pro"}, "timestamp": datetime.utcnow() - timedelta(hours=2)},
    {"customer_id": 1, "event_type": "add_to_cart", "metadata": {"product_id": 1, "qty": 1}, "timestamp": datetime.utcnow() - timedelta(hours=1)},
    {"customer_id": 2, "event_type": "purchase", "metadata": {"order_id": 3, "total": 1499.99}, "timestamp": datetime.utcnow() - timedelta(hours=6)},
    {"customer_id": 3, "event_type": "search", "metadata": {"query": "4K TV under 1000"}, "timestamp": datetime.utcnow() - timedelta(minutes=30)},
    {"customer_id": 4, "event_type": "return_request", "metadata": {"order_id": 4, "reason": "damaged"}, "timestamp": datetime.utcnow() - timedelta(days=1)},
    {"customer_id": 5, "event_type": "page_view", "metadata": {"page": "/products/bose-qc45"}, "timestamp": datetime.utcnow() - timedelta(hours=3)},
]


def seed():
    db = get_db()

    print("Clearing existing data...")
    db.reviews.delete_many({})
    db.support_tickets.delete_many({})
    db.activity_logs.delete_many({})

    print("Inserting reviews...")
    db.reviews.insert_many(REVIEWS)

    print("Inserting support tickets...")
    db.support_tickets.insert_many(SUPPORT_TICKETS)

    print("Inserting activity logs...")
    db.activity_logs.insert_many(ACTIVITY_LOGS)

    print(f"MongoDB seed complete: {len(REVIEWS)} reviews, {len(SUPPORT_TICKETS)} tickets, {len(ACTIVITY_LOGS)} logs.")


if __name__ == "__main__":
    seed()

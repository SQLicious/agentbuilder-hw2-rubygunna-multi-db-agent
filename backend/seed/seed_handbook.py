from openai import OpenAI
import psycopg2
from backend.config import settings
from backend.seed.handbook_docs import HANDBOOK_SECTIONS


def chunk_text(text: str, max_chars: int = 600) -> list[str]:
    """Split text into chunks at paragraph boundaries."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) > max_chars and current:
            chunks.append(current.strip())
            current = para
        else:
            current = current + "\n\n" + para if current else para
    if current:
        chunks.append(current.strip())
    return chunks


def seed():
    client = OpenAI(api_key=settings.openai_api_key)
    conn = psycopg2.connect(settings.database_url)
    cur = conn.cursor()

    print("Clearing existing handbook chunks...")
    cur.execute("DELETE FROM handbook_chunks")

    for section_data in HANDBOOK_SECTIONS:
        section = section_data["section"]
        chunks = chunk_text(section_data["content"])
        print(f"Embedding {len(chunks)} chunks for section: {section}")

        for chunk in chunks:
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=chunk,
            )
            embedding = response.data[0].embedding
            cur.execute(
                "INSERT INTO handbook_chunks (section, content, embedding) VALUES (%s, %s, %s::vector)",
                (section, chunk, embedding),
            )

    conn.commit()
    cur.close()
    conn.close()
    print("Handbook seed complete.")


if __name__ == "__main__":
    seed()

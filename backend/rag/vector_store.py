from rag.embedder import embed_text

VECTOR_DB = []

def add_documents(chunks: list[str]):
    for chunk in chunks:
        VECTOR_DB.append({
            "text": chunk,
            "embedding": embed_text(chunk)
        })

def similarity_search(query: str, top_k: int = 3):
    query_emb = embed_text(query)

    scored = [
        (abs(query_emb - item["embedding"]), item["text"])
        for item in VECTOR_DB
    ]

    scored.sort(key=lambda x: x[0])
    return [text for _, text in scored[:top_k]]

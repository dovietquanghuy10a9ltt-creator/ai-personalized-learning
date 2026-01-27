from pathlib import Path
from rag.chunker import chunk_text
from rag.vector_store import add_documents

def load_documents():
    base_path = Path("data/uploads")

    for file in base_path.glob("*.txt"):
        text = file.read_text(encoding="utf-8")
        chunks = chunk_text(text)
        add_documents(chunks)

if __name__ == "__main__":
    load_documents()
    print("RAG data loaded")

from rag.vector_store import similarity_search

def retrieve_context(question: str) -> str:
    docs = similarity_search(question)
    return "\n".join(docs)

from langchain_groq import ChatGroq

# Dùng Llama 3 trên Groq: Siêu nhanh, Free, Không lo 429
llm = ChatGroq(
    temperature=0,
    model_name="llama-3.3-70b-versatile", 
    api_key="" # <--- Dán Key của bạn vào đây
)
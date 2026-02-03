import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv
load_dotenv()
# Dùng Llama 3 trên Groq
llm = ChatGroq(
    temperature=0,
    model_name="llama-3.1-8b-instant", 
    api_key= os.getenv("API")
)
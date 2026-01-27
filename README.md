# **🧠 AI-Based Personalized Learning Platform**
---
## 1️⃣ Giới thiệu

AI-Based Personalized Learning Platform là hệ thống học tập cá nhân hóa dựa trên AI Agent, cho phép:

Phân tích hành vi học tập của người học

Gợi ý nội dung học phù hợp với năng lực

Hỗ trợ hỏi–đáp thông minh dựa trên tài liệu học tập (RAG)

Hệ thống hướng tới việc cá nhân hóa lộ trình học, thay vì áp dụng cùng một nội dung cho mọi người học.
---
## 2️⃣ Mục tiêu & Phạm vi
🎯 Mục tiêu

Xây dựng hệ thống AI Agent hỗ trợ học tập cá nhân hóa

Ứng dụng Retrieval-Augmented Generation (RAG)

Tách biệt rõ Backend – Frontend – AI Logic

📌 Phạm vi

Người học tương tác qua giao diện web

Backend xử lý nghiệp vụ, AI Agent và dữ liệu

Chưa triển khai ở quy mô thương mại
---
## 3️⃣ Công nghệ sử dụng
Backend

Python 3

FastAPI – xây dựng REST API

SQLAlchemy – ORM

SQLite / PostgreSQL – cơ sở dữ liệu

Pydantic – validate dữ liệu

AI / Agent

AI Agent architecture

RAG (Retrieval-Augmented Generation)

Vector Database (ChromaDB)

Frontend

Next.js / React

TypeScript

TailwindCSS
---
## 4️⃣ Kiến trúc hệ thống
Frontend (Web)
      |
      v
FastAPI Backend
      |
      |-- API Layer
      |-- Business Logic
      |-- AI Agent
      |-- RAG Module
      |
      v
Database & Vector DB


➡️ Frontend chỉ giao tiếp với Backend
➡️ AI Agent được xử lý hoàn toàn ở Backend
---
## 5️⃣ Mô tả các thành phần chính
📁 backend/agents

Định nghĩa AI Agent

Quyết định hành vi phản hồi

Điều phối giữa LLM, RAG và dữ liệu người học

📁 backend/rag

Xử lý nhúng (embedding)

Truy xuất tài liệu liên quan

Cung cấp ngữ cảnh cho AI Agent

📁 backend/api

Định nghĩa các endpoint (REST API)

Giao tiếp với frontend

📁 backend/db

Kết nối cơ sở dữ liệu

ORM models

📁 frontend

Giao diện người dùng

Chat với AI

Upload tài liệu học tập
---
## 6️⃣ Quy trình hoạt động (Workflow)

Người học gửi câu hỏi / yêu cầu

Backend nhận request qua API

AI Agent phân tích ngữ cảnh người học

RAG truy xuất tài liệu liên quan

AI Agent tổng hợp & sinh câu trả lời

Kết quả trả về frontend
---
## 7️⃣ Cách cài đặt & chạy hệ thống
🔹 Backend
```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
🔹 Frontend
```
cd frontend
npm install
npm run dev
```
---
## 8️⃣ Hướng phát triển

Lưu lịch sử học tập và tiến độ người học

Multi-agent (Tutor Agent, Evaluator Agent)

Gợi ý lộ trình học tự động

Dashboard phân tích học tập


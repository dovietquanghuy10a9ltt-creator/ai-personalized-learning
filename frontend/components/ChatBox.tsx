"use client";
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

type Message = { id: number; role: 'user' | 'ai'; content: string; isThinking?: boolean };

export default function ChatBox() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'ai', content: "Chào bạn! Mình là Adaptive Agent. Hôm nay bạn muốn ôn tập nội dung gì?" }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // 1. Lưu input và hiển thị tin nhắn người dùng ngay lập tức
    const currentInput = input;
    const userMsg: Message = { id: Date.now(), role: 'user', content: currentInput };
    
    setMessages(prev => [...prev, userMsg]);
    setInput(""); // Xóa ô nhập liệu

    // 2. Hiển thị trạng thái "Đang suy nghĩ..."
    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: "...", isThinking: true }]);

    try {
      // 3. GỌI API BACKEND THẬT
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });

      if (!res.ok) {
        throw new Error("Server error");
      }

      const data = await res.json();

      // 4. Cập nhật câu trả lời từ Gemini
      setMessages(prev => {
        // Xóa tin nhắn "Đang suy nghĩ" đi
        const newMsgs = prev.filter(m => !m.isThinking);
        
        // Thêm câu trả lời thật vào
        return [...newMsgs, { 
          id: Date.now() + 2, 
          role: 'ai', 
          content: data.response || "Xin lỗi, tôi không có câu trả lời." 
        }];
      });

    } catch (error) {
      console.error("Lỗi kết nối:", error);
      // Xử lý lỗi nếu không gọi được backend
      setMessages(prev => {
        const newMsgs = prev.filter(m => !m.isThinking);
        return [...newMsgs, { 
          id: Date.now() + 3, 
          role: 'ai', 
          content: "⚠️ Lỗi kết nối: Không thể gọi đến Backend (Port 8000). Bạn hãy kiểm tra xem cửa sổ Terminal chạy Python còn mở không nhé!" 
        }];
      });
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start max-w-[80%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-orange-500'}`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
              }`}>
                {msg.isThinking ? (
                  <div className="flex gap-1 items-center animate-pulse">
                    <Sparkles size={14} /> <span>Đang suy nghĩ...</span>
                  </div>
                ) : (
                  // Hiển thị nội dung tin nhắn (hỗ trợ xuống dòng)
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi Adaptive Agent..."
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button type="submit" className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
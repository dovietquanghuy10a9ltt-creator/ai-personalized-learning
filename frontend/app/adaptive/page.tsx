"use client";
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SUBJECTS = [
  "Vật lý", 
  "Đại số tuyến tính", 
  "Giải tích", 
  "Tin học đại cương", 
  "Chuyên đề giới thiệu ngành CNTT",
  "Ngôn ngữ lập trình C++", 
  "Cấu trúc dữ liệu và giải thuật", 
  "Hệ cơ sở dữ liệu", 
  "Kiến trúc máy tính", 
  "Xác suất thống kê", 
  "Toán học tính toán", 
  "Mạng máy tính", 
  "PP lập trình hướng đối tượng", 
  "Kỹ thuật truyền thông", 
  "Cơ sở hệ điều hành"
];

export default function AdaptivePage() {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);

  // State cho Chat Tutor
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1. Lấy Lộ Trình (Generate Roadmap)
  const getRecommendations = async () => {
    setLoadingMap(true);
    setRecommendations([]); 
    setMessages([]); // Reset chat khi đổi môn
    try {
      const res = await axios.get(`http://localhost:8000/api/adaptive/recommend/${selectedSubject}`);
      if (Array.isArray(res.data.path)) {
        setRecommendations(res.data.path);
        
        // GIA SƯ CHÀO HỎI NGAY KHI CÓ LỘ TRÌNH
        setMessages([
          { role: "assistant", content: `Chào bạn! Tôi là gia sư AI môn ${selectedSubject}. Dựa trên kết quả kiểm tra, tôi đã soạn lộ trình bên trái cho bạn. Chúng ta bắt đầu học **Bước 1** ngay nhé?` }
        ]);
      }
    } catch (error) {
      alert("Chưa có dữ liệu kiểm tra để tạo lộ trình!");
    } finally {
      setLoadingMap(false);
    }
  };

  // 2. Chat với Gia sư
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoadingChat(true);

    try {
      // Gửi kèm Lộ trình (JSON string) để Gia sư biết đang dạy cái gì
      const roadmapString = JSON.stringify(recommendations);
      
      const res = await axios.post("http://localhost:8000/api/adaptive/chat", {
        subject: selectedSubject,
        message: userMsg,
        roadmap_context: roadmapString
      });

      setMessages(prev => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Lỗi kết nối với gia sư..." }]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[85vh]">
        
        {/* CỘT TRÁI: CẤU HÌNH & LỘ TRÌNH (Chiếm 7 phần) */}
        <div className="lg:col-span-7 flex flex-col gap-6 overflow-y-auto pr-2">
          
          {/* Header & Chọn môn */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-2xl">🧭</div>
              <h1 className="text-2xl font-bold text-gray-800">Lộ Trình Học Tập</h1>
            </div>
            
            <div className="flex gap-3">
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="flex-1 p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-orange-400"
              >
                {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              <button 
                onClick={getRecommendations}
                disabled={loadingMap}
                className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition shadow-md disabled:bg-gray-300 whitespace-nowrap"
              >
                {loadingMap ? "Đang tạo..." : "Tạo Lộ Trình"}
              </button>
            </div>
          </div>

          {/* Danh sách Lộ trình */}
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border-l-8 border-orange-500 relative overflow-hidden group hover:shadow-md transition">
                  <div className="absolute top-0 right-0 bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-bl-xl">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 mt-1">{item.topic}</h3>
                  <p className="text-gray-600 text-sm mb-3"><span className="font-semibold">Nhiệm vụ:</span> {item.action}</p>
                  <p className="text-xs text-gray-400 italic bg-gray-50 p-2 rounded">💡 {item.reason}</p>
                  
                  {/* Nút học ngay -> Gửi tin nhắn tự động vào Chat */}
                  <button 
                    onClick={() => {
                        setInput(`Tôi muốn bắt đầu học ${item.step}: ${item.topic}. Hãy hướng dẫn tôi!`);
                    }}
                    className="mt-3 text-orange-600 text-sm font-bold hover:underline"
                  >
                    👉 Bắt đầu học phần này
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border-dashed border-2 border-gray-300 text-gray-400 p-10 text-center">
              Chưa có lộ trình. Hãy chọn môn và bấm "Tạo Lộ Trình" để AI phân tích.
            </div>
          )}
        </div>

        {/* CỘT PHẢI: GIA SƯ AI CHAT (Chiếm 5 phần) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col h-full overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 bg-gray-900 text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse text-xs">🤖</div>
            <div>
              <h3 className="font-bold text-sm">Gia sư AI</h3>
              <p className="text-xs text-gray-400">Luôn sẵn sàng hỗ trợ bạn</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-10">
                Hãy tạo lộ trình để kích hoạt Gia sư AI...
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loadingChat && (
              <div className="flex justify-start">
                <div className="bg-gray-200 p-3 rounded-2xl rounded-tl-none text-xs text-gray-500 animate-pulse">
                  Gia sư đang soạn bài...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={recommendations.length > 0 ? "Hỏi gia sư về lộ trình..." : "Vui lòng tạo lộ trình trước..."}
              disabled={recommendations.length === 0}
              className="flex-1 p-3 bg-gray-100 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button 
              onClick={handleSendMessage}
              disabled={loadingChat || recommendations.length === 0}
              className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition"
            >
              ➤
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
"use client";
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';

const SUBJECTS = [
  "Vật lý", "Đại số tuyến tính", "Giải tích", "Tin học đại cương", 
  "Chuyên đề giới thiệu ngành CNTT", "Ngôn ngữ lập trình C++", 
  "Cấu trúc dữ liệu và giải thuật", "Hệ cơ sở dữ liệu", "Kiến trúc máy tính", 
  "Xác suất thống kê", "Toán học tính toán", "Mạng máy tính", 
  "PP lập trình hướng đối tượng", "Kỹ thuật truyền thông", "Cơ sở hệ điều hành"
];

export default function AdaptivePage() {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [analysisResult, setAnalysisResult] = useState<any>(null); // Lưu kết quả phân tích
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
    setAnalysisResult(null); 
    setMessages([]); // Reset chat khi đổi môn
    
    try {
      const res = await axios.get(`http://localhost:8000/api/adaptive/recommend/${selectedSubject}`);
      
      // Backend trả về: { analysis: "...", roadmap: ["..."] }
      if (res.data && res.data.roadmap) {
        setAnalysisResult(res.data);
        
        // GIA SƯ CHÀO HỎI NGAY KHI CÓ LỘ TRÌNH
        setMessages([
          { 
            role: "assistant", 
            content: `Chào bạn! Tôi là gia sư AI môn ${selectedSubject}.\n\nDựa trên bài kiểm tra gần nhất:\n"${res.data.analysis}"\n\nTôi đã soạn lộ trình bên trái. Bạn muốn bắt đầu từ đâu?` 
          }
        ]);
        toast.success("Đã tạo lộ trình học tập cá nhân hóa!");
      } else {
         toast.error("Dữ liệu trả về không đúng định dạng.");
      }
    } catch (error) {
      toast.error("Chưa có dữ liệu bài kiểm tra để phân tích. Hãy làm bài kiểm tra trước!");
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
      // Gửi kèm Lộ trình (JSON string) để Gia sư biết ngữ cảnh
      const contextString = analysisResult 
        ? `Phân tích: ${analysisResult.analysis}. Lộ trình: ${JSON.stringify(analysisResult.roadmap)}`
        : "Chưa có lộ trình.";

      const res = await axios.post("http://localhost:8000/api/adaptive/chat", {
        subject: selectedSubject,
        message: userMsg,
        roadmap_context: contextString
      });

      setMessages(prev => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Lỗi kết nối với gia sư..." }]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans">
      <Toaster />
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[85vh]">
        
        {/* CỘT TRÁI: CẤU HÌNH & LỘ TRÌNH (Chiếm 7 phần) */}
        <div className="lg:col-span-7 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Header & Chọn môn */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🧭</div>
              <div>
                 <h1 className="text-2xl font-black text-gray-800 tracking-tight">Lộ Trình Học Tập</h1>
                 <p className="text-sm text-gray-400 font-medium">AI phân tích lỗi sai & đề xuất giải pháp</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3">
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="flex-1 p-4 border border-gray-200 rounded-xl bg-gray-50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              <button 
                onClick={getRecommendations}
                disabled={loadingMap}
                className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loadingMap ? "Đang phân tích..." : "Tạo Lộ Trình"}
              </button>
            </div>
          </div>

          {/* Hiển thị Phân tích & Lộ trình */}
          {analysisResult ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
               {/* Box Phân tích */}
               <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                  <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                     🩺 Chẩn đoán điểm yếu
                  </h3>
                  <p className="text-gray-800 font-medium leading-relaxed">
                     {analysisResult.analysis}
                  </p>
               </div>

               {/* Danh sách các bước Roadmap */}
               <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-2">Kế hoạch khắc phục</h3>
                  {analysisResult.roadmap.map((step: string, idx: number) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-start group hover:border-indigo-300 transition-all">
                       <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                       </span>
                       <div className="flex-1">
                          <p className="text-gray-800 font-bold mt-1">{step}</p>
                          <button 
                             onClick={() => setInput(`Hãy hướng dẫn tôi chi tiết về bước ${idx + 1}: "${step}"`)}
                             className="text-xs font-bold text-indigo-500 mt-2 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                             👉 Học ngay cùng Gia sư
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 p-10 text-center min-h-[300px]">
              <div className="text-6xl mb-4 opacity-50">🤖</div>
              <p className="font-bold">Chưa có dữ liệu phân tích.</p>
              <p className="text-sm mt-2">Chọn môn và bấm nút để AI tìm ra lỗ hổng kiến thức của bạn.</p>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: GIA SƯ AI CHAT (Chiếm 5 phần) */}
        <div className="lg:col-span-5 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col h-full overflow-hidden">
          {/* Chat Header */}
          <div className="p-5 bg-white border-b border-gray-100 flex items-center gap-4">
            <div className="relative">
               <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg shadow-lg">
                  🎓
               </div>
               <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Gia sư AI</h3>
              <p className="text-xs text-gray-400 font-medium">Đang trực tuyến • Hỗ trợ 24/7</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50/50 scroll-smooth">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                <p>👋 Xin chào! Tôi có thể giúp gì cho bạn?</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'
                }`}>
                  {/* Hỗ trợ xuống dòng cho tin nhắn của AI */}
                  {msg.content.split('\n').map((line, i) => (
                     <p key={i} className={`min-h-[1rem] ${i > 0 ? 'mt-1' : ''}`}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            
            {loadingChat && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-none text-xs text-gray-500 flex gap-2 items-center">
                   <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                   <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                   <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={analysisResult ? "Hỏi thêm về lộ trình..." : "Tạo lộ trình trước khi chat..."}
              disabled={!analysisResult}
              className="flex-1 p-4 bg-gray-100 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button 
              onClick={handleSendMessage}
              disabled={loadingChat || !analysisResult}
              className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-200"
            >
              ➤
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
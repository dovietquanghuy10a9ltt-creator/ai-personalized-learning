"use client";
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { 
  Compass, Zap, Send, Bot, User, Map, 
  Sparkles, MessageSquare, BookOpen, GraduationCap 
} from 'lucide-react';

const SUBJECTS = [
  "Vật lý", "Đại số tuyến tính", "Giải tích", "Tin học đại cương", 
  "Chuyên đề giới thiệu ngành CNTT", "Ngôn ngữ lập trình C++", 
  "Cấu trúc dữ liệu và giải thuật", "Hệ cơ sở dữ liệu", "Kiến trúc máy tính", 
  "Xác suất thống kê", "Toán học tính toán", "Mạng máy tính", 
  "PP lập trình hướng đối tượng", "Kỹ thuật truyền thông", "Cơ sở hệ điều hành"
];

export default function AdaptivePage() {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[11]);
  const [analysisResult, setAnalysisResult] = useState<any>(null); 
  const [loadingMap, setLoadingMap] = useState(false);

  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingChat]);

  // 1. TẠO LỘ TRÌNH
  const getRecommendations = async () => {
    setLoadingMap(true);
    setAnalysisResult(null); 
    setMessages([]);
    
    try {
      const res = await axios.get(`http://localhost:8000/api/adaptive/recommend/${selectedSubject}`);
      const data = res.data;
      if (data) {
        setAnalysisResult(data);
        setMessages([
          { 
            role: "assistant", 
            content: `Chào bạn! Tôi là Gia sư AI môn **${selectedSubject}**. \n\nLộ trình vá lỗ hổng kiến thức của bạn đã sẵn sàng bên tay trái. Chúng ta bắt đầu ngay nhé?` 
          }
        ]);
        toast.success("Đã tạo lộ trình thành công!");
      }
    } catch (error) {
      toast.error("Chưa có dữ liệu bài test. Hãy làm bài kiểm tra trước!");
    } finally {
      setLoadingMap(false);
    }
  };

  // 2. CHAT VỚI GIA SƯ
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoadingChat(true);

    try {
      const contextString = analysisResult 
        ? `Lộ trình hiện tại: ${JSON.stringify(analysisResult)}`
        : "Học viên chưa có lộ trình.";

      const res = await axios.post("http://localhost:8000/api/adaptive/chat", {
        subject: selectedSubject,
        message: userMsg,
        roadmap_context: contextString
      });

      setMessages(prev => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Hệ thống đang bận, vui lòng thử lại sau." }]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    
    <div className="fixed inset-0 bg-[#F8FAFC] font-sans text-slate-800 flex flex-col pt-[80px] pb-4 px-6 overflow-hidden">
      <Toaster position="top-center" />
      
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 w-full max-w-[1600px] mx-auto">
        
        {/* === CỘT TRÁI: LỘ TRÌNH === */}
        <div className="flex flex-col gap-4 h-full min-h-0">
          
          {/* 1. Control Box */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shadow-sm border border-orange-100">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Cá nhân hóa lộ trình</h2>
                <p className="text-[10px] text-slate-500 font-medium">Dữ liệu từ bài kiểm tra năng lực</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select 
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-orange-500 appearance-none cursor-pointer transition-all shadow-inner"
                >
                  {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
                <BookOpen className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              
              <button 
                onClick={getRecommendations}
                disabled={loadingMap}
                className="px-4 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-black transition-all flex items-center gap-1.5 disabled:opacity-70 shadow-md active:scale-95"
              >
                {loadingMap ? "Đang tạo..." : <><Sparkles className="w-3.5 h-3.5 text-orange-400" /> Tạo lộ trình</>}
              </button>
            </div>
          </div>

          {/* 2. Danh sách Lộ trình */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Kế hoạch đề xuất
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
              {analysisResult && Array.isArray(analysisResult) ? (
                analysisResult.map((item: any, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => setInput(`Hãy dạy tôi chi tiết về chủ đề: ${item.topic}`)}
                    className="group p-4 rounded-xl border border-slate-100 hover:border-orange-400 hover:bg-orange-50/30 cursor-pointer transition-all relative overflow-hidden bg-white"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="w-10 h-10 text-orange-500" />
                    </div>
                    <div className="relative z-10">
                        <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md text-[9px] font-black uppercase tracking-widest mb-1.5">
                          GIAI ĐOẠN {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2">{item.topic}</h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-3">{item.action}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
                  <GraduationCap className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-xs font-bold text-slate-400">Chưa có lộ trình</p>
                  <p className="text-[10px] text-slate-400 mt-1">Chọn môn & Bấm tạo lộ trình</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === CỘT PHẢI: GIA SƯ CHAT === */}
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden h-full min-h-0">
          
          {/* 1. Header */}
          <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Gia sư AI</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Trực tuyến</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-xs font-bold text-slate-400">Bắt đầu trò chuyện để học tập hiệu quả hơn</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 border border-indigo-200 mt-1">
                      <Bot className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] p-3.5 rounded-xl text-xs md:text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                  }`}>
                    {/* SỬ DỤNG REACT MARKDOWN ĐỂ RENDER */}
                    {msg.role === 'assistant' ? (
                       <ReactMarkdown 
                          components={{
                             strong: ({node, ...props}) => <span className="font-bold text-indigo-700" {...props} />,
                             ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                             ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                             li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
                             p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                             h1: ({node, ...props}) => <h1 className="text-lg font-bold my-2" {...props} />,
                             h2: ({node, ...props}) => <h2 className="text-base font-bold my-2" {...props} />,
                          }}
                       >
                          {msg.content}
                       </ReactMarkdown>
                    ) : (
                       // Tin nhắn của User
                       <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center shrink-0 border border-slate-300 mt-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {loadingChat && (
              <div className="flex justify-start gap-3">
                 <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                 </div>
                 <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl rounded-tl-none shadow-sm flex gap-1 items-center">
                    <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 3. Input */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-50 transition-all shadow-inner">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={analysisResult ? "Nhập câu hỏi..." : "Vui lòng tạo lộ trình trước..."}
                disabled={!analysisResult || loadingChat}
                className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-slate-800 px-3 placeholder-slate-400 disabled:opacity-50 h-8"
              />
              <button 
                onClick={handleSendMessage}
                disabled={loadingChat || !analysisResult || !input.trim()}
                className="w-8 h-8 bg-indigo-600 text-white rounded-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center active:scale-95"
              >
                <Send className="w-4 h-4 pl-0.5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
"use client";
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { 
  Compass, Zap, Send, Bot, User, Map, 
  Sparkles, MessageSquare, BookOpen, GraduationCap,
  UserPlus, Loader2, CheckCircle2
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
  
  // --- STATE QUẢN LÝ LỚP HỌC ---
  const [userId, setUserId] = useState<number | null>(null);
  const [userClass, setUserClass] = useState<any>(null);
  const [classCode, setClassCode] = useState("");
  const [joining, setJoining] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) {
      setUserId(parseInt(id));
      fetchUserStatus(parseInt(id));
    }
    scrollToBottom();
  }, [messages, loadingChat]);

  // Lấy thông tin lớp học của học sinh
  const fetchUserStatus = async (id: number) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/auth/me/${id}`);
      if (res.data.enrolled_class) {
        setUserClass(res.data.enrolled_class);
      }
    } catch (e) {
      console.error("Lỗi tải thông tin lớp");
    }
  };

  // Tham gia lớp học
  const handleJoinClass = async () => {
    if (!classCode.trim() || !userId) return;
    setJoining(true);
    try {
      await axios.post("http://localhost:8000/api/classroom/join", null, {
        params: { student_id: userId, class_id: classCode }
      });
      toast.success("Tham gia lớp học thành công!");
      fetchUserStatus(userId);
      setClassCode("");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Mã lớp không hợp lệ");
    } finally {
      setJoining(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getRecommendations = async () => {
    setLoadingMap(true);
    setAnalysisResult(null); 
    setMessages([]);
    
    try {
      const res = await axios.get(`http://localhost:8000/api/adaptive/recommend/${selectedSubject}`);
      if (res.data) {
        setAnalysisResult(res.data);
        setMessages([
          { 
            role: "assistant", 
            content: `Chào bạn! Tôi là Gia sư AI môn **${selectedSubject}**. \n\nLộ trình vá lỗ hổng của bạn đã sẵn sàng. Bạn có thể hỏi tôi bất cứ điều gì dựa trên tài liệu lớp học nhé!` 
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

  const handleSendMessage = async () => {
    if (!input.trim() || !userId) return;
    
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
        roadmap_context: contextString,
        user_id: userId // Gửi kèm userId để Backend lọc tài liệu theo lớp
      });

      setMessages(prev => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "AI đang bận, vui lòng thử lại sau." }]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F8FAFC] font-sans text-slate-800 flex flex-col pt-[80px] pb-4 px-6 overflow-hidden">
      <Toaster position="top-center" />
      
      {/* 1. TOP BAR: THÔNG TIN LỚP HỌC */}
      <div className="max-w-[1600px] w-full mx-auto mb-4">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          {!userClass ? (
            <div className="flex items-center gap-4 w-full">
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 font-black text-[10px] uppercase">
                <UserPlus size={14} /> Chưa có lớp học
              </div>
              <div className="flex gap-2 flex-1 max-w-sm">
                <input 
                  type="text" 
                  placeholder="Nhập mã lớp để mở khóa tài liệu..."
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  className="flex-1 bg-slate-50 border-none outline-none text-[11px] font-bold px-4 py-2 rounded-xl focus:ring-2 ring-indigo-500 transition-all"
                />
                <button 
                  onClick={handleJoinClass}
                  disabled={joining}
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-black disabled:opacity-50"
                >
                  {joining ? <Loader2 className="animate-spin" size={14} /> : "Tham gia"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 border border-emerald-100">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Lớp học hiện tại</p>
                  <p className="text-sm font-black text-slate-800">{userClass.name} <span className="text-indigo-600 font-medium ml-2 text-xs">GV: {userClass.teacher_name}</span></p>
                </div>
              </div>
              <div className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
                AI đã sẵn sàng tri thức lớp học
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 w-full max-w-[1600px] mx-auto">
        {/* === CỘT TRÁI: LỘ TRÌNH === */}
        <div className="flex flex-col gap-4 h-full min-h-0">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-100">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase">Lộ trình học tập</h2>
                  <p className="text-[10px] text-slate-500 font-medium tracking-tight">Cá nhân hóa theo năng lực của bạn</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="flex-1 py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-orange-500 appearance-none cursor-pointer"
              >
                {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              <button 
                onClick={getRecommendations}
                disabled={loadingMap}
                className="px-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all flex items-center gap-2"
              >
                {loadingMap ? <Loader2 className="animate-spin" size={14} /> : <><Sparkles size={14} className="text-orange-400" /> Tạo lộ trình</>}
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {analysisResult && Array.isArray(analysisResult) ? (
                analysisResult.map((item: any, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => setInput(`Hãy dạy tôi về: ${item.topic}`)}
                    className="p-4 rounded-2xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/20 cursor-pointer transition-all bg-white shadow-sm"
                  >
                    <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md text-[9px] font-black uppercase mb-2">Bước {idx + 1}</span>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">{item.topic}</h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.action}</p>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                  <GraduationCap className="w-12 h-12 mb-3" />
                  <p className="text-xs font-bold">Vui lòng tạo lộ trình để bắt đầu</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === CỘT PHẢI: GIA SƯ CHAT === */}
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden h-full min-h-0">
          <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase">Gia sư AI</h3>
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse">Đang trực tuyến</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                <MessageSquare size={48} className="mb-4" />
                <p className="text-xs font-bold uppercase">Không gian tri thức AI</p>
                <p className="text-[10px] font-medium mt-1">Sử dụng tài liệu lớp học để giải đáp cho bạn</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                      <Bot size={16} className="text-indigo-600" />
                    </div>
                  )}
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown 
                        components={{
                          strong: ({...props}) => <span className="font-bold text-indigo-700" {...props} />,
                          ul: ({...props}) => <ul className="list-disc pl-4 space-y-2 my-3" {...props} />,
                          p: ({...props}) => <p className="mb-3 last:mb-0" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : <p className="font-medium">{msg.content}</p>}
                  </div>
                </div>
              ))
            )}
            {loadingChat && (
              <div className="flex justify-start gap-2 items-center text-indigo-600 font-black text-[10px] animate-pulse">
                <Loader2 className="animate-spin" size={12} /> AI ĐANG TRUY XUẤT TÀI LIỆU LỚP HỌC...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={!userClass ? "Hãy tham gia lớp học trước..." : "Hỏi AI về bài giảng hôm nay..."}
                disabled={!userClass || loadingChat}
                className="flex-1 bg-transparent border-none outline-none text-[13px] font-medium px-4 h-10"
              />
              <button 
                onClick={handleSendMessage}
                disabled={loadingChat || !userClass || !input.trim()}
                className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all disabled:opacity-30"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { 
  Send, Bot, Map, Sparkles, MessageSquare, GraduationCap,
  UserPlus, Loader2, CheckCircle2, Lock, PlayCircle, Download
} from 'lucide-react';

const SUBJECTS = [
  "Vật lý", "Đại số tuyến tính", "Giải tích", "Tin học đại cương", 
  "Chuyên đề giới thiệu ngành CNTT", "Ngôn ngữ lập trình C++", 
  "Cấu trúc dữ liệu và giải thuật", "Hệ cơ sở dữ liệu", "Kiến trúc máy tính", 
  "Xác suất thống kê", "Toán học tính toán", "Mạng máy tính", 
  "PP lập trình hướng đối tượng", "Kỹ thuật truyền thông", "Cơ sở hệ điều hành"
];

export default function AdaptiveLearningPage() {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[11]);
  
  const [roadmap, setRoadmap] = useState<any[]>([]);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(1); 
  const [learnerLevel, setLearnerLevel] = useState("BEGINNER");

  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [activeLessonContext, setActiveLessonContext] = useState<string>("");
  
  const [userId, setUserId] = useState<number | null>(null);
  const [userClass, setUserClass] = useState<any>(null);
  const [classCode, setClassCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [triggerInitialMessage, setTriggerInitialMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // CƠ CHẾ TỰ ĐỘNG KHỞI TẠO TỪ URL (AUTO-LOAD)
  // =========================================================================
  useEffect(() => {
    const id = localStorage.getItem("userId") || localStorage.getItem("user_id");
    if (id) {
      const uid = parseInt(id);
      setUserId(uid);
      fetchUserStatus(uid);

      // Đọc URL xem có truyền môn học từ trang Kết quả/Dashboard sang không
      const params = new URLSearchParams(window.location.search);
      const urlSubject = params.get("subject");
      const autoStart = params.get("auto_start") === "true"; // Lệnh tự động mở chat
      
      let targetSubject = selectedSubject;
      if (urlSubject) {
          targetSubject = urlSubject;
          setSelectedSubject(urlSubject); // Tự động đổi dropdown
      }

      // TỰ ĐỘNG TẢI LỘ TRÌNH 
      autoLoadRoadmap(uid, targetSubject, autoStart);
    }
  }, []);

  const autoLoadRoadmap = async (uid: number, subj: string, autoStart: boolean = false) => {
    setLoadingRoadmap(true);
    setRoadmap([]); 
    setMessages([]);
    setActiveLessonContext("");
    
    try {
      const res = await axios.get(`http://localhost:8000/api/assessment/roadmap/${subj}?user_id=${uid}`);
      
      if (res.data && res.data.has_roadmap) {
         const loadedRoadmap = res.data.roadmap_data;
         const currentSess = res.data.current_session;
         
         setRoadmap(loadedRoadmap);
         setCurrentSessionIndex(currentSess); 
         setLearnerLevel(res.data.level_assigned.toUpperCase());
         
         // Nếu truyền link kèm auto_start=true -> Mở Chat AI luôn vào bài đang học
         if (autoStart && loadedRoadmap.length > 0) {
             const lesson = loadedRoadmap.find((l: any) => l.session === currentSess) || loadedRoadmap[0];
             // Delay nhẹ để giao diện render xong roadmap
             setTimeout(() => {
                 handleStartTutor(lesson);
             }, 300);
         }
      } else if (!autoStart) {
         // Chỉ báo lỗi nếu người dùng tự bấm nút tải
         toast.error("Bạn chưa làm bài đánh giá năng lực môn này. Hãy quay lại trang Kiểm Tra nhé!");
      }
    } catch (error) {
      if (!autoStart) toast.error("Lỗi khi tải chương trình học.");
    } finally {
      setLoadingRoadmap(false);
    }
  };

  // Nút bấm "Tải Lộ Trình" thủ công sẽ dùng lại hàm này
  const handleLoadRoadmap = () => {
    if (!userId) {
      toast.error("Vui lòng đăng nhập lại!");
      return;
    }
    autoLoadRoadmap(userId, selectedSubject, false);
    toast.success("Đã tải chương trình học!");
  };
  // =========================================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingChat]);

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

  const handleStartTutor = (lesson: any) => {
    const context = `BUỔI ${lesson.session}: ${lesson.topic} - Mô tả: ${lesson.description}`;
    setActiveLessonContext(context);
    // Xóa chat cũ và đặt câu chào đầu tiên
    setMessages([{ role: 'user', content: "Chào AI, hãy bắt đầu bài học hôm nay nhé." }]);
    setTriggerInitialMessage(true);
  };

  useEffect(() => {
    if (triggerInitialMessage && activeLessonContext) {
      // Tin nhắn đầu tiên: lịch sử gửi lên là mảng rỗng
      sendChatMessage("Chào AI, hãy bắt đầu bài học hôm nay nhé.", activeLessonContext, []);
      setTriggerInitialMessage(false);
    }
  }, [triggerInitialMessage, activeLessonContext]);

  const handleTakeTest = (lesson: any) => {
    toast.success(`Đang chuyển sang bài kiểm tra Buổi ${lesson.session}...`);
    setTimeout(() => {
        window.location.href = '/assessment';
    }, 1000);
  };

  // --- HÀM GỬI TIN NHẮN: FIX THỨ TỰ HIỂN THỊ ---
  const handleSendMessage = async () => {
    if (!input.trim() || !userId || !activeLessonContext) return;
    
    const userMsg = input.trim();
    setInput("");

    // 1. Cập nhật State để tin nhắn người dùng hiện ngay lập tức
    const updatedHistory = [...messages, { role: "user", content: userMsg }];
    setMessages(updatedHistory);

    // 2. Gửi đi kèm toàn bộ lịch sử (đã có tin nhắn vừa gõ) để AI xử lý
    await sendChatMessage(userMsg, activeLessonContext, updatedHistory);
  };

  const sendChatMessage = async (message: string, context: string, chatHistory: {role: string, content: string}[]) => {
    setLoadingChat(true);
    try {
      const currentId = localStorage.getItem("userId") || localStorage.getItem("user_id");
      
      const res = await axios.post("http://localhost:8000/api/adaptive/chat", {
        subject: selectedSubject,
        message: message,
        roadmap_context: context,
        user_id: Number(currentId),
        history: chatHistory // Gửi lịch sử để AI có trí nhớ
      });

      // 3. Nối phản hồi của AI vào sau tin nhắn User đã hiện
      setMessages(prev => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch (e: any) {
      console.error("LỖI CHAT API:", e);
      const realError = e.response?.data?.detail || e.message || "Lỗi đường truyền API";
      const errorString = typeof realError === 'object' ? JSON.stringify(realError) : realError;
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `❌ **Hệ thống báo lỗi:** ${errorString}` 
      }]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F8FAFC] font-sans text-slate-800 flex flex-col pt-[80px] pb-4 px-6 overflow-hidden">
      <Toaster position="top-center" />

      <div className="max-w-[1600px] w-full mx-auto mb-4 shrink-0">
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
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 border border-emerald-100 shadow-sm">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Lớp học hiện tại</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{userClass.name} <span className="text-indigo-600 font-medium ml-2 text-xs">GV: {userClass.teacher_name}</span></p>
                </div>
              </div>
              <div className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">
                AI đã sẵn sàng tri thức lớp học
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0 w-full max-w-[1600px] mx-auto">
        
        <div className="xl:col-span-7 flex flex-col gap-4 h-full min-h-0">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 shadow-sm">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase">Chương trình học</h2>
                <p className="text-[10px] text-slate-500 font-medium tracking-tight mt-0.5">Tải lộ trình đã được thiết lập</p>
              </div>
            </div>
            
            <div className="flex w-full sm:w-auto gap-2">
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="flex-1 sm:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500 appearance-none cursor-pointer transition-all"
              >
                {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              <button 
                onClick={handleLoadRoadmap}
                disabled={loadingRoadmap || !userClass}
                className="px-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
              >
                {loadingRoadmap ? <Loader2 className="animate-spin" size={14} /> : <><Download size={14} className="text-indigo-300" /> Tải lộ trình</>}
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 relative">
             {!userClass ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <UserPlus className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">Bạn cần tham gia lớp học</p>
                 </div>
             ) : roadmap.length === 0 && !loadingRoadmap ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <GraduationCap className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">Chọn môn và tải lộ trình</p>
                </div>
             ) : loadingRoadmap ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-600">
                    <Loader2 className="w-10 h-10 mb-4 animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Đang lấy dữ liệu bài học...</p>
                </div>
             ) : (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                   
                   <div className="flex justify-end mb-4 relative z-10">
                      <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-full shadow-sm ring-1 ring-indigo-100">
                         Trình độ: {learnerLevel}
                      </span>
                   </div>

                   {roadmap.map((lesson, idx) => {
                      const isUnlocked = lesson.session <= currentSessionIndex;
                      const isCurrent = lesson.session === currentSessionIndex;
                      
                      return (
                        <div key={idx} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-500 ${!isUnlocked ? 'opacity-50 grayscale select-none' : ''}`}>
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 
                               ${isCurrent ? 'bg-indigo-600 border-indigo-100 text-white' : isUnlocked ? 'bg-emerald-500 border-emerald-100 text-white' : 'bg-slate-100 border-white text-slate-400'}`}>
                                {isUnlocked && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : <span className="font-black text-xs">{lesson.session}</span>}
                            </div>
                            
                            <div className={`w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border shadow-sm transition-all
                                ${isCurrent ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-50' : isUnlocked ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex justify-between items-start mb-2">
                                   <h3 className={`font-black text-sm ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>{lesson.topic}</h3>
                                   {isCurrent && <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded uppercase tracking-wider shadow-sm shrink-0 ml-2">Đang học</span>}
                                   {!isUnlocked && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />}
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-4 line-clamp-2" title={lesson.description}>{lesson.description}</p>
                                
                                {isUnlocked && (
                                   <div className="flex flex-col xl:flex-row gap-2">
                                      <button 
                                        onClick={() => handleStartTutor(lesson)}
                                        className="flex-1 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 hover:bg-indigo-600 transition-colors shadow-md"
                                      >
                                         <Bot className="w-3.5 h-3.5" /> Học với AI
                                      </button>
                                      <button 
                                        onClick={() => handleTakeTest(lesson)}
                                        className="flex-1 px-3 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                                      >
                                         <PlayCircle className="w-3.5 h-3.5" /> Test qua bài
                                      </button>
                                   </div>
                                )}
                            </div>
                        </div>
                      )
                   })}
                </div>
             )}
          </div>
        </div>

        <div className="xl:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full min-h-0">
          <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-indigo-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Gia sư AI</h3>
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Đang trực tuyến
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                <MessageSquare size={48} className="mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest">Không gian tri thức AI</p>
                <p className="text-[10px] font-medium mt-1">Bấm "Học với AI" ở bài học bên trái để bắt đầu</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 bg-indigo-100 border border-indigo-200 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                      <Bot size={16} className="text-indigo-600" />
                    </div>
                  )}
                  <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown 
                        components={{
                          strong: ({...props}) => <span className="font-bold text-indigo-700" {...props} />,
                          ul: ({...props}) => <ul className="list-disc pl-4 space-y-1.5 my-2" {...props} />,
                          p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
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
              <div className="flex justify-start">
                 <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-150"></span>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <div className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 ring-indigo-50 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={!activeLessonContext ? "Vui lòng chọn bài học trước..." : "Trả lời Gia sư AI..."}
                disabled={!activeLessonContext || loadingChat}
                className="flex-1 bg-transparent border-none outline-none text-[13px] font-medium px-3 h-10 disabled:opacity-50"
              />
              <button 
                onClick={handleSendMessage}
                disabled={loadingChat || !activeLessonContext || !input.trim()}
                className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all disabled:opacity-30 disabled:active:scale-100 shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
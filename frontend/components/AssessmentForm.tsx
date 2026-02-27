"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Bot, ChevronRight, GraduationCap } from 'lucide-react';

const SUBJECTS = [
  { id: 1, name: "Vật lý", icon: "⚛️" },
  { id: 2, name: "Đại số tuyến tính", icon: "📐" },
  { id: 3, name: "Giải tích", icon: "📉" },
  { id: 4, name: "Tin học đại cương", icon: "💻" },
  { id: 5, name: "Chuyên đề giới thiệu ngành CNTT", icon: "🌐" },
  { id: 6, name: "Ngôn ngữ lập trình C++", icon: "⚙️" },
  { id: 7, name: "Cấu trúc dữ liệu và giải thuật", icon: "🧩" },
  { id: 8, name: "Hệ cơ sở dữ liệu", icon: "🗄️" },
  { id: 9, name: "Kiến trúc máy tính", icon: "🏗️" },
  { id: 10, name: "Xác suất thống kê", icon: "🎲" },
  { id: 11, name: "Toán học tính toán", icon: "🔢" },
  { id: 12, name: "Mạng máy tính", icon: "🔗" },
  { id: 13, name: "PP lập trình hướng đối tượng", icon: "📦" },
  { id: 14, name: "Kỹ thuật truyền thông", icon: "📡" },
  { id: 15, name: "Cơ sở hệ điều hành", icon: "🖥️" },
];

const LABELS = ['A', 'B', 'C', 'D'];
const STORAGE_KEY = 'quiz_auto_save_data';

const AssessmentForm = () => {
  const [step, setStep] = useState<'select_subject' | 'quiz' | 'result'>('select_subject');
  const [subject, setSubject] = useState("");
  const [sessionTopic, setSessionTopic] = useState(""); 
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{[key: number]: string}>({}); 
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  
  const [resultData, setResultData] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null); 
  const [reviewMode, setReviewMode] = useState(false); 
  const [currentIndex, setCurrentIndex] = useState(0);

  const getUserId = () => {
    if (typeof window === "undefined") return null;
    const id = localStorage.getItem("userId") || localStorage.getItem("user_id");
    return id ? parseInt(id) : null;
  };

  const getCleanErrorMessage = (error: any) => {
    const raw = error.response?.data?.detail;
    if (typeof raw === 'object') return raw[0]?.msg || raw.msg || "Lỗi dữ liệu";
    return raw || "Lỗi hệ thống";
  };

  const fetchRoadmap = async (selectedSub: string) => {
    const userId = getUserId();
    if (!userId) return;
    try {
      const res = await axios.get(`http://localhost:8000/api/assessment/roadmap/${selectedSub}?user_id=${userId}`);
      if (res.data.has_roadmap) {
        setRoadmap(res.data);
      }
    } catch (error) {
      console.error("Lỗi lấy lộ trình:", error);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSubject = params.get("subject");
    const urlTopic = params.get("topic");
    const urlLevel = params.get("level");

    if (urlSubject && urlTopic && urlLevel && step === 'select_subject') {
      handleStartSessionQuiz(urlSubject, urlTopic, urlLevel);
    }
  }, []);

  useEffect(() => {
    const currentUserId = getUserId();
    const savedData = localStorage.getItem(STORAGE_KEY);
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.userId !== currentUserId) {
          localStorage.removeItem(STORAGE_KEY);
          setAnswers({});
          setTimer(0);
        } else if (parsed.step === 'quiz' && parsed.questions?.length > 0) {
          setSubject(parsed.subject);
          setSessionTopic(parsed.sessionTopic || "");
          setQuestions(parsed.questions);
          setAnswers(parsed.answers || {});
          setTimer(parsed.timer || 0);
          setStep('quiz');
          toast.success("Đã khôi phục bài làm của bạn!");
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (step === 'quiz' && questions.length > 0) {
      const dataToSave = { 
        step: 'quiz', 
        subject,
        sessionTopic,
        questions, 
        answers, 
        timer, 
        userId: getUserId() 
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [step, subject, sessionTopic, questions, answers, timer]);

  useEffect(() => {
    let interval: any;
    if (step === 'quiz' && !loading) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, loading]);

  useEffect(() => {
    if (step === 'quiz') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      window.history.pushState(null, "", window.location.href);
      const handlePopState = () => {
        if (window.confirm("⚠️ CẢNH BÁO: Bạn đang làm bài thi. Nếu thoát, bài làm sẽ bị xóa.")) {
          localStorage.removeItem(STORAGE_KEY);
          window.history.replaceState(null, "", window.location.pathname);
          setStep('select_subject');
        } else {
          window.history.pushState(null, "", window.location.href);
        }
      };
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [step]);

  const cleanOptionText = (text: string) => text.replace(/^[A-D][\.\:\-\)]\s*/, "").trim();
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleSafeExit = () => {
    if (Object.keys(answers).length > 0) {
      if (window.confirm("⚠️ Thoát bây giờ bài làm sẽ bị xóa. Xác nhận thoát?")) {
        localStorage.removeItem(STORAGE_KEY);
        window.history.replaceState(null, "", window.location.pathname);
        setStep('select_subject');
        setAnswers({});
        setTimer(0);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      window.history.replaceState(null, "", window.location.pathname);
      setStep('select_subject');
    }
  };

  const handleSelectSubject = async (selectedSub: string) => {
    const userId = getUserId();
    if (!userId) { toast.error("Vui lòng đăng nhập lại."); return; }

    setSubject(selectedSub);
    setSessionTopic(""); 
    setLoading(true);
    setAnswers({});
    setTimer(0);
    setResultData(null);
    setRoadmap(null);
    setReviewMode(false);
    setCurrentIndex(0);
    localStorage.removeItem(STORAGE_KEY);

    try {
      const res = await axios.post("http://localhost:8000/api/assessment/generate", { 
        subject: selectedSub,
        user_id: userId 
      });
      if (res.data.questions && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
        setStep('quiz');
        toast.dismiss();
        toast.success(`Khởi tạo bài kiểm tra đánh giá năng lực môn ${selectedSub}`);
      }
    } catch (error: any) {
      toast.error(getCleanErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleStartSessionQuiz = async (urlSubject: string, urlTopic: string, urlLevel: string) => {
    const userId = getUserId();
    if (!userId) { toast.error("Vui lòng đăng nhập lại."); return; }

    setSubject(urlSubject);
    setSessionTopic(urlTopic); 
    setLoading(true);
    setAnswers({});
    setTimer(0);
    setResultData(null);
    setRoadmap(null);
    setReviewMode(false);
    setCurrentIndex(0);
    localStorage.removeItem(STORAGE_KEY);

    try {
      const res = await axios.post("http://localhost:8000/api/assessment/generate-session", { 
        subject: urlSubject,
        user_id: userId,
        session_topic: urlTopic,
        level: urlLevel
      });
      
      if (res.data.questions && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
        setStep('quiz');
        toast.dismiss();
        toast.success(`Khởi tạo bài kiểm tra: ${urlTopic}`);
      }
    } catch (error: any) {
      toast.error(getCleanErrorMessage(error));
      setStep('select_subject'); 
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const userId = getUserId();
    if (!userId) return;
    setLoading(true);
    const submissionData = {
      subject,
      user_id: userId,
      answers: Object.entries(answers).map(([qid, opt]) => ({
        question_id: Number(qid),
        selected_option: opt
      })),
      duration_seconds: timer,
      is_session_quiz: sessionTopic !== "" 
    };

    try {
      const res = await axios.post("http://localhost:8000/api/assessment/submit", submissionData);
      setResultData(res.data);
      await fetchRoadmap(subject); 
      setStep('result');
      localStorage.removeItem(STORAGE_KEY);
      window.history.replaceState(null, "", window.location.pathname);
      toast.success("Nộp bài thành công!");
    } catch (error: any) {
      toast.error(getCleanErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAndSubmit = () => {
    const missingIndexes = questions.map((q, idx) => (answers[q.id] ? null : idx + 1)).filter((idx) => idx !== null);
    if (missingIndexes.length > 0) {
      toast.error(`🛑 Bạn chưa làm câu: ${missingIndexes.join(", ")}`);
      return; 
    }
    if (window.confirm("✅ Xác nhận nộp bài?")) handleSubmit();
  };

  const handleGoToAdaptive = () => {
    window.location.href = `/adaptive?subject=${encodeURIComponent(subject)}&auto_start=true`;
  };

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const isPassed = resultData?.is_passed !== false;
  const progressVal = Number(roadmap?.progress_percent);
  const displayProgress = isNaN(progressVal) ? 0 : Math.round(progressVal);

  return (
    <div key={getUserId()} className="min-h-screen bg-gray-50 py-10 px-4 font-sans text-slate-800">

      {step === 'select_subject' && (
        <div className="max-w-5xl mx-auto p-4 text-center">
          <h2 className="text-2xl font-black text-gray-800 mb-8 uppercase tracking-tighter">Hệ thống học tập thích ứng</h2>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-blue-600 font-bold animate-pulse">AI đang phân tích tài liệu và soạn đề...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {SUBJECTS.map((sub) => (
                <button 
                  key={sub.id} onClick={() => handleSelectSubject(sub.name)}
                  className="group flex flex-col items-center p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-500 hover:bg-blue-50 transition-all hover:-translate-y-1"
                >
                  <span className="text-3xl mb-3">{sub.icon}</span>
                  <span className="text-[10px] font-bold text-gray-600 uppercase group-hover:text-blue-600 leading-tight">{sub.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'result' && resultData && !reviewMode && (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
          
          {/* HIỆU ỨNG BẰNG KHEN TỐT NGHIỆP */}
          {roadmap?.is_completed && (
            <div className="relative p-1 rounded-[2.5rem] bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 shadow-2xl shadow-yellow-500/30 animate-in zoom-in duration-700 overflow-hidden mb-8">
               <div className="relative bg-white rounded-[2.4rem] p-8 md:p-12 text-center overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-100 rounded-full blur-3xl opacity-50"></div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-100 rounded-full blur-3xl opacity-50"></div>

                  <div className="text-7xl mb-6 animate-bounce relative z-10 drop-shadow-lg">🎓</div>
                  <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-600 uppercase tracking-tighter mb-4 relative z-10">
                    BẰNG CHỨNG NHẬN TỐT NGHIỆP
                  </h1>
                  <p className="text-slate-600 font-medium text-sm md:text-lg mb-8 relative z-10 max-w-2xl mx-auto">
                    Chúc mừng bạn đã xuất sắc vượt qua bài thi cuối khóa. Hệ thống ghi nhận bạn đã hoàn thành trọn vẹn lộ trình học tập và chính thức làm chủ tri thức môn <strong className="text-amber-600 font-black">{subject}</strong>!
                  </p>
                  <div className="inline-block bg-amber-50 border-2 border-amber-200 px-8 py-4 rounded-3xl relative z-10 shadow-inner">
                    <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest mb-1">Trình độ tốt nghiệp</p>
                    <p className="text-3xl font-black text-amber-600 uppercase tracking-wider">{resultData.level}</p>
                  </div>
               </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-100 pb-6 mb-6 gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl">🏆</div>
                  <div>
                      <h2 className="text-xl font-black text-gray-800">
                        {sessionTopic ? `Qua bài: ${sessionTopic}` : subject}
                      </h2>
                      <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest mt-1 inline-block">
                        Trình độ: {resultData.level}
                      </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-5xl font-black ${isPassed ? 'text-indigo-600' : 'text-red-600'}`}>
                    {Math.round(resultData.score)}%
                  </div>
                  <div className={`text-[10px] font-bold uppercase mt-1 ${isPassed ? 'text-gray-400' : 'text-red-400'}`}>
                    {isPassed ? 'Điểm đánh giá' : 'Chưa qua bài'}
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`p-6 rounded-2xl border relative ${isPassed ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-200'}`}>
                  <div className="absolute top-4 right-4 text-2xl opacity-20">{isPassed ? '🤖' : '🚨'}</div>
                  <h3 className={`text-xs font-black uppercase mb-3 ${isPassed ? 'text-amber-600' : 'text-red-600'}`}>
                    {isPassed ? 'Thông báo hệ thống' : 'Cảnh báo học tập'}
                  </h3>
                  <p className={`text-sm font-medium leading-relaxed text-justify ${isPassed ? 'text-amber-900' : 'text-red-900'}`}>
                    {resultData.message}
                  </p>
                </div>

                <div className="flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 p-3 rounded-xl text-center">
                          <p className="text-[9px] text-gray-400 font-black uppercase">Đúng</p>
                          <p className={`text-lg font-black ${isPassed ? 'text-emerald-600' : 'text-red-500'}`}>{resultData.correct_count}/{resultData.total_questions}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl text-center">
                          <p className="text-[9px] text-gray-400 font-black uppercase">Tiến độ</p>
                          <p className="text-lg font-black text-orange-500">{displayProgress}%</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl text-center">
                          <p className="text-[9px] text-gray-400 font-black uppercase">Thời gian</p>
                          <p className="text-lg font-black text-gray-700">{formatTime(timer)}</p>
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => { setReviewMode(true); setCurrentIndex(0); }} className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase hover:bg-black transition-all shadow-lg">🔍 Xem bài giải</button>
                      <button onClick={() => {
                        window.history.replaceState(null, "", window.location.pathname);
                        setStep('select_subject');
                      }} className="flex-1 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl font-bold text-xs uppercase hover:bg-gray-50 transition-all">Môn học khác</button>
                  </div>
                </div>
            </div>
          </div>

          {/* CHỈ HIỂN THỊ DANH SÁCH LỘ TRÌNH KHI CHƯA TỐT NGHIỆP */}
          {roadmap && roadmap.roadmap_data && roadmap.roadmap_data.length > 0 && !roadmap.is_completed && (
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-5 duration-700">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
                    <GraduationCap className="text-indigo-600" /> Chương trình học cá nhân hóa
                  </h3>
                  <p className="text-xs text-gray-400 font-medium mt-1">Dựa trên tài liệu lớp học và trình độ {roadmap.level_assigned || "Beginner"}</p>
                </div>
              </div>

              <div className="grid gap-4">
                {roadmap.roadmap_data.map((item: any, idx: number) => {
                  const isCurrent = item.session === roadmap.current_session;
                  const isDone = item.session < roadmap.current_session;
                  return (
                    <div 
                      key={idx} 
                      className={`group p-5 border rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between transition-all ${
                        isCurrent ? "border-indigo-200 bg-indigo-50/30 hover:shadow-xl" : 
                        isDone ? "border-emerald-100 bg-emerald-50/20" : "border-slate-100 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-5 w-full md:w-auto">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-all ${
                          isCurrent ? "bg-indigo-600 text-white shadow-indigo-200 scale-110" : 
                          isDone ? "bg-emerald-500 text-white" : "bg-white text-slate-400"
                        }`}>
                          {isDone ? "✓" : item.session}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-black text-sm uppercase ${isCurrent ? 'text-indigo-700' : isDone ? 'text-emerald-700' : 'text-slate-800'}`}>{item.topic}</h4>
                            {isCurrent && <span className="hidden md:inline-block bg-indigo-600 text-white text-[8px] px-2 py-0.5 rounded font-black uppercase animate-pulse">Đang học</span>}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium line-clamp-1">{item.description}</p>
                        </div>
                      </div>
                      
                      {isCurrent && (
                        <div className="mt-4 md:mt-0 w-full md:w-auto flex justify-end items-center gap-3">
                           <button onClick={handleGoToAdaptive} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white shadow-md shadow-indigo-200 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-indigo-700">
                             <Bot size={14} /> Học với AI
                           </button>
                           <ChevronRight className="text-indigo-400 hidden md:block" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {((step === 'quiz') || (step === 'result' && reviewMode)) && currentQ && (
        <div className="flex items-center justify-center min-h-[60vh] py-8">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-300">
             <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-white">
                <div>
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">
                     {reviewMode ? 'CHẾ ĐỘ XEM LẠI' : sessionTopic ? `KIỂM TRA BÀI: ${sessionTopic}` : `BÀI ĐÁNH GIÁ: ${subject}`}
                   </span>
                   <span className="text-xs font-bold text-gray-400">CÂU {currentIndex + 1}/{questions.length}</span>
                </div>
                <div className="flex items-center gap-3">
                   {!reviewMode && (
                     <>
                        <button onClick={handleSafeExit} className="px-3 py-1 bg-gray-100 text-gray-500 rounded hover:bg-red-50 hover:text-red-600 text-[10px] font-bold uppercase transition-colors">Thoát</button>
                        <div className="bg-indigo-50 px-3 py-1 rounded text-[10px] font-black text-indigo-600">⏱️ {formatTime(timer)}</div>
                     </>
                   )}
                   {reviewMode && (
                     <button onClick={() => setReviewMode(false)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-100 transition-colors">Thoát</button>
                   )}
                </div>
             </div>

             <div className="h-1 w-full bg-gray-50">
                <div className={`h-full transition-all duration-300 ${reviewMode ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${progress}%` }}></div>
             </div>

             <div className="p-6 md:p-8 bg-white">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-6 leading-relaxed">{currentQ.content}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                   {currentQ.options.map((opt: string, idx: number) => {
                      const label = LABELS[idx]; 
                      const isSelected = answers[currentQ.id] === label;
                      const displayContent = cleanOptionText(opt);
                      let cStyle = "border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer";
                      let bStyle = "bg-gray-100 text-gray-500";
                      let tStyle = "text-gray-600";

                      if (!reviewMode && isSelected) {
                          cStyle = "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 shadow-md";
                          bStyle = "bg-indigo-600 text-white";
                          tStyle = "text-indigo-900 font-bold";
                      }
                      
                      if (reviewMode) {
                          const resultItem = resultData?.results?.find((r: any) => r.question_id === currentQ.id);
                          const correctLabel = resultItem?.correct_label?.trim().toUpperCase();
                          const isCorrect = correctLabel === label;
                          cStyle = "border-gray-100 opacity-50 cursor-default"; 
                          if (isCorrect) {
                              cStyle = "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 opacity-100 shadow-md";
                              bStyle = "bg-emerald-500 text-white";
                              tStyle = "text-emerald-900 font-bold";
                          } else if (isSelected) {
                              cStyle = "border-red-500 bg-red-50 ring-1 ring-red-500 opacity-100 shadow-md";
                              bStyle = "bg-red-500 text-white";
                              tStyle = "text-red-900 font-bold";
                          }
                      }
                      
                      return (
                         <div key={idx} onClick={() => !reviewMode && setAnswers(prev => ({...prev, [currentQ.id]: label}))} className={`relative p-4 border rounded-xl transition-all flex items-start gap-3 ${cStyle}`}>
                            <span className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5 ${bStyle}`}>{label}</span>
                            <span className={`text-sm font-medium leading-relaxed ${tStyle}`}>{displayContent}</span>
                         </div>
                      );
                   })}
                </div>
                {reviewMode && (
                   <div className="mt-2 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">💡</span>
                          <strong className="text-blue-700 uppercase tracking-widest text-[10px]">Giải thích từ hệ thống</strong>
                      </div>
                      <p className="text-sm text-blue-900 leading-relaxed font-medium">
                        {resultData?.results?.find((r: any) => r.question_id === currentQ.id)?.explanation || "Không có giải thích chi tiết cho câu hỏi này."}
                      </p>
                   </div>
                )}
             </div>

             <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-4">
                <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-lg font-black text-[10px] uppercase hover:bg-gray-100 disabled:opacity-50 transition-all"> Quay lại </button>
                {currentIndex < questions.length - 1 ? (
                   <button onClick={() => setCurrentIndex(prev => prev + 1)} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-black text-[10px] uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"> Tiếp theo </button>
                ) : (
                   !reviewMode && <button onClick={handleCheckAndSubmit} disabled={loading} className="flex-[2] py-3 bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"> {loading ? "Đang xử lý..." : "Hoàn thành đánh giá"} </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentForm;
"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// --- CONFIG ---
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
const STORAGE_KEY = 'quiz_auto_save_data'; // Key lưu trong bộ nhớ trình duyệt

const AssessmentForm = () => {
  const [step, setStep] = useState<'select_subject' | 'quiz' | 'result'>('select_subject');
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{[key: number]: string}>({}); 
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  
  const [resultData, setResultData] = useState<any>(null);
  const [reviewMode, setReviewMode] = useState(false); 
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- 1. CƠ CHẾ KHÔI PHỤC DỮ LIỆU KHI F5 (AUTO RESTORE) ---
  useEffect(() => {
    // Chạy 1 lần duy nhất khi trang vừa load xong
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Chỉ khôi phục nếu dữ liệu hợp lệ và đang ở trạng thái làm bài
        if (parsed.step === 'quiz' && parsed.questions && parsed.questions.length > 0) {
          setSubject(parsed.subject);
          setQuestions(parsed.questions);
          setAnswers(parsed.answers || {});
          setTimer(parsed.timer || 0);
          setStep('quiz');
          toast.success("Đã khôi phục bài làm của bạn!", { icon: '🔄', duration: 3000 });
        }
      } catch (error) {
        console.error("Lỗi khôi phục dữ liệu:", error);
        localStorage.removeItem(STORAGE_KEY); // Xóa nếu dữ liệu lỗi
      }
    }
  }, []);

  // --- 2. CƠ CHẾ TỰ ĐỘNG LƯU (AUTO SAVE) ---
  useEffect(() => {
    // Chỉ lưu khi đang làm bài (step = quiz)
    if (step === 'quiz' && questions.length > 0) {
      const dataToSave = {
        step: 'quiz',
        subject,
        questions,
        answers,
        timer
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [step, subject, questions, answers, timer]);

  // --- 3. LOGIC TIMER ---
  useEffect(() => {
    let interval: any;
    if (step === 'quiz' && !loading) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, loading]);

  // --- 4. LOGIC CHẶN NÚT BACK VÀ CẢNH BÁO ĐÓNG TAB ---
  useEffect(() => {
    if (step === 'quiz') {
      // A. Cảnh báo khi đóng Tab hoặc F5 (Vẫn giữ để an toàn)
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      // B. Chặn Nút Back bằng History Trap
      window.history.pushState(null, "", window.location.href);
      const handlePopState = (e: PopStateEvent) => {
        const confirmLeave = window.confirm("⚠️ CẢNH BÁO:\n\nBạn đang làm bài thi. Nếu thoát, bài làm sẽ bị xóa.\n\nBạn có chắc chắn muốn thoát?");
        if (confirmLeave) {
          // Nếu thoát thật -> Xóa bộ nhớ -> Cho về trang chủ
          localStorage.removeItem(STORAGE_KEY); 
          window.removeEventListener('popstate', handlePopState);
          window.history.back();
          setStep('select_subject');
        } else {
          // Nếu ở lại -> Đẩy lại bẫy history
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

  const cleanOptionText = (text: string) => text.replace(/^[A-D]\.\s*/, "").trim();
  
  const normalizeLabel = (label: string) => {
      if (!label) return "";
      return label.trim().charAt(0).toUpperCase();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // --- HÀM THOÁT AN TOÀN (Xóa bộ nhớ khi thoát) ---
  const handleSafeExit = () => {
    if (Object.keys(answers).length > 0) {
      if (window.confirm("⚠️ CẢNH BÁO: Bạn đang làm bài thi.\nNếu thoát bây giờ, kết quả sẽ bị xóa và không thể khôi phục.\n\nBạn có chắc chắn muốn thoát?")) {
        localStorage.removeItem(STORAGE_KEY); // Xóa bản lưu
        setStep('select_subject');
        setAnswers({});
        setTimer(0);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setStep('select_subject');
    }
  };

  const handleSelectSubject = async (selectedSub: string) => {
    setSubject(selectedSub);
    setLoading(true);
    setAnswers({});
    setTimer(0);
    setResultData(null);
    setReviewMode(false);
    setCurrentIndex(0);
    // Xóa bộ nhớ cũ trước khi tạo đề mới
    localStorage.removeItem(STORAGE_KEY);

    try {
      const res = await axios.post("http://localhost:8000/api/assessment/generate", { subject: selectedSub });
      if (res.data.questions && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
        setStep('quiz');
        toast.dismiss();
        toast.success(`Đã tạo đề thi môn ${selectedSub}`, { duration: 2000 });
      }
    } catch (error) {
      toast.error("Chưa có tài liệu môn này.", { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const submissionData = {
      subject: subject,
      answers: Object.entries(answers).map(([qid, opt]) => ({
        question_id: Number(qid),
        selected_option: opt
      })),
      duration_seconds: timer
    };

    try {
      const res = await axios.post("http://localhost:8000/api/assessment/submit", submissionData);
      setResultData(res.data);
      setStep('result');
      localStorage.removeItem(STORAGE_KEY); // Nộp xong thì xóa bản lưu nháp
      toast.dismiss();
      toast.success("Nộp bài thành công!", { duration: 3000 });
    } catch (error) {
      toast.error("Lỗi khi nộp bài.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAndSubmit = () => {
    const missingIndexes = questions
      .map((q, idx) => (answers[q.id] ? null : idx + 1))
      .filter((idx) => idx !== null);

    if (missingIndexes.length > 0) {
      toast.error(
        `🛑 Bạn chưa làm các câu: ${missingIndexes.join(", ")}\nVui lòng hoàn thành trước khi nộp!`,
        { duration: 4000, icon: '⚠️' }
      );
      return; 
    }

    if (window.confirm("✅ Bạn đã hoàn thành tất cả câu hỏi.\nXác nhận nộp bài ngay?")) {
      handleSubmit();
    }
  };

  // --- LOGIC VIEW ---
  const currentQ = questions[currentIndex];
  let reviewStatus = null;
  let explanation = null;
  let correctLabelRaw = "";

  if ((step === 'quiz' || reviewMode) && resultData && reviewMode) {
      if (currentQ) {
        const resultItem = resultData.results.find((r: any) => r.question_id === currentQ.id);
        if (resultItem) {
          reviewStatus = resultItem.is_correct ? 'correct' : 'wrong';
          explanation = resultItem.explanation;
          correctLabelRaw = resultItem.correct_label;
        }
      }
  }
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <Toaster position="top-center" reverseOrder={false} />

      {/* 1. VIEW CHỌN MÔN */}
      {step === 'select_subject' && (
        <div className="max-w-5xl mx-auto p-4 text-center">
          <h2 className="text-2xl font-black text-gray-800 mb-8 uppercase tracking-tighter">Chọn môn học</h2>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-blue-600 font-bold animate-pulse">AI đang soạn đề thi...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {SUBJECTS.map((sub) => (
                <button 
                  key={sub.id} onClick={() => handleSelectSubject(sub.name)}
                  className="group flex flex-col items-center p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-500 hover:bg-blue-50 transition-all hover:-translate-y-1"
                >
                  <span className="text-3xl mb-3">{sub.icon}</span>
                  <span className="text-xs font-bold text-gray-600 uppercase group-hover:text-blue-600 leading-tight">
                    {sub.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. VIEW KẾT QUẢ */}
      {step === 'result' && resultData && !reviewMode && (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-100 pb-6 mb-6 gap-6">
             <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl">🏆</div>
                <div>
                    <h2 className="text-xl font-black text-gray-800">{subject}</h2>
                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                        {resultData.level}
                    </span>
                </div>
             </div>
             <div className="text-center">
                <div className="text-5xl font-black text-indigo-600">{Math.round(resultData.score)}%</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Điểm tổng kết</div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 relative">
                <div className="absolute top-4 right-4 text-2xl opacity-20">🤖</div>
                <h3 className="text-xs font-black text-amber-600 uppercase mb-3">Nhận xét từ AI</h3>
                <p className="text-sm text-amber-900 font-medium leading-relaxed text-justify">
                  "{resultData.evaluation?.evaluation_msg ? resultData.evaluation.evaluation_msg.replace(/(\d+\.\d)\d+/g, '$1') : "Đang phân tích kết quả..."}"
                </p>
             </div>

             <div className="flex flex-col justify-between gap-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <p className="text-[9px] text-gray-400 font-black uppercase">Đúng</p>
                        <p className="text-lg font-black text-emerald-600">
                          {resultData.correct_count ?? Math.round((resultData.score / 100) * questions.length)}/{resultData.total_questions || questions.length}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <p className="text-[9px] text-gray-400 font-black uppercase">Nỗ lực</p>
                        <p className="text-lg font-black text-orange-500">{Math.round(resultData.evaluation?.effort_score || 0)}%</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <p className="text-[9px] text-gray-400 font-black uppercase">Thời gian</p>
                        <p className="text-lg font-black text-gray-700">{formatTime(timer)}</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button onClick={() => { setReviewMode(true); setCurrentIndex(0); }} className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase hover:bg-black transition-all shadow-lg">
                      🔍 Xem lời giải
                    </button>
                    <button onClick={() => setStep('select_subject')} className="flex-1 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl font-bold text-xs uppercase hover:bg-gray-50 transition-all">
                      Làm đề khác
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 3. VIEW QUIZ & REVIEW */}
      {((step === 'quiz') || (step === 'result' && reviewMode)) && currentQ && (
        <div className="flex items-center justify-center min-h-[60vh] py-8">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-300">
             <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-white">
                <div>
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">
                      {reviewMode ? 'CHẾ ĐỘ XEM LẠI' : subject}
                   </span>
                   <span className="text-xs font-bold text-gray-400">CÂU {currentIndex + 1}/{questions.length}</span>
                </div>
                
                <div className="flex items-center gap-3">
                   {/* NÚT THOÁT & ĐỒNG HỒ */}
                   {!reviewMode && (
                      <>
                        <button 
                          onClick={handleSafeExit} 
                          className="px-3 py-1 bg-gray-100 text-gray-500 rounded hover:bg-red-50 hover:text-red-600 text-[10px] font-bold uppercase transition-colors"
                        >
                          Thoát
                        </button>
                        <div className="bg-indigo-50 px-3 py-1 rounded text-[10px] font-black text-indigo-600">
                            ⏱️ {formatTime(timer)}
                        </div>
                      </>
                   )}
                   {reviewMode && (
                      <button onClick={() => setReviewMode(false)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-100 transition-colors">
                         Thoát
                      </button>
                   )}
                </div>
             </div>

             <div className="h-1 w-full bg-gray-50">
                <div className={`h-full transition-all duration-300 ${reviewMode ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${progress}%` }}></div>
             </div>

             <div className="p-6 md:p-8 bg-white">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-6 leading-relaxed">
                    {currentQ.content}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                   {currentQ.options.map((opt: string, idx: number) => {
                      const label = LABELS[idx]; 
                      const isSelected = answers[currentQ.id] === label;
                      const displayContent = cleanOptionText(opt);

                      let containerStyle = "border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer";
                      let badgeStyle = "bg-gray-100 text-gray-500";
                      let textStyle = "text-gray-600";

                      if (!reviewMode && isSelected) {
                          containerStyle = "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 shadow-md";
                          badgeStyle = "bg-indigo-600 text-white";
                          textStyle = "text-indigo-900 font-bold";
                      }

                      if (reviewMode) {
                          containerStyle = "border-gray-100 opacity-50 cursor-default"; 
                          
                          const isLabelMatch = normalizeLabel(correctLabelRaw) === label;
                          const isTextMatch = correctLabelRaw && cleanOptionText(opt).toLowerCase().includes(correctLabelRaw.toLowerCase()) && correctLabelRaw.length > 2;
                          const isCorrect = isLabelMatch || isTextMatch;

                          if (isCorrect) {
                             containerStyle = "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 opacity-100 shadow-md";
                             badgeStyle = "bg-emerald-500 text-white";
                             textStyle = "text-emerald-900 font-bold";
                          } else if (isSelected && reviewStatus === 'wrong') {
                             containerStyle = "border-red-500 bg-red-50 ring-1 ring-red-500 opacity-100 shadow-md";
                             badgeStyle = "bg-red-500 text-white";
                             textStyle = "text-red-900 font-bold";
                          }
                      }

                      return (
                         <div key={idx} onClick={() => !reviewMode && setAnswers(prev => ({...prev, [currentQ.id]: label}))}
                            className={`relative p-4 border rounded-xl transition-all flex items-start gap-3 ${containerStyle}`}
                         >
                            <span className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5 ${badgeStyle}`}>
                               {label}
                            </span>
                            <span className={`text-sm font-medium leading-relaxed ${textStyle}`}>{displayContent}</span>
                         </div>
                      );
                   })}
                </div>

                {reviewMode && explanation && (
                   <div className="mt-2 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">💡</span>
                          <strong className="text-blue-700 uppercase tracking-widest text-[10px]">Giải thích chi tiết</strong>
                      </div>
                      <p className="text-sm text-blue-900 leading-relaxed font-medium">{explanation}</p>
                   </div>
                )}
             </div>

             <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-4">
                <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0}
                   className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-lg font-black text-[10px] uppercase hover:bg-gray-100 disabled:opacity-50 transition-all"
                > Quay lại </button>

                {currentIndex < questions.length - 1 ? (
                   <button onClick={() => setCurrentIndex(prev => prev + 1)}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-black text-[10px] uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                   > Tiếp theo </button>
                ) : (
                   !reviewMode && (
                      <button 
                          onClick={handleCheckAndSubmit} 
                          disabled={loading}
                          className="flex-[2] py-3 bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                      > {loading ? "Đang xử lý..." : "Nộp bài ngay"} </button>
                   )
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentForm;
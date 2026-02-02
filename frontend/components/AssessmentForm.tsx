"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// --- DANH SÁCH MÔN HỌC ---
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

const AssessmentForm = () => {
  // --- STATE ---
  const [step, setStep] = useState<'select_subject' | 'quiz' | 'result'>('select_subject');
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{[key: number]: string}>({}); 
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  
  // State Kết quả & Review
  const [resultData, setResultData] = useState<any>(null);
  const [reviewMode, setReviewMode] = useState(false); 
  const [currentIndex, setCurrentIndex] = useState(0);

  // Đồng hồ
  useEffect(() => {
    let interval: any;
    if (step === 'quiz' && !loading) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, loading]);

  // --- HÀM XỬ LÝ (HELPER) ---
  
  // 1. Làm sạch text đáp án an toàn
  // Chỉ xóa "A.", "B." nếu nó nằm ở đầu dòng. Không dùng substring cắt bừa bãi.
  const cleanOptionText = (text: string) => {
    return text.replace(/^[A-D]\.\s*/, "").trim();
  };

  // 2. Format thời gian (MM:SS)
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // --- API CALLS ---

  const handleSelectSubject = async (selectedSub: string) => {
    setSubject(selectedSub);
    setLoading(true);
    setAnswers({});
    setTimer(0);
    setResultData(null);
    setReviewMode(false);
    setCurrentIndex(0);

    try {
      const res = await axios.post("http://localhost:8000/api/assessment/generate", { subject: selectedSub });
      if (res.data.questions && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
        setStep('quiz');
        toast.success(`Đã tạo đề thi môn ${selectedSub}`, { duration: 3000 });
      } else {
        toast.error("Không tìm thấy dữ liệu đề thi.", { duration: 3000 });
      }
    } catch (error) {
      toast.error("Chưa có tài liệu môn này. Vui lòng upload trước!", { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Kiểm tra làm đủ chưa
    if (Object.keys(answers).length < questions.length) {
       if(!confirm("Bạn chưa làm hết câu hỏi. Chắc chắn nộp bài?")) return;
    }
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
      toast.success("Nộp bài thành công!", { duration: 3000 });
    } catch (error) {
      toast.error("Lỗi khi nộp bài.", { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VIEW 1: CHỌN MÔN HỌC
  // ==========================================
  if (step === 'select_subject') {
    return (
      <div className="max-w-6xl mx-auto p-4 text-center pb-20">
        <Toaster />
        <h2 className="text-xl font-black text-gray-800 mb-6 uppercase tracking-tighter">
          Chọn môn học kiểm tra năng lực
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-600 font-bold animate-pulse text-sm">AI đang soạn đề thi...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {SUBJECTS.map((sub) => (
              <button 
                key={sub.id} 
                onClick={() => handleSelectSubject(sub.name)}
                className="group flex flex-col items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg hover:border-blue-200 hover:-translate-y-1 transition-all duration-300"
              >
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{sub.icon}</span>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight group-hover:text-blue-600">
                  {sub.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: KẾT QUẢ TỔNG KẾT
  // ==========================================
  if (step === 'result' && resultData) {
    // Nếu chưa vào chế độ Review thì hiện bảng điểm
    if (!reviewMode) {
      return (
        <div className="max-w-md mx-auto mt-6 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 text-center animate-in zoom-in-95 duration-300">
          <Toaster />
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🏆</div>
          <h2 className="text-lg font-bold text-gray-800">{subject}</h2>
          
          <div className="text-5xl font-black text-blue-600 my-4">{Math.round(resultData.score)}%</div>
          <div className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase mb-6">
            Trình độ: {resultData.level}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
             <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Câu đúng</p>
                <p className="text-lg font-black text-green-600">{resultData.correct_count}/{resultData.total_questions}</p>
             </div>
             <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Thời gian</p>
                <p className="text-lg font-black text-gray-700">{formatTime(timer)}</p>
             </div>
          </div>

          <div className="space-y-2">
            <button onClick={() => { setReviewMode(true); setCurrentIndex(0); }} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition shadow-lg">
              🔍 Xem lời giải chi tiết
            </button>
            <button onClick={() => setStep('select_subject')} className="w-full py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition">
              Làm đề khác
            </button>
          </div>
        </div>
      );
    }
  }

  // ==========================================
  // VIEW 3: QUIZ & REVIEW (GIAO DIỆN CHÍNH)
  // ==========================================
  const currentQ = questions[currentIndex];
  
  // Logic hiển thị Review
  let reviewStatus = null;
  let explanation = null;
  let correctLabel = null; // A, B, C, D

  if (reviewMode && resultData) {
     const resultItem = resultData.results.find((r: any) => r.question_id === currentQ.id);
     if (resultItem) {
        reviewStatus = resultItem.is_correct ? 'correct' : 'wrong';
        explanation = resultItem.explanation;
        // QUAN TRỌNG: Sử dụng correct_label từ Backend trả về để tô màu chính xác
        correctLabel = resultItem.correct_label; 
     }
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative flex flex-col" style={{ minHeight: '60vh' }}>
       <Toaster />
       
       {/* HEADER: Sticky top */}
       <div className="px-6 py-3 border-b border-gray-50 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
             <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                {reviewMode ? 'CHẾ ĐỘ XEM LẠI' : subject}
             </span>
             <span className="text-xs font-bold text-gray-400">
                Câu {currentIndex + 1}/{questions.length}
             </span>
          </div>
          {!reviewMode && (
             <div className="bg-gray-100 px-3 py-1 rounded-lg text-xs font-mono font-bold text-gray-600">
                ⏱️ {formatTime(timer)}
             </div>
          )}
          {reviewMode && (
             <button onClick={() => setStep('select_subject')} className="text-xs font-bold text-red-500 hover:underline">
                Thoát
             </button>
          )}
       </div>

       {/* THANH TIẾN ĐỘ */}
       <div className="h-1 w-full bg-gray-100">
          <div 
             className={`h-full transition-all duration-300 ${reviewMode ? 'bg-green-500' : 'bg-blue-600'}`} 
             style={{ width: `${progress}%` }}
          ></div>
       </div>

       {/* NỘI DUNG CÂU HỎI */}
       <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
          <h2 className="text-lg font-bold text-gray-800 mb-6 leading-relaxed">
             {currentQ.content}
          </h2>

          {/* GRID LAYOUT: 2 Cột để form gọn hơn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             {currentQ.options.map((opt: string, idx: number) => {
                const label = LABELS[idx]; 
                const isSelected = answers[currentQ.id] === label;
                const displayContent = cleanOptionText(opt); // Text sạch, không bị cắt chữ

                let containerStyle = "border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer";
                let badgeStyle = "bg-gray-100 text-gray-500";

                // --- Style khi đang làm bài ---
                if (!reviewMode && isSelected) {
                   containerStyle = "border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm";
                   badgeStyle = "bg-blue-600 text-white";
                }

                // --- Style khi Review ---
                if (reviewMode) {
                   containerStyle = "border-gray-100 opacity-60 cursor-default";
                   
                   // Nếu đây là đáp án ĐÚNG (khớp với correctLabel từ Backend)
                   if (label === correctLabel) {
                      containerStyle = "border-green-500 bg-green-50 ring-1 ring-green-500 opacity-100 font-medium";
                      badgeStyle = "bg-green-600 text-white";
                   } 
                   // Nếu user chọn SAI
                   else if (isSelected && reviewStatus === 'wrong') {
                      containerStyle = "border-red-500 bg-red-50 ring-1 ring-red-500 opacity-100";
                      badgeStyle = "bg-red-600 text-white";
                   }
                }

                return (
                   <div 
                      key={idx}
                      onClick={() => !reviewMode && setAnswers(prev => ({...prev, [currentQ.id]: label}))}
                      className={`relative p-3 border rounded-xl transition-all duration-200 flex items-start gap-3 h-full ${containerStyle}`}
                   >
                      <span className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-colors mt-0.5 ${badgeStyle}`}>
                         {label}
                      </span>
                      <span className="text-sm text-gray-700 leading-snug">{displayContent}</span>
                   </div>
                );
             })}
          </div>

          {/* GIẢI THÍCH (Chỉ hiện khi Review) */}
          {reviewMode && explanation && (
             <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-xs text-gray-700 animate-in fade-in">
                <strong className="text-yellow-600 uppercase tracking-wide block mb-1">💡 Giải thích:</strong>
                {explanation}
             </div>
          )}
       </div>

       {/* FOOTER ĐIỀU HƯỚNG */}
       <div className="p-4 border-t border-gray-50 flex gap-3 bg-gray-50/30">
          <button 
             onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
             disabled={currentIndex === 0}
             className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase hover:bg-gray-50 disabled:opacity-50 transition"
          >
             Quay lại
          </button>

          {currentIndex < questions.length - 1 ? (
             <button 
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-700 shadow-md transition"
             >
                Tiếp theo
             </button>
          ) : (
             !reviewMode && (
                <button 
                   onClick={handleSubmit}
                   disabled={loading}
                   className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-green-700 shadow-md transition"
                >
                   {loading ? "Đang nộp..." : "Nộp bài"}
                </button>
             )
          )}
       </div>
    </div>
  );
};

export default AssessmentForm;
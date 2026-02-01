"use client";
import React, { useState } from 'react';
import { api } from '../services/api';

// Danh sách môn học ĐẦY ĐỦ + ICON minh họa
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

const AssessmentForm = () => {
  const [step, setStep] = useState<'select_subject' | 'quiz' | 'result'>('select_subject');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<any>(null);
  
  // Biến đếm giờ
  const [startTime, setStartTime] = useState<number>(0);

  // 1. Chọn môn -> Gọi API sinh đề
  const handleSelectSubject = async (subjectName: string) => {
    setSelectedSubject(subjectName);
    setLoading(true);
    try {
      const data = await api.generateAssessment(subjectName);
      if (data && data.length > 0) {
        setQuestions(data);
        setStep('quiz');
        setScore(0);
        setCurrentIndex(0);
        // Bắt đầu tính giờ ngay khi có đề
        setStartTime(Date.now());
      } else {
        alert("Hệ thống chưa có câu hỏi cho môn này. Vui lòng thử lại sau!");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối Server! Hãy kiểm tra lại Backend.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Xử lý khi chọn đáp án
  const handleAnswer = (option: string) => {
    const isCorrect = option === questions[currentIndex].correct_answer;
    
    // Tính điểm ngay lập tức
    const nextScore = score + (isCorrect ? 1 : 0);
    setScore(nextScore);

    // Chuyển câu hoặc nộp bài
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishQuiz(nextScore);
    }
  };

  // 3. Nộp bài & Tính thời gian
  const finishQuiz = async (finalScore: number) => {
    setLoading(true);
    try {
      // Tính thời gian thực tế (giây)
      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - startTime) / 1000); 

      // Lấy danh sách ID để đánh dấu đã học
      const qIds = questions.map(q => q.id); 
      
      const res = await api.submitAssessment(
        selectedSubject, 
        finalScore, 
        questions.length, 
        qIds,
        durationSeconds // Gửi thời gian thực xuống backend
      );
      
      setResult({ ...res, score_percent: (finalScore / questions.length) * 100 });
      setStep('result');
    } catch (e) {
      console.error(e);
      alert("Lỗi khi nộp bài! Kiểm tra kết nối mạng.");
    } finally {
      setLoading(false);
    }
  };

  // --- GIAO DIỆN CHỌN MÔN ---
  if (step === 'select_subject') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-center mb-2 text-blue-900">Kiểm Tra Năng Lực</h2>
        <p className="text-center text-gray-500 mb-8">Chọn môn học để hệ thống tạo đề thi phù hợp với trình độ của bạn</p>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-xl font-bold text-blue-600 animate-pulse">
              🤖 AI đang đọc tài liệu & soạn đề thi mới...
            </p>
            <p className="text-sm text-gray-400 mt-2">Vui lòng đợi (khoảng 10-20 giây cho lần đầu)</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SUBJECTS.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSelectSubject(sub.name)}
                className="flex flex-col items-center p-6 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {sub.icon}
                </div>
                <div className="font-bold text-gray-800 text-center group-hover:text-blue-700">
                  {sub.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- GIAO DIỆN KẾT QUẢ ---
  if (step === 'result' && result) {
    return (
      <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg text-center mt-10">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{selectedSubject}</h2>
        
        <div className="relative inline-block mb-6">
          <svg className="w-32 h-32 text-blue-600" viewBox="0 0 100 100">
            <circle className="text-gray-200 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
            <circle className="text-blue-600 progress-ring__circle stroke-current" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * result.score_percent) / 100}></circle>
          </svg>
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-blue-700">{Math.round(result.score_percent)}%</span>
          </div>
        </div>

        <div className={`p-4 rounded-lg mb-6 border ${result.level === 'Advanced' ? 'bg-green-50 border-green-200 text-green-800' : result.level === 'Intermediate' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <p className="font-bold text-lg">Trình độ: {result.level}</p>
          <p className="text-sm mt-1">{result.message}</p>
        </div>

        <button 
          onClick={() => setStep('select_subject')} 
          className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-black transition shadow-lg"
        >
          Chọn môn khác
        </button>
      </div>
    );
  }

  // --- GIAO DIỆN LÀM BÀI (Quiz) ---
  const currentQ = questions[currentIndex];
  
  if (!currentQ) return <div className="text-center mt-10">Đang tải câu hỏi...</div>;

  return (
    <div className="max-w-3xl mx-auto mt-8 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
       <div className="flex justify-between items-center mb-6">
         <div>
            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider">Môn học</h3>
            <p className="font-semibold text-blue-600">{selectedSubject}</p>
         </div>
         <div className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-bold">
            Câu {currentIndex + 1} / {questions.length}
         </div>
       </div>

       <div className="mb-8">
         <h3 className="text-xl font-bold text-gray-800 leading-relaxed">{currentQ.content || currentQ.question}</h3>
       </div>

       <div className="space-y-3">
         {currentQ.options.map((opt: string, idx: number) => (
           <button 
             key={idx} 
             onClick={() => handleAnswer(opt)}
             className="w-full text-left p-4 border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 font-medium text-gray-700"
           >
             <span className="inline-block w-8 font-bold text-gray-400">{String.fromCharCode(65 + idx)}.</span>
             {opt}
           </button>
         ))}
       </div>
    </div>
  );
};

export default AssessmentForm;
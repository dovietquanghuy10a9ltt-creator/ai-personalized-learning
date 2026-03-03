"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FileText, Download, Loader2, BookOpen, 
  Settings2, Layers, Bot, CheckCircle2 
} from 'lucide-react';

export default function ExamGeneratorPage() {
  const [classList, setClassList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");
  const [subject, setSubject] = useState("");
  
  const [examType, setExamType] = useState("trắc nghiệm");
  const [numQuestions, setNumQuestions] = useState<number>(20);
  const [numVersions, setNumVersions] = useState<number>(2); 
  const [level, setLevel] = useState("Trung bình");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      const teacherId = localStorage.getItem("userId") || localStorage.getItem("user_id");
      if (!teacherId) return;
      try {
        const res = await axios.get(`http://localhost:8000/api/classroom/teacher/${teacherId}`);
        setClassList(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedClassId(res.data[0].id);
          setSubject(res.data[0].subject);
        }
      } catch (error) {
        console.error("Lỗi lấy danh sách lớp:", error);
      }
    };
    fetchClasses();
  }, []);

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedClassId(Number(val));
    const c = classList.find(x => x.id === Number(val));
    if (c) setSubject(c.subject);
  };

  const handleGenerateAndDownload = async () => {
    if (!selectedClassId || !subject) {
      toast.error("Vui lòng chọn lớp và môn học.");
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading("AI đang phân tích tài liệu và xáo trộn mã đề...");

    try {
      const response = await axios.post("http://localhost:8000/api/exam/generate-word", {
        class_id: selectedClassId,
        subject: subject,
        exam_type: examType,
        num_questions: numQuestions,
        num_versions: numVersions,
        level: level
      }, {
        responseType: 'blob' 
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DeThi_${subject.replace(/\s+/g, '')}_${examType}.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      toast.success("Tạo và tải đề thi thành công!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Lỗi kết nối máy chủ hoặc AI sinh đề thất bại. Hãy chắc chắn Backend đang chạy.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 sm:p-8 bg-[#F8FAFC]">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* HEADER SECTION */}
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-white">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-inner">
                <FileText className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    AI Khảo Thí <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest translate-y-[-2px]">Beta</span>
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Hệ thống sinh đề thi tự động chuẩn Form ĐH Xây Dựng Hà Nội</p>
            </div>
        </div>

        {/* MAIN FORM */}
        <div className="p-8 space-y-8 bg-slate-50/30">
          
          {/* Block 1: Bối cảnh học phần */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" /> Bối cảnh học phần
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Chọn lớp học</label>
                <select 
                    value={selectedClassId} 
                    onChange={handleClassChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all cursor-pointer shadow-sm appearance-none"
                >
                  {classList.length === 0 ? <option value="">Chưa có lớp</option> : classList.map(c => <option key={c.id} value={c.id}>{c.name} - {c.subject}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Môn học đang chọn</label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 cursor-not-allowed">
                  {subject || "Chưa chọn lớp"}
                </div>
              </div>
            </div>
          </div>

          {/* Block 2: Cấu hình đề thi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-500" /> Cấu hình sinh đề
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="col-span-1 md:col-span-2 lg:col-span-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Loại đề</label>
                <select 
                  value={examType} 
                  onChange={(e) => setExamType(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                >
                  <option value="trắc nghiệm">Trắc nghiệm</option>
                  <option value="tự luận">Tự luận</option>
                </select>
              </div>
              
              <div className="col-span-1 lg:col-span-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Mức độ</label>
                <select 
                  value={level} 
                  onChange={(e) => setLevel(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                >
                  <option value="Cơ bản">Cơ bản</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Nâng cao">Nâng cao</option>
                </select>
              </div>

              <div className="col-span-1 lg:col-span-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Số câu hỏi</label>
                <input 
                  type="number" min="1" max="50" 
                  value={numQuestions} 
                  onChange={(e) => setNumQuestions(Number(e.target.value))} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center"
                />
              </div>

              <div className="col-span-1 lg:col-span-1">
                <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-wider mb-2">Số mã đề</label>
                <select 
                  value={numVersions} 
                  onChange={(e) => setNumVersions(Number(e.target.value))} 
                  className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                >
                  <option value={1}>1 Mã đề</option>
                  <option value={2}>2 Mã đề</option>
                  <option value={3}>3 Mã đề</option>
                  <option value={4}>4 Mã đề</option>
                </select>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 p-6 rounded-2xl flex flex-col md:flex-row gap-5 items-start">
             <div className="p-3 bg-white rounded-xl shadow-sm">
                <Bot className="w-6 h-6 text-indigo-600" />
             </div>
             <div>
                 <p className="font-black text-slate-800 mb-2">Cấu trúc File Word xuất ra:</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-xs font-medium text-slate-600">Template Header chuẩn ĐH Xây Dựng HN.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-xs font-medium text-slate-600">Tự động xáo trộn câu hỏi và đáp án.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-xs font-medium text-slate-600">Bảng Answer Key (Đáp án) đính kèm cuối file.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-xs font-medium text-slate-600">Dễ dàng chỉnh sửa trước khi in ấn.</span>
                    </div>
                 </div>
             </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={handleGenerateAndDownload}
            disabled={loading || classList.length === 0}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:bg-slate-900"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Đang soạn đề & xáo trộn mã đề...</>
            ) : (
              <><Download className="w-5 h-5 text-indigo-300" /> Xuất File Word Đề Thi</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
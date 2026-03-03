"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BookOpen, Download, Search, FileText, 
  Filter, LockKeyhole, Loader2, File
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentLibraryPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchEnrolledSubjects();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedSubject]);

  const getUserId = () => {
    return localStorage.getItem("userId") || localStorage.getItem("user_id");
  };

  const fetchEnrolledSubjects = async () => {
    const userId = getUserId();
    if (!userId) return;
    try {
      const res = await axios.get(`http://localhost:8000/api/auth/me/${userId}`);
      const classes = res.data.enrolled_classes || [];
      const subjects = Array.from(new Set(classes.map((c: any) => c.subject))) as string[];
      setEnrolledSubjects(subjects);
    } catch (error) {
      console.error("Lỗi lấy môn học:", error);
    }
  };

  const fetchDocuments = async () => {
    const userId = getUserId();
    if (!userId) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/documents/student/${userId}`, {
          params: { subject: selectedSubject !== "Tất cả" ? selectedSubject : undefined }
      });
      setDocuments(res.data || []);
    } catch (error) {
      console.error("Lỗi tải tài liệu:", error);
      toast.error("Không thể tải danh sách tài liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (docId: number, filename: string) => {
    // Mở URL tải file trong tab mới, trình duyệt sẽ tự động bắt link và tải về
    window.open(`http://localhost:8000/api/documents/download/${docId}`, '_blank');
    toast.success(`Đang tải xuống: ${filename}`);
  };

  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Xác định định dạng file để tô màu icon
  const getFileIcon = (filename: string) => {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (['pdf'].includes(ext || '')) return <FileText className="w-8 h-8 text-rose-500" />;
      if (['doc', 'docx'].includes(ext || '')) return <FileText className="w-8 h-8 text-blue-500" />;
      if (['xls', 'xlsx'].includes(ext || '')) return <FileText className="w-8 h-8 text-emerald-500" />;
      if (['ppt', 'pptx'].includes(ext || '')) return <FileText className="w-8 h-8 text-orange-500" />;
      return <File className="w-8 h-8 text-slate-400" />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Thư viện tài liệu</h1>
              <p className="text-slate-500 font-medium text-sm mt-1">Tải về giáo trình và bài giảng từ Giáo viên</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm tên tài liệu..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer shadow-sm"
              >
                <option value="Tất cả">Tất cả môn học</option>
                {enrolledSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-500 font-bold">Đang tải thư viện...</p>
          </div>
        ) : enrolledSubjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
            <LockKeyhole className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-600 uppercase mb-2">Chưa tham gia lớp học</h3>
            <p className="text-sm text-slate-500 max-w-md text-center mb-6">Bạn cần nhập mã lớp học để mở khóa tài liệu từ giáo viên.</p>
            <button onClick={() => window.location.href = '/adaptive'} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs shadow-md hover:bg-indigo-700 transition-all">Tham gia lớp ngay</button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">Không tìm thấy tài liệu nào khớp với yêu cầu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in duration-500">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
                    {getFileIcon(doc.filename)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug" title={doc.filename}>
                      {doc.filename}
                    </h3>
                    <span className="inline-block mt-2 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-wider rounded-lg border border-indigo-100">
                      {doc.subject}
                    </span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => handleDownload(doc.id, doc.filename)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Tải xuống
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
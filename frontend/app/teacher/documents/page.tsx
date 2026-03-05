'use client';

import { useState, useEffect } from 'react';
import { FileText, Trash2, Filter, Search, FolderOpen, Loader2, Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU ĐỂ HẾT BÁO ĐỎ
interface DocumentData {
  id: number;
  title: string;
  subject: string;
  file_path: string;
  created_at: string;
}

export default function DocumentLibrary() {
  // Gán kiểu DocumentData[] cho state
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [filterSubject, setFilterSubject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchDocs = async () => {
    try {
      // Lấy classId động từ localStorage, nếu chưa có thì tạm dùng 2
      const classId = localStorage.getItem("classId") || "2"; 
      const res = await axios.get(`http://localhost:8000/api/documents/class-documents/${classId}`);
      setDocuments(res.data);
    } catch (error) {
      toast.error("Lỗi khi tải kho tài liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  // 2. HÀM XỬ LÝ XÓA TÀI LIỆU
  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tài liệu: ${title}?`)) return;
    
    setDeleteId(id);
    try {
      await axios.delete(`http://localhost:8000/api/documents/delete/${id}`);
      toast.success("Đã xóa tài liệu");
      // Cập nhật lại danh sách ngay lập tức ở giao diện
      setDocuments(documents.filter(d => d.id !== id));
    } catch (error) {
      toast.error("Không thể xóa tài liệu");
    } finally {
      setDeleteId(null);
    }
  };

  const subjects = ['all', ...new Set(documents.map(doc => doc.subject))];

  const filteredDocs = documents.filter(doc => {
    const matchesSubject = filterSubject === 'all' || doc.subject === filterSubject;
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <FolderOpen className="text-indigo-600" size={32} />
            THƯ VIỆN HỌC LIỆU
          </h1>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1">
            Hệ thống lưu trữ và phân loại tri thức AI
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Tìm tên tài liệu..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg">
            <Filter size={14} />
            <select 
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-transparent text-xs font-black uppercase outline-none cursor-pointer"
            >
              {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s === 'all' ? 'Tất cả môn' : s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-4">
        {loading ? (
           <div className="flex items-center justify-center py-20">
             <Loader2 className="animate-spin text-indigo-600" size={32} />
           </div>
        ) : filteredDocs.length > 0 ? (
          filteredDocs.map((doc) => (
            <div key={doc.id} className="flex items-start gap-6 group">
              <div className="hidden lg:flex flex-col items-end w-32 pt-5 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  {doc.created_at.includes(' - ') ? doc.created_at.split(' - ')[1] : ''}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {doc.created_at.includes(' - ') ? doc.created_at.split(' - ')[0] : doc.created_at}
                </span>
              </div>

              <div className="flex-1 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                  </div>
                  <div>
                    <a 
                      href={`http://localhost:8000/${doc.file_path}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-bold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer block mb-1"
                    >
                      {doc.title}
                    </a>
                    <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-md">{doc.subject}</span>
                  </div>
                </div>

                {/* ĐÃ SỬA: Luôn hiển thị cụm nút bấm, thêm nút Tải xuống */}
                <div className="flex items-center gap-2 border-l border-slate-100 pl-4 ml-4">
                  <a 
                    href={`http://localhost:8000/${doc.file_path}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    download={doc.title}
                    className="p-2.5 text-slate-400 bg-slate-50 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition-all shadow-sm"
                    title="Tải tài liệu xuống"
                  >
                    <Download size={18} />
                  </a>

                  <button 
                    onClick={() => handleDelete(doc.id, doc.title)}
                    disabled={deleteId === doc.id}
                    className="p-2.5 text-slate-400 bg-slate-50 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-sm"
                    title="Xóa tài liệu này"
                  >
                    {deleteId === doc.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-slate-300 font-bold uppercase text-sm border-2 border-dashed border-slate-50 rounded-[3rem]">
            Kho lưu trữ trống
          </div>
        )}
      </div>
    </div>
  );
}
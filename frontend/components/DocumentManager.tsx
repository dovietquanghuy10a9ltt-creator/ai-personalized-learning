"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FileText, Trash2, Clock, BookOpen, Loader2 } from 'lucide-react';

interface Document {
  id: number;
  filename: string;
  subject: string;
  upload_time: string;
  class_id?: number; // Thêm class_id vào interface
}

// 1. Khai báo Interface Props để nhận classId từ TeacherPage
interface DocumentManagerProps {
  classId?: number | null;
}

export default function DocumentManager({ classId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Lấy danh sách tài liệu (Có lọc theo class_id nếu có)
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // Nếu có classId thì gửi kèm lên query string để Backend lọc
      const url = classId 
        ? `http://localhost:8000/api/upload/documents?class_id=${classId}`
        : `http://localhost:8000/api/upload/documents`;
        
      const res = await axios.get(url);
      setDocuments(res.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách tài liệu:", error);
      toast.error("Không thể tải danh sách tài liệu.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Tự động chạy lại khi classId thay đổi
  useEffect(() => {
    fetchDocuments();
  }, [classId]);

  // Xử lý xóa tài liệu
  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này khỏi kho học liệu của lớp?")) return;

    try {
      await axios.delete(`http://localhost:8000/api/upload/documents/${id}`);
      toast.success("Đã xóa tài liệu thành công!");
      // Cập nhật lại UI ngay lập tức
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (error) {
      toast.error("Không thể xóa tài liệu.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang truy xuất kho học liệu...</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" /> 
          Tri thức lớp ID: <span className="text-indigo-600">{classId || "Toàn bộ"}</span>
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          {documents.length} Tài liệu
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-6 py-4">Tên tài liệu</th>
              <th className="px-6 py-4">Môn học</th>
              <th className="px-6 py-4">Ngày tải lên</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {documents.length > 0 ? (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-700 truncate max-w-[300px]">{doc.filename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-white text-indigo-600 rounded text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                      {doc.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(doc.upload_time).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Xóa tài liệu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-slate-100" />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                      Lớp học này chưa được nạp tri thức
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
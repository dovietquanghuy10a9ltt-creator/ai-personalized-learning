"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Users, Mail, GraduationCap, Search, Trash2, 
  ChevronDown, ShieldAlert, BookOpenCheck 
} from 'lucide-react';

export default function ClassMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classList, setClassList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchMembers(selectedClassId);
    } else {
      setMembers([]);
    }
  }, [selectedClassId]);

  const fetchTeacherClasses = async () => {
    const teacherId = localStorage.getItem("userId") || localStorage.getItem("user_id");
    if (!teacherId) {
      toast.error("Vui lòng đăng nhập lại.");
      return;
    }
    try {
      const res = await axios.get(`http://localhost:8000/api/classroom/teacher/${teacherId}`);
      const classes = res.data || [];
      setClassList(classes);
      if (classes.length > 0) {
          setSelectedClassId(classes[0].id);
      } else {
          setLoading(false);
      }
    } catch (error) {
      toast.error("Lỗi khi tải danh sách lớp học");
      setLoading(false);
    }
  };

  const fetchMembers = async (classId: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/classroom/members/${classId}`);
      setMembers(res.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách học sinh");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (studentId: number, studentName: string) => {
    if (!window.confirm(`⚠️ Bạn có chắc chắn muốn xóa học sinh ${studentName} khỏi lớp này?`)) return;
    try {
      await axios.delete(`http://localhost:8000/api/classroom/remove-student/${studentId}`);
      toast.success(`Đã xóa học sinh ${studentName} khỏi lớp.`);
      setMembers(prev => prev.filter(m => m.id !== studentId));
    } catch (error) {
      toast.error("Lỗi khi xóa học sinh");
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-purple-100 text-purple-700'];
    const index = name.length % colors.length;
    return colors[index];
  };

  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // HÀM MỚI: Tự động bôi đen (highlight) chữ trùng khớp
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    
    // Tách chuỗi theo từ khóa (không phân biệt hoa thường)
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-amber-200 text-amber-900 rounded-sm px-0.5 font-black">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="min-h-[80vh] flex flex-col gap-6">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản lý thành viên</h1>
              <p className="text-slate-500 font-medium text-sm mt-1">Theo dõi và kiểm soát danh sách học sinh tham gia lớp</p>
            </div>
          </div>
        </div>

        {/* BỘ LỌC VÀ CHỌN LỚP */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          
          {/* Thanh tìm kiếm có nút bấm */}
          <div className="flex w-full sm:w-[300px] shadow-sm rounded-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm tên, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
              />
            </div>
            <button 
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-r-xl transition-colors border border-indigo-600 flex-shrink-0"
              onClick={() => { /* Danh sách đã tự lọc khi gõ */ }}
            >
              Tìm
            </button>
          </div>

          {/* Chọn lớp */}
          <div className="relative w-full sm:w-auto min-w-[180px]">
            <select 
              className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 shadow-sm cursor-pointer transition-all"
              value={selectedClassId || ""}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
            >
              {classList.length === 0 ? (
                <option value="">Chưa có lớp nào</option>
              ) : (
                classList.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Badge Số lượng */}
          <div className="hidden sm:flex px-4 py-2.5 bg-indigo-50 text-indigo-700 text-sm font-black rounded-xl border border-indigo-100 items-center gap-1.5 whitespace-nowrap shadow-sm">
            <BookOpenCheck className="w-4 h-4 text-indigo-500" />
            <span>{members.length}</span>
            <span>Học sinh</span>
          </div>
        </div>
      </div>

      {/* MAIN TABLE SECTION */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
           <div className="p-24 flex flex-col items-center justify-center">
             <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
             <div className="text-indigo-600 font-bold text-sm">Đang đồng bộ dữ liệu lớp học...</div>
           </div>
        ) : classList.length === 0 ? (
           <div className="p-24 flex flex-col items-center text-center">
             <ShieldAlert className="w-16 h-16 text-slate-200 mb-4" />
             <h3 className="text-lg font-black text-slate-700">Chưa có lớp học nào</h3>
             <p className="text-slate-500 font-medium mt-2">Vui lòng tạo lớp học mới để bắt đầu thêm học sinh.</p>
           </div>
        ) : members.length === 0 ? (
           <div className="p-24 text-center flex flex-col items-center bg-slate-50/50">
               <div className="w-24 h-24 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-6">
                   <GraduationCap className="w-12 h-12 text-indigo-300" />
               </div>
               <h3 className="text-xl font-black text-slate-800">Lớp học hiện đang trống</h3>
               <p className="text-slate-500 font-medium mt-2 max-w-sm">
                 Học sinh cần đăng nhập và nhập ID lớp <strong className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 mx-1">{selectedClassId}</strong> để tham gia.
               </p>
           </div>
        ) : filteredMembers.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">
              Không tìm thấy học sinh nào khớp với từ khóa "<strong className="text-slate-800">{searchTerm}</strong>".
            </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="p-5 pl-8 w-24 text-[11px] font-black text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Học sinh</th>
                  <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Tài khoản (Email)</th>
                  <th className="p-5 pr-8 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                    {/* ID */}
                    <td className="p-5 pl-8 font-bold text-slate-400">#{m.id}</td>
                    
                    {/* HỌ VÀ TÊN + AVATAR (Có Gọi Hàm Highlight) */}
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-sm ${getAvatarColor(m.full_name)}`}>
                          {m.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800">
                          {highlightText(m.full_name, searchTerm)}
                        </span>
                      </div>
                    </td>

                    {/* EMAIL (Có Gọi Hàm Highlight) */}
                    <td className="p-5">
                      <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <Mail className="w-4 h-4 opacity-40 group-hover:text-indigo-500 transition-colors" /> 
                        {highlightText(m.email, searchTerm)}
                      </div>
                    </td>

                    {/* THAO TÁC */}
                    <td className="p-5 text-right pr-8">
                      <button 
                        onClick={() => handleRemove(m.id, m.full_name)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm focus:ring-4 focus:ring-rose-50"
                        title="Xóa học sinh này"
                      >
                        <Trash2 className="w-4 h-4" /> 
                        <span className="hidden sm:inline">Xóa</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
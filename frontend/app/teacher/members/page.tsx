"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Users, Mail, GraduationCap, Search, Trash2, 
  ChevronDown, ShieldAlert, BookOpenCheck, LineChart as LineChartIcon, 
  X, History, BarChart3, Award
} from 'lucide-react';

import { 
  BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'; 

const SUBJECTS = [
  "Tất cả", "Vật lý", "Đại số tuyến tính", "Giải tích", "Tin học đại cương", 
  "Chuyên đề giới thiệu ngành CNTT", "Ngôn ngữ lập trình C++", 
  "Cấu trúc dữ liệu và giải thuật", "Hệ cơ sở dữ liệu", "Kiến trúc máy tính", 
  "Xác suất thống kê", "Toán học tính toán", "Mạng máy tính", 
  "PP lập trình hướng đối tượng", "Kỹ thuật truyền thông", "Cơ sở hệ điều hành"
];

export default function ClassMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classList, setClassList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [classStats, setClassStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [classSubject, setClassSubject] = useState<string>("Tất cả");

  const [viewingStudent, setViewingStudent] = useState<{id: number, name: string} | null>(null);
  const [studentSubject, setStudentSubject] = useState<string>("Tất cả");
  const [studentStats, setStudentStats] = useState({ avg: 0, total: 0, best: 0 });
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [studentStatsLoading, setStudentStatsLoading] = useState(false);

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

  useEffect(() => {
    if (selectedClassId) {
      fetchClassAnalytics(selectedClassId, classSubject);
    } else {
      setClassStats(null);
    }
  }, [selectedClassId, classSubject]);

  useEffect(() => {
    if (viewingStudent) { fetchStudentStats(viewingStudent.id, studentSubject); }
  }, [viewingStudent, studentSubject]);

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

  const fetchClassAnalytics = async (classId: number, subject: string) => {
    setStatsLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/stats/class/${classId}`, {
        params: { subject: subject === "Tất cả" ? "" : subject }
      });
      setClassStats(res.data);
    } catch (error) {
      console.error("Lỗi tải biểu đồ lớp", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchStudentStats = async (studentId: number, subject: string) => {
    setStudentStatsLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/stats/learning-stats`, {
        params: { user_id: studentId, subject: subject === "Tất cả" ? "" : subject }
      });
      setStudentHistory(res.data.history_list || []);
      setStudentStats({ 
        avg: res.data.avgScore || 0, 
        total: res.data.totalTests || 0, 
        best: res.data.bestScore || 0
      });
    } catch (error) {
      toast.error("Không thể tải điểm của học sinh này");
      setStudentHistory([]);
    } finally {
      setStudentStatsLoading(false);
    }
  };

  const handleRemove = async (studentId: number, studentName: string) => {
    if (!window.confirm(`⚠️ Bạn có chắc chắn muốn xóa học sinh ${studentName} khỏi lớp này?`)) return;
    try {
      await axios.delete(`http://localhost:8000/api/classroom/remove-student/${studentId}`);
      toast.success(`Đã xóa học sinh ${studentName} khỏi lớp.`);
      setMembers(prev => prev.filter(m => m.id !== studentId));
      if (selectedClassId) fetchClassAnalytics(selectedClassId, classSubject);
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

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-amber-200 text-amber-900 rounded-sm px-0.5 font-black">{part}</mark>
          ) : (<span key={i}>{part}</span>)
        )}
      </span>
    );
  };

  return (
    <div className="min-h-[80vh] flex flex-col gap-6 relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản lý lớp học</h1>
              <p className="text-slate-500 font-medium text-sm mt-1">Thống kê lớp học và kiểm soát danh sách học viên</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="flex w-full sm:w-[250px] shadow-sm rounded-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Tìm tên, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all" />
            </div>
          </div>

          <div className="relative w-full sm:w-auto min-w-[150px]">
            <select className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 shadow-sm cursor-pointer" value={selectedClassId || ""} onChange={(e) => setSelectedClassId(Number(e.target.value))}>
              {classList.length === 0 ? <option value="">Chưa có lớp</option> : classList.map(c => <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="hidden sm:flex px-4 py-2.5 bg-indigo-50 text-indigo-700 text-sm font-black rounded-xl border border-indigo-100 items-center gap-1.5 shadow-sm whitespace-nowrap">
            <BookOpenCheck className="w-4 h-4 text-indigo-500" /><span>{members.length}</span><span>Học sinh</span>
          </div>
        </div>
      </div>

      {/* --- KHU VỰC BIỂU ĐỒ THỐNG KÊ (CLASS ANALYTICS) --- */}
      {classStats && !statsLoading && members.length > 0 && (
        <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm animate-in fade-in duration-500">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
             <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
               <LineChartIcon className="w-5 h-5 text-indigo-600" /> Tổng quan dữ liệu
             </h2>
             
             <div className="flex items-center gap-3 w-full sm:w-auto">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Lọc theo môn:</span>
               <div className="relative w-full sm:min-w-[200px]">
                  <select 
                    className="w-full appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-sm cursor-pointer transition-all"
                    value={classSubject}
                    onChange={(e) => setClassSubject(e.target.value)}
                  >
                    {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Biểu đồ Phổ điểm */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" /> Phổ điểm 
              </h3>
              <div className="h-48 w-full">
                {classStats.score_dist.every((d: any) => d.value === 0) ? (
                   <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-300">Chưa có dữ liệu bài thi</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classStats.score_dist}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
                      
                      
                      <RechartsTooltip 
                        formatter={(value: any) => [value, 'Học sinh']} 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                      />
                      
                      <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 2. Biểu đồ Năng lực */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-500" /> Năng lực AI phân loại
              </h3>
              <div className="h-48 w-full flex flex-col items-center justify-center">
                {classStats.level_dist.every((d: any) => d.value === 0) ? (
                   <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-300">Chưa có dữ liệu bài thi</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={classStats.level_dist} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                          {classStats.level_dist.map((entry: any, index: number) => {
                            const COLORS = ['#94a3b8', '#3b82f6', '#8b5cf6']; 
                            return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                          })}
                        </Pie>
                        
                        
                        <RechartsTooltip 
                          formatter={(value: any) => [value, 'Học sinh']}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                        />

                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                       <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div> Beginner</span>
                       <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Inter</span>
                       <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Advanced</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. Biểu đồ Thời lượng học tập */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <History className="w-4 h-4 text-rose-500" /> Cường độ học tập (Phút)
              </h3>
              <div className="h-48 w-full">
                {classStats.study_hours.length === 0 ? (
                   <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-300">Chưa có dữ liệu học tập</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classStats.study_hours}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
                      
                      
                      <RechartsTooltip 
                        formatter={(value: any) => [`${value} phút`, 'Thời lượng']}
                        cursor={{fill: '#fff1f2'}} 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                      />
                      
                      <Bar dataKey="minutes" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- BẢNG DANH SÁCH HỌC SINH --- */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
        {loading || statsLoading ? (
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
                    <td className="p-5 pl-8 font-bold text-slate-400">#{m.id}</td>
                    
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

                    <td className="p-5">
                      <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <Mail className="w-4 h-4 opacity-40 group-hover:text-indigo-500 transition-colors" /> 
                        {highlightText(m.email, searchTerm)}
                      </div>
                    </td>

                    <td className="p-5 text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setViewingStudent({ id: m.id, name: m.full_name })}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm focus:ring-4 focus:ring-indigo-50"
                        >
                          <LineChartIcon className="w-4 h-4" /> 
                          <span className="hidden sm:inline">Xem kết quả</span>
                        </button>

                        <button 
                          onClick={() => handleRemove(m.id, m.full_name)}
                          className="inline-flex items-center justify-center p-2 text-sm font-bold text-slate-400 bg-white border border-slate-200 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm focus:ring-4 focus:ring-rose-50"
                        >
                          <Trash2 className="w-4 h-4" /> 
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- CỬA SỔ MODAL HIỂN THỊ KẾT QUẢ HỌC TẬP --- */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <LineChartIcon className="w-6 h-6 text-indigo-600" />
                  Kết quả học tập: {viewingStudent.name}
                </h3>
              </div>
              <button 
                onClick={() => setViewingStudent(null)}
                className="p-2 bg-white border border-slate-200 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Lọc theo môn:</span>
                <div className="relative min-w-[200px]">
                  <select 
                    className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                    value={studentSubject}
                    onChange={(e) => setStudentSubject(e.target.value)}
                  >
                    {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {studentStatsLoading ? (
                 <div className="p-12 text-center flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <span className="text-indigo-600 font-bold">Đang lấy dữ liệu bài thi...</span>
                 </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><History className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Tổng số bài thi</p>
                        <p className="text-2xl font-black text-slate-800">{studentStats.total}</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600"><BarChart3 className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Điểm trung bình</p>
                        <p className="text-2xl font-black text-slate-800">{studentStats.avg}%</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><Award className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Tốt nhất</p>
                        <p className="text-2xl font-black text-slate-800">{studentStats.best}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {studentHistory.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 font-bold">Học sinh này chưa có dữ liệu bài kiểm tra.</div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                          <tr>
                            <th className="p-4 pl-6 font-black text-slate-400 uppercase text-[10px] tracking-wider">Môn học</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-wider">Thời gian nộp</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-wider">Cấp độ</th>
                            <th className="p-4 pr-6 font-black text-slate-400 uppercase text-[10px] tracking-wider text-right">Điểm</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {studentHistory.map((h: any) => (
                            <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 pl-6 font-bold text-slate-600">{h.subject}</td>
                              <td className="p-4 text-slate-500 font-medium">{new Date(h.date).toLocaleString('vi-VN')}</td>
                              <td className="p-4"><span className="px-2 py-1 text-[10px] font-black uppercase rounded bg-slate-100 text-slate-500">{h.level}</span></td>
                              <td className="p-4 pr-6 text-right font-black text-indigo-600 text-lg">{h.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
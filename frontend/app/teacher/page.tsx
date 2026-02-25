"use client";
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FileUploader from '@/components/FileUploader';
import DocumentManager from '@/components/DocumentManager';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Plus, 
  Loader2, 
  ChevronRight,
  GraduationCap,
  Info
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function TeacherPage() {
  const router = useRouter();
  
  // --- STATE QUẢN LÝ ---
  const [refreshKey, setRefreshKey] = useState(0);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [newClassName, setNewClassName] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  // Kiểm tra quyền và lấy dữ liệu ban đầu
  useEffect(() => {
    const id = localStorage.getItem("userId");
    const role = localStorage.getItem("role");
    
    if (role !== 'teacher' || !id) {
      router.push('/auth');
      return;
    }

    setTeacherId(id);
    fetchClasses(id);
  }, [router]);

  const fetchClasses = async (id: string) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/classroom/teacher/${id}`);
      const data = res.data;
      setClasses(data);
      
      // Tự động chọn lớp đầu tiên nếu chưa chọn lớp nào
      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].id);
        setSelectedClassName(data[0].name);
      }
    } catch (e) {
      toast.error("Không thể tải danh sách lớp học");
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      toast.error("Vui lòng nhập tên lớp");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/api/classroom/create", {
        name: newClassName,
        teacher_id: parseInt(teacherId!)
      });
      toast.success(`Đã tạo lớp ${newClassName}`);
      setNewClassName("");
      fetchClasses(teacherId!);
      
      // Chuyển sang lớp vừa tạo
      if (res.data.class_id) {
        setSelectedClassId(res.data.class_id);
        setSelectedClassName(newClassName);
      }
    } catch (e) {
      toast.error("Lỗi khi tạo lớp học");
    } finally {
      setCreateLoading(false);
    }
  };

  // Callback khi upload thành công để refresh danh sách tài liệu
  const handleUploadSuccess = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    toast.success(`Đã cập nhật tri thức cho lớp ${selectedClassName}`);
  }, [selectedClassName]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <Toaster position="top-center" />
      
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <LayoutDashboard size={20} />
          </div>
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Teacher Console</h1>
        </div>
        <div className="px-4 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Quản trị viên lớp học</p>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* CỘT TRÁI: DANH SÁCH LỚP */}
          <section className="lg:col-span-4 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Quản lý tổ chức</h2>
              <h3 className="text-xl font-black text-slate-800">Lớp học của tôi</h3>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Tên lớp mới..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500 transition-all"
                />
                <button 
                  onClick={handleCreateClass}
                  disabled={createLoading}
                  className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-transform active:scale-95 shadow-md shadow-indigo-100"
                >
                  {createLoading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingClasses ? (
                  <div className="flex justify-center py-8 text-slate-400 animate-pulse font-bold text-xs uppercase tracking-widest">Đang tải...</div>
                ) : classes.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 text-[10px] font-black uppercase">Chưa có dữ liệu</div>
                ) : (
                  classes.map((cls: any) => (
                    <button 
                      key={cls.id} 
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setSelectedClassName(cls.name);
                      }}
                      className={`w-full group p-4 rounded-2xl flex items-center justify-between transition-all border-2 text-left
                        ${selectedClassId === cls.id 
                          ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-50' 
                          : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-sm transition-colors
                          ${selectedClassId === cls.id ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>
                          {cls.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{cls.name}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-tighter ${selectedClassId === cls.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                            ID: {cls.id}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className={`${selectedClassId === cls.id ? 'text-indigo-600 translate-x-1' : 'text-slate-300'} transition-all`} />
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                <GraduationCap className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32 group-hover:scale-110 transition-transform duration-500" />
                <h4 className="font-black text-sm uppercase mb-2 flex items-center gap-2">
                  <Info size={16} /> Hướng dẫn nhanh
                </h4>
                <p className="text-[11px] font-medium leading-relaxed text-indigo-100 relative z-10">
                  Chọn lớp tương ứng trước khi tải tài liệu. Hệ thống AI Agent sẽ tự động phân loại và chỉ cung cấp kiến thức này cho học sinh thuộc lớp đó.
                </p>
            </div>
          </section>

          {/* CỘT PHẢI: TÀI LIỆU LỚP HỌC */}
          <section className="lg:col-span-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {!selectedClassId ? (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <BookOpen size={64} className="text-slate-100 mb-4" />
                  <h3 className="text-xl font-black text-slate-800 uppercase">Hãy chọn lớp học</h3>
                  <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto font-medium">
                    Chọn một lớp học từ danh sách bên trái để bắt đầu quản lý tài liệu và tri thức AI.
                  </p>
              </div>
            ) : (
              <>
                {/* Upload Section */}
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <span className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">Đang làm việc tại: {selectedClassName}</span>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cập nhật tri thức lớp học</h3>
                  </div>
                  <div className="bg-white p-2 rounded-[2.5rem] shadow-sm border-2 border-indigo-100 ring-8 ring-indigo-50/30 transition-all">
                     <FileUploader 
                        onUploadSuccess={handleUploadSuccess} 
                        teacherId={teacherId} 
                        classId={selectedClassId} 
                     />
                  </div>
                </div>

                {/* List Section */}
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Kho lưu trữ nội bộ</span>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Tài liệu của {selectedClassName}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                    <DocumentManager 
                      key={`${selectedClassId}-${refreshKey}`} 
                      classId={selectedClassId} 
                    />
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
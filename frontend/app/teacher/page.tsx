"use client";
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FileUploader from '@/components/FileUploader';
import { 
  LayoutDashboard, 
  Plus, 
  Loader2, 
  ChevronRight,
  GraduationCap,
  Info,
  BookOpen,
  FolderOpen,
  Copy,
  Trash2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SUBJECTS = [
  "Vật lý", "Đại số tuyến tính", "Giải tích", "Tin học đại cương", 
  "Chuyên đề giới thiệu ngành CNTT", "Ngôn ngữ lập trình C++", 
  "Cấu trúc dữ liệu và giải thuật", "Hệ cơ sở dữ liệu", "Kiến trúc máy tính", 
  "Xác suất thống kê", "Toán học tính toán", "Mạng máy tính", 
  "PP lập trình hướng đối tượng", "Kỹ thuật truyền thông", "Cơ sở hệ điều hành"
];

export default function TeacherPage() {
  const router = useRouter();
  
  const [refreshKey, setRefreshKey] = useState(0);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  
  const [newClassName, setNewClassName] = useState("");
  const [newClassSubject, setNewClassSubject] = useState(""); 
  
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);

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

  const fetchClasses = async (id: string, selectNewId?: number) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/classroom/teacher/${id}`);
      const data = res.data;
      setClasses(data);
      
      // Nếu có ID lớp mới truyền vào, chọn luôn lớp đó
      if (selectNewId) {
          const newClass = data.find((c: any) => c.id === selectNewId);
          if (newClass) {
              setSelectedClassId(newClass.id);
              setSelectedClassName(newClass.name);
              localStorage.setItem("classId", newClass.id.toString());
              
              setRefreshKey(prev => prev + 1);
          }
      } 
      // Nếu load lần đầu, chọn lớp đầu tiên
      else if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].id);
        setSelectedClassName(data[0].name);
        localStorage.setItem("classId", data[0].id.toString());
      } else if (data.length === 0) {
        setSelectedClassId(null);
        setSelectedClassName("");
      }
    } catch (e) {
      toast.error("Không thể tải danh sách lớp học");
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      toast.error("Vui lòng nhập tên lớp!");
      return;
    }
    if (!newClassSubject) {
      toast.error("Vui lòng chọn môn học cho lớp này!");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/api/classroom/create", {
        name: newClassName,
        subject: newClassSubject,
        teacher_id: parseInt(teacherId!)
      });
      toast.success(`Đã tạo lớp ${newClassName} thành công!`);
      
      setNewClassName("");
      setNewClassSubject("");
      
      // Gọi lại hàm lấy danh sách lớp và báo nó chọn luôn lớp vừa tạo
      if (res.data.class_id) {
          fetchClasses(teacherId!, res.data.class_id);
      } else {
          fetchClasses(teacherId!);
      }
      
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || "Lỗi khi tạo lớp học";
      toast.error(errorMsg);
    } finally {
      setCreateLoading(false);
    }
  };

  // HÀM XÓA LỚP HỌC
  const handleDeleteClass = async (e: React.MouseEvent, classIdToDelete: number, className: string) => {
    e.stopPropagation(); // Ngăn sự kiện click chọn lớp
    
    if (!window.confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa lớp "${className}"? Toàn bộ tài liệu và học sinh trong lớp này sẽ bị gỡ bỏ!`)) {
        return;
    }

    try {
        await axios.delete(`http://localhost:8000/api/classroom/delete/${classIdToDelete}`);
        toast.success(`Đã xóa lớp ${className}`);
        
        // Cập nhật lại UI sau khi xóa
        if (selectedClassId === classIdToDelete) {
            setSelectedClassId(null);
            setSelectedClassName("");
        }
        
        fetchClasses(teacherId!);
    } catch (error: any) {
        const errorMsg = error.response?.data?.detail || "Lỗi khi xóa lớp học";
        toast.error(errorMsg);
    }
  };

  const handleUploadSuccess = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    toast.success(`Đã cập nhật tri thức cho lớp ${selectedClassName}`);
  }, [selectedClassName]);

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation(); 
    navigator.clipboard.writeText(code);
    toast.success(`Đã copy mã lớp: ${code}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <LayoutDashboard size={20} />
          </div>
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight hidden sm:block">Teacher Console</h1>
        </div>
        <div className="px-4 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Quản trị viên lớp học</p>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          <section className="lg:col-span-4 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Quản lý tổ chức</h2>
              <h3 className="text-xl font-black text-slate-800">Lớp học của tôi</h3>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-6 space-y-3">
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Tên lớp (VD: Lập trình C++ N01)..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500 transition-all placeholder:text-slate-400"
                />
                <div className="flex gap-2">
                  <select
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    className={`flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500 transition-all ${newClassSubject ? 'text-slate-800' : 'text-slate-400'}`}
                  >
                    <option value="" disabled>-- Chọn môn học --</option>
                    {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                  <button 
                    onClick={handleCreateClass}
                    disabled={createLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-transform active:scale-95 shadow-md shadow-indigo-100 flex items-center justify-center min-w-[3rem]"
                  >
                    {createLoading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                  </button>
                </div>
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
                        localStorage.setItem("classId", cls.id.toString());
                      }}
                      className={`w-full group p-4 rounded-2xl flex items-center justify-between transition-all border-2 text-left
                        ${selectedClassId === cls.id 
                          ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-50' 
                          : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-sm transition-colors shrink-0
                          ${selectedClassId === cls.id ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>
                          {cls.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 text-sm truncate">{cls.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className={`text-[10px] font-bold uppercase tracking-tighter ${selectedClassId === cls.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                              Mã lớp: <span className="font-black">{cls.class_code}</span>
                            </p>
                            <div 
                              onClick={(e) => handleCopyCode(e, cls.class_code)}
                              className={`p-1 rounded-md transition-colors cursor-pointer flex items-center justify-center
                                ${selectedClassId === cls.id ? 'text-indigo-500 hover:bg-indigo-100' : 'text-slate-400 hover:bg-slate-200 hover:text-indigo-600'}
                              `}
                              title="Click để Copy mã lớp"
                            >
                              <Copy size={12} />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* NÚT XÓA LỚP */}
                      <div className="flex items-center gap-2">
                          <div 
                              onClick={(e) => handleDeleteClass(e, cls.id, cls.name)}
                              className={`p-2 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100
                                ${selectedClassId === cls.id ? 'text-red-400 hover:bg-red-100 hover:text-red-600' : 'text-slate-400 hover:bg-red-50 hover:text-red-500'}
                              `}
                              title="Xóa lớp học này"
                          >
                              <Trash2 size={16} />
                          </div>
                          <ChevronRight size={16} className={`${selectedClassId === cls.id ? 'text-indigo-600 translate-x-1' : 'text-slate-300'} transition-all`} />
                      </div>
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
                  Chọn lớp tương ứng trước khi tải tài liệu. Nhấn vào biểu tượng Copy để lấy Mã Lớp và gửi cho học sinh tham gia.
                </p>
            </div>
          </section>

          <section className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <span className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">Đang làm việc tại: {selectedClassName}</span>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cập nhật tri thức lớp học</h3>
                  </div>
                  <div className="bg-white p-2 rounded-[2.5rem] shadow-sm border-2 border-indigo-100 ring-8 ring-indigo-50/30 transition-all">
                     <FileUploader 
                        key={refreshKey}
                        onUploadSuccess={handleUploadSuccess} 
                        teacherId={teacherId} 
                        classId={selectedClassId} 
                        externalClasses={classes} // Truyền dữ liệu lớp sang Uploader
                     />
                  </div>
                </div>

                <Link href="/teacher/documents" className="block group">
                  <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <FolderOpen size={28} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                          Mở thư viện tài liệu
                        </h4>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                          Xem, lọc và xóa các tài liệu đã tải lên của lớp {selectedClassName}
                        </p>
                      </div>
                    </div>
                    <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <ChevronRight className="text-slate-400 group-hover:text-indigo-600 transition-colors" size={20} />
                    </div>
                  </div>
                </Link>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
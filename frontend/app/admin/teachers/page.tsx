'use client';

import { useState } from 'react';
import { 
  UserPlus, 
  User, 
  Mail, 
  Loader2, 
  Copy, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function CreateTeacherPage() {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State lưu thông tin tài khoản vừa tạo để hiển thị Popup
  const [newAccount, setNewAccount] = useState<{ email: string; password: string; fullname: string } | null>(null);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNewAccount(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy Token xác thực. Vui lòng đăng nhập lại với quyền Admin!');
      }

      const res = await fetch('http://localhost:8000/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullname: fullname,
          email: email,
          role: 'teacher' // Ép cứng luôn là giáo viên!
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Có lỗi xảy ra từ máy chủ!');
      }

      // THÀNH CÔNG: Bắt lấy thông tin và hiện Popup
      setNewAccount({
        email: data.email,
        password: data.password,
        fullname: data.fullname
      });

      // Xóa trắng form 
      setFullname('');
      setEmail('');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Hàm hỗ trợ Copy nhanh mật khẩu
  const copyToClipboard = () => {
    if (newAccount) {
      navigator.clipboard.writeText(
        `Kính gửi thầy/cô ${newAccount.fullname},\nĐây là tài khoản hệ thống của thầy/cô:\n- Tài khoản: ${newAccount.email}\n- Mật khẩu: ${newAccount.password}\nVui lòng đăng nhập và đổi mật khẩu!`
      );
      alert('Đã copy thông tin tài khoản thành công!');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 flex flex-col items-center py-12 px-4 relative overflow-hidden font-sans">
      
      {/* Hiệu ứng nền */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[400px] h-[400px] bg-rose-100 rounded-full blur-[100px] opacity-60" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-slate-200 rounded-full blur-[100px] opacity-60" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Phần tiêu đề */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-white shadow-xl shadow-rose-100 mb-4 border border-rose-50">
            <UserPlus className="h-8 w-8 text-rose-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cấp tài khoản</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 uppercase tracking-widest">
            Dành riêng cho Giáo viên
          </p>
        </div>

        {/* Bảng Form nhập liệu */}
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 sm:p-10">
          <form onSubmit={handleCreateTeacher} className="space-y-6">
            
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Họ và tên Giáo viên</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Email / Tên đăng nhập</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                  placeholder="VD: gv.nguyenvana@school.edu"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 hover:bg-rose-600 transition-all active:scale-[0.98] shadow-xl shadow-slate-200 disabled:opacity-70 mt-4 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                  Tạo tài khoản
                </>
              )}
            </button>
          </form>
        </div>

        {/* POPUP HIỂN THỊ MẬT KHẨU NGẪU NHIÊN - BẢN NÂNG CẤP */}
        {newAccount && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-slate-100 transform transition-all animate-in zoom-in-95 duration-300">
              
              <div className="flex flex-col items-center text-center mb-6">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cấp thành công!</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Tài khoản cho giáo viên <span className="font-bold text-slate-800">{newAccount.fullname}</span> đã sẵn sàng.
                </p>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6 space-y-4">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Tài khoản truy cập</span>
                  <span className="text-slate-800 font-bold text-sm bg-white py-2 px-4 rounded-xl border border-slate-100">{newAccount.email}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Mật khẩu tạm thời</span>
                  <span className="text-rose-600 font-black text-2xl tracking-wider bg-rose-50 py-3 px-4 rounded-xl border border-rose-100 text-center">
                    {newAccount.password}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold p-3 rounded-xl mb-6 flex gap-2">
                <AlertCircle className="shrink-0 w-4 h-4" />
                <p>Mật khẩu này chỉ hiển thị 1 lần duy nhất để đảm bảo bảo mật. Hãy copy ngay!</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-rose-200"
                >
                  <Copy size={18} />
                  Sao chép gửi GV
                </button>
                <button
                  onClick={() => setNewAccount(null)}
                  className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-colors text-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";
import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound,
  Eye, 
  EyeOff, 
  Loader2, 
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // States lưu dữ liệu
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States ẩn/hiện mật khẩu
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Kiểm tra mật khẩu xác nhận
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu mới không khớp nhau!");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    setLoading(true);

    try {
      // Lấy token để gọi API bảo mật
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Vui lòng đăng nhập lại!");
        router.push('/auth');
        return;
      }

      // 2. Gọi API Đổi mật khẩu
      const res = await axios.post("http://localhost:8000/api/auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.success(res.data.message || "Đổi mật khẩu thành công!");
      setSuccess(true);
      
      // Xóa form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Mật khẩu cũ không chính xác hoặc có lỗi xảy ra.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Nút quay lại */}
      <button 
        onClick={() => router.back()} 
        className="absolute top-8 left-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 transition-all group z-20"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
        Quay lại
      </button>

      {/* Hiệu ứng nền */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[400px] h-[400px] bg-blue-100 rounded-full blur-[100px] opacity-60" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-indigo-100 rounded-full blur-[100px] opacity-60" />
      
      <div className="max-w-[480px] w-full bg-white backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-slate-100 p-10 space-y-8 relative z-10">
        
        <div className="text-center">
          <div className="inline-flex p-4 rounded-2xl bg-indigo-50 text-indigo-600 mb-6">
            <KeyRound size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">
            Đổi mật khẩu
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Hãy đặt mật khẩu mới an toàn hơn cho tài khoản của bạn.
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-4">
            <CheckCircle2 size={48} className="text-green-500 mx-auto" />
            <h3 className="text-lg font-bold text-green-800">Đổi mật khẩu thành công!</h3>
            <p className="text-sm text-green-600">Lần đăng nhập tiếp theo hãy sử dụng mật khẩu mới này nhé.</p>
            <button 
              onClick={() => router.back()}
              className="mt-4 px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
            >
              Quay về trang chủ
            </button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* MẬT KHẨU CŨ */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Mật khẩu hiện tại</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 text-slate-400" size={18} />
                <input
                  type={showOld ? "text" : "password"}
                  required
                  placeholder="Nhập mật khẩu cũ (hoặc mật khẩu cấp phát)"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-4 text-slate-400 hover:text-indigo-600">
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* MẬT KHẨU MỚI */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Mật khẩu mới</label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-4 text-slate-400" size={18} />
                <input
                  type={showNew ? "text" : "password"}
                  required
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 text-slate-400 hover:text-indigo-600">
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* XÁC NHẬN MẬT KHẨU MỚI */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Xác nhận mật khẩu mới</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 text-slate-400" size={18} />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 text-slate-400 hover:text-indigo-600">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-lg shadow-indigo-200 disabled:opacity-70 mt-4 flex justify-center"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : "Xác nhận đổi mật khẩu"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
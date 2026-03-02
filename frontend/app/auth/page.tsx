"use client";
import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2, 
  Eye, 
  EyeOff,
  ChevronLeft
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullname: '',
    role: 'student' // ÉP CỨNG: Bất cứ ai đăng ký ở ngoài đều là học sinh
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // FASTAPI YÊU CẦU FORM-DATA CHO ĐĂNG NHẬP (OAUTH2)
        const loginData = new URLSearchParams();
        loginData.append('username', formData.email); // Chú ý: backend nhận 'username' thay vì 'email'
        loginData.append('password', formData.password);

        const res = await axios.post("http://localhost:8000/api/auth/login", loginData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("fullname", res.data.fullname);
        localStorage.setItem("userId", res.data.userId);

        toast.success(`Chào mừng ${res.data.fullname} quay trở lại!`);
        
        // CHUYỂN HƯỚNG DỰA TRÊN ROLE
        setTimeout(() => {
          if (res.data.role === 'admin') {
            window.location.href = '/admin/teachers'; // Chuyển hướng Admin
          } else if (res.data.role === 'teacher') {
            window.location.href = '/teacher'; // Chuyển hướng Giáo viên
          } else {
            window.location.href = '/adaptive'; // Chuyển hướng Học sinh
          }
        }, 1000);
        
      } else {
        // ĐĂNG KÝ HỌC SINH MỚI
        await axios.post("http://localhost:8000/api/auth/register", formData);
        toast.success("Đăng ký thành công! Mời bạn đăng nhập.");
        setIsLogin(true);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Đã có lỗi xảy ra. Vui lòng thử lại.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Nút quay lại trang chủ */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 transition-all group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
        Trang chủ
      </Link>

      {/* Hiệu ứng nền */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-[120px] opacity-60" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-violet-50 rounded-full blur-[120px] opacity-60" />
      
      <div className="max-w-[480px] w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] border border-slate-100 p-10 md:p-12 space-y-8 relative z-10 animate-in fade-in zoom-in duration-500">
        
        <div className="text-center">
          <div className="inline-flex p-4 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 mb-6 transform hover:rotate-6 transition-transform cursor-pointer">
            <BrainCircuit size={32} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">
            {isLogin ? "Đăng nhập" : "Đăng ký"}
          </h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
            Hệ thống học tập cá nhân hóa AI
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Họ và tên</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Họ và tên của bạn"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                  onChange={(e) => setFormData({...formData, fullname: e.target.value})}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Email đăng nhập</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text" // Chuyển thành text để hỗ trợ đăng nhập tài khoản "admin" (không cần @)
                required
                placeholder={isLogin ? "Email hoặc 'admin'" : "example@learning.com"}
                className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Mật khẩu bảo mật</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all active:scale-[0.98] shadow-2xl shadow-slate-200 disabled:opacity-70 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                {isLogin ? "Đăng nhập hệ thống" : "Tạo tài khoản học tập"}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setShowPassword(false);
            }}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
          >
            {isLogin ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập tại đây"}
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";
import React from 'react';
import Link from 'next/link';
import { 
  BrainCircuit, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  ArrowRight, 
  Zap,
  ShieldCheck,
  Layout
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* 1. THANH ĐIỀU HƯỚNG TINH GỌN */}
      <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-xl border-b border-slate-100 z-50 px-6 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform">
              <BrainCircuit size={18} />
            </div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tighter">
              AI Learning Agent
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href="/auth" className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-widest px-4 py-2 transition-all">
              Đăng nhập
            </Link>
            <Link 
              href="/auth?mode=register" 
              className="px-5 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION - THU NHỎ & TINH TẾ */}
      <header className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-700">
            <Sparkles size={12} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Hệ thống tri thức cá nhân hóa</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
            Học tập đột phá cùng <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Trợ lý AI Agent
            </span>
          </h2>

          <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl mx-auto leading-relaxed">
            Kết nối tri thức từ giáo viên và sức mạnh AI để xây dựng lộ trình vá lỗ hổng kiến thức chuẩn xác cho từng học sinh.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link 
              href="/auth?mode=register" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-indigo-100 group active:scale-95"
            >
              Bắt đầu hành trình <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-600 border border-slate-200 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
              Xem bản demo
            </button>
          </div>
        </div>
      </header>

      {/* 3. TÍNH NĂNG - GRID NHỎ GỌN */}
      <section className="py-20 bg-slate-50/50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                <Zap size={20} />
              </div>
              <h3 className="text-sm font-black text-slate-800 mb-3 uppercase tracking-tight">AI Adaptive Learning</h3>
              <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
                Phân tích lỗi sai từ bài thi để tự động thiết lập lộ trình học tập tối ưu nhất.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                <BookOpen size={20} />
              </div>
              <h3 className="text-sm font-black text-slate-800 mb-3 uppercase tracking-tight">Kho tài liệu RAG</h3>
              <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
                Dữ liệu được trích xuất từ tài liệu chính thống của giáo viên, đảm bảo độ tin cậy.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-inner">
                <Layout size={20} />
              </div>
              <h3 className="text-sm font-black text-slate-800 mb-3 uppercase tracking-tight">Quản lý lớp học</h3>
              <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
                Dễ dàng tạo lớp, chia sẻ mã tham gia và theo dõi sự tiến bộ của từng học sinh.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="py-10 text-center border-t border-slate-100">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
          Dự án Học tập Cá nhân hóa • 2026
        </p>
      </footer>
    </div>
  );
}
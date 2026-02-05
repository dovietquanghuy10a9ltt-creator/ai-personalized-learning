"use client";
import React from 'react';
import Link from 'next/link';
import { 
  Library, 
  PenTool, 
  BarChart3, 
  Sparkles, 
  ArrowRight, 
  Zap,
  Play,
  Layers
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-12 pb-16 md:pt-24 md:pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-100/40 to-indigo-100/40 rounded-full blur-3xl -z-10 opacity-70"></div>
        
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-indigo-600 text-[11px] font-bold uppercase tracking-widest mb-6 shadow-sm animate-in fade-in slide-in-from-bottom-3">
            <Sparkles className="w-3 h-3" /> 
            Hệ thống học tập thông minh
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight animate-in fade-in slide-in-from-bottom-5 delay-100">
            Khai phá tiềm năng cùng <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Hệ thống AI Agents
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-6 delay-200">
            Nền tảng giáo dục tích hợp Agent chuyên biệt giúp bạn quản lý tri thức, luyện thi, đánh giá năng lực và tối ưu lộ trình học tập tự động.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 delay-300">
            <Link href="/assessment" className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-black transition-all shadow-xl shadow-slate-200 hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400 fill-current" />
              Kiểm tra ngay
            </Link>
            <Link href="/adaptive" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
              <Play className="w-4 h-4" />
              Gặp gia sư AI
            </Link>
          </div>
        </div>
      </section>

      {/* --- AGENTS GRID --- */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. Content Agent */}
          <FeatureCard 
            href="/upload"
            icon={<Library className="w-6 h-6 text-blue-600" />}
            iconBg="bg-blue-50"
            title="Tải tài liệu"
            desc="Tích hợp Content Agent tự động phân tích và trích xuất kiến thức từ tài liệu (PDF, Word) để xây dựng kho dữ liệu."
            linkText="Quản lý tài liệu"
            borderColor="hover:border-blue-200"
          />

          {/* 2. Assessment Agent */}
          <FeatureCard 
            href="/assessment"
            icon={<PenTool className="w-6 h-6 text-emerald-600" />}
            iconBg="bg-emerald-50"
            title="Bài tập kiểm tra"
            desc="Sử dụng Assessment Agent sinh câu hỏi trắc nghiệm thông minh, tích hợp Learner Profiling Agent đánh giá và phân loại năng lực học viên"
            linkText="Làm bài kiểm tra"
            borderColor="hover:border-emerald-200"
          />

          {/* 3. Evaluation Agent */}
          <FeatureCard 
            href="/evaluation"
            icon={<BarChart3 className="w-6 h-6 text-violet-600" />}
            iconBg="bg-violet-50"
            title="Theo dõi học tập"
            desc="Dùng Evaluation Agent phân tích kết quả, theo dõi nỗ lực và biểu đồ tiến bộ của bạn qua từng giai đoạn."
            linkText="Xem báo cáo"
            borderColor="hover:border-violet-200"
          />

          {/* 4. Adaptive Agent */}
          <FeatureCard 
            href="/adaptive"
            icon={<Sparkles className="w-6 h-6 text-orange-600" />}
            iconBg="bg-orange-50"
            title="Gia sư AI"
            desc="Đưa Adaptive Agent vào việc cá nhân hóa lộ trình học và giải đáp thắc mắc trực tiếp 24/7."
            linkText="Vào học ngay"
            borderColor="hover:border-orange-200"
            isHighlight={true}
          />

        </div>
      </section>

      {/* --- WORKFLOW: Quy trình học tập --- */}
      <section className="bg-white border-t border-slate-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             <div className="flex items-center gap-3">
                <Layers className="w-8 h-8 text-slate-300" />
                <span className="font-black text-xl text-slate-300 uppercase tracking-widest">Knowledge RAG</span>
             </div>
             <div className="h-px bg-slate-200 flex-1 hidden md:block"></div>
             <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-slate-300" />
                <span className="font-black text-xl text-slate-300 uppercase tracking-widest">Llama 3.3 Engine</span>
             </div>
             <div className="h-px bg-slate-200 flex-1 hidden md:block"></div>
             <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-slate-300" />
                <span className="font-black text-xl text-slate-300 uppercase tracking-widest">Real-time Analytics</span>
             </div>
          </div>
        </div>
      </section>

    </div>
  );
}


const FeatureCard = ({ href, icon, iconBg, title, desc, linkText, borderColor, isHighlight }: any) => {
  return (
    <Link 
      href={href} 
      className={`
        group flex flex-col bg-white p-8 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
        ${isHighlight ? 'border-orange-100 shadow-orange-50 ring-1 ring-orange-50' : 'border-slate-100 shadow-sm'}
        ${borderColor}
      `}
    >
      <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      
      <h3 className="text-lg font-black text-slate-800 mb-3">{title}</h3>
      
      <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 flex-grow">
        {desc}
      </p>
      
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 group-hover:text-indigo-600 transition-colors mt-auto">
        {linkText} 
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
};
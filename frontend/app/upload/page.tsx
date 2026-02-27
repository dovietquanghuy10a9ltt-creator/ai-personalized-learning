"use client";
import React, { useState, useEffect } from 'react';
import FileUploader from '@/components/FileUploader';
import { Database, ShieldCheck, Sparkles, Zap, Target } from 'lucide-react';

export default function UploadPage() {
  // --- STATE ĐỂ LƯU ID GIÁO VIÊN VÀ LỚP HỌC ---
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [classId, setClassId] = useState<number | null>(1); 

  // --- LẤY ID TỪ LOCALSTORAGE KHI LOAD TRANG ---
  useEffect(() => {
    const id = localStorage.getItem("userId") || localStorage.getItem("user_id");
    if (id) setTeacherId(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 md:py-12 font-sans">
      
      <div className="max-w-4xl mx-auto px-6 space-y-10">
        
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-2 border-slate-100">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-slate-900 rounded-[1.5rem] shadow-2xl shadow-slate-200 rotate-3">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                  Quản lý tri thức
                </h1>
                <Sparkles className="w-5 h-5 text-indigo-500 fill-current" />
              </div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
                Content Agent System
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
              AI Key Protection Enabled
            </span>
          </div>
        </div>

        {/* --- UPLOAD COMPONENT: COMPACT & BALANCED --- */}
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-3 border border-slate-50">
  
            <FileUploader teacherId={teacherId} classId={classId} />
          </div>
        </div>

        {/* --- FEATURES GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<Zap className="w-5 h-5 text-amber-500" />}
            title="Nhận diện tự động"
            desc="AI phân tích nội dung để xác định môn học chính xác."
          />
          <FeatureCard 
            icon={<Target className="w-5 h-5 text-indigo-500" />}
            title="Xử lý thông minh"
            desc="Tự động bóc tách kiến thức trọng tâm để soạn đề thi."
          />
          <FeatureCard 
            icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />}
            title="Độ tin cậy cao"
            desc="Dữ liệu được chuẩn hóa bởi mô hình Llama 3.3 70B."
          />
        </div>

        {/* --- FOOTER NOTE --- */}
        <div className="text-center pt-4">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Hệ thống đang hoạt động trên nền tảng RAG ổn định
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="font-black text-slate-800 text-sm mb-1 tracking-tight">{title}</h4>
      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
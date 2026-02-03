"use client";
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { UploadCloud, FileText, Loader2, X, CheckCircle2, ChevronDown, BrainCircuit } from 'lucide-react';

const SUBJECTS = [
  "Vật lý", "Đại số tuyến tính", "Giải tích", "Tin học đại cương", 
  "Chuyên đề giới thiệu ngành CNTT", "Ngôn ngữ lập trình C++", 
  "Cấu trúc dữ liệu và giải thuật", "Hệ cơ sở dữ liệu", "Kiến trúc máy tính", 
  "Xác suất thống kê", "Toán học tính toán", "Mạng máy tính", 
  "PP lập trình hướng đối tượng", "Kỹ thuật truyền thông", "Cơ sở hệ điều hành"
];

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const [selectedSubject, setSelectedSubject] = useState("");

  // 1. CHỌN FILE -> GỌI AI PHÂN TÍCH NGAY
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsAnalyzing(true);
    setSelectedSubject("");
    setProcessingStage('idle');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await axios.post("http://localhost:8000/api/upload/analyze-subject", formData);
      const suggested = res.data.suggested_subject;
      setSelectedSubject(suggested || "Khác");
      // Không toast ở đây để giữ giao diện sạch, người dùng sẽ thấy ngay ở dropdown
    } catch (error) {
      setSelectedSubject("Khác");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 2. NÚT XÁC NHẬN NẠP
  const handleConfirmUpload = async () => {
    if (!file || !selectedSubject) return;

    setIsUploading(true);
    setProcessingStage('uploading');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("manual_subject", selectedSubject);

    try {
      const res = await axios.post("http://localhost:8000/api/upload/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          const total = ev.total || file.size || 1;
          const percent = Math.round((ev.loaded * 100) / total);
          setUploadProgress(percent);
          if (percent >= 100) setProcessingStage('processing');
        },
      });
      setProcessingStage('done');
      toast.success("Nạp tri thức thành công!");
    } catch (error) {
      toast.error("Lỗi upload.");
      setProcessingStage('idle');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setSelectedSubject("");
    setProcessingStage('idle');
    setUploadProgress(0);
  };

  return (
    <div className="p-0"> {/* Bỏ padding to để component fit vào parent */}
      
      {/* --- TRẠNG THÁI 1: CHƯA CHỌN FILE --- */}
      {!file ? (
        <label className="flex flex-col items-center justify-center w-full h-44 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-indigo-500 transition-all bg-white group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className="p-3 bg-white border border-slate-100 rounded-full mb-3 shadow-sm group-hover:scale-110 transition-transform">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-sm text-slate-600 font-medium">
              <span className="font-bold text-indigo-600">Click</span> hoặc kéo thả tài liệu
            </p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">PDF, DOCX (Max 20MB)</p>
          </div>
          <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx,.txt" />
        </label>
      ) : (
        
        // --- TRẠNG THÁI 2: ĐÃ CHỌN FILE (Giao diện Form chuẩn) ---
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            
            {/* 1. Header hiển thị tên file */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white border border-slate-200 rounded flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{file.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>
                {!isUploading && processingStage !== 'done' && (
                    <button onClick={removeFile} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* 2. Body Form */}
            <div className="p-4 space-y-4">
                
                {/* A. Phần chọn môn học (Quan trọng) */}
                {isAnalyzing ? (
                    // Loading khi AI đang đoán
                    <div className="py-2 flex items-center gap-2 text-indigo-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs font-bold">AI đang phân tích nội dung...</span>
                    </div>
                ) : processingStage !== 'done' ? (
                    // Form chọn môn (Giao diện Input chuẩn, không màu mè)
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
                            <span>Môn học</span>
                            <span className="flex items-center gap-1 text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                <BrainCircuit className="w-3 h-3" /> AI Gợi ý
                            </span>
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                disabled={isUploading}
                                className="w-full p-2.5 pl-3 pr-8 bg-white border border-slate-300 rounded-md text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer hover:border-slate-400"
                            >
                                <option value="" disabled>-- Chọn môn học --</option>
                                {SUBJECTS.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                                <option value="Khác">Khác</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                ) : (
                    // Hoàn tất (Chỉ hiện text, không hiện input)
                    <div className="flex items-center gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div>
                            <p className="text-xs font-bold text-emerald-700 uppercase">Lưu trữ thành công</p>
                            <p className="text-[10px] text-emerald-600">Môn: {selectedSubject}</p>
                        </div>
                    </div>
                )}

                {/* B. Thanh tiến độ (Chỉ hiện khi đang upload) */}
                {isUploading && (
                    <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                            <span>{processingStage === 'uploading' ? "Uploading..." : "Processing..."}</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-indigo-600 rounded-full transition-all duration-200 ease-out" 
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                            {processingStage === 'processing' && (
                                <div className="absolute inset-0 w-full h-full bg-white/30 animate-[shimmer_1s_infinite]"></div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Nút bấm Action */}
                {!isUploading && processingStage !== 'done' && (
                    <button 
                        onClick={handleConfirmUpload}
                        disabled={isAnalyzing || !selectedSubject}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        Xác nhận nạp
                    </button>
                )}

                {processingStage === 'done' && (
                    <button 
                        onClick={removeFile}
                        className="w-full py-2.5 bg-white border border-slate-300 text-slate-600 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all mt-2"
                    >
                        Nạp tài liệu khác
                    </button>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
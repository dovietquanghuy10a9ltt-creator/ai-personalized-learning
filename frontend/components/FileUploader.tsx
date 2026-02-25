"use client";
import React, { useState, useCallback } from 'react';
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

// Cập nhật Interface nhận classId và teacherId
interface FileUploaderProps {
  onUploadSuccess?: () => void;
  teacherId: string | null;
  classId: number | null;
}

export default function FileUploader({ onUploadSuccess, teacherId, classId }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  const processFile = async (selectedFile: File) => {
    if (!selectedFile) return;

    const validTypes = ['.pdf', '.docx', '.txt', '.pptx'];
    const fileExt = "." + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExt)) {
      toast.error("Định dạng file không hỗ trợ! Chỉ nhận PDF, DOCX, PPTX.");
      return;
    }

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
    } catch (error) {
      console.error(error);
      setSelectedSubject("Khác");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFile(droppedFiles[0]);
    }
  }, []);

  const handleConfirmUpload = async () => {
    if (!file || !selectedSubject) return;
    
    // Kiểm tra classId trước khi upload
    if (!classId) {
        toast.error("Lỗi: Vui lòng chọn một lớp học trước khi nạp tài liệu!");
        return;
    }

    setIsUploading(true);
    setProcessingStage('uploading');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("manual_subject", selectedSubject);
    
    // GỬI KÈM ID GIÁO VIÊN VÀ ID LỚP HỌC
    if (teacherId) formData.append("teacher_id", teacherId);
    formData.append("class_id", classId.toString());

    try {
      await axios.post("http://localhost:8000/api/upload/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          const total = ev.total || file.size || 1;
          const percent = Math.round((ev.loaded * 100) / total);
          setUploadProgress(percent);
          if (percent >= 100) setProcessingStage('processing');
        },
      });
      
      setProcessingStage('done');
      toast.success("Đã nạp tri thức riêng cho lớp học này!");

      if (onUploadSuccess) {
        onUploadSuccess();
      }

    } catch (error) {
      toast.error("Lỗi upload tài liệu vào lớp học.");
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
    <div className="p-0">
      {!file ? (
        <label 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-44 border border-dashed rounded-lg cursor-pointer transition-all bg-white group
            ${isDragActive 
              ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' 
              : 'border-slate-300 hover:bg-slate-50 hover:border-indigo-500'
            }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
            <div className={`p-3 border rounded-full mb-3 shadow-sm transition-transform
                ${isDragActive ? 'bg-white border-indigo-200 scale-110' : 'bg-white border-slate-100 group-hover:scale-110'}`}>
                <UploadCloud className={`w-5 h-5 text-indigo-600`} />
            </div>
            <p className="text-sm text-slate-600 font-medium">
              <span className="font-bold text-indigo-600">Click</span> hoặc kéo thả tài liệu
            </p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">LỚP ID: {classId || "Chưa chọn"}</p>
          </div>
          <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx,.txt,.pptx" />
        </label>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {/* ... Phần hiển thị file đang nạp giữ nguyên ... */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white border border-slate-200 rounded flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{file.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Lớp ID: {classId}</p>
                    </div>
                </div>
                {!isUploading && processingStage !== 'done' && (
                    <button onClick={removeFile} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {isAnalyzing ? (
                    <div className="py-2 flex items-center gap-2 text-indigo-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs font-bold">AI đang phân tích nội dung...</span>
                    </div>
                ) : processingStage !== 'done' ? (
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
                                className="w-full p-2.5 pl-3 pr-8 bg-white border border-slate-300 rounded-md text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-all cursor-pointer hover:border-slate-400"
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
                    <div className="flex items-center gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div>
                            <p className="text-xs font-bold text-emerald-700 uppercase">Lưu trữ thành công</p>
                            <p className="text-[10px] text-emerald-600">Tài liệu đã được gắn vào lớp học.</p>
                        </div>
                    </div>
                )}

                {isUploading && (
                    <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                            <span>{processingStage === 'uploading' ? "Uploading..." : "Processing..."}</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden relative">
                            <div 
                                className="h-full bg-indigo-600 rounded-full transition-all duration-200" 
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {!isUploading && processingStage !== 'done' && (
                    <button 
                        onClick={handleConfirmUpload}
                        disabled={isAnalyzing || !selectedSubject}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-sm active:scale-95 disabled:opacity-50 mt-2"
                    >
                        Xác nhận nạp cho lớp {classId}
                    </button>
                )}

                {processingStage === 'done' && (
                    <button 
                        onClick={removeFile}
                        className="w-full py-2.5 bg-white border border-slate-300 text-slate-600 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all mt-2"
                    >
                        Nạp thêm tài liệu
                    </button>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
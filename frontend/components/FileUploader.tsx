"use client";
import React, { useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const SUBJECTS = [
  "Vật lý", "Đại số tuyến tính", "Giải tích", "Tin học đại cương",
  "Chuyên đề giới thiệu ngành CNTT", "Ngôn ngữ lập trình C++",
  "Cấu trúc dữ liệu và giải thuật", "Hệ cơ sở dữ liệu",
  "Kiến trúc máy tính", "Xác suất thống kê", "Toán học tính toán",
  "Mạng máy tính", "PP lập trình hướng đối tượng",
  "Kỹ thuật truyền thông", "Cơ sở hệ điều hành"
];

const FileUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0); // Thêm state tiến độ

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setMessage("");
    setIsAnalyzing(true);
    setSelectedSubject("");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await axios.post("http://localhost:8000/api/analyze-subject", formData);
      const suggested = res.data.suggested_subject;
      setSelectedSubject(suggested);
      toast.success(`AI gợi ý môn: ${suggested}`);
    } catch (error) {
      console.error("Lỗi phân tích gợi ý:", error);
      setSelectedSubject("Khác");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedSubject) return;

    setUploading(true);
    setMessage("");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("manual_subject", selectedSubject);

    try {
      await axios.post("http://localhost:8000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        // Lấy tiến độ tải lên thực tế
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadProgress(percentCompleted);
        },
      });
      setMessage(`✅ Đã lưu tài liệu vào môn: ${selectedSubject}`);
      setFile(null);
      setSelectedSubject("");
    } catch (error) {
      setMessage("❌ Lỗi khi nạp tài liệu vào hệ thống.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-50 max-w-md mx-auto">
      <Toaster />
      <h3 className="text-lg font-bold mb-5 text-gray-800">Tải lên tài liệu học tập</h3>
      
      <div className="flex flex-col gap-4">
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative group">
            <input 
                type="file" 
                accept=".pdf,.docx,.pptx" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
                <div className="text-blue-600 font-bold text-sm">📄 {file.name}</div>
            ) : (
                <div className="text-gray-400">
                    <span className="text-3xl block mb-2">📥</span>
                    <span className="text-xs font-bold uppercase tracking-widest">Click để chọn file</span>
                </div>
            )}
        </div>

        {file && (
          <div className={`p-4 rounded-2xl border transition-all ${isAnalyzing ? 'bg-gray-50 border-gray-100' : 'bg-blue-50 border-blue-100 animate-in fade-in slide-in-from-top-1'}`}>
            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2 text-left">
              {isAnalyzing ? "🔄 AI Đang phân tích nội dung..." : "💡 AI gợi ý môn học này:"}
            </label>
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={isAnalyzing}
              className="w-full p-2 bg-white border border-blue-200 rounded-xl text-sm font-bold text-gray-700 outline-none"
            >
              <option value="" disabled>--- Chọn môn học ---</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Khác">Khác</option>
            </select>
          </div>
        )}

        {/* Thanh Tiến Độ Upload */}
        {uploading && (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-blue-600 uppercase tracking-widest">
              <span>Đang tải lên dữ liệu...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <button 
            onClick={handleUpload} 
            disabled={!file || isAnalyzing || uploading}
            className={`py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-md active:scale-95 ${
                (file && !isAnalyzing) 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
        >
            {uploading ? "XỬ LÝ DỮ LIỆU..." : "Xác nhận và Lưu"}
        </button>

        {message && (
            <div className={`p-3 rounded-xl text-[11px] font-bold text-center ${message.includes("Lỗi") ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"}`}>
                {message}
            </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
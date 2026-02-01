"use client";
import React, { useState } from 'react';
import axios from 'axios';

const FileUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setMessage(""); // Reset thông báo cũ
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Gọi API Upload
      await axios.post("http://localhost:8000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("✅ Upload & Xử lý thành công! AI đã học xong tài liệu.");
      setFile(null); // Reset file sau khi up
    } catch (error) {
      console.error(error);
      setMessage("❌ Lỗi khi upload tài liệu.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Tải lên tài liệu học tập</h3>
      
      <div className="flex flex-col gap-4">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition cursor-pointer relative">
            <input 
                type="file" 
                // CHẤP NHẬN ĐA ĐỊNH DẠNG
                accept=".pdf,.docx,.pptx" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
                <div className="text-green-600 font-medium">
                    📄 {file.name}
                </div>
            ) : (
                <div className="text-gray-500">
                    <span className="text-4xl block mb-2">📥</span>
                    <span className="font-semibold text-blue-600">Click để chọn file</span>
                    <p className="text-xs mt-1">Hỗ trợ: PDF, Word (.docx), PowerPoint (.pptx)</p>
                </div>
            )}
        </div>

        {uploading ? (
            <button disabled className="bg-gray-400 text-white py-3 rounded-xl font-bold cursor-not-allowed flex justify-center items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Đang AI xử lý...
            </button>
        ) : (
            <button 
                onClick={handleUpload} 
                disabled={!file}
                className={`py-3 rounded-xl font-bold transition ${
                    file 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
                Bắt đầu Upload
            </button>
        )}

        {message && (
            <p className={`text-center text-sm font-bold ${message.includes("Lỗi") ? "text-red-500" : "text-green-600"}`}>
                {message}
            </p>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
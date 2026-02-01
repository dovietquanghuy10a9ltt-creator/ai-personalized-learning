"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Danh sách 15 môn học
const SUBJECTS = [
  "Vật lý", "Đại số tuyến tính", "Giải tích", 
  "Tin học đại cương", "Chuyên đề giới thiệu ngành CNTT",
  "Ngôn ngữ lập trình C++", "Cấu trúc dữ liệu và giải thuật", 
  "Hệ cơ sở dữ liệu", "Kiến trúc máy tính", "Xác suất thống kê", 
  "Toán học tính toán", "Mạng máy tính", 
  "PP lập trình hướng đối tượng", "Kỹ thuật truyền thông", 
  "Cơ sở hệ điều hành"
];

export default function EvaluationPage() {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[6]); 
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async (subject: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/assessment/history/${subject}`);
      setData(res.data);
    } catch (error) {
      console.error("Lỗi tải lịch sử:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(selectedSubject);
  }, [selectedSubject]);

  // --- HÀM XỬ LÝ THỜI GIAN (MỚI) ---
  
  // 1. Chuyển đổi giờ UTC (Server) sang giờ Việt Nam
  const formatDateTime = (isoString: string) => {
    // Thêm 'Z' vào cuối để báo hiệu đây là giờ UTC, trình duyệt sẽ tự cộng 7 tiếng
    const date = new Date(isoString.endsWith("Z") ? isoString : isoString + "Z");
    return date.toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // 2. Hiển thị thời lượng chi tiết (Phút : Giây)
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} giây`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min} phút ${sec} giây`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-2xl">📊</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Evaluation Dashboard</h1>
            <p className="text-gray-500">Phân tích nỗ lực và tiến bộ học tập theo thời gian thực</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Chọn môn cần xem báo cáo:</label>
          <select 
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full md:w-1/2 p-3 border rounded-lg bg-gray-50 font-medium focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
          >
            {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>

        {loading ? (
           <div className="text-center py-20 text-gray-500 flex flex-col items-center">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
             ⏳ Đang phân tích dữ liệu học tập...
           </div>
        ) : data && data.history && data.history.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Cột Trái: Summary */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <h3 className="text-gray-400 text-xs font-bold uppercase">Trình độ hiện tại</h3>
                <div className={`text-3xl font-black mt-1 ${
                  data.summary.latest_level === 'Advanced' ? 'text-green-600' : 
                  data.summary.latest_level === 'Intermediate' ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {data.summary.latest_level}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {/* Sửa hiển thị ngày cập nhật */}
                  Cập nhật: {formatDateTime(data.history[0].timestamp)}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                <h3 className="text-gray-400 text-xs font-bold uppercase">Điểm trung bình (Hệ 10)</h3>
                <div className="text-3xl font-black text-green-600 mt-1">
                  {data.summary.average_score} <span className="text-lg text-gray-400 font-normal">/ 10</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                <h3 className="text-gray-400 text-xs font-bold uppercase">Đánh giá Nỗ lực</h3>
                <div className={`text-2xl font-black mt-1 ${
                    data.summary.effort_level.includes("Cao") || data.summary.effort_level.includes("tiến bộ") ? "text-green-600" : 
                    data.summary.effort_level.includes("Mới") ? "text-blue-600" : "text-yellow-600"
                }`}>
                    {data.summary.effort_level}
                </div>
                <p className="text-xs text-gray-500 mt-2">Đã làm bài tập: {data.summary.total_attempts} lần</p>
              </div>
            </div>

            {/* Cột Phải: Bảng Lịch sử */}
            <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex justify-between items-center">
                Lịch sử tiến bộ
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Mới nhất lên đầu</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-xs text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-2">Thời gian nộp</th>
                      <th className="py-3 px-2 text-center">Điểm số</th>
                      <th className="py-3 px-2">Xếp loại</th>
                      <th className="py-3 px-2 text-right">Thời lượng làm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((h: any, idx: number) => (
                      <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50 transition group">
                        
                        {/* 1. SỬA THỜI GIAN NỘP BÀI (Hiện đúng giờ VN) */}
                        <td className="py-4 px-2 text-sm text-gray-600 font-medium">
                          {formatDateTime(h.timestamp)}
                        </td>

                        <td className="py-4 px-2 text-center">
                           <span className={`font-bold ${h.score >= 80 ? 'text-green-600' : h.score >= 50 ? 'text-blue-600' : 'text-red-500'}`}>
                             {Math.round(h.score)}%
                           </span>
                        </td>
                        
                        <td className="py-4 px-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block w-28 text-center ${
                            h.level_at_time === 'Advanced' ? 'bg-green-100 text-green-700' :
                            h.level_at_time === 'Intermediate' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {h.level_at_time}
                          </span>
                        </td>

                        {/* 2. SỬA THỜI LƯỢNG LÀM BÀI (Hiện giây chính xác) */}
                        <td className="py-4 px-2 text-sm text-gray-500 text-right group-hover:text-blue-600 font-medium">
                          ⏱️ {formatDuration(h.duration_seconds)}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="text-6xl mb-4 opacity-50">📉</div>
            <h3 className="text-xl font-bold text-gray-700">Chưa có dữ liệu đánh giá</h3>
            <p className="text-gray-500 mb-6 mt-2">Bạn chưa làm bài kiểm tra nào cho môn <span className="font-bold text-gray-800">{selectedSubject}</span>.</p>
            <a href="/assessment" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-lg font-medium">
              Làm bài kiểm tra ngay
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
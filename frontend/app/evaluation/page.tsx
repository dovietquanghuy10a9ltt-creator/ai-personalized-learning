"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// Danh sách môn học
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
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[11]); // Mặc định Mạng máy tính
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Gọi API lấy dữ liệu theo môn đã chọn
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`http://localhost:8000/api/assessment/history/${selectedSubject}`);
        setData(res.data);
      } catch (error) {
        console.error("Lỗi tải lịch sử:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [selectedSubject]);

  // --- HÀM XỬ LÝ THỜI GIAN (FIX LỖI MÚI GIỜ) ---
  const formatDateTime = (isoString: string) => {
    if (!isoString) return "--:--";
    // Thêm Z nếu server trả về thiếu để browser hiểu là UTC
    const dateStr = isoString.endsWith("Z") ? isoString : isoString + "Z";
    return new Date(dateStr).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0s";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return min > 0 ? `${min}p ${sec}s` : `${sec}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-8">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* TIÊU ĐỀ & CHỌN MÔN */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Kết quả học tập</h1>
            <p className="text-gray-500 text-sm">Theo dõi sự tiến bộ chi tiết từng môn học</p>
          </div>
          
          <div className="w-full md:w-auto">
             <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
             >
                {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
             </select>
          </div>
        </div>

        {loading ? (
           <div className="py-20 text-center text-blue-600 font-bold animate-pulse">⏳ Đang tải dữ liệu môn {selectedSubject}...</div>
        ) : !data || !data.history || data.history.length === 0 ? (
           <div className="bg-white p-10 rounded-3xl text-center shadow-sm border border-gray-100">
              <div className="text-4xl mb-3">📭</div>
              <h3 className="font-bold text-gray-800">Chưa có dữ liệu cho môn này</h3>
              <p className="text-gray-500 text-sm mb-6">Bạn chưa làm bài kiểm tra nào thuộc môn {selectedSubject}.</p>
              <a href="/assessment" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700">Làm bài kiểm tra ngay</a>
           </div>
        ) : (
           <div className="space-y-6">
              
              {/* --- PHẦN 1: SUMMARY CARDS (GIỮ NGUYÊN THEO Ý BẠN) --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Card 1: Trình độ */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Trình độ hiện tại</p>
                    <div className="text-2xl font-black text-blue-600 mt-2">{data.summary.latest_level}</div>
                    <p className="text-[10px] text-gray-400 mt-1">Dựa trên kết quả bài gần nhất</p>
                 </div>

                 {/* Card 2: Điểm TB */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Điểm trung bình</p>
                    <div className="text-2xl font-black text-green-600 mt-2">{data.summary.average_score}/100</div>
                    <p className="text-[10px] text-gray-400 mt-1">Trung bình cộng tất cả các lần thi</p>
                 </div>

                 {/* Card 3: Nỗ lực */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-orange-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Đánh giá nỗ lực</p>
                    <div className="text-2xl font-black text-orange-600 mt-2">{data.summary.effort_level}</div>
                    <p className="text-[10px] text-gray-400 mt-1">Đã làm tổng cộng: {data.summary.total_attempts} bài</p>
                 </div>
              </div>

              {/* --- PHẦN 2: BIỂU ĐỒ (MỚI THÊM) --- */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                 <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-6">📉 Biểu đồ tiến bộ môn {selectedSubject}</h3>
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={data.history}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          {/* Format ngày tháng trên trục X cho gọn */}
                          <XAxis 
                            dataKey="date" 
                            fontSize={10} 
                            tickFormatter={(str) => new Date(str).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'})}
                            axisLine={false} tickLine={false} 
                          />
                          <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip 
                            labelFormatter={(label) => formatDateTime(label)}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                          />
                          <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb'}} />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* --- PHẦN 3: BẢNG CHI TIẾT (MỚI THÊM) --- */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-50">
                    <h3 className="text-xs font-black text-gray-800 uppercase">Lịch sử chi tiết</h3>
                 </div>
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                       <tr>
                          <th className="px-6 py-3">Thời gian</th>
                          <th className="px-6 py-3 text-center">Cấp độ</th>
                          <th className="px-6 py-3 text-center">Thời lượng</th>
                          <th className="px-6 py-3 text-center">Kết quả</th>
                          <th className="px-6 py-3 text-right">Điểm số</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {/* Đảo ngược mảng để hiện bài mới nhất lên đầu */}
                       {[...data.history].reverse().map((item: any) => (
                          <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                             <td className="px-6 py-4 text-xs font-medium text-gray-600">
                                {formatDateTime(item.date)}
                             </td>
                             <td className="px-6 py-4 text-center">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase">
                                   {item.level}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-center text-xs text-gray-500">
                                {formatDuration(item.duration)}
                             </td>
                             <td className="px-6 py-4 text-center text-xs font-bold text-gray-700">
                                {item.correct}/{item.total} câu
                             </td>
                             <td className="px-6 py-4 text-right">
                                <span className={`text-sm font-black ${
                                   item.score >= 80 ? 'text-green-600' : (item.score >= 50 ? 'text-blue-600' : 'text-red-500')
                                }`}>
                                   {Math.round(item.score)}%
                                </span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
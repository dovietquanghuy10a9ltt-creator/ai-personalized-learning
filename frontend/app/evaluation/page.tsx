"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart3, History, TrendingUp, Calendar, Target, Award, ChevronDown, 
  Clock, ArrowUpRight, ArrowDownRight, Minus, Timer 
} from 'lucide-react';

// 1. Định nghĩa Interface đầy đủ cho các hạng mục
interface AssessmentItem {
  id: number;
  date: string;
  duration: string | number;
  score: number;
  subject: string;
  level?: string;
  trend?: number;
}

interface StatsData {
  avg: number;
  total: number;
  best: number;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
}

const SUBJECTS = [
  "Vật lý", "Đại số tuyến tính", "Giải tích", "Tin học đại cương", 
  "Chuyên đề giới thiệu ngành CNTT", "Ngôn ngữ lập trình C++", 
  "Cấu trúc dữ liệu và giải thuật", "Hệ cơ sở dữ liệu", "Kiến trúc máy tính", 
  "Xác suất thống kê", "Toán học tính toán", "Mạng máy tính", 
  "PP lập trình hướng đối tượng", "Kỹ thuật truyền thông", "Cơ sở hệ điều hành"
];

export default function EvaluationPage() {
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECTS[11]); 
  const [history, setHistory] = useState<AssessmentItem[]>([]); 
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<StatsData>({ avg: 0, total: 0, best: 0 });

  useEffect(() => {
    fetchHistory();
  }, [selectedSubject]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // --- SỬA LỖI TẠI ĐÂY: Quét đúng biến ID và tuyệt đối KHÔNG gán mặc định số 2 ---
      const storedId = localStorage.getItem('userId') || localStorage.getItem('user_id');
      const userId = storedId ? parseInt(storedId, 10) : null;

      // Nếu không tìm thấy ID, ngắt luôn không cho gọi API
      if (!userId) {
        console.error("🚨 LỖI: Không tìm thấy ID học sinh! Vui lòng đăng nhập lại.");
        setHistory([]);
        setStats({ avg: 0, total: 0, best: 0 });
        setLoading(false);
        return; 
      }

      const res = await axios.get(`http://localhost:8000/api/stats/learning-stats`, {
        params: {
          user_id: userId, // Lúc này userId chắc chắn là ID của người đang đăng nhập (VD: 3)
          subject: selectedSubject
        }
      });

      // Nhặt mảng lịch sử từ đúng tên 'history_list' mà backend trả về
      const data = res.data.history_list || [];
      setHistory(data);
      
      // Nhặt 3 con số thống kê nằm ngay bên ngoài
      setStats({ 
        avg: Math.round(res.data.avgScore || 0), 
        total: res.data.totalTests || 0, 
        best: Math.round(res.data.bestScore || 0) 
      });

    } catch (error) {
      console.error("Lỗi fetch stats:", error);
      setHistory([]);
      setStats({ avg: 0, total: 0, best: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Xử lý múi giờ UTC -> Giờ Việt Nam chuẩn xác
  const formatDateTime = (dateStr: string): string => {
    if(!dateStr) return "N/A";
    
    // Nếu Backend đã gửi chuỗi format sẵn "HH:mm - dd/mm/yyyy" thì dùng luôn
    if (dateStr.includes('-') && !dateStr.includes('T')) return dateStr;

    try {
        const isoString = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return dateStr; // Fallback nếu parse lỗi
        
        return d.toLocaleString('vi-VN', {
          hour: '2-digit', minute: '2-digit',
          day: '2-digit', month: '2-digit', year: 'numeric'
        });
    } catch {
        return dateStr;
    }
  };

  const formatDuration = (val: string | number): string => {
    if (!val) return "0 giây";
    if (typeof val === 'string') return val; // Nếu backend gửi "1p 30s"
    
    const numVal = Number(val);
    const m = Math.floor(numVal / 60);
    const s = numVal % 60;
    
    if (m > 0) return `${m} phút ${s} giây`;
    return `${s} giây`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
              Phân tích năng lực
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Lịch sử chi tiết & Đánh giá tiến độ</p>
          </div>

          <div className="relative min-w-[250px]">
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-3 pl-4 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={<History className="w-5 h-5 text-blue-600" />} label="Tổng số bài thi" value={stats.total} bg="bg-blue-50" />
          <StatCard icon={<BarChart3 className="w-5 h-5 text-indigo-600" />} label="Điểm trung bình" value={`${stats.avg}%`} bg="bg-indigo-50" />
          <StatCard icon={<Award className="w-5 h-5 text-emerald-600" />} label="Thành tích tốt nhất" value={`${stats.best}%`} bg="bg-emerald-50" />
        </div>

        {/* MAIN TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Nhật ký: {selectedSubject}
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-400">Đang tải dữ liệu...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold">Chưa có bài kiểm tra nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4">Thời điểm nộp bài</th>
                    <th className="p-4">Thời gian hoàn thành</th>
                    <th className="p-4">Cấp độ</th>
                    <th className="p-4">Tiến bộ</th>
                    <th className="p-4 text-right">Điểm số</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {history.map((item: AssessmentItem, idx: number) => (
                    <tr key={item.id || idx} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      
                      {/* CỘT 1: NGÀY GIỜ */}
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-medium text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDateTime(item.date)}
                        </div>
                      </td>

                      {/* CỘT 2: THỜI GIAN LÀM BÀI */}
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold bg-slate-100 w-fit px-3 py-1.5 rounded-lg border border-slate-200">
                            <Timer className="w-3.5 h-3.5 text-indigo-500" />
                            {formatDuration(item.duration)}
                        </div>
                      </td>

                      {/* CỘT 3: CẤP ĐỘ */}
                      <td className="p-4">
                        <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase ${
                          item.level === 'Advanced' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          item.level === 'Intermediate' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {item.level || 'Beginner'}
                        </span>
                      </td>

                      {/* CỘT 4: TIẾN BỘ */}
                      <td className="p-4">
                        {idx === history.length - 1 ? (
                             <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                                <Minus className="w-4 h-4" /> Bài đầu tiên
                             </span>
                        ) : (
                            <div className={`flex items-center gap-2 font-bold ${
                                (item.trend || 0) > 0 ? 'text-emerald-600' : 
                                (item.trend || 0) < 0 ? 'text-red-500' : 'text-slate-400'
                            }`}>
                                {(item.trend || 0) > 0 ? <ArrowUpRight className="w-4 h-4" /> : 
                                 (item.trend || 0) < 0 ? <ArrowDownRight className="w-4 h-4" /> : 
                                 <Minus className="w-4 h-4" />}
                                {(item.trend || 0) > 0 ? `Tăng ${item.trend}đ` : (item.trend || 0) < 0 ? `Giảm ${Math.abs(item.trend || 0)}đ` : 'Không đổi'}
                            </div>
                        )}
                      </td>

                      {/* CỘT 5: ĐIỂM SỐ */}
                      <td className="p-4 text-right">
                        <span className={`text-xl font-black ${
                            item.score >= 80 ? 'text-emerald-600' : 
                            item.score >= 50 ? 'text-indigo-600' : 'text-red-500'
                        }`}>
                            {Math.round(item.score)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, bg }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
    </div>
  </div>
);
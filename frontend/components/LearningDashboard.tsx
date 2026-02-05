"use client";
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area } from 'recharts';
import axios from 'axios';
import { Award, Zap, Target, TrendingUp, History } from 'lucide-react';

const LearningDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Gọi API History tổng hợp
        const res = await axios.get("http://localhost:8000/api/assessment/history/all"); 
        setData(res.data);
      } catch (e) {
        console.error("Lỗi lấy dữ liệu thống kê:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black text-indigo-600 uppercase tracking-widest text-xs animate-pulse">Agent đang tổng hợp dữ liệu...</p>
    </div>
  );
  
  if (!data) return <div className="text-center p-10 font-bold text-slate-400">Chưa có dữ liệu học tập.</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 pb-24">
      
      {/* --- PHẦN 1: THẺ TỔNG QUAN (DỮ LIỆU TỪ PROFILING & EVALUATION AGENT) --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={<Award className="text-indigo-600" />} 
          label="Trình độ tổng thể" 
          value={data.summary.global_level} 
          sub="Cập nhật từ Profiling Agent"
          color="bg-indigo-50" 
        />
        <StatCard 
          icon={<Zap className="text-orange-600" />} 
          label="Chỉ số nỗ lực" 
          value={`${data.summary.avg_effort}%`} 
          sub="Tính theo thời gian làm bài"
          color="bg-orange-50" 
        />
        <StatCard 
          icon={<Target className="text-emerald-600" />} 
          label="Độ chính xác" 
          value={`${data.summary.avg_score}%`} 
          sub="Điểm trung bình các môn"
          color="bg-emerald-50" 
        />
        <StatCard 
          icon={<TrendingUp className="text-blue-600" />} 
          label="Xu hướng" 
          value={data.summary.trend} 
          sub="Sự tiến bộ gần đây"
          color="bg-blue-50" 
        />
      </div>

      {/* --- PHẦN 2: BIỂU ĐỒ TRỰC QUAN --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Biểu đồ vùng: Xu hướng điểm số & nỗ lực */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">📉 Phân tích tiến độ học tập</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charts.history}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} tick={{fill: '#94a3b8'}} />
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ cột: Trình độ thực tế từng môn */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">📊 Năng lực theo chuyên môn</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.subjects} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="subject" type="category" fontSize={10} tickLine={false} axisLine={false} width={100} tick={{fill: '#475569', fontWeight: 'bold'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none' }} />
                <Bar dataKey="avg" radius={[0, 10, 10, 0]} barSize={12}>
                  {data.charts.subjects.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.avg >= 80 ? '#10b981' : (entry.avg >= 50 ? '#4f46e5' : '#ef4444')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- PHẦN 3: NHẬT KÝ CHI TIẾT --- */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100"><History className="w-5 h-5 text-indigo-600" /></div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Nhật ký Agent đánh giá</h2>
        </div>
        
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Ngày / Môn học</th>
                <th className="px-8 py-5">Kết quả</th>
                <th className="px-8 py-5">Nỗ lực</th>
                <th className="px-8 py-5 text-right">Đánh giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.details.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800">{item.subject}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{item.date}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="bg-slate-100 text-slate-600 py-1.5 px-4 rounded-full text-[11px] font-black border border-slate-200">
                      {item.correct}/{item.total_questions} CÂU
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500" style={{ width: `${item.effort}%` }}></div>
                       </div>
                       <span className="text-[11px] font-black text-orange-600">{item.effort}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className={`text-sm font-black ${
                      item.score >= 80 ? 'text-emerald-500' : (item.score >= 50 ? 'text-indigo-600' : 'text-red-500')
                    }`}>
                      {item.score}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.details.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center">
              <div className="text-4xl mb-4 grayscale opacity-20">📭</div>
              <p className="text-slate-400 font-bold text-sm">Chưa có lịch sử làm bài được ghi nhận.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component cho thẻ thống kê
function StatCard({ icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-lg shadow-slate-200/30 border border-slate-50 flex items-center gap-5 transition-transform hover:scale-[1.02]">
      <div className={`p-4 ${color} rounded-2xl shadow-inner`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-slate-800 tracking-tight">{value}</p>
        <p className="text-[9px] text-slate-400 font-medium mt-1">{sub}</p>
      </div>
    </div>
  );
}

export default LearningDashboard;
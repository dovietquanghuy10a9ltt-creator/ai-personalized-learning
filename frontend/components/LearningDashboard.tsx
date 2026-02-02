"use client";
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { api } from '../services/api';

const LearningDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.getLearningStats();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-20 text-center font-bold text-blue-600 animate-pulse">📊 ĐANG TỔNG HỢP KẾT QUẢ...</div>;
  if (!data) return <div className="text-center p-10">Chưa có dữ liệu.</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 pb-20">
      
      {/* --- PHẦN 1: BIỂU ĐỒ TỔNG QUAN --- */}
      <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter border-l-4 border-blue-600 pl-4">
        Tổng quan năng lực
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biểu đồ đường */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg">
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">📉 Xu hướng điểm số</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.charts.history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{r:4, fill:'#2563eb'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ cột */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg">
          <h3 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-4">📊 Trình độ theo môn</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.subjects} layout="vertical">
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="subject" type="category" width={100} fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={20} background={{ fill: '#f9fafb', radius: 4 }}>
                  {data.charts.subjects.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.avg >= 80 ? '#10b981' : (entry.avg >= 50 ? '#3b82f6' : '#ef4444')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- PHẦN 2: DANH SÁCH CHI TIẾT (HISTORY TABLE) --- */}
      <div className="mt-10">
        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter border-l-4 border-orange-500 pl-4 mb-6">
          Lịch sử làm bài chi tiết
        </h2>
        
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Môn học</th>
                <th className="px-6 py-4">Thời lượng</th>
                <th className="px-6 py-4 text-center">Kết quả (Đúng/Tổng)</th>
                <th className="px-6 py-4 text-right">Điểm số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.details.map((item: any) => (
                <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-6 py-4 text-xs text-gray-500 font-medium">{item.date}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">{item.subject}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{item.duration}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-gray-100 text-gray-600 py-1 px-3 rounded-lg text-xs font-bold">
                      {item.correct}/{item.total_questions}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-black ${
                      item.score >= 80 ? 'text-green-600' : (item.score >= 50 ? 'text-blue-600' : 'text-red-500')
                    }`}>
                      {item.score}đ
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {data.details.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm italic">
              Bạn chưa làm bài kiểm tra nào.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default LearningDashboard;
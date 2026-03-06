"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart3, History, TrendingUp, Calendar, Target, Award, ChevronDown, 
  Clock, ArrowUpRight, ArrowDownRight, Minus, Timer, LockKeyhole, Sparkles
} from 'lucide-react';

// Định nghĩa Interface
interface AssessmentItem {
  id: number;
  date: string;
  duration: string | number;
  score: number;
  subject: string;
  level?: string;
  trend?: number;
  test_type?: string;
}

interface StatsData {
  avg: number;
  total: number;
  best: number;
}

// Bổ sung Interface cho Điểm Evaluation Agent
interface EvaluationScores {
  test_score: number;
  effort_score: number;
  progress_score: number;
  final_score: number;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
  subtitle?: string;
}

export default function EvaluationPage() {
  const [selectedSubject, setSelectedSubject] = useState<string>(""); 
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(true);
  const [classIdMap, setClassIdMap] = useState<{[key: string]: number}>({}); // Lưu mapping Môn học -> ID lớp

  const [history, setHistory] = useState<AssessmentItem[]>([]); 
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [stats, setStats] = useState<StatsData>({ avg: 0, total: 0, best: 0 });
  const [evalScores, setEvalScores] = useState<EvaluationScores | null>(null);

  // LẤY DANH SÁCH MÔN HỌC MÀ SINH VIÊN ĐÃ THAM GIA LỚP
  useEffect(() => {
    const fetchEnrolledClasses = async () => {
      const storedId = localStorage.getItem('userId') || localStorage.getItem('user_id');
      const userId = storedId ? parseInt(storedId, 10) : null;
      
      if (!userId) {
        setLoadingSubjects(false);
        return;
      }

      try {
        const res = await axios.get(`http://localhost:8000/api/auth/me/${userId}`);
        const classes = res.data.enrolled_classes || [];
        
        const map: {[key: string]: number} = {};
        const subjects: string[] = [];
        
        classes.forEach((c: any) => {
            if (!subjects.includes(c.subject)) {
                subjects.push(c.subject);
                map[c.subject] = c.id; // Ghi nhớ ID của lớp tương ứng với môn
            }
        });
        
        setEnrolledSubjects(subjects);
        setClassIdMap(map);
        if (subjects.length > 0) {
            setSelectedSubject(subjects[0]); 
        }
      } catch (error) {
        console.error("Lỗi lấy thông tin môn học:", error);
      } finally {
        setLoadingSubjects(false);
      }
    };
    
    fetchEnrolledClasses();
  }, []);

  // LẤY THỐNG KÊ KHI ĐÃ CHỌN ĐƯỢC MÔN HỌC
  useEffect(() => {
    if (selectedSubject) {
        fetchHistory();
        fetchEvaluationScores();
    }
  }, [selectedSubject]);

  const fetchHistory = async () => {
    setLoadingStats(true);
    try {
      const storedId = localStorage.getItem('userId') || localStorage.getItem('user_id');
      const userId = storedId ? parseInt(storedId, 10) : null;

      if (!userId) return; 

      const res = await axios.get(`http://localhost:8000/api/stats/learning-stats`, {
        params: {
          user_id: userId, 
          subject: selectedSubject
        }
      });

      const data = res.data.history_list || [];
      setHistory(data);
      
      setStats({ 
        avg: res.data.avgScore || 0, 
        total: res.data.totalTests || 0, 
        best: res.data.bestScore || 0 
      });

    } catch (error) {
      console.error("Lỗi fetch stats:", error);
      setHistory([]);
      setStats({ avg: 0, total: 0, best: 0 });
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchEvaluationScores = async () => {
    const classId = classIdMap[selectedSubject];
    const storedId = localStorage.getItem('userId') || localStorage.getItem('user_id');
    const userId = storedId ? parseInt(storedId, 10) : null;
    if (!classId || !userId) return;

    try {
        // Lấy điểm Evaluation Agent từ API danh sách lớp
        const res = await axios.get(`http://localhost:8000/api/classroom/members/${classId}`);
        const members = res.data || [];
        const myData = members.find((m: any) => m.id === userId);
        
        if (myData && myData.final_score !== undefined) {
            setEvalScores({
                test_score: myData.test_score,
                effort_score: myData.effort_score,
                progress_score: myData.progress_score,
                final_score: myData.final_score
            });
        } else {
            setEvalScores(null);
        }
    } catch (e) {
        console.error("Lỗi lấy điểm Evaluation:", e);
        setEvalScores(null);
    }
  };

  const formatDateTime = (dateStr: string): string => {
    if(!dateStr) return "N/A";
    if (dateStr.includes('-') && !dateStr.includes('T')) return dateStr;

    try {
        const isoString = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return dateStr; 
        
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
    if (typeof val === 'string') return val; 
    
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
            <p className="text-sm text-slate-500 font-medium mt-1">Đánh giá AI & Lịch sử học tập</p>
          </div>

          <div className="relative min-w-[250px]">
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={enrolledSubjects.length === 0 || loadingSubjects}
              className="w-full p-3 pl-4 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-indigo-500 appearance-none cursor-pointer disabled:opacity-50"
            >
              {loadingSubjects ? (
                  <option value="">Đang tải...</option>
              ) : enrolledSubjects.length === 0 ? (
                  <option value="">Chưa có môn học</option>
              ) : (
                  enrolledSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* NẾU CHƯA CÓ LỚP NÀO -> HIỂN THỊ MÀN HÌNH KHÓA */}
        {!loadingSubjects && enrolledSubjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-300 shadow-sm max-w-3xl mx-auto mt-10">
              <LockKeyhole className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-black text-gray-600 uppercase mb-2">Hệ thống phân tích đang bị khóa</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md text-center">Bạn cần tham gia ít nhất một lớp học để hệ thống có thể theo dõi và phân tích năng lực học tập của bạn.</p>
              <button 
                onClick={() => window.location.href = '/adaptive'} 
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                Nhập mã lớp học ngay
              </button>
            </div>
        ) : (
            <>
              {/* EVALUATION AGENT SCORE PANEL */}
              {evalScores && (
                 <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden animate-in zoom-in duration-500">
                    <Sparkles className="absolute top-4 right-4 w-24 h-24 text-indigo-400 opacity-20" />
                    
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="w-full lg:w-1/3 text-center lg:text-left border-b lg:border-b-0 lg:border-r border-indigo-700/50 pb-6 lg:pb-0 lg:pr-8">
                           <p className="text-indigo-300 font-black uppercase tracking-widest text-xs mb-2">Evaluation Agent Score</p>
                           <h2 className="text-5xl font-black text-amber-400 mb-2">{evalScores.final_score} <span className="text-lg text-indigo-200">/ 100</span></h2>
                           <p className="text-sm font-medium text-indigo-100">
                              {evalScores.final_score >= 80 ? "Xuất sắc! Bạn đang làm rất tốt." : evalScores.final_score >= 50 ? "Khá! Cố gắng cải thiện thêm nhé." : "Cần nỗ lực nhiều hơn."}
                           </p>
                        </div>
                        
                        <div className="w-full lg:w-2/3 grid grid-cols-3 gap-4">
                           <div className="bg-indigo-950/40 p-4 rounded-2xl border border-indigo-700/30 text-center">
                              <p className="text-[10px] text-indigo-300 font-black uppercase mb-1">Học lực (50%)</p>
                              <p className="text-2xl font-black text-blue-300">{evalScores.test_score}</p>
                           </div>
                           <div className="bg-indigo-950/40 p-4 rounded-2xl border border-indigo-700/30 text-center">
                              <p className="text-[10px] text-indigo-300 font-black uppercase mb-1">Nỗ lực (30%)</p>
                              <p className="text-2xl font-black text-emerald-300">{evalScores.effort_score}</p>
                           </div>
                           <div className="bg-indigo-950/40 p-4 rounded-2xl border border-indigo-700/30 text-center">
                              <p className="text-[10px] text-indigo-300 font-black uppercase mb-1">Tiến bộ (20%)</p>
                              <p className="text-2xl font-black text-purple-300">{evalScores.progress_score}</p>
                           </div>
                        </div>
                    </div>
                 </div>
              )}

              {/* STATS OVERVIEW */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={<History className="w-5 h-5 text-blue-600" />} label="Tổng số bài thi" value={stats.total} bg="bg-blue-50" />
                <StatCard icon={<BarChart3 className="w-5 h-5 text-indigo-600" />} label="Điểm thi trung bình" value={`${stats.avg}%`} bg="bg-indigo-50" />
                <StatCard icon={<Award className="w-5 h-5 text-emerald-600" />} label="Thành tích tốt nhất" value={`${stats.best}%`} bg="bg-emerald-50" />
              </div>

              {/* MAIN TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Nhật ký làm bài: {selectedSubject || "Đang tải..."}
                  </h3>
                </div>

                {loadingStats ? (
                  <div className="p-12 text-center">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs font-bold text-slate-400">Đang tải dữ liệu phân tích...</p>
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
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="p-4">Thời điểm nộp bài</th>
                          <th className="p-4">Loại bài</th>
                          <th className="p-4">Thời gian làm</th>
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

                            {/* CỘT MỚI: LOẠI BÀI */}
                            <td className="p-4">
                                <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">
                                    {item.test_type === 'baseline' ? 'Đầu vào' : item.test_type === 'final' ? 'Cuối kỳ' : 'Qua bài'}
                                </span>
                            </td>

                            {/* CỘT 2: THỜI GIAN LÀM BÀI */}
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-slate-700 font-bold">
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
            </>
        )}
      </div>
    </div>
  );
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, bg, subtitle }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2">
         <p className="text-2xl font-black text-slate-800">{value}</p>
         {subtitle && <span className="text-[10px] font-bold text-slate-400 uppercase">{subtitle}</span>}
      </div>
    </div>
  </div>
);
'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  Trash2, 
  Search, 
  User, 
  Mail, 
  Shield, 
  GraduationCap,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserData {
  id: number;
  email: string;
  fullname: string;
  role: string;
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  // 1. Lấy danh sách người dùng từ Backend
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // 2. Hàm Xóa tài khoản
  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản của "${name}" không? Hành động này không thể hoàn tác!`)) return;

    setDeleteLoading(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/admin/delete-user/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(`Đã xóa tài khoản ${name}`);
        setUsers(users.filter(u => u.id !== id));
      } else {
        const data = await res.json();
        toast.error(data.detail || "Xóa thất bại");
      }
    } catch (error) {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setDeleteLoading(null);
    }
  };

  // 3. Lọc danh sách theo từ khóa tìm kiếm
  const filteredUsers = users.filter(u => 
    u.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-rose-50 rounded-full blur-[120px] opacity-60" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Users size={40} className="text-rose-600" />
              Quản lý tài khoản
            </h1>
            <p className="text-slate-500 font-medium mt-1 uppercase tracking-[0.2em] text-[10px]">
              Danh sách nhân sự và người học trong hệ thống
            </p>
          </div>

          {/* Thanh tìm kiếm */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Tìm tên hoặc email..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Bảng danh sách */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-rose-600" size={40} />
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Đang tải dữ liệu...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-20 text-center">
              <AlertTriangle className="mx-auto text-slate-200 mb-4" size={64} />
              <p className="text-slate-400 font-bold">Không tìm thấy tài khoản nào!</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người dùng</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
                          {u.fullname.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.fullname}</p>
                          <p className="text-xs text-slate-400 font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        u.role === 'teacher' 
                        ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' 
                        : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                      }`}>
                        {u.role === 'teacher' ? <Shield size={12} /> : <GraduationCap size={12} />}
                        {u.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDelete(u.id, u.fullname)}
                        disabled={deleteLoading === u.id}
                        className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
                        title="Xóa người dùng"
                      >
                        {deleteLoading === u.id ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
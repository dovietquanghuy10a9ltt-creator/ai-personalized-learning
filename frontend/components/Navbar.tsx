"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BrainCircuit, 
  Layout, 
  LineChart, 
  GraduationCap, 
  FileText,
  LayoutDashboard,
  LogOut,
  Users,       // Thêm icon cho Quản lý lớp
  BookOpen     // Thêm icon cho Tài liệu
} from 'lucide-react';
import clsx from 'clsx';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = useState<{ role: string | null; name: string | null }>({
    role: null,
    name: null
  });

  useEffect(() => {
    const role = localStorage.getItem("role");
    const name = localStorage.getItem("fullname");
    setUser({ role, name });
  }, [pathname]);

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.clear();
      router.push('/auth');
    }
  };

  // Xác định đường dẫn "Trang chủ" nội bộ dựa trên vai trò
  const getHomeHref = () => {
    if (user.role === 'teacher') return '/teacher';
    if (user.role === 'student') return '/adaptive';
    return '/auth';
  };

  // TÁCH BIỆT HOÀN TOÀN MENU GIỮA GIÁO VIÊN VÀ HỌC SINH
  let navs: { name: string; href: string; icon: any }[] = [];

  if (user.role === 'teacher') {
    navs = [
      { name: 'Quản lý tài liệu', href: '/teacher', icon: LayoutDashboard },
      { name: 'Quản lý Lớp', href: '/teacher/members', icon: Users },
    ];
  } else if (user.role === 'student') {
    navs = [
      { name: 'Gia sư AI', href: '/adaptive', icon: GraduationCap },
      { name: 'Kiểm tra', href: '/assessment', icon: FileText },
      { name: 'Kết quả', href: '/evaluation', icon: LineChart },
    ];
  }

  // Ẩn Navbar ở trang Login hoặc Landing Page
  if (pathname === '/auth' || pathname === '/') return null;
  
  // Tránh render lỗi chớp giao diện khi chưa lấy được role từ localStorage
  if (!user.role) return null;

  return (
    <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <Link href={getHomeHref()} className="flex items-center gap-2 group">
            <div className={`p-2 rounded-lg group-hover:rotate-6 transition-transform shadow-lg ${
              user.role === 'teacher' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-emerald-500 shadow-emerald-100'
            }`}>
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <span className="font-black text-xl text-slate-800 tracking-tighter hidden sm:block">
              AI LEARNING
            </span>
          </Link>
          
          {/* Menu Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navs.map((item) => {
              // Bắt chính xác đường dẫn để hiện trạng thái Active
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/adaptive' && item.href !== '/teacher');
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200",
                    isActive 
                      ? (user.role === 'teacher' ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100" : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100")
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon size={14} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
          
          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
              <div className="text-right hidden lg:block">
                <p className={`text-[10px] font-black uppercase leading-none ${
                  user.role === 'teacher' ? 'text-indigo-600' : 'text-emerald-500'
                }`}>
                  {user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                </p>
                <p className="text-[10px] font-bold text-slate-800 mt-1 truncate max-w-[120px]">
                  {user.name || 'Người dùng'}
                </p>
              </div>

              <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs shadow-md">
                  {user.name ? user.name.substring(0, 2).toUpperCase() : 'AI'}
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <LogOut size={18} />
                </button>
              </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
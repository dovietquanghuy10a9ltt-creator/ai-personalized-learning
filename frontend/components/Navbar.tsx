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
  Users,       
  BookOpen,
  ShieldCheck, 
  UserPlus,    
  KeyRound     
} from 'lucide-react';
import clsx from 'clsx';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Thêm biến isMounted để fix lỗi Hydration của Next.js khi dùng localStorage
  const [isMounted, setIsMounted] = useState(false);

  const [user, setUser] = useState<{ role: string | null; name: string | null; id: string | null }>({
    role: null,
    name: null,
    id: null
  });

  useEffect(() => {
    setIsMounted(true);
    
    // 👇 CHUẨN HOÁ ROLE VỀ CHỮ THƯỜNG để tránh lỗi "Student" != "student" gây mất menu
    const rawRole = localStorage.getItem("role");
    const role = rawRole ? rawRole.toLowerCase() : null; 
    
    const name = localStorage.getItem("fullname");
    
    // Lấy ID: Quét tất cả các key có thể có để đảm bảo không bị thiếu MSSV
    const studentId = localStorage.getItem("studentId") || localStorage.getItem("mssv") || localStorage.getItem("username");
    const userId = localStorage.getItem("userId");
    
    const idDisplay = role === 'student' ? studentId : userId;
    
    setUser({ role, name, id: idDisplay });
  }, [pathname]);

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.clear();
      router.push('/auth');
    }
  };

  const getHomeHref = () => {
    if (user.role === 'admin') return '/admin/teachers';
    if (user.role === 'teacher') return '/teacher';
    if (user.role === 'student') return '/adaptive';
    return '/auth';
  };

  let navs: { name: string; href: string; icon: any }[] = [];

  if (user.role === 'admin') {
    navs = [
      { name: 'Cấp tài khoản', href: '/admin/teachers', icon: UserPlus },
      { name: 'Quản lý tài khoản', href: '/admin/users', icon: Users },
    ];
  } else if (user.role === 'teacher') {
    navs = [
      { name: 'Quản lý tài liệu', href: '/teacher', icon: LayoutDashboard },
      { name: 'Quản lý Lớp', href: '/teacher/members', icon: Users },
      { name: 'Xuất Đề Thi', href: '/teacher/exam', icon: FileText },
    ];
  } else if (user.role === 'student') {
    navs = [
      { name: 'Gia sư AI', href: '/adaptive', icon: GraduationCap },
      { name: 'Kiểm tra', href: '/assessment', icon: FileText },
      { name: 'Kết quả', href: '/evaluation', icon: LineChart },
      { name: 'Thư viện', href: '/library', icon: BookOpen },
    ];
  }

  let roleConfig = {
    name: 'Học sinh',
    idPrefix: 'MSSV:', 
    showId: true,
    textColor: 'text-emerald-500',
    logoColor: 'bg-emerald-500 shadow-emerald-100',
    activeNav: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
  };

  if (user.role === 'admin') {
    roleConfig = {
      name: 'Quản trị viên',
      idPrefix: 'ID:', 
      showId: true,
      textColor: 'text-rose-600',
      logoColor: 'bg-rose-600 shadow-rose-100',
      activeNav: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
    };
  } else if (user.role === 'teacher') {
    roleConfig = {
      name: 'Giáo viên',
      idPrefix: '', 
      showId: false,
      textColor: 'text-indigo-600',
      logoColor: 'bg-indigo-600 shadow-indigo-100',
      activeNav: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100'
    };
  }

  // Chờ Client render xong mới hiển thị Navbar để tránh lỗi vỡ layout
  if (!isMounted) return null;
  if (pathname === '/auth' || pathname === '/') return null;
  if (!user.role) return null;

  return (
    // 👇 SỬA LẠI CLASNAME TẠI ĐÂY: Thêm z-[9999] để đảm bảo Navbar luôn nằm trên cùng mọi trang
    <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-[9999]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <Link href={getHomeHref()} className="flex items-center gap-2 group relative z-[10000]">
            <div className={`p-2 rounded-lg group-hover:rotate-6 transition-transform shadow-lg ${roleConfig.logoColor}`}>
              {user.role === 'admin' ? <ShieldCheck className="h-6 w-6 text-white" /> : <BrainCircuit className="h-6 w-6 text-white" />}
            </div>
            <span className="font-black text-xl text-slate-800 tracking-tighter hidden sm:block">
              AI LEARNING
            </span>
          </Link>
          
          {/* Menu Links */}
          <div className="hidden md:flex items-center space-x-1 relative z-[10000]">
            {navs.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/adaptive' && item.href !== '/teacher');
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200",
                    isActive ? roleConfig.activeNav : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon size={14} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
          
          {/* User Info & Actions */}
          <div className="flex items-center gap-4 relative z-[10000]">
              <div className="text-right hidden lg:block">
                <p className={`text-[10px] font-black uppercase leading-none ${roleConfig.textColor}`}>
                  {roleConfig.name}
                </p>
                <p className="text-[10px] font-bold text-slate-800 mt-1 truncate max-w-[120px]">
                  {user.name || 'Người dùng'}
                </p>
                {roleConfig.showId && user.id && (
                    <p className="text-[9px] font-medium text-slate-400 mt-0.5 tracking-wider">
                        {roleConfig.idPrefix} {user.id}
                    </p>
                )}
              </div>

              <div className="flex items-center gap-1 border-l pl-4 border-slate-100">
                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs shadow-md mr-1">
                  {user.name ? user.name.substring(0, 2).toUpperCase() : 'AI'}
                </div>
                
                <Link 
                  href="/change-password"
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                  title="Đổi mật khẩu bảo mật"
                >
                  <KeyRound size={18} />
                </Link>

                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
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
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BrainCircuit, 
  Home, 
  LineChart, 
  GraduationCap, 
  Upload, 
  FileText 
} from 'lucide-react';
import clsx from 'clsx';

export default function Navbar() {
  const pathname = usePathname();

  // Danh sách điều hướng
  const navs = [
    { name: 'Trang chủ', href: '/', icon: Home },
    { name: 'Gia sư AI', href: '/adaptive', icon: GraduationCap },
    { name: 'Kết quả học tập', href: '/evaluation', icon: LineChart },
    { name: 'Tài liệu', href: '/upload', icon: Upload },
    { name: 'Kiểm tra', href: '/assessment', icon: FileText },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800">AI Learning Agent</span>
          </Link>
          
          {/* Menu điều hướng*/}
          <div className="hidden md:flex space-x-1">
            {navs.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    isActive 
                      ? "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
          
          
          <div className="flex items-center gap-3">
             <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
               HV
             </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
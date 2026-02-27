import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Agent Learning System",
  description: "Hệ thống học tập cá nhân hóa với Multi-Agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${inter.className} bg-slate-50 min-h-screen text-slate-900 flex flex-col`}>
        {/* Thanh điều hướng thông minh */}
        <Navbar />
        
        {/* Thả tự do chiều rộng để các trang (Auth, Landing) có thể bung Full màn hình */}
        <main className="flex-1 w-full flex flex-col">
          {children}
        </main>

        {/* Thông báo Global */}
        <Toaster 
          position="top-center" 
          reverseOrder={false} 
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              borderRadius: '10px'
            }
          }}
        />
      </body>
    </html>
  );
}
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">AI</div>
            <h1 className="text-2xl font-bold text-gray-800">Hệ Thống Học Tập Cá Nhân Hóa</h1>
          </div>
        </header>

        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Chào mừng trở lại, Học viên!</h2>
          <p className="text-xl text-gray-600 mb-8">Hệ thống AI Agents đã sẵn sàng hỗ trợ bạn.</p>
          <Link href="/assessment" className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition shadow-lg">
            Bắt đầu làm bài kiểm tra ngay →
          </Link>
        </div>

        {/* DANH SÁCH CÁC AGENT - CẬP NHẬT 4 CỘT */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. Content Agent */}
          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl mb-6">📂</div>
            <h3 className="text-xl font-bold mb-3">Content Agent</h3>
            <p className="text-gray-500 mb-6 flex-grow text-sm">Tự động phân tích và trích xuất kiến thức từ tài liệu đa định dạng (PDF, Word, Slide).</p>
            <Link href="/upload" className="text-blue-600 font-bold hover:underline mt-auto">Quản lý tài liệu →</Link>
          </div>

          {/* 2. Assessment Agent */}
          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center text-2xl mb-6">📝</div>
            <h3 className="text-xl font-bold mb-3">Assessment Agent</h3>
            <p className="text-gray-500 mb-6 flex-grow text-sm">Sinh câu hỏi trắc nghiệm thông minh và đánh giá năng lực cá nhân.</p>
            <Link href="/assessment" className="text-green-600 font-bold hover:underline mt-auto">Làm bài kiểm tra →</Link>
          </div>

          {/* 3. Evaluation Agent */}
          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col">
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-2xl mb-6">📊</div>
            <h3 className="text-xl font-bold mb-3">Evaluation Agent</h3>
            <p className="text-gray-500 mb-6 flex-grow text-sm">Theo dõi lịch sử học tập, phân tích nỗ lực và sự tiến bộ qua thời gian.</p>
            <Link href="/evaluation" className="text-purple-600 font-bold hover:underline mt-auto">Xem báo cáo →</Link>
          </div>

          {/* 4. Adaptive Agent*/}
          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition border border-orange-100 flex flex-col ring-2 ring-orange-50">
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-2xl mb-6">🧭</div>
            <h3 className="text-xl font-bold mb-3 text-gray-800">Adaptive Agent</h3>
            <p className="text-gray-500 mb-6 flex-grow text-sm">Gia sư AI đề xuất lộ trình học và hướng dẫn bạn giải đáp thắc mắc trực tiếp.</p>
            <Link href="/adaptive" className="text-orange-600 font-bold hover:underline mt-auto">Vào học ngay →</Link>
          </div>

        </div>
      </div>
    </div>
  );
}
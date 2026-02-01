import FileUploader from '@/components/FileUploader';
import { Database } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
        <div className="p-3 bg-blue-100 rounded-xl">
          <Database className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý tri thức (Content Agent)</h1>
          <p className="text-slate-500">Tải lên giáo trình để hệ thống tự động phân tích và tạo bài học.</p>
        </div>
      </div>
      <FileUploader />
    </div>
  );
}
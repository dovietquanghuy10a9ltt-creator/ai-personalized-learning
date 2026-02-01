// frontend/app/assessment/page.tsx
import React from 'react';
import AssessmentForm from '@/components/AssessmentForm'; // Import component đã sửa

export default function AssessmentPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            Hệ Thống Đánh Giá Năng Lực AI
          </h1>
          <p className="text-gray-600">
            Kiểm tra kiến thức dựa trên tài liệu bạn đã tải lên hệ thống
          </p>
        </div>
        
        {/* Đây là nơi hiển thị cái Form thông minh bạn vừa code */}
        <div className="flex justify-center">
          <AssessmentForm />
        </div>
      </div>
    </div>
  );
}
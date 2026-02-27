"use client";

import React from 'react';
import AssessmentForm from '@/components/AssessmentForm'; 

export default function AssessmentPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      

      <div className="container mx-auto px-4">
        {/* 2. Phần tiêu đề trang */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-900 mb-2">
            AI Personalized Learning
          </h1>
          <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
        </div>

        {/* 3. Component chứa toàn bộ logic làm bài */}
        <div className="flex justify-center">
          <div className="w-full max-w-5xl">
            <AssessmentForm />
          </div>
        </div>
      </div>
    </div>
  );
}
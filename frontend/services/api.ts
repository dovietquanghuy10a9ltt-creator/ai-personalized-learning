// frontend/services/api.ts
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const api = {
  // --- 1. PHẦN KIỂM TRA & ĐÁNH GIÁ ---
  
  // Lấy đề thi từ AI
  generateAssessment: async (subject: string) => {
    try {
      const response = await axios.post(`${API_URL}/assessment/generate`, { 
        subject: subject 
      });
      return response.data; 
    } catch (error) {
      console.error("Lỗi lấy đề thi:", error);
      throw error;
    }
  },

  // Nộp bài và lưu kết quả
  submitAssessment: async (
    subject: string, 
    correctCount: number, 
    totalQuestions: number, 
    questionIds: number[],
    durationSeconds: number = 300 
  ) => {
    try {
      const response = await axios.post(`${API_URL}/assessment/submit`, { 
        subject: subject,
        correct_count: correctCount,
        total_questions: totalQuestions,
        question_ids: questionIds,
        duration_seconds: durationSeconds 
      });
      return response.data;
    } catch (error) {
      console.error("Lỗi nộp bài:", error);
      throw error;
    }
  },

  // --- 2. PHẦN THỐNG KÊ (DASHBOARD) ---
  // 👇 QUAN TRỌNG: Hàm này lấy dữ liệu cho biểu đồ
  getLearningStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/stats/learning-stats`);
      return response.data;
    } catch (error) {
      console.error("Lỗi lấy thống kê:", error);
      throw error; // Ném lỗi để Component hiển thị thông báo nếu cần
    }
  },

  // --- 3. PHẦN UPLOAD (Tùy chọn dùng thay cho axios trực tiếp) ---
  uploadFile: async (formData: FormData, onProgress?: (percent: number) => void) => {
    return axios.post(`${API_URL}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  },

  analyzeSubject: async (formData: FormData) => {
    return axios.post(`${API_URL}/analyze-subject`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  }
};
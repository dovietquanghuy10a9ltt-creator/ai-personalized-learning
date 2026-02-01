// frontend/services/api.ts
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const api = {
  // 1. Hàm lấy đề thi
  generateAssessment: async (subject: string) => {
    try {
      const response = await axios.post(`${API_URL}/assessment/generate`, { 
        subject: subject 
      });
      return response.data.questions;
    } catch (error) {
      console.error("Lỗi lấy đề thi:", error);
      throw error;
    }
  },

  // 2. Hàm nộp bài (ĐÃ SỬA: Thêm durationSeconds)
  submitAssessment: async (
    subject: string, 
    correctCount: number, 
    totalQuestions: number, 
    questionIds: number[],
    durationSeconds: number = 300 // <-- Quan trọng: Nhận thời gian từ Form
  ) => {
    try {
      const response = await axios.post(`${API_URL}/assessment/submit`, { 
        subject: subject,
        correct_count: correctCount,
        total_questions: totalQuestions,
        question_ids: questionIds,
        duration_seconds: durationSeconds // <-- Gửi xuống Backend
      });
      return response.data;
    } catch (error) {
      console.error("Lỗi nộp bài:", error);
      throw error;
    }
  }
};
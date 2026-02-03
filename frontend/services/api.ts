import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const api = {
  // --- 1. CONTENT AGENT: Xử lý tri thức ---
  
  // Phân tích nhanh gợi ý môn học
  analyzeSubject: async (formData: FormData) => {
    return axios.post(`${API_URL}/upload/analyze-subject`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },

  // Nạp tài liệu chính thức vào kho lưu trữ RAG
  uploadFile: async (formData: FormData, onProgress?: (percent: number) => void) => {
    return axios.post(`${API_URL}/upload/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  },

  // --- 2. ASSESSMENT, EVALUATION & PROFILING AGENT: Kiểm tra & Đánh giá ---
  
  // Sinh đề thi cá nhân hóa từ RAG (Assessment Agent)
  generateAssessment: async (subject: string) => {
    const response = await axios.post(`${API_URL}/assessment/generate`, { subject });
    return response.data;
  },

  // Nộp bài để Chấm điểm (Evaluation Agent) & Xếp loại (Profiling Agent)
  submitAssessment: async (submissionData: {
    subject: string,
    answers: { question_id: number, selected_option: string }[],
    duration_seconds: number
  }) => {
    // Backend sẽ tự gọi Evaluation & Profiling Agent để trả về dữ liệu đa chiều
    const response = await axios.post(`${API_URL}/assessment/submit`, submissionData);
    return response.data;
  },

  // Lấy lịch sử học tập tổng hợp từ Dashboard
  getLearningStats: async () => {
    // Endpoint này tổng hợp dữ liệu từ Profiling (Level) và Evaluation (Effort)
    const response = await axios.get(`${API_URL}/assessment/history/all`);
    return response.data;
  },

  // --- 3. ADAPTIVE AGENT: Lộ trình & Gia sư AI ---

  // Lấy lộ trình "Vá lỗ hổng" (Adaptive Agent sử dụng GROQ_KEY_ADAPTIVE)
  getAdaptiveRoadmap: async (subject: string) => {
    const response = await axios.get(`${API_URL}/adaptive/recommend/${subject}`);
    return response.data;
  },

  // Chat trực tiếp với Gia sư AI có ngữ cảnh lộ trình
  chatWithTutor: async (chatData: {
    subject: string,
    message: string,
    roadmap_context: string
  }) => {
    const response = await axios.post(`${API_URL}/adaptive/chat`, chatData);
    return response.data;
  }
};
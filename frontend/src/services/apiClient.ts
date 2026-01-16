// API клиент для работы с бэкендом
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Типы для API
import { CoursePassport, ModuleLayer } from './api';

export interface ApiCourse {
  id: string;
  title: string;
  description: string;
  category_id?: string;
  format: string;
  level: string;
  duration: string;
  intensity: string;
  goal: string;
  created_at: string;
  is_paid?: boolean;
  price?: number;
  is_public?: boolean;
  is_private?: boolean;
  created_by: string;
  modules?: ApiModule[];
  passport?: CoursePassport;
}

export interface ApiModule {
  id: string;
  title: string;
  description?: string;
  course_id: string;
  lessons: ApiLesson[];
  layers?: ModuleLayer[];
}

export interface ApiLesson {
  id: string;
  title: string;
  type?: string;
  content: any; // Can be string (markdown) or object (structured experience)
  module_id: string;
  duration_minutes?: number;
  videos?: any[];
  practice_exercises?: any[];
  additional_materials?: any[];
}

export interface ApiUser {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role: 'student' | 'teacher' | 'org';
}

export interface ApiEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  progress_percent: number;
  last_accessed_at?: string;
  completed_at?: string;
}

export interface ApiCategory {
  id: string;
  label: string;
  description?: string;
}

// Утилита для получения токена
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// Базовый fetch с обработкой ошибок
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Auth API
export const authApi = {
  async register(data: { username: string; email: string; password: string; full_name?: string }) {
    return apiRequest<ApiUser>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(email: string, password: string) {
    const response = await apiRequest<{ access_token: string; refresh_token: string; token_type: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      }
    );
    if (typeof window !== 'undefined' && response.access_token) {
      localStorage.setItem('access_token', response.access_token);
    }
    return response;
  },

  async getCurrentUser() {
    return apiRequest<ApiUser>('/api/auth/me');
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  },
};

// Courses API
export const coursesApi = {
  async list() {
    return apiRequest<ApiCourse[]>('/api/courses');
  },

  async getMyCourses() {
    return apiRequest<ApiCourse[]>('/api/courses/my');
  },

  async getEnrolledCourses() {
    return apiRequest<ApiCourse[]>('/api/courses/enrolled');
  },

  async getById(courseId: string) {
    return apiRequest<ApiCourse>(`/api/courses/${courseId}`);
  },

  async create(data: {
    title: string;
    description: string;
    category_id?: string;
    format: string;
    level: string;
    duration: string;
    intensity: string;
    goal: string;
    is_paid?: boolean;
    price?: number;
    is_public?: boolean;
    is_private?: boolean;
  }) {
    return apiRequest<ApiCourse>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(courseId: string, data: Partial<ApiCourse>) {
    return apiRequest<ApiCourse>(`/api/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async enroll(courseId: string) {
    return apiRequest<{ message: string }>(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
    });
  },

  async delete(courseId: string) {
    return apiRequest<void>(`/api/courses/${courseId}`, {
      method: 'DELETE',
    });
  },
};

// Categories API
export const categoriesApi = {
  async list() {
    return apiRequest<ApiCategory[]>('/api/courses/categories');
  },
};

// Progress API
export const progressApi = {
  async completeLesson(lessonId: string) {
    return apiRequest<{ message: string; progress: number }>(
      `/api/progress/lesson/${lessonId}/complete`,
      {
        method: 'POST',
      }
    );
  },

  async getCourseProgress(courseId: string) {
    return apiRequest<{
      course_id: string;
      progress_percent: number;
      completed_lessons: number;
      total_lessons: number;
      last_accessed?: string;
      completed_at?: string;
    }>(`/api/progress/course/${courseId}`);
  },
};

// Users API
export const usersApi = {
  async getById(userId: string) {
    return apiRequest<ApiUser>(`/api/users/${userId}`);
  },

  async update(userId: string, data: { full_name?: string; bio?: string; avatar_url?: string }) {
    return apiRequest<ApiUser>(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Discussions API Types
export interface ApiDiscussion {
  id: string;
  course_id: string;
  author_id: string;
  title: string;
  content: string;
  likes_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  replies: ApiDiscussionReply[];
}

export interface ApiDiscussionReply {
  id: string;
  discussion_id: string;
  author_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

// Discussions API
export const discussionsApi = {
  async list(courseId?: string) {
    const url = courseId ? `/api/discussions?course_id=${courseId}` : '/api/discussions';
    return apiRequest<ApiDiscussion[]>(url);
  },

  async create(data: { course_id: string; title: string; content: string }) {
    return apiRequest<ApiDiscussion>('/api/discussions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async reply(discussionId: string, content: string) {
    return apiRequest<ApiDiscussionReply>(`/api/discussions/${discussionId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async likeDiscussion(discussionId: string) {
    return apiRequest<{ message: string; likes: number }>(`/api/discussions/${discussionId}/like`, {
      method: 'POST',
    });
  },

  async likeReply(replyId: string) {
    return apiRequest<{ message: string; likes: number }>(`/api/discussions/replies/${replyId}/like`, {
      method: 'POST',
    });
  },
};


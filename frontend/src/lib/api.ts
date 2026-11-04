// Клиент для FastAPI-бэкенда (см. backend/app/routers и backend/app/main.py)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  bio?: string | null;
  role: string;
  subscription_plan: string;
  generations_count: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  title: string;
  content?: string | null;
  duration_minutes?: number | null;
  order: number;
}

export interface Module {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  lessons: Lesson[];
}

// Сфера или подтема; у подтемы parent — её сфера
export interface CategoryBrief {
  id: string;
  label: string;
  icon?: string | null;
  parent?: CategoryBrief | null;
}

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  level?: string | null;
  duration?: string | null;
  created_by: string;
  created_at: string;
  views: number;
  category?: CategoryBrief | null;
  modules?: Module[];
}

export interface Progress {
  course_id: string;
  progress_percent: number;
  completed_lessons: number;
  total_lessons: number;
}

export interface TestQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface GradeResult {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  ai_feedback: string;
}

export const tokens = {
  get: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  set(access: string, refresh: string) {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function refresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/api/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`, {
    method: 'POST',
  });
  if (!res.ok) return false;
  const data = await res.json();
  tokens.set(data.access_token, data.refresh_token);
  return true;
}

// Понятные сообщения для ошибок валидации FastAPI (422)
const FIELD_ERRORS: Record<string, string> = {
  email: 'Проверьте почту — похоже, в ней ошибка',
  username: 'Логин — от 3 до 100 символов',
  password: 'Пароль — не короче 8 символов',
  login: 'Введите логин или почту',
};

function errorMessage(status: number, body: { detail?: unknown }): string {
  if (typeof body.detail === 'string') return body.detail;
  if (Array.isArray(body.detail)) {
    const field = body.detail[0]?.loc?.at(-1);
    return FIELD_ERRORS[field] ?? 'Проверьте введённые данные';
  }
  if (status === 429) return 'Слишком много попыток — подождите минуту';
  return `Ошибка ${status}`;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = tokens.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('Сервер недоступен — проверьте, что бэкенд запущен', 0);
  }

  const isAuthCall = path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register');
  if (res.status === 401 && retry && !isAuthCall && (await refresh().catch(() => false))) {
    return request<T>(path, init, false);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(errorMessage(res.status, body), res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  // login — логин или почта
  async login(login: string, password: string) {
    const t = await post<{ access_token: string; refresh_token: string }>('/api/auth/login/json', { login, password });
    tokens.set(t.access_token, t.refresh_token);
  },
  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    post<User>('/api/auth/register', data),
  me: () => request<User>('/api/auth/me'),
  // ai_ready: false — в backend/.env не задан OPENAI_API_KEY
  health: () => request<{ status: string; ai_ready?: boolean }>('/health'),

  myCourses: () => request<Course[]>('/api/courses/my'),
  publicCourses: () => request<Course[]>('/api/courses'),
  course: (id: string) => request<Course>(`/api/courses/${id}`),
  deleteCourse: (id: string) => request<void>(`/api/courses/${id}`, { method: 'DELETE' }),
  enroll: (id: string) => post<unknown>(`/api/courses/${id}/enroll`),

  // Мини-курс: 15–30 минут, уровень под пользователя (презентация, слайд «FILL AI»)
  generate: (topic: string, level: Level, files: { name: string; content: string }[] = []) =>
    post<{ success: boolean; course?: { id: string }; error?: string }>('/api/courses/generate', {
      settings: {
        title: topic,
        description: `Мини-курс по запросу: ${topic}`,
        difficulty: level,
        duration_hours: 1,
        target_audience: 'Самоучка, который хочет быстро разобраться в теме',
        learning_objectives: [],
        reference_files: files.length ? files : undefined,
      },
    }),

  progress: (courseId: string) => request<Progress>(`/api/progress/course/${courseId}`),
  completeLesson: (lessonId: string) => post<unknown>(`/api/progress/lesson/${lessonId}/complete`),

  moduleTest: (course: Course, module: Module) =>
    post<{ success: boolean; test?: { tests: TestQuestion[] }; error?: string }>('/api/courses/generate-module-test', {
      course_title: course.title,
      course_difficulty: course.level || 'intermediate',
      module_title: module.title,
      module_description: module.description || '',
      lessons: module.lessons.map((l) => ({ title: l.title })),
    }),

  grade: (data: { course_title: string; lesson_title: string; exercise_title: string; exercise_description: string; user_answer: string }) =>
    post<{ success: boolean; result?: GradeResult; error?: string }>('/api/ai/grade-exercise', data),
};

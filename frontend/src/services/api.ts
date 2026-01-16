import { useUIStore } from '@/store/uiStore';
import { refreshToken as refreshAuthToken, logout as apiLogout } from './authApi';

/**
 * API сервис для работы с бэкендом
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('access_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && retryCount === 0) {
    const refreshTokenValue = localStorage.getItem('refresh_token');

    if (refreshTokenValue) {
      try {
        console.log('🔄 Access token expired, refreshing...');
        const tokens = await refreshAuthToken(refreshTokenValue);
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);

        console.log('✅ Token refreshed successfully, retrying request...');
        // Retry the original request with new token
        return request<T>(endpoint, options, retryCount + 1);
      } catch (refreshError) {
        console.error('❌ Token refresh failed, logging out:', refreshError);
        // Refresh failed, logout user
        apiLogout();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
      }
    } else {
      // No refresh token available
      console.warn('⚠️ No refresh token available');
      apiLogout();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
  }

  if (response.status === 403) {
    // Check if it's a limit error (server should send specific detail, but we assume 403 is likely limit or auth)
    const data = await response.clone().json().catch(() => ({}));
    if (data.detail && data.detail.includes('limit reached')) {
      useUIStore.getState().setSubscriptionModalOpen(true);
    } else if (data.detail === "Free tier limit reached. Please upgrade to Premium.") {
      useUIStore.getState().setSubscriptionModalOpen(true);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export interface CourseSettings {
  title: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_hours: number;
  target_audience: string;
  learning_objectives?: string[];
  custom_category_name?: string;
  additional_requirements?: string;
  reference_files?: ReferenceFile[];
}

export interface ReferenceFile {
  name: string;
  content: string;
  size_kb?: number;
  type?: string;
}

export interface BackendPracticeExercise {
  title: string;
  description: string;
  difficulty: string;
  estimated_time?: string;
  solution_hint?: string;
}

export interface BackendVideoMaterial {
  title: string;
  url: string;
  description?: string;
  duration?: string;
  channel?: string;
}

export interface BackendAdditionalMaterial {
  title: string;
  type: string;
  url?: string;
  description?: string;
}

export interface BackendLesson {
  title: string;
  content: string;
  duration_minutes: number;
  exercises: string[];
  practice_exercises: BackendPracticeExercise[];
  videos: BackendVideoMaterial[];
  additional_materials: BackendAdditionalMaterial[];
}


export type HallucinationRisk = 'low' | 'medium' | 'high';

export interface CoursePassport {
  target_result: string;
  thinking_level: string;
  limitations: string;
  depth_score: number;
  hallucination_risk: HallucinationRisk;
}

export type ModuleLayerType = 'meaning' | 'core' | 'simulation' | 'practice' | 'control';

export interface ModuleLayer {
  type: ModuleLayerType;
  title: string;
  content: any;
}

export interface BackendModule {
  title: string;
  description: string;
  lessons: BackendLesson[];
  layers?: ModuleLayer[];
  duration_hours: number;
}

export interface BackendCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  modules: BackendModule[];
  total_duration_hours: number;
  learning_objectives: string[];
  passport?: CoursePassport;
}

export interface CourseStructureLesson {
  title: string;
  content?: string;
  duration_minutes?: number;
}

export interface CourseStructureModule {
  title: string;
  description?: string;
  lessons: CourseStructureLesson[];
}

export interface CourseStructurePlan {
  modules: CourseStructureModule[];
}

export interface CourseGenerationRequest {
  settings: CourseSettings;
  structure_override?: CourseStructurePlan;
  reference_files?: ReferenceFile[];
}

export interface CourseGenerationResponse {
  success: boolean;
  course?: BackendCourse;
  error?: string;
  message?: string;
}

export interface CourseStructureResponse {
  success: boolean;
  structure?: CourseStructurePlan;
  error?: string;
}

// ----- AI helpers -----

export interface ExerciseCheckRequest {
  course_title: string;
  lesson_title: string;
  exercise_title: string;
  exercise_description?: string;
  user_answer: string;
  language?: string;
}

export interface ExerciseCheckResult {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  ai_feedback: string;
}

export interface ExerciseCheckResponse {
  success: boolean;
  result?: ExerciseCheckResult;
  error?: string;
}

export interface AssistantUserContext {
  name?: string;
  goals?: string[];
  current_courses?: string[];
  preferred_topics?: string[];
}

export interface AssistantChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  user_context?: AssistantUserContext;
  history?: AssistantChatMessage[];
  language?: string;
}

export interface AssistantChatResponse {
  success: boolean;
  reply?: string;
  error?: string;
}

export interface TestQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface ModuleTest {
  tests: TestQuestion[];
}

export interface ModuleTestRequest {
  course_title: string;
  course_difficulty: string;
  module_title: string;
  module_description: string;
  lessons: Array<{
    title: string;
    content?: string;
  }>;
}

export interface ModuleTestResponse {
  success: boolean;
  test?: ModuleTest;
  error?: string;
}

// ===== Clarifying Questions for Course Wizard =====

export interface ClarifyingQuestion {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'scale';
  options?: string[];  // For choice type
  placeholder?: string; // For text type
  required: boolean;
}

export interface QuestionAnswer {
  questionId: string;
  answer: string | number;
}

export interface ClarifyingQuestionsRequest {
  topic: string;
  target_audience?: string;
}

export interface ClarifyingQuestionsResponse {
  success: boolean;
  questions?: ClarifyingQuestion[];
  error?: string;
}

/**
 * Преобразует настройки фронтенда в формат бэкенда
 */
export function transformFrontendSettingsToBackend(
  topic: string,
  frontendSettings: any
): CourseSettings {
  // Преобразуем уровень сложности
  const difficultyMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
    'Начинающий': 'beginner',
    'Средний': 'intermediate',
    'Продвинутый': 'advanced',
    'Экспертный': 'advanced',
  };

  // Преобразуем длительность из строки в часы
  const durationMap: Record<string, number> = {
    '1 неделя': 5,
    '2 недели': 10,
    '4 недели': 20,
    '8 недель': 40,
  };

  // Извлекаем цели обучения из текста
  const learningObjectives: string[] = [];
  if (frontendSettings.goal) {
    // Разбиваем цель на отдельные пункты если есть переносы строк или точки
    learningObjectives.push(...frontendSettings.goal.split(/[.\n]/).filter((obj: string) => obj.trim().length > 0));
  }

  return {
    title: topic,
    description: frontendSettings.preferences || `Курс по теме "${topic}"`,
    difficulty: difficultyMap[frontendSettings.level] || 'intermediate',
    duration_hours: durationMap[frontendSettings.duration] || 10,
    target_audience: frontendSettings.preferences || 'Общая аудитория',
    learning_objectives: learningObjectives.length > 0 ? learningObjectives : undefined,
    custom_category_name: frontendSettings.customCategory || undefined,
    additional_requirements: frontendSettings.preferences || undefined,
    reference_files: frontendSettings.referenceFiles || undefined,
  };
}

function sanitizeStructureForBackend(structure?: CourseStructurePlan): CourseStructurePlan | undefined {
  if (!structure) return undefined;
  return {
    modules: structure.modules.map((module) => ({
      title: module.title,
      description: module.description,
      lessons: (module.lessons || []).map((lesson) => ({
        title: lesson.title,
        content: lesson.content,
        duration_minutes: lesson.duration_minutes ?? 30,
      })),
    })),
  };
}

/**
 * Преобразует курс от бэкенда в формат фронтенда
 */
export function transformBackendCourseToFrontend(
  backendCourse: BackendCourse
): any {
  // Преобразуем данные для фронтенда с сохранением всех новых полей
  const transformedModules = backendCourse.modules.map((module) => ({
    id: crypto.randomUUID(),
    title: module.title,
    description: module.description,
    lessons: module.lessons.map((lesson) => {
      // Объединяем content и exercises в один content для обратной совместимости
      const exercisesText = lesson.exercises.length > 0
        ? `\n\nПрактические упражнения:\n${lesson.exercises.map((ex, idx) => `${idx + 1}. ${ex}`).join('\n')}`
        : '';

      return {
        id: crypto.randomUUID(),
        title: lesson.title,
        content: lesson.content + exercisesText,
        // Сохраняем новые данные
        practice_exercises: lesson.practice_exercises || [],
        videos: lesson.videos || [],
        additional_materials: lesson.additional_materials || [],
        duration_minutes: lesson.duration_minutes,
      };
    }),
  }));

  // Преобразуем difficulty обратно в формат фронтенда
  const levelMap: Record<string, string> = {
    'beginner': 'Начинающий',
    'intermediate': 'Средний',
    'advanced': 'Продвинутый',
  };

  // Преобразуем duration_hours обратно в строку
  const durationMap: Record<number, string> = {
    5: '1 неделя',
    10: '2 недели',
    20: '4 недели',
    40: '8 недель',
  };

  return {
    id: backendCourse.id,
    title: backendCourse.title,
    description: backendCourse.description,
    category: backendCourse.category.toLowerCase().replace(/\s+/g, '-'),
    format: 'Смешанный', // По умолчанию
    level: levelMap[backendCourse.difficulty] || 'Средний',
    duration: durationMap[backendCourse.total_duration_hours] || `${Math.round(backendCourse.total_duration_hours / 5)} недель`,
    intensity: 'Средняя', // По умолчанию
    goal: backendCourse.learning_objectives?.join(', ') || '',
    createdAt: new Date().toISOString(),
    modules: transformedModules,
  };
}

/**
 * Генерирует курс через API бэкенда
 */
export async function generateCourse(
  topic: string,
  frontendSettings: any,
  structureOverride?: CourseStructurePlan
): Promise<any> {
  try {
    const backendSettings = transformFrontendSettingsToBackend(topic, frontendSettings);
    const structurePayload = sanitizeStructureForBackend(structureOverride);

    const data = await api.post<CourseGenerationResponse>('/api/courses/generate', {
      settings: backendSettings,
      structure_override: structurePayload,
      reference_files: backendSettings.reference_files,
    });

    if (!data.success || !data.course) {
      throw new Error(data.error || 'Failed to generate course');
    }

    // Преобразуем курс в формат фронтенда
    return transformBackendCourseToFrontend(data.course);
  } catch (error) {
    console.error('Error generating course:', error);
    throw error;
  }
}

/**
 * Получить предварительную структуру курса для редактирования
 */
export async function previewCourseStructure(
  topic: string,
  frontendSettings: any
): Promise<CourseStructurePlan> {
  const backendSettings = transformFrontendSettingsToBackend(topic, frontendSettings);

  const response = await fetch(`${API_BASE_URL}/api/courses/structure/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      settings: backendSettings,
      reference_files: backendSettings.reference_files,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data: CourseStructureResponse = await response.json();

  if (!data.success || !data.structure) {
    throw new Error(data.error || 'Не удалось получить структуру курса');
  }

  return data.structure;
}

export async function gradeExercise(
  payload: ExerciseCheckRequest
): Promise<ExerciseCheckResult> {
  const response = await fetch(`${API_BASE_URL}/api/ai/grade-exercise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Ошибка проверки задания: ${response.status}`);
  }

  const data: ExerciseCheckResponse = await response.json();
  if (!data.success || !data.result) {
    throw new Error(data.error || 'Не удалось проверить задание');
  }
  return data.result;
}

export async function assistantChat(
  payload: AssistantChatRequest
): Promise<AssistantChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ai/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Ошибка чата с ассистентом: ${response.status}`);
  }

  const data: AssistantChatResponse = await response.json();
  return data;
}

export async function generateModuleTest(
  payload: ModuleTestRequest
): Promise<ModuleTestResponse> {
  const response = await fetch(`${API_BASE_URL}/api/courses/generate-module-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Ошибка генерации теста: ${response.status}`);
  }

  const data: ModuleTestResponse = await response.json();
  return data;
}

/**
 * Проверяет доступность API
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Генерирует уточняющие вопросы для создания курса
 */
export async function generateClarifyingQuestions(
  topic: string,
  targetAudience?: string
): Promise<ClarifyingQuestion[]> {
  const payload: ClarifyingQuestionsRequest = {
    topic,
    target_audience: targetAudience,
  };

  const response = await fetch(`${API_BASE_URL}/api/courses/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Ошибка генерации вопросов: ${response.status}`);
  }

  const data: ClarifyingQuestionsResponse = await response.json();

  if (!data.success || !data.questions) {
    throw new Error(data.error || 'Не удалось сгенерировать вопросы');
  }

  return data.questions;
}

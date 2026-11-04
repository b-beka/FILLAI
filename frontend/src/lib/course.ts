import type { Course, Lesson } from './api';

// Бэкенд хранит урок как JSON-строку: { content, videos, practice_exercises, ... }
// (см. generate_course в backend/app/main.py)

export interface Video {
  title: string;
  url: string;
  channel?: string;
  duration?: string;
}

export interface Exercise {
  title: string;
  description: string;
  difficulty?: string;
  solution_hint?: string;
}

export interface LessonContent {
  text: string;
  videos: Video[];
  exercises: Exercise[];
}

// Поля «опытов» (experience_agent), которые можно показать как текст
const TEXT_FIELDS = ['content', 'concept_explanation', 'scenario', 'situation', 'context', 'description_for_ai', 'observation_task', 'expected_insight', 'raw_content'];
const LIST_FIELDS = ['key_points', 'analysis_questions', 'discussion_points', 'documents'];

export function parseLesson(lesson: Lesson): LessonContent {
  const raw = lesson.content ?? '';
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    data = parsed && typeof parsed === 'object' ? parsed : { content: String(parsed) };
  } catch {
    return { text: raw, videos: [], exercises: [] };
  }

  const parts: string[] = [];
  for (const key of TEXT_FIELDS) {
    if (typeof data[key] === 'string' && data[key]) parts.push(data[key] as string);
  }
  for (const key of LIST_FIELDS) {
    const list = data[key];
    if (Array.isArray(list) && list.length) parts.push(list.map((item) => `- ${String(item)}`).join('\n'));
  }

  return {
    text: parts.join('\n\n'),
    videos: Array.isArray(data.videos) ? (data.videos as Video[]).filter((v) => v?.url) : [],
    exercises: Array.isArray(data.practice_exercises) ? (data.practice_exercises as Exercise[]) : [],
  };
}

export function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return match ? match[1] : null;
}

export function allLessons(course: Course): Lesson[] {
  return (course.modules ?? []).flatMap((m) => m.lessons);
}

// Иконка ветки графа по теме запроса — как в макете: языки, тренировки, дизайн
export type BranchIcon = 'globe' | 'dumbbell' | 'sparkles' | 'code' | 'book';

export function iconFor(title: string): BranchIcon {
  const t = title.toLowerCase();
  if (/язык|english|англ|немец|франц|испан|китай|казах|lang/.test(t)) return 'globe';
  if (/трен|спорт|фитнес|бег|йог|зал|workout|gym/.test(t)) return 'dumbbell';
  if (/дизайн|рисов|арт|figma|ui|ux|креатив|design/.test(t)) return 'sparkles';
  if (/python|код|програм|javascript|react|sql|алгоритм|code|dev/.test(t)) return 'code';
  return 'book';
}

export const LEVELS = [
  { id: 'beginner', label: 'Начинающий' },
  { id: 'intermediate', label: 'Средний' },
  { id: 'advanced', label: 'Продвинутый' },
] as const;

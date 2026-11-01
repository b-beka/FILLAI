'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Course, type Level } from './api';
import { useAuth } from './auth';

interface Pending {
  topic: string;
  error?: string;
}

interface CoursesState {
  courses: Course[];
  loading: boolean;
  pending: Pending | null;
  reload: () => Promise<void>;
  generate: (topic: string, level: Level, files?: { name: string; content: string }[]) => Promise<string | null>;
  dismissError: () => void;
}

const CoursesContext = createContext<CoursesState | null>(null);

export function CoursesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setCourses([]);
      return;
    }
    setLoading(true);
    try {
      setCourses(await api.myCourses());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const generate = useCallback(
    async (topic: string, level: Level, files: { name: string; content: string }[] = []) => {
      setPending({ topic });
      try {
        const res = await api.generate(topic, level, files);
        if (!res.success || !res.course) throw new Error(res.error || 'Не удалось создать курс');
        await reload();
        setPending(null);
        return res.course.id;
      } catch (e) {
        setPending({ topic, error: e instanceof Error ? e.message : 'Не удалось создать курс' });
        return null;
      }
    },
    [reload],
  );

  const dismissError = useCallback(() => setPending(null), []);

  return (
    <CoursesContext.Provider value={{ courses, loading, pending, reload, generate, dismissError }}>{children}</CoursesContext.Provider>
  );
}

export function useCourses() {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error('useCourses вне CoursesProvider');
  return ctx;
}

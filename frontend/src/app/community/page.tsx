'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PageFrame, { Card, Empty } from '@/components/PageFrame';
import { Icon } from '@/components/Icons';
import { api, type Course } from '@/lib/api';
import { iconFor } from '@/lib/course';

// «Тут пользователи могут поделиться с миром своим курсом — в своём роде маркетплейс» — презентация
export default function CommunityPage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .publicCourses()
      .then(setCourses)
      .catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (courses ?? []).filter((c) => !q || c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }, [courses, query]);

  return (
    <PageFrame
      title="Сообщество"
      aside={
        <label className="flex w-full items-center gap-3 rounded-full bg-field px-4 py-2.5 text-field-ink sm:w-72">
          <Icon name="search" size={18} strokeWidth={2} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти курс" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
      }
    >
      {error ? (
        <Empty>Не удалось загрузить курсы: {error}</Empty>
      ) : !courses ? (
        <Empty>Загружаю…</Empty>
      ) : !shown.length ? (
        <Empty>{query ? 'Ничего не нашлось' : 'Пока никто не поделился курсом'}</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((c) => (
            <Link key={c.id} href={`/course/${c.id}`} className="group">
              <Card className="flex h-full gap-4 transition group-hover:ring-white/30">
                <span className="node flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <Icon name={iconFor(c.title)} size={22} strokeWidth={1.3} />
                </span>
                <span className="min-w-0">
                  <span className="mb-1 block truncate text-lg">{c.title}</span>
                  {c.description && <span className="line-clamp-2 block text-sm font-light text-ink/70">{c.description}</span>}
                  <span className="mt-2 block text-xs font-light text-ink/55">
                    {c.modules?.length ?? 0} мод. · {c.views} просмотров
                  </span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageFrame>
  );
}

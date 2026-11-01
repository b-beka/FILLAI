'use client';

import Link from 'next/link';
import PageFrame, { Card, Empty, button } from '@/components/PageFrame';
import { Icon } from '@/components/Icons';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCourses } from '@/lib/courses';
import { LEVELS } from '@/lib/course';

// «Тут хранится вся история и курсы, с которыми пользователь взаимодействовал» — презентация
export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const { courses, loading, reload } = useCourses();

  const remove = async (id: string, title: string) => {
    if (!confirm(`Удалить курс «${title}»?`)) return;
    await api.deleteCourse(id).catch(() => undefined);
    await reload();
  };

  return (
    <PageFrame title="Библиотека">
      {!authLoading && !user ? (
        <Empty>
          <Link href="/login" className="underline">
            Войдите
          </Link>
          , чтобы видеть свои курсы
        </Empty>
      ) : loading && !courses.length ? (
        <Empty>Загружаю…</Empty>
      ) : !courses.length ? (
        <div className="py-12 text-center">
          <p className="mb-5 font-light text-ink/70">Пока пусто. Задайте первую тему в строке «Изучить».</p>
          <Link href="/" className={button}>
            Изучить тему
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => {
            const lessons = (c.modules ?? []).reduce((n, m) => n + m.lessons.length, 0);
            return (
              <Card key={c.id} className="flex flex-col">
                <Link href={`/course/${c.id}`} className="mb-2 text-lg hover:underline">
                  {c.title}
                </Link>
                {c.description && <p className="mb-4 line-clamp-2 text-sm font-light text-ink/70">{c.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-3 text-xs font-light text-ink/60">
                  <span>
                    {[LEVELS.find((l) => l.id === c.level)?.label, `${c.modules?.length ?? 0} мод.`, `${lessons} ур.`, new Date(c.created_at).toLocaleDateString('ru-RU')]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <span className="flex gap-3">
                    <Link href={`/?course=${c.id}`} className="hover:text-ink" title="Показать на графе">
                      <Icon name="link" size={18} />
                    </Link>
                    <button onClick={() => remove(c.id, c.title)} className="hover:text-ink" title="Удалить">
                      <Icon name="trash" size={18} />
                    </button>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageFrame>
  );
}

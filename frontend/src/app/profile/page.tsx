'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageFrame, { Card, Empty, button, ghostButton } from '@/components/PageFrame';
import { Icon, UserSolid } from '@/components/Icons';
import { useAuth } from '@/lib/auth';
import { useCourses } from '@/lib/courses';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { courses } = useCourses();

  if (loading) return <PageFrame title="Профиль">{<Empty>Загружаю…</Empty>}</PageFrame>;
  if (!user)
    return (
      <PageFrame title="Профиль">
        <div className="py-12 text-center">
          <p className="mb-5 font-light text-ink/70">Войдите, чтобы сохранять курсы и прогресс</p>
          <Link href="/login" className={button}>
            Войти
          </Link>
        </div>
      </PageFrame>
    );

  const lessons = courses.reduce((n, c) => n + (c.modules ?? []).reduce((k, m) => k + m.lessons.length, 0), 0);

  return (
    <PageFrame title="Профиль">
      <Card className="mb-5 flex flex-wrap items-center gap-5">
        <span className="node flex h-20 w-20 items-center justify-center rounded-full">
          <UserSolid size={36} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl">{user.full_name || user.username}</p>
          <p className="truncate font-light text-ink/65">{user.email}</p>
        </div>
        <button
          onClick={() => {
            logout();
            router.push('/');
          }}
          className={ghostButton}
        >
          <Icon name="logout" size={16} /> Выйти
        </button>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Курсов', courses.length],
          ['Уроков', lessons],
          ['Генераций', user.generations_count],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-3xl font-light">{value}</p>
            <p className="mt-1 text-sm font-light text-ink/65">{label}</p>
          </Card>
        ))}
      </div>
    </PageFrame>
  );
}

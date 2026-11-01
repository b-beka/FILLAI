'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon, Logo, type IconName } from './Icons';
import { useAuth } from '@/lib/auth';
import { useCourses } from '@/lib/courses';
import { u } from '@/lib/units';

// Геометрия — слой «Group 8» кадра «MacBook Pro 16 - 4»: ширина 375, строки 65, иконки 30, текст 20
// Три темы: серебро (макет Figma), тёмная, светлая. Применяется до отрисовки скриптом в layout.tsx
export const THEMES = [
  { id: 'silver', label: 'Серебро', swatch: 'linear-gradient(125deg, #303030, #6a6a6a 50%, #303030)' },
  { id: 'dark', label: 'Тёмная', swatch: 'linear-gradient(125deg, #0b0b0b, #1b1b1b 50%, #0b0b0b)' },
  { id: 'light', label: 'Светлая', swatch: 'linear-gradient(125deg, #ececec, #bdbdbd 50%, #ececec)' },
] as const;
type Theme = (typeof THEMES)[number]['id'];
export const THEME_KEY = 'fill-theme';

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/library', label: 'Библиотека', icon: 'library' },
  { href: '/community', label: 'Сообщество', icon: 'community' },
  { href: '/friends', label: 'Друзья', icon: 'friends' },
  { href: '/profile', label: 'Профиль', icon: 'profile' },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const { courses, pending } = useCourses();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setThemeState] = useState<Theme>('silver');
  const [menu, setMenu] = useState<'theme' | 'help' | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.theme as Theme | undefined;
    if (current && THEMES.some((t) => t.id === current)) setThemeState(current);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  };

  useEffect(onClose, [pathname, params, onClose]);

  const width = collapsed ? 100 : 375;
  const activeCourse = params?.get('course');

  return (
    <>
      {open && <button aria-label="Закрыть меню" className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[300px] shrink-0 flex-col bg-side text-ink transition-[transform,width] duration-200 md:static md:w-[var(--sw)] md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ ['--sw' as string]: u(width) }}
      >
        {/* Лого + свернуть */}
        <div className="flex shrink-0 items-center justify-between" style={{ height: u(100), paddingLeft: u(20), paddingRight: u(collapsed ? 20 : 43) }}>
          <Link href="/" aria-label="FILL AI — главная" className={collapsed ? 'hidden' : ''}>
            <Logo size={u(60)} />
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden text-ink/90 hover:text-ink md:block"
            aria-label={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
            style={{ width: u(38), height: u(38), marginInline: collapsed ? 'auto' : undefined }}
          >
            <Icon name="panel" size="100%" strokeWidth={1.4} />
          </button>
        </div>

        <nav style={{ marginTop: u(15) }}>
          {NAV.map((nav) => {
            // Без входа вместо «Профиля» — «Войти»
            const item = nav.href === '/profile' && !loading && !user ? { href: '/login', label: 'Войти', icon: 'profile' as const } : nav;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center transition-colors hover:bg-ink/[0.05] ${active ? 'bg-ink/[0.08]' : ''}`}
                style={{ height: u(65), paddingLeft: u(35), gap: u(31), fontSize: u(20) }}
              >
                <Icon name={item.icon} size={u(30)} strokeWidth={1.2} className="shrink-0" />
                {!collapsed && <span className="font-light">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 bg-line" style={{ height: 1, marginTop: u(33) }} />

        {!collapsed && (
          <div className="flex min-h-0 flex-1 flex-col" style={{ paddingTop: u(43) }}>
            <p className="font-light text-muted" style={{ paddingLeft: u(17), fontSize: u(20), marginBottom: u(10) }}>
              Запросы
            </p>
            <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto border-l border-line" style={{ marginLeft: u(35), marginRight: u(10) }}>
              {pending && (
                <li className="pulse-soft truncate font-light text-muted" style={{ height: u(65), lineHeight: u(65), paddingLeft: u(27), fontSize: u(20) }}>
                  {pending.topic}
                </li>
              )}
              {courses.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/?course=${c.id}`}
                    title={c.title}
                    className={`block truncate font-normal transition-colors hover:bg-ink/[0.05] ${activeCourse === c.id ? 'bg-ink/[0.08]' : ''}`}
                    style={{ height: u(65), lineHeight: u(65), paddingLeft: u(27), fontSize: u(20) }}
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
              {!pending && courses.length === 0 && (
                <li className="font-light text-muted/70" style={{ paddingLeft: u(27), paddingTop: u(18), fontSize: u(16), lineHeight: 1.5 }}>
                  Здесь появятся ваши темы
                </li>
              )}
            </ul>
          </div>
        )}
        {collapsed && <div className="flex-1" />}

        {/* Низ: настройки (тема) и помощь */}
        <div className="relative shrink-0 border-t border-line">
          <div className="flex items-center justify-between" style={{ height: u(64), paddingLeft: u(35), paddingRight: u(collapsed ? 35 : 21) }}>
            <button
              onClick={() => setMenu((m) => (m === 'theme' ? null : 'theme'))}
              aria-label="Тема оформления"
              aria-expanded={menu === 'theme'}
              title="Тема оформления"
              className="text-ink/90 hover:text-ink"
            >
              <Icon name="settings" size={u(31)} strokeWidth={1.3} />
            </button>
            {!collapsed && (
              <button onClick={() => setMenu((m) => (m === 'help' ? null : 'help'))} aria-label="Помощь" className="text-ink/90 hover:text-ink">
                <Icon name="help" size={u(31)} strokeWidth={1.3} />
              </button>
            )}
          </div>
          {menu === 'theme' && (
            <div className="panel absolute bottom-full left-3 z-10 mb-3 w-60 rounded-2xl p-3 text-white" role="menu" aria-label="Тема оформления">
              <p className="px-2 pb-2 text-xs font-light text-white/75">Тема</p>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  role="menuitemradio"
                  aria-checked={theme === t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-white/10 ${theme === t.id ? 'bg-white/15' : ''}`}
                >
                  <span className="h-6 w-6 shrink-0 rounded-full ring-1 ring-white/40" style={{ background: t.swatch }} />
                  <span className="flex-1 font-light">{t.label}</span>
                  {theme === t.id && <Icon name="task" size={18} />}
                </button>
              ))}
            </div>
          )}
          {menu === 'help' && (
            <div className="panel absolute bottom-full right-3 z-10 mb-3 w-72 rounded-2xl p-5 text-sm leading-relaxed text-white">
              <p className="mb-2 font-medium">Как пользоваться</p>
              <p className="font-light">
                Напишите тему в строке «Изучить» — FILL AI соберёт мини-курс: конспект, видео, задания и тест. Каждая тема становится веткой
                вашего графа знаний.
              </p>
              <p className="mt-2 font-light">
                Граф живой: узлы можно таскать, фон — двигать мышью, колесо приближает, двойной клик возвращает вид.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

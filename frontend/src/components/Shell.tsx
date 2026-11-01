'use client';

import { Suspense, useCallback, useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Icon } from './Icons';
import { AuthProvider } from '@/lib/auth';
import { CoursesProvider } from '@/lib/courses';

export default function Shell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const close = useCallback(() => setMenu(false), []);

  return (
    <AuthProvider>
      <CoursesProvider>
        <div className="flex h-dvh overflow-hidden">
          <Suspense>
            <Sidebar open={menu} onClose={close} />
          </Suspense>
          <main className="bg-canvas relative min-w-0 flex-1 overflow-hidden">
            <button
              onClick={() => setMenu(true)}
              className="absolute left-4 top-4 z-20 rounded-full bg-side/80 p-2 text-ink md:hidden"
              aria-label="Открыть меню"
            >
              <Icon name="panel" size={22} />
            </button>
            {children}
          </main>
        </div>
      </CoursesProvider>
    </AuthProvider>
  );
}

import type { ReactNode } from 'react';

// Внутренние страницы: тот же холст, контент в прокручиваемой колонке
export default function PageFrame({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-16 md:px-10 md:pt-14">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-light tracking-tight text-ink md:text-4xl">{title}</h1>
          {aside}
        </header>
        {children}
      </div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[24px] bg-black/20 p-5 text-ink ring-1 ring-white/10 md:p-6 ${className}`}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-16 text-center font-light text-ink/70">{children}</p>;
}

export const button =
  'inline-flex items-center justify-center gap-2 rounded-full bg-field px-5 py-2.5 text-sm font-medium text-field-ink transition hover:brightness-95 disabled:opacity-50';

export const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-light text-ink ring-1 ring-white/30 transition hover:ring-white/70 disabled:opacity-50';

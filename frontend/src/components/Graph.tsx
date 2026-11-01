'use client';

import type { ReactNode } from 'react';
import { STAGE, u } from '@/lib/units';

export interface GraphNode {
  id: string;
  x: number; // смещение от центра пользователя, px макета
  y: number;
  size: number;
  content: ReactNode;
  label?: string;
  showLabel?: boolean;
  onClick?: () => void;
  active?: boolean;
  pulse?: boolean;
  delay?: number;
}

// Сцена 1353×1117 в единицах макета, центрируется в холсте
export function Stage({ children }: { children: ReactNode }) {
  return (
    // Без transform: иначе position: fixed у мобильной панели перестанет работать
    <div
      className="stage pointer-events-none absolute"
      style={{ left: `calc(50% - ${u(STAGE.w / 2)})`, top: `calc(50% - ${u(STAGE.h / 2)})`, width: u(STAGE.w), height: u(STAGE.h) }}
    >
      {children}
    </div>
  );
}

export function Edges({ edges, nodes }: { edges: [string, string][]; nodes: GraphNode[] }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`${-STAGE.ox} ${-STAGE.oy} ${STAGE.w} ${STAGE.h}`} aria-hidden>
      {edges.map(([a, b]) => {
        const p = byId.get(a);
        const q = byId.get(b);
        if (!p || !q) return null;
        return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--edge)" strokeWidth={6} strokeLinecap="round" />;
      })}
    </svg>
  );
}

export function Nodes({ nodes }: { nodes: GraphNode[] }) {
  return (
    <>
      {nodes.map((n) => {
        const Tag = n.onClick ? 'button' : 'div';
        return (
          <Tag
            key={n.id}
            onClick={n.onClick}
            aria-label={n.label}
            title={n.label}
            className={`node node-in group pointer-events-auto absolute flex items-center justify-center rounded-full transition-[transform,filter] duration-200 ${
              n.onClick ? 'cursor-pointer hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white' : ''
            } ${n.active ? 'ring-[3px] ring-white/80' : ''} ${n.pulse ? 'pulse-soft' : ''}`}
            style={{
              left: u(STAGE.ox + n.x),
              top: u(STAGE.oy + n.y),
              width: u(n.size),
              height: u(n.size),
              transform: 'translate(-50%, -50%)',
              animationDelay: n.delay ? `${n.delay}ms` : undefined,
            }}
          >
            {n.content}
            {n.label && (
              <span
                className={`pointer-events-none absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap font-light text-ink/80 transition-opacity ${
                  n.showLabel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                }`}
                style={{ marginTop: u(10), fontSize: u(16), maxWidth: u(260), overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {n.label}
              </span>
            )}
          </Tag>
        );
      })}
    </>
  );
}

// Кольца уровня владения навыком — кадр «MacBook Pro 16 - 1»: Ø691 / Ø523 / внутренний диск растёт с прогрессом
export function ProgressRings({ percent }: { percent: number }) {
  const inner = 200 + (Math.max(0, Math.min(100, percent)) / 100) * 300;
  const ring = (d: number, color: string) => (
    <div
      className="absolute rounded-full transition-all duration-700"
      style={{ left: u(STAGE.ox - d / 2), top: u(STAGE.oy - d / 2), width: u(d), height: u(d), background: color }}
    />
  );
  return (
    <div className="absolute inset-0">
      {ring(691, 'var(--ring-1)')}
      {ring(523, 'var(--ring-2)')}
      {ring(inner, 'var(--ring-3)')}
      <p className="absolute -translate-x-1/2 font-light text-ink/80" style={{ left: u(STAGE.ox), top: u(STAGE.oy + 360), fontSize: u(18) }}>
        Уровень владения: {percent}%
      </p>
    </div>
  );
}

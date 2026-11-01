'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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

type Point = { x: number; y: number };
type Body = Point & { vx: number; vy: number; phase: number };

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

// «Живой» граф из прототипа living-graph-ui: узлы покачиваются, отталкиваются от курсора,
// перетаскиваются и пружиной возвращаются на место из макета
const WANDER = 4; // амплитуда покачивания, px макета
const CURSOR_R = 170; // радиус влияния курсора
const CURSOR_PUSH = 14;
const SPRING = 0.08;
const DAMPING = 0.82;
const DRAG_THRESHOLD = 5;

export function LivingGraph({
  nodes,
  edges,
  children,
}: {
  nodes: GraphNode[];
  edges: [string, string][];
  // Слой между связями и узлами (панель курса); получает живые позиции узлов
  children?: (pos: (id: string) => Point | undefined) => ReactNode;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const bodies = useRef(new Map<string, Body>());
  const cursor = useRef<Point | null>(null);
  const drag = useRef<{ id: string; start: Point; from: Point; moved: boolean } | null>(null);
  const suppressClick = useRef<string | null>(null);
  const [, setFrame] = useState(0);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const body = (id: string) => {
    let b = bodies.current.get(id);
    if (!b) {
      b = { x: 0, y: 0, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 };
      bodies.current.set(id, b);
    }
    return b;
  };

  // Координаты указателя в единицах сцены (центр пользователя = 0,0)
  const toStage = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = layer.current?.getBoundingClientRect();
    if (!rect || !rect.width) return null;
    const scale = rect.width / STAGE.w;
    return { x: (clientX - rect.left) / scale - STAGE.ox, y: (clientY - rect.top) / scale - STAGE.oy };
  }, []);

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const p = toStage(e.clientX, e.clientY);
      cursor.current = e.pointerType === 'mouse' ? p : null;
      const d = drag.current;
      if (d && p) {
        const dx = p.x - d.start.x;
        const dy = p.y - d.start.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) d.moved = true;
        const b = body(d.id);
        b.x = d.from.x + dx;
        b.y = d.from.y + dy;
        b.vx = b.vy = 0;
      }
    };
    const onUp = () => {
      if (drag.current?.moved) suppressClick.current = drag.current.id;
      drag.current = null;
    };
    const onLeave = () => {
      cursor.current = null;
    };

    const tick = (now: number) => {
      const t = now / 1000;
      for (const n of nodesRef.current) {
        const b = body(n.id);
        if (drag.current?.id === n.id) continue;
        const amp = still ? 0 : WANDER * (n.id === 'me' ? 0.5 : 1);
        let tx = Math.sin(t * 0.6 + b.phase) * amp;
        let ty = Math.cos(t * 0.5 + b.phase * 1.3) * amp;
        const c = cursor.current;
        if (c && !still) {
          const dx = n.x + b.x - c.x;
          const dy = n.y + b.y - c.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 1 && dist < CURSOR_R) {
            const push = (1 - dist / CURSOR_R) * CURSOR_PUSH;
            tx += (dx / dist) * push;
            ty += (dy / dist) * push;
          }
        }
        b.vx = (b.vx + (tx - b.x) * SPRING) * DAMPING;
        b.vy = (b.vy + (ty - b.y) * SPRING) * DAMPING;
        b.x += b.vx;
        b.y += b.vy;
      }
      setFrame((f) => (f + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.documentElement.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [toStage]);

  const live = nodes.map((n) => {
    const b = bodies.current.get(n.id);
    return b ? { ...n, x: n.x + b.x, y: n.y + b.y } : n;
  });
  const byId = new Map(live.map((n) => [n.id, n]));
  const pos = (id: string) => byId.get(id);

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = toStage(e.clientX, e.clientY);
    if (!p) return;
    const b = body(id);
    drag.current = { id, start: p, from: { x: b.x, y: b.y }, moved: false };
  };

  const click = (n: GraphNode) => () => {
    if (suppressClick.current === n.id) {
      suppressClick.current = null;
      return;
    }
    n.onClick?.();
  };

  return (
    <div ref={layer} className="absolute inset-0">
      <svg className="absolute inset-0 h-full w-full" viewBox={`${-STAGE.ox} ${-STAGE.oy} ${STAGE.w} ${STAGE.h}`} aria-hidden>
        {edges.map(([a, b]) => {
          const p = byId.get(a);
          const q = byId.get(b);
          if (!p || !q) return null;
          return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--edge)" strokeWidth={6} strokeLinecap="round" />;
        })}
      </svg>
      {children?.(pos)}
      {live.map((n) => {
        const Tag = n.onClick ? 'button' : 'div';
        const c = cursor.current;
        const near = c ? Math.max(0, 1 - Math.hypot(n.x - c.x, n.y - c.y) / CURSOR_R) : 0;
        const dragging = drag.current?.id === n.id;
        return (
          <Tag
            key={n.id}
            onClick={click(n)}
            onPointerDown={startDrag(n.id)}
            aria-label={n.label}
            title={n.label}
            className={`node node-in group pointer-events-auto absolute flex touch-none select-none items-center justify-center rounded-full ${
              dragging ? 'cursor-grabbing' : n.onClick ? 'cursor-pointer' : 'cursor-grab'
            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
              n.active ? 'ring-[3px] ring-white/80' : ''
            } ${n.pulse ? 'pulse-soft' : ''}`}
            style={{
              left: u(STAGE.ox + n.x),
              top: u(STAGE.oy + n.y),
              width: u(n.size),
              height: u(n.size),
              transform: `translate(-50%, -50%) scale(${dragging ? 1.08 : 1})`,
              filter: near > 0 ? `brightness(${1 + near * 0.18})` : undefined,
              transition: 'transform 150ms ease-out',
              animationDelay: n.delay ? `${n.delay}ms` : undefined,
            }}
          >
            {n.content}
            {n.label && (
              <span
                className={`pointer-events-none absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap font-light text-ink/80 transition-opacity ${
                  n.showLabel || dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                }`}
                style={{ marginTop: u(10), fontSize: u(16), maxWidth: u(260), overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {n.label}
              </span>
            )}
          </Tag>
        );
      })}
    </div>
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

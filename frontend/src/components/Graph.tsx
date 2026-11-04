'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icons';
import { STAGE, u } from '@/lib/units';

export interface GraphNode {
  id: string;
  x: number; // начальная позиция относительно центра пользователя, px макета
  y: number;
  size: number;
  content: ReactNode;
  label?: string;
  showLabel?: boolean;
  onClick?: () => void;
  active?: boolean;
  pulse?: boolean;
  delay?: number;
  hidden?: boolean; // участвует в раскладке, но невидим и не ловит указатель
}

export type Point = { x: number; y: number };
type Body = Point & { vx: number; vy: number };
type View = { k: number; x: number; y: number };

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

// Силовой граф в духе Obsidian: узлы отталкиваются, связи — пружины, всё можно таскать,
// холст двигается мышью, колесо — зум. Симуляция «остывает» и снова оживает при перетаскивании.
const REPULSION = 9000;
const SPRING = 0.035;
const CENTER = 0.004;
const DAMPING = 0.78;
const ALPHA_MIN = 0.002;
const ALPHA_DECAY = 0.985;
const DRAG_THRESHOLD = 5;
const ZOOM = { min: 0.35, max: 2.5 };

function linkLength(a: GraphNode, b: GraphNode) {
  return a.size >= 90 || b.size >= 90 ? 175 : 115;
}

export function LivingGraph({
  nodes,
  edges,
  underlay,
  children,
}: {
  nodes: GraphNode[];
  edges: [string, string][];
  // Под графом в мировых координатах (кольца прогресса), получает живые позиции
  underlay?: (pos: (id: string) => Point | undefined) => ReactNode;
  // Поверх связей в координатах сцены (панель курса), получает позиции на экране
  children?: (pos: (id: string) => Point | undefined) => ReactNode;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const bodies = useRef(new Map<string, Body>());
  const alpha = useRef(1);
  const view = useRef<View>({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ id: string; start: Point; moved: boolean } | null>(null);
  const pan = useRef<{ start: Point; from: View } | null>(null);
  const suppressClick = useRef<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [, setFrame] = useState(0);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Новые узлы появляются на подсказанной позиции и «будят» симуляцию
  for (const n of nodes) {
    if (!bodies.current.has(n.id)) {
      bodies.current.set(n.id, { x: n.x, y: n.y, vx: 0, vy: 0 });
      alpha.current = Math.max(alpha.current, 0.6);
    }
  }

  // Указатель → координаты сцены (центр пользователя = 0,0, без учёта зума)
  const toStage = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = layer.current?.getBoundingClientRect();
    if (!rect || !rect.width) return null;
    const scale = rect.width / STAGE.w;
    return { x: (clientX - rect.left) / scale - STAGE.ox, y: (clientY - rect.top) / scale - STAGE.oy };
  }, []);
  const toWorld = (p: Point): Point => ({ x: (p.x - view.current.x) / view.current.k, y: (p.y - view.current.y) / view.current.k });

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const p = toStage(e.clientX, e.clientY);
      if (!p) return;
      const d = drag.current;
      if (d) {
        if (Math.hypot(p.x - d.start.x, p.y - d.start.y) > DRAG_THRESHOLD) d.moved = true;
        const b = bodies.current.get(d.id);
        if (b && d.moved) {
          const w = toWorld(p);
          b.x = w.x;
          b.y = w.y;
          b.vx = b.vy = 0;
          alpha.current = Math.max(alpha.current, 0.3);
        }
      } else if (pan.current) {
        const { start, from } = pan.current;
        view.current = { k: from.k, x: from.x + p.x - start.x, y: from.y + p.y - start.y };
      }
    };
    const onUp = () => {
      if (drag.current?.moved) suppressClick.current = drag.current.id;
      drag.current = null;
      pan.current = null;
      layer.current?.classList.remove('cursor-grabbing');
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toStage(e.clientX, e.clientY);
      if (!p) return;
      const v = view.current;
      const k = Math.min(ZOOM.max, Math.max(ZOOM.min, v.k * Math.exp(-e.deltaY * 0.0015)));
      // Зум вокруг курсора
      view.current = { k, x: p.x - ((p.x - v.x) / v.k) * k, y: p.y - ((p.y - v.y) / v.k) * k };
    };

    const tick = () => {
      const a = alpha.current;
      const list = nodesRef.current;
      if (a > ALPHA_MIN && !still) {
        const byId = new Map(list.map((n) => [n.id, n]));
        // Отталкивание всех пар
        for (let i = 0; i < list.length; i++) {
          const bi = bodies.current.get(list[i].id)!;
          for (let j = i + 1; j < list.length; j++) {
            const bj = bodies.current.get(list[j].id)!;
            let dx = bj.x - bi.x;
            let dy = bj.y - bi.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < 1) {
              dx = Math.random() - 0.5;
              dy = Math.random() - 0.5;
              d2 = 1;
            }
            const d = Math.sqrt(d2);
            const f = (Math.min(REPULSION / d2, 6) * a) / d;
            bi.vx -= dx * f;
            bi.vy -= dy * f;
            bj.vx += dx * f;
            bj.vy += dy * f;
          }
        }
        // Пружины связей
        for (const [ia, ib] of edgesRef.current) {
          const na = byId.get(ia);
          const nb = byId.get(ib);
          const ba = bodies.current.get(ia);
          const bb = bodies.current.get(ib);
          if (!na || !nb || !ba || !bb) continue;
          const dx = bb.x - ba.x;
          const dy = bb.y - ba.y;
          const d = Math.hypot(dx, dy) || 1;
          const f = ((d - linkLength(na, nb)) * SPRING * a) / d;
          ba.vx += dx * f;
          ba.vy += dy * f;
          bb.vx -= dx * f;
          bb.vy -= dy * f;
        }
        // Слабое притяжение к центру и движение
        for (const n of list) {
          const b = bodies.current.get(n.id)!;
          if (drag.current?.id === n.id && drag.current.moved) continue;
          b.vx -= b.x * CENTER * a;
          b.vy -= b.y * CENTER * a;
          b.vx *= DAMPING;
          b.vy *= DAMPING;
          b.x += b.vx;
          b.y += b.vy;
        }
        alpha.current = drag.current ? Math.max(a, 0.3) : a * ALPHA_DECAY;
      }
      setFrame((f) => (f + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };

    const el = layer.current;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el?.addEventListener('wheel', onWheel, { passive: false });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el?.removeEventListener('wheel', onWheel);
    };
  }, [toStage]);

  const v = view.current;
  const world = (id: string) => bodies.current.get(id);
  const screen = (id: string) => {
    const b = bodies.current.get(id);
    return b ? { x: v.x + b.x * v.k, y: v.y + b.y * v.k } : undefined;
  };

  // Соседи узла под курсором — подсвечиваем, остальное приглушаем (как в Obsidian)
  const neighbours = new Set<string>();
  if (hover) {
    neighbours.add(hover);
    for (const [a, b] of edges) {
      if (a === hover) neighbours.add(b);
      if (b === hover) neighbours.add(a);
    }
  }
  const hiddenIds = new Set(nodes.filter((n) => n.hidden).map((n) => n.id));
  const dim = (id: string) => hover !== null && !neighbours.has(id);

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const p = toStage(e.clientX, e.clientY);
    if (p) drag.current = { id, start: p, moved: false };
  };
  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = toStage(e.clientX, e.clientY);
    if (!p) return;
    pan.current = { start: p, from: { ...view.current } };
    layer.current?.classList.add('cursor-grabbing');
  };
  const zoomBy = (factor: number) => {
    const k = Math.min(ZOOM.max, Math.max(ZOOM.min, v.k * factor));
    view.current = { k, x: (v.x / v.k) * k, y: (v.y / v.k) * k };
  };
  const reset = () => {
    view.current = { k: 1, x: 0, y: 0 };
    alpha.current = Math.max(alpha.current, 0.5);
  };
  const click = (n: GraphNode) => () => {
    if (suppressClick.current === n.id) {
      suppressClick.current = null;
      return;
    }
    n.onClick?.();
  };

  return (
    <div ref={layer} onPointerDown={startPan} onDoubleClick={reset} className="pointer-events-auto absolute inset-0 cursor-grab touch-none select-none">
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${u(v.x)}, ${u(v.y)}) scale(${v.k})`,
          transformOrigin: `${u(STAGE.ox)} ${u(STAGE.oy)}`,
        }}
      >
        {underlay?.(world)}
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`${-STAGE.ox} ${-STAGE.oy} ${STAGE.w} ${STAGE.h}`} aria-hidden>
          {edges.map(([a, b]) => {
            const p = world(a);
            const q = world(b);
            if (!p || !q || hiddenIds.has(a) || hiddenIds.has(b)) return null;
            const faded = hover !== null && !(neighbours.has(a) && neighbours.has(b));
            return (
              <line
                key={`${a}-${b}`}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                stroke="var(--edge)"
                strokeWidth={6}
                strokeLinecap="round"
                opacity={faded ? 0.25 : 1}
                style={{ transition: 'opacity 150ms' }}
              />
            );
          })}
        </svg>
      </div>

      {children?.(screen)}

      <div
        className="absolute inset-0"
        style={{ transform: `translate(${u(v.x)}, ${u(v.y)}) scale(${v.k})`, transformOrigin: `${u(STAGE.ox)} ${u(STAGE.oy)}`, pointerEvents: 'none' }}
      >
        {nodes.map((n) => {
          const b = world(n.id)!;
          const Tag = n.onClick ? 'button' : 'div';
          const dragging = drag.current?.id === n.id && drag.current.moved;
          return (
            <Tag
              key={n.id}
              onClick={click(n)}
              onPointerDown={startDrag(n.id)}
              onPointerEnter={() => setHover(n.id)}
              onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
              aria-label={n.label}
              title={n.label}
              className={`node node-in group pointer-events-auto absolute flex items-center justify-center rounded-full ${
                dragging ? 'cursor-grabbing' : n.onClick ? 'cursor-pointer' : 'cursor-grab'
              } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                n.active ? 'ring-[3px] ring-white/80' : ''
              } ${n.pulse ? 'pulse-soft' : ''}`}
              style={{
                left: u(STAGE.ox + b.x),
                top: u(STAGE.oy + b.y),
                width: u(n.size),
                height: u(n.size),
                transform: `translate(-50%, -50%) scale(${dragging ? 1.08 : 1})`,
                opacity: dim(n.id) ? 0.35 : 1,
                visibility: n.hidden ? 'hidden' : undefined,
                transition: 'transform 150ms ease-out, opacity 150ms',
                animationDelay: n.delay ? `${n.delay}ms` : undefined,
              }}
            >
              {n.content}
              {n.label && (
                <span
                  className={`pointer-events-none absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap font-light text-ink/80 transition-opacity ${
                    n.showLabel || dragging || hover === n.id ? 'opacity-100' : 'opacity-0 group-focus-visible:opacity-100'
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

      {/* Управление видом */}
      <div className="absolute flex flex-col" style={{ right: u(28), top: u(28), gap: u(10) }} onPointerDown={(e) => e.stopPropagation()}>
        {[
          { icon: 'plus' as const, label: 'Приблизить', onClick: () => zoomBy(1.25) },
          { icon: 'minus' as const, label: 'Отдалить', onClick: () => zoomBy(0.8) },
          { icon: 'target' as const, label: 'Вернуть вид (двойной клик по фону)', onClick: reset },
        ].map((c) => (
          <button
            key={c.label}
            onClick={c.onClick}
            title={c.label}
            aria-label={c.label}
            className="node flex items-center justify-center rounded-full transition hover:brightness-110"
            style={{ width: u(44), height: u(44) }}
          >
            <Icon name={c.icon} size={u(20)} strokeWidth={1.6} />
          </button>
        ))}
      </div>
    </div>
  );
}

// Кольца уровня владения навыком — кадр «MacBook Pro 16 - 1»: Ø691 / Ø523 / внутренний диск растёт с прогрессом
export function ProgressRings({ percent, center = { x: 0, y: 0 } }: { percent: number; center?: Point }) {
  const inner = 200 + (Math.max(0, Math.min(100, percent)) / 100) * 300;
  const ring = (d: number, color: string) => (
    <div
      className="absolute rounded-full transition-[width,height] duration-700"
      style={{ left: u(STAGE.ox + center.x - d / 2), top: u(STAGE.oy + center.y - d / 2), width: u(d), height: u(d), background: color }}
    />
  );
  return (
    <div className="pointer-events-none absolute inset-0">
      {ring(691, 'var(--ring-1)')}
      {ring(523, 'var(--ring-2)')}
      {ring(inner, 'var(--ring-3)')}
      <p
        className="absolute -translate-x-1/2 whitespace-nowrap font-light text-ink/80"
        style={{ left: u(STAGE.ox + center.x), top: u(STAGE.oy + center.y + 360), fontSize: u(18) }}
      >
        Уровень владения: {percent}%
      </p>
    </div>
  );
}

'use client';

import { Icon, type IconName } from './Icons';
import { STAGE, u } from '@/lib/units';

// Слой «Тренировка» в Figma: панель 320×370, пункты — круги 60, действия — круги 30
const W = 320;
const H = 370;

export interface PanelAction {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
}

export default function TrainingPanel({
  anchor,
  title,
  subtitle,
  items,
  actions,
}: {
  anchor: { x: number; y: number };
  title: string;
  subtitle?: string;
  items: { icon: IconName; label: string; onClick: () => void }[];
  actions: PanelAction[];
}) {
  // Справа от узла (как в макете), если не помещается — слева; не выходим за сцену
  const right = anchor.x >= 0;
  const margin = 20;
  let left = right ? anchor.x + 93 : anchor.x - 93 - W;
  left = Math.min(Math.max(left, -STAGE.ox + margin), STAGE.w - STAGE.ox - W - margin);
  const top = Math.min(Math.max(anchor.y - H / 2, -STAGE.oy + margin), STAGE.h - STAGE.oy - H - 140);
  const edgeX = right ? left : left + W;

  return (
    <>
      <svg className="training-link absolute inset-0 h-full w-full" viewBox={`${-STAGE.ox} ${-STAGE.oy} ${STAGE.w} ${STAGE.h}`} aria-hidden>
        <line x1={anchor.x} y1={anchor.y} x2={edgeX} y2={anchor.y} stroke="var(--edge)" strokeWidth={6} strokeLinecap="round" />
      </svg>
      <section
        className="training-panel panel node-in pointer-events-auto absolute flex flex-col text-white"
        style={{
          left: u(STAGE.ox + left + W / 2),
          top: u(STAGE.oy + top + H / 2),
          width: u(W),
          height: u(H),
          transform: 'translate(-50%, -50%)',
          borderRadius: u(30),
          padding: `${u(28)} ${u(24)} ${u(20)}`,
        }}
        aria-label={title}
      >
        <h2 className="truncate text-center font-light" style={{ fontSize: u(20) }} title={title}>
          {title}
        </h2>
        {subtitle && (
          <p className="truncate text-center font-light text-white/70" style={{ fontSize: u(14), marginTop: u(4) }} title={subtitle}>
            {subtitle}
          </p>
        )}
        <div className="flex flex-1 flex-col justify-center" style={{ gap: u(20) }}>
          {items.map((item) => (
            <button key={item.label} onClick={item.onClick} className="group flex items-center text-left" style={{ gap: u(26) }}>
              <span className="node flex shrink-0 items-center justify-center rounded-full transition group-hover:brightness-110" style={{ width: u(60), height: u(60) }}>
                <Icon name={item.icon} size={u(31)} strokeWidth={1.3} />
              </span>
              <span className="font-light transition group-hover:translate-x-1" style={{ fontSize: u(20) }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
        <div className="flex justify-end" style={{ gap: u(20) }}>
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              title={a.label}
              aria-label={a.label}
              className={`node flex items-center justify-center rounded-full transition hover:brightness-110 ${a.active ? 'ring-2 ring-white/80' : ''}`}
              style={{ width: u(30), height: u(30) }}
            >
              <Icon name={a.icon} size={u(17)} strokeWidth={1.6} />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

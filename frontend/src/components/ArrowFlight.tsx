"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./Icons";
import { STAGE } from "@/lib/units";
import type { Point } from "./Graph";

const DURATION = 700;
const EASING = "cubic-bezier(.3,0,.2,1)";

// Стрелка вылетает из строки поиска и по дуге садится в узел графа.
// Рендерится внутри LivingGraph (children), поэтому `to` — координаты сцены от pos().
// to === undefined (узла ещё нет) — полёт завершается сразу.
export default function ArrowFlight({
  from,
  to,
  onDone,
  size = 80,
}: {
  from: DOMRect;
  to: Point | undefined;
  onDone: () => void;
  size?: number; // размер узла-цели в px макета
}) {
  const box = useRef<HTMLDivElement>(null);
  // children() вызывается каждый кадр, onDone приходит новой функцией — держим в ref
  const done = useRef(onDone);
  done.current = onDone;
  const finished = useRef(false);
  const start = useRef({ from, to, size });

  useEffect(() => {
    const el = box.current;
    const parent = el?.parentElement;
    const { from: f, to: t, size: s } = start.current;
    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      done.current();
    };
    if (!el || !parent || !t || typeof el.animate !== "function") {
      finish();
      return;
    }

    // Смещение — от прямоугольника родителя: сцена масштабируется вместе с --u
    const rect = parent.getBoundingClientRect();
    const scale = rect.width / STAGE.w;
    const sx = f.left + f.width / 2 - rect.left;
    const sy = f.top + f.height / 2 - rect.top;
    const tx = (STAGE.ox + t.x) * scale;
    const ty = (STAGE.oy + t.y) * scale;
    // Цель за пределами видимой сцены (зум или сдвиг) — не летим вслепую
    const margin = 40;
    if (!(
      tx > -margin &&
      ty > -margin &&
      tx < rect.width + margin &&
      ty < rect.height + margin
    )) {
      finish();
      return;
    }

    const w = f.width;
    const h = f.height;
    const grow = Math.max(0.1, (s * scale) / w);
    const at = (x: number, y: number, k: number) =>
      `translate(${x - w / 2}px, ${y - h / 2}px) scale(${k})`;
    // Дуга: промежуточный кадр сдвинут вбок от прямой на четверть длины пути
    const dx = tx - sx;
    const dy = ty - sy;
    const mx = sx + dx / 2 + dy * 0.25;
    const my = sy + dy / 2 - dx * 0.25;

    el.style.visibility = "visible";
    const anim = el.animate(
      [
        { transform: at(sx, sy, 1), opacity: 1, offset: 0 },
        { transform: at(mx, my, 1.15), opacity: 1, offset: 0.5 },
        { transform: at(tx, ty, grow), opacity: 1, offset: 0.85 },
        { transform: at(tx, ty, grow), opacity: 0, offset: 1 },
      ],
      { duration: DURATION, easing: EASING, fill: "forwards" },
    );
    anim.onfinish = finish;
    anim.oncancel = finish;
    return () => {
      // Размонтирование (в том числе двойной запуск эффекта в dev) не считается завершением
      anim.onfinish = null;
      anim.oncancel = null;
      anim.cancel();
    };
  }, []);

  return (
    <div
      ref={box}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 flex items-center justify-center rounded-full bg-field-ink text-field"
      style={{
        width: from.width,
        height: from.height,
        visibility: "hidden",
        zIndex: 20,
      }}
    >
      <Icon
        name="chevron"
        size={Math.round(from.width * 0.55)}
        strokeWidth={1.6}
      />
    </div>
  );
}

'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Icon } from './Icons';
import type { Level } from '@/lib/api';
import { LEVELS } from '@/lib/course';
import { u } from '@/lib/units';

// Слой «поиск»: 676×58, лупа 31 слева, справа «+» и кнопка «>» (внутри строки, на самом краю)
export default function SearchBar({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  // from — прямоугольник стрелки на экране: откуда стартует полёт в граф
  onSubmit: (topic: string, level: Level, files: { name: string; content: string }[], from: DOMRect | null) => void;
  disabled?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const [level, setLevel] = useState<Level>('beginner');
  const [files, setFiles] = useState<{ name: string; content: string }[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const arrow = useRef<HTMLButtonElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const topic = value.trim();
    if (!topic || disabled) return;
    onSubmit(topic, level, files, arrow.current?.getBoundingClientRect() ?? null);
    setFiles([]);
    setMenu(false);
  };

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const read = await Promise.all(
      Array.from(list).map(async (f) => ({ name: f.name, content: (await f.text()).slice(0, 20000) })),
    );
    setFiles((prev) => [...prev, ...read]);
  };

  return (
    <form
      onSubmit={submit}
      className="search pointer-events-auto absolute left-1/2 flex -translate-x-1/2 items-center"
      // Кнопка внутри строки, поэтому сама строка стоит по центру холста без отступов
      style={{ bottom: u(100) }}
    >
      <div className="relative">
        {menu && (
          <div
            className="panel absolute bottom-full right-0 text-white"
            style={{ marginBottom: u(14), width: u(320), borderRadius: u(24), padding: u(20), fontSize: u(16) }}
          >
            <p className="font-light text-white/80" style={{ marginBottom: u(10) }}>
              Уровень
            </p>
            <div className="flex flex-wrap" style={{ gap: u(8), marginBottom: u(18) }}>
              {LEVELS.map((l) => (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={`rounded-full border transition ${level === l.id ? 'border-white bg-white text-[#202020]' : 'border-white/50 hover:border-white'}`}
                  style={{ padding: `${u(6)} ${u(14)}` }}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center font-light hover:text-white" style={{ gap: u(10) }}>
              <Icon name="clip" size={u(20)} /> Прикрепить материалы (.txt, .md)
            </button>
            {files.length > 0 && (
              <ul className="font-light text-white/80" style={{ marginTop: u(10), fontSize: u(14) }}>
                {files.map((f) => (
                  <li key={f.name} className="truncate">
                    {f.name}
                  </li>
                ))}
              </ul>
            )}
            <input ref={fileInput} type="file" multiple accept=".txt,.md,.csv,.json" className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </div>
        )}

        <label className="flex items-center rounded-full bg-field text-field-ink" style={{ width: u(676), height: u(58), paddingLeft: u(19), paddingRight: u(7) }}>
          <Icon name="search" size={u(31)} strokeWidth={2} className="shrink-0" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Изучить"
            aria-label="Что хотите изучить?"
            className="min-w-0 flex-1 bg-transparent font-normal outline-none placeholder:text-field-ink/60"
            style={{ marginLeft: u(19), fontSize: u(20) }}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            aria-label="Уровень и материалы"
            aria-expanded={menu}
            className={`shrink-0 transition hover:opacity-70 ${menu ? 'rotate-45' : ''}`}
            style={{ marginRight: u(10) }}
          >
            <Icon name="plus" size={u(26)} strokeWidth={1.4} />
          </button>
          <button
            ref={arrow}
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Создать курс"
            className="flex shrink-0 items-center justify-center rounded-full bg-field-ink text-field transition hover:brightness-95 disabled:opacity-50"
            style={{ width: u(44), height: u(44) }}
          >
            <Icon name="chevron" size={u(24)} strokeWidth={1.6} />
          </button>
        </label>
      </div>
    </form>
  );
}

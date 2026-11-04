'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LivingGraph, ProgressRings, Stage, type GraphNode } from '@/components/Graph';
import { Icon, UserSolid, type IconName } from '@/components/Icons';
import SearchBar from '@/components/SearchBar';
import TrainingPanel from '@/components/TrainingPanel';
import { api, type Course, type Level } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCourses } from '@/lib/courses';
import { iconFor } from '@/lib/course';
import { u } from '@/lib/units';

// Стартовые позиции веток — из макета: тренировки (141, 94), языки (−151, 77), дизайн (51, −163).
// Дальше граф раскладывается силами и двигается, как в Obsidian
const SLOTS = [
  { x: 141, y: 94 },
  { x: -151, y: 77 },
  { x: 51, y: -163 },
];

function slot(i: number) {
  if (i < SLOTS.length) return SLOTS[i];
  const angle = i * 2.4; // золотой угол — ветки не налезают друг на друга
  return { x: Math.cos(angle) * 200, y: Math.sin(angle) * 200 };
}

// Пустой граф (кадр «MacBook Pro 16 - 5») — подсказки тем из презентации
const SUGGESTIONS: { topic: string; icon: IconName }[] = [
  { topic: 'Тренировки: теория, видео, задание', icon: 'dumbbell' },
  { topic: 'Английский язык', icon: 'globe' },
  { topic: 'Основы дизайна интерфейсов', icon: 'sparkles' },
];

const MAX_COURSES = 24;
const MAX_MODULES = 6;

function sortedModules(c: Course) {
  return (c.modules ?? []).slice().sort((a, b) => a.order - b.order).slice(0, MAX_MODULES);
}

function branchIcon(icon: IconName) {
  return <Icon name={icon} size={u(icon === 'globe' ? 40 : 31)} strokeWidth={1.3} />;
}

function Home() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { courses, pending, generate, dismissError } = useCourses();
  const [topic, setTopic] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [aiReady, setAiReady] = useState(true);

  // Нет ключа AI — сразу говорим, куда его вписать, а не после неудачной генерации
  useEffect(() => {
    api.health().then((h) => setAiReady(h.ai_ready !== false)).catch(() => {});
  }, []);

  const selectedId = params?.get('course');
  const moduleIdx = Number(params?.get('m') || 0);
  const visible = courses.slice(0, MAX_COURSES);
  const selected = visible.find((c) => c.id === selectedId) ?? null;
  const modules = useMemo(() => (selected ? sortedModules(selected) : []), [selected]);

  // Тема, введённая до входа в аккаунт (см. /login?topic=)
  useEffect(() => {
    const t = params?.get('topic');
    if (t) setTopic(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setShowProgress(false);
    setProgress(null);
  }, [selectedId]);

  useEffect(() => {
    if (!showProgress || !selected) return;
    api
      .progress(selected.id)
      .then((p) => setProgress(p.progress_percent))
      .catch(() => setProgress(0));
  }, [showProgress, selected]);

  const select = (id: string | null, m = 0) => router.replace(id ? `/?course=${id}${m ? `&m=${m}` : ''}` : '/', { scroll: false });

  const onSubmit = async (t: string, level: Level, files: { name: string; content: string }[]) => {
    if (!user) {
      router.push(`/login?topic=${encodeURIComponent(t)}`);
      return;
    }
    setTopic('');
    const id = await generate(t, level, files);
    if (id) select(id);
  };

  // Узлы графа: вы → курсы → модули
  const nodes: GraphNode[] = [
    { id: 'me', x: 0, y: 0, size: 100, content: <UserSolid size={u(46)} />, label: user ? user.full_name || user.username : 'Вы', showLabel: true },
  ];
  const edges: [string, string][] = [];

  if (visible.length === 0 && !pending) {
    SUGGESTIONS.forEach((s, i) => {
      nodes.push({ id: `s${i}`, ...slot(i), size: 80, content: branchIcon(s.icon), label: s.topic, onClick: () => setTopic(s.topic), delay: 80 * i });
      edges.push(['me', `s${i}`]);
    });
  }

  visible.forEach((c, i) => {
    const id = `c-${c.id}`;
    const at = slot(i);
    const isSelected = selected?.id === c.id;
    nodes.push({
      id,
      ...at,
      size: 80,
      content: branchIcon(iconFor(c.title)),
      label: c.title,
      showLabel: true,
      active: isSelected,
      onClick: () => select(isSelected ? null : c.id),
      delay: 40 * i,
    });
    edges.push(['me', id]);

    // Модули — листья вокруг курса, наружу от центра
    const ms = sortedModules(c);
    const base = Math.atan2(at.y, at.x);
    ms.forEach((m, j) => {
      const angle = base + (j - (ms.length - 1) / 2) * 0.55;
      const mid = `m-${m.id}`;
      nodes.push({
        id: mid,
        x: at.x + Math.cos(angle) * 115,
        y: at.y + Math.sin(angle) * 115,
        size: 52,
        content: <span style={{ fontSize: u(17) }}>{j + 1}</span>,
        label: m.title,
        active: isSelected && j === moduleIdx,
        onClick: () => select(c.id, j),
        delay: 40 * i + 30 * j,
      });
      edges.push([id, mid]);
    });
  });

  if (pending) {
    nodes.push({
      id: 'pending',
      ...slot(visible.length),
      size: 80,
      content: branchIcon(iconFor(pending.topic)),
      label: pending.error ? 'Ошибка' : 'Собираю курс…',
      showLabel: true,
      pulse: !pending.error,
    });
    edges.push(['me', 'pending']);
  }

  const open = (tab: string) => selected && router.push(`/course/${selected.id}?m=${moduleIdx}&tab=${tab}`);

  const share = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/course/${selected.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <>
      <Stage>
        <LivingGraph
          nodes={nodes}
          edges={edges}
          underlay={(pos) => selected && showProgress && <ProgressRings percent={progress ?? 0} center={pos('me')} />}
        >
          {(pos) => {
            const anchor = selected && pos(`c-${selected.id}`);
            return (
              selected &&
              anchor && (
                <TrainingPanel
                  anchor={anchor}
                  from={anchor}
                  title={selected.title}
                  subtitle={modules[moduleIdx]?.title}
                  items={[
                    { icon: 'theory', label: 'Теория', onClick: () => open('theory') },
                    { icon: 'video', label: 'Видео', onClick: () => open('video') },
                    { icon: 'task', label: 'Задание', onClick: () => open('task') },
                  ]}
                  actions={[
                    { icon: 'test', label: 'Тест по модулю', onClick: () => open('test') },
                    { icon: 'trending', label: 'Прогресс', onClick: () => setShowProgress((v) => !v), active: showProgress },
                    { icon: 'link', label: copied ? 'Ссылка скопирована' : 'Поделиться ссылкой', onClick: share, active: copied },
                  ]}
                />
              )
            );
          }}
        </LivingGraph>
      </Stage>

      {!aiReady && !pending?.error && (
        <div
          role="status"
          className="panel absolute left-1/2 -translate-x-1/2 text-white"
          style={{ bottom: u(180), borderRadius: u(20), padding: `${u(12)} ${u(18)}`, fontSize: u(15), maxWidth: u(676) }}
        >
          <p>Генерация курсов выключена: не задан ключ AI.</p>
          <p className="font-light opacity-80">
            Впишите его в <code>FillAI-official\backend\.env</code> в строку <code>OPENAI_API_KEY=</code> и перезапустите бэкенд.
          </p>
        </div>
      )}

      {pending?.error && (
        <div
          role="alert"
          className="panel absolute left-1/2 flex -translate-x-1/2 items-center text-white"
          style={{ bottom: u(180), gap: u(14), borderRadius: u(20), padding: `${u(12)} ${u(18)}`, fontSize: u(16), maxWidth: u(676) }}
        >
          <span className="font-light">{pending.error}</span>
          <button onClick={dismissError} aria-label="Закрыть" className="shrink-0 hover:opacity-70">
            <Icon name="close" size={u(18)} />
          </button>
        </div>
      )}

      <SearchBar value={topic} onChange={setTopic} onSubmit={onSubmit} disabled={!!pending && !pending.error} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}

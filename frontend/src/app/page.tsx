'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LivingGraph, ProgressRings, Stage, type GraphNode } from '@/components/Graph';
import { Icon, UserSolid, type IconName } from '@/components/Icons';
import SearchBar from '@/components/SearchBar';
import TrainingPanel from '@/components/TrainingPanel';
import { api, type Level } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCourses } from '@/lib/courses';
import { iconFor } from '@/lib/course';
import { u } from '@/lib/units';

// Позиции веток относительно пользователя. Первые три — точно из макета:
// тренировки (141, 94), языки (−151, 77), дизайн (51, −163)
const SLOTS = [
  { x: 141, y: 94 },
  { x: -151, y: 77 },
  { x: 51, y: -163 },
  { x: 205, y: -60 },
  { x: -205, y: -75 },
  { x: -25, y: 190 },
  { x: -120, y: -175 },
  { x: 215, y: 215 },
];

// Пустой граф (кадр «MacBook Pro 16 - 5») — подсказки тем из презентации
const SUGGESTIONS: { topic: string; icon: IconName }[] = [
  { topic: 'Тренировки: теория, видео, задание', icon: 'dumbbell' },
  { topic: 'Английский язык', icon: 'globe' },
  { topic: 'Основы дизайна интерфейсов', icon: 'sparkles' },
];

// Модули выбранной ветки: на 133 дальше от центра (как RU/EN в макете), веером в сторону от панели
const LEAF_D = 133;
const LEAF_STEP = 110;

function branchIcon(icon: IconName) {
  return <Icon name={icon} size={u(icon === 'globe' ? 40 : 31)} strokeWidth={1.3} />;
}

function Home() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { courses, pending, generate, dismissError } = useCourses();
  const [topic, setTopic] = useState('');
  const [moduleIdx, setModuleIdx] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedId = params?.get('course');
  const visible = courses.slice(0, pending ? SLOTS.length - 1 : SLOTS.length);
  const selectedIdx = visible.findIndex((c) => c.id === selectedId);
  const selected = selectedIdx >= 0 ? visible[selectedIdx] : null;
  const modules = useMemo(() => (selected?.modules ?? []).slice().sort((a, b) => a.order - b.order).slice(0, 4), [selected]);

  // Тема, введённая до входа в аккаунт (см. /login?topic=)
  useEffect(() => {
    const t = params?.get('topic');
    if (t) setTopic(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setModuleIdx(0);
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

  const select = (id: string | null) => router.replace(id ? `/?course=${id}` : '/', { scroll: false });

  const onSubmit = async (t: string, level: Level, files: { name: string; content: string }[]) => {
    if (!user) {
      router.push(`/login?topic=${encodeURIComponent(t)}`);
      return;
    }
    setTopic('');
    const id = await generate(t, level, files);
    if (id) select(id);
  };

  // Узлы графа
  const nodes: GraphNode[] = [
    { id: 'me', x: 0, y: 0, size: 100, content: <UserSolid size={u(46)} />, label: user ? user.full_name || user.username : 'Вы' },
  ];
  const edges: [string, string][] = [];

  if (visible.length === 0 && !pending) {
    SUGGESTIONS.forEach((s, i) => {
      nodes.push({ id: `s${i}`, ...SLOTS[i], size: 80, content: branchIcon(s.icon), label: s.topic, onClick: () => setTopic(s.topic), delay: 80 * i });
      edges.push(['me', `s${i}`]);
    });
  }

  visible.forEach((c, i) => {
    const id = `c${i}`;
    nodes.push({
      id,
      ...SLOTS[i],
      size: 80,
      content: branchIcon(iconFor(c.title)),
      label: c.title,
      active: selected?.id === c.id,
      onClick: () => select(selected?.id === c.id ? null : c.id),
      delay: 40 * i,
    });
    edges.push(['me', id]);
  });

  if (pending) {
    const slot = SLOTS[visible.length];
    nodes.push({ id: 'pending', ...slot, size: 80, content: branchIcon(iconFor(pending.topic)), label: pending.error ? 'Ошибка' : 'Собираю курс…', showLabel: true, pulse: !pending.error });
    edges.push(['me', 'pending']);
  }

  // Панель «Тренировки» крепится к ветке сбоку (как в макете), модули — снизу/сверху
  const anchor = selected ? SLOTS[selectedIdx] : null;
  if (selected && anchor) {
    const side = anchor.x >= 0 ? 1 : -1;
    const vertical = anchor.y >= 0 ? 1 : -1;
    modules.forEach((m, i) => {
      const id = `m${i}`;
      const pos = { x: anchor.x - side * i * LEAF_STEP, y: anchor.y + vertical * LEAF_D };
      nodes.push({
        id,
        ...pos,
        size: 80,
        content: <span style={{ fontSize: u(20) }}>{i + 1}</span>,
        label: m.title,
        active: i === moduleIdx,
        onClick: () => setModuleIdx(i),
        delay: 60 * i,
      });
      edges.push([`c${selectedIdx}`, id]);
    });
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
        {selected && showProgress && <ProgressRings percent={progress ?? 0} />}
        <LivingGraph nodes={nodes} edges={edges}>
          {(pos) =>
            selected &&
            anchor && (
              <TrainingPanel
                anchor={anchor}
                from={pos(`c${selectedIdx}`)}
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
          }
        </LivingGraph>
      </Stage>

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

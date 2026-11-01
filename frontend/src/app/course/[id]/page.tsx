'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageFrame, { Card, Empty, button, ghostButton } from '@/components/PageFrame';
import { Icon, type IconName } from '@/components/Icons';
import { api, type Course, type GradeResult, type Lesson, type Module, type TestQuestion } from '@/lib/api';
import { parseLesson, youtubeId } from '@/lib/course';

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'theory', label: 'Теория', icon: 'theory' },
  { id: 'video', label: 'Видео', icon: 'video' },
  { id: 'task', label: 'Задание', icon: 'task' },
  { id: 'test', label: 'Тест', icon: 'test' },
];

function CourseView() {
  const id = useParams<{ id: string }>()?.id ?? '';
  const params = useSearchParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState('');

  const tab = params?.get('tab') || 'theory';
  const moduleIdx = Number(params?.get('m') || 0);

  useEffect(() => {
    api
      .course(id)
      .then(setCourse)
      .catch((e) => setError(e.message));
  }, [id]);

  const modules = useMemo(() => (course?.modules ?? []).slice().sort((a, b) => a.order - b.order), [course]);
  const mod = modules[moduleIdx] ?? modules[0];

  const go = (next: { m?: number; tab?: string }) =>
    router.replace(`/course/${id}?m=${next.m ?? moduleIdx}&tab=${next.tab ?? tab}`, { scroll: false });

  if (error) return <PageFrame title="Курс">{<Empty>{error === 'Course not found' ? 'Курс не найден или закрыт автором' : error}</Empty>}</PageFrame>;
  if (!course) return <PageFrame title="Курс">{<Empty>Загружаю курс…</Empty>}</PageFrame>;

  return (
    <PageFrame
      title={course.title}
      aside={
        <Link href={`/?course=${course.id}`} className={ghostButton}>
          <Icon name="back" size={16} /> К графу
        </Link>
      }
    >
      {course.description && <p className="-mt-4 mb-6 font-light text-ink/75">{course.description}</p>}

      {modules.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {modules.map((m, i) => (
            <button
              key={m.id}
              onClick={() => go({ m: i })}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                m.id === mod?.id ? 'bg-field text-field-ink' : 'font-light text-ink ring-1 ring-white/25 hover:ring-white/60'
              }`}
            >
              {i + 1}. {m.title}
            </button>
          ))}
        </div>
      )}

      <div role="tablist" className="mb-6 flex gap-1 rounded-full bg-black/20 p-1 ring-1 ring-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => go({ tab: t.id })}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm transition ${
              tab === t.id ? 'bg-white/90 text-[#202020]' : 'font-light text-ink/80 hover:text-ink'
            }`}
          >
            <Icon name={t.icon} size={18} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {!mod ? (
        <Empty>В курсе пока нет модулей</Empty>
      ) : tab === 'video' ? (
        <Videos lessons={mod.lessons} />
      ) : tab === 'task' ? (
        <Tasks course={course} lessons={mod.lessons} />
      ) : tab === 'test' ? (
        <ModuleTest key={mod.id} course={course} module={mod} />
      ) : (
        <Theory lessons={mod.lessons} />
      )}
    </PageFrame>
  );
}

function Theory({ lessons }: { lessons: Lesson[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  if (!lessons.length) return <Empty>В модуле нет уроков</Empty>;

  const complete = async (lesson: Lesson) => {
    try {
      await api.completeLesson(lesson.id);
      setDone((d) => ({ ...d, [lesson.id]: true }));
    } catch {}
  };

  return (
    <div className="space-y-5">
      {lessons.map((lesson, i) => {
        const { text } = parseLesson(lesson);
        return (
          <Card key={lesson.id}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-xl font-normal">
                {i + 1}. {lesson.title}
              </h2>
              {lesson.duration_minutes ? <span className="shrink-0 text-sm font-light text-ink/60">{lesson.duration_minutes} мин</span> : null}
            </div>
            <div className="prose-fill">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || '_Конспект пока пуст_'}</ReactMarkdown>
            </div>
            <div className="mt-5">
              <button onClick={() => complete(lesson)} disabled={done[lesson.id]} className={done[lesson.id] ? ghostButton : button}>
                <Icon name="task" size={18} /> {done[lesson.id] ? 'Пройдено' : 'Отметить как пройдено'}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Videos({ lessons }: { lessons: Lesson[] }) {
  const videos = lessons.flatMap((l) => parseLesson(l).videos.map((v) => ({ ...v, lesson: l.title })));
  if (!videos.length) return <Empty>Для этого модуля видео не подобраны</Empty>;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {videos.map((v, i) => {
        const vid = youtubeId(v.url);
        return (
          <Card key={`${v.url}-${i}`} className="!p-3">
            {vid ? (
              <iframe
                className="aspect-video w-full rounded-2xl"
                src={`https://www.youtube-nocookie.com/embed/${vid}`}
                title={v.title}
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <a href={v.url} target="_blank" rel="noreferrer" className="block rounded-2xl bg-black/30 p-6 underline">
                Открыть видео
              </a>
            )}
            <p className="mt-3 px-2 text-sm">{v.title}</p>
            <p className="px-2 pb-1 text-xs font-light text-ink/60">{[v.channel, v.lesson].filter(Boolean).join(' · ')}</p>
          </Card>
        );
      })}
    </div>
  );
}

function Tasks({ course, lessons }: { course: Course; lessons: Lesson[] }) {
  const tasks = lessons.flatMap((l) => parseLesson(l).exercises.map((e) => ({ ...e, lesson: l.title })));
  if (!tasks.length) return <Empty>В этом модуле нет заданий</Empty>;
  return (
    <div className="space-y-5">
      {tasks.map((t, i) => (
        <Task key={`${t.title}-${i}`} course={course} task={t} />
      ))}
    </div>
  );
}

function Task({ course, task }: { course: Course; task: { title: string; description: string; solution_hint?: string; lesson: string } }) {
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState('');
  const [hint, setHint] = useState(false);

  const check = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.grade({
        course_title: course.title,
        lesson_title: task.lesson,
        exercise_title: task.title,
        exercise_description: task.description,
        user_answer: answer,
      });
      if (!res.success || !res.result) throw new Error(res.error || 'Не удалось проверить ответ');
      setResult(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-2 text-lg">{task.title}</h2>
      <p className="mb-4 whitespace-pre-line font-light text-ink/80">{task.description}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={4}
        placeholder="Ваш ответ"
        className="w-full resize-y rounded-2xl bg-black/25 p-4 font-light text-ink outline-none ring-1 ring-white/15 placeholder:text-ink/40 focus:ring-white/50"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={check} disabled={busy || answer.trim().length < 3} className={button}>
          {busy ? 'Проверяю…' : 'Проверить'}
        </button>
        {task.solution_hint && (
          <button onClick={() => setHint((h) => !h)} className={ghostButton}>
            Подсказка
          </button>
        )}
      </div>
      {hint && <p className="mt-3 font-light text-ink/75">{task.solution_hint}</p>}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {result && (
        <div className="mt-4 rounded-2xl bg-black/25 p-4">
          <p className="mb-2">
            <span className="text-2xl">{result.score}%</span> <span className="font-light text-ink/75">· {result.verdict}</span>
          </p>
          <p className="font-light text-ink/85">{result.ai_feedback}</p>
          {result.improvements.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm font-light text-ink/75">
              {result.improvements.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function ModuleTest({ course, module }: { course: Course; module: Module }) {
  const [questions, setQuestions] = useState<TestQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.moduleTest(course, module);
      if (!res.success || !res.test) throw new Error(res.error || 'Не удалось собрать тест');
      setQuestions(res.test.tests);
      setAnswers({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  if (!questions)
    return (
      <Card className="text-center">
        <p className="mb-4 font-light text-ink/80">Короткий тест по модулю «{module.title}» для самопроверки.</p>
        <button onClick={load} disabled={busy} className={button}>
          {busy ? 'Собираю вопросы…' : 'Начать тест'}
        </button>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </Card>
    );

  const answered = Object.keys(answers).length;
  const correct = questions.filter((q, i) => answers[i] === q.correct).length;

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => {
        const picked = answers[qi];
        return (
          <Card key={qi}>
            <p className="mb-4">
              {qi + 1}. {q.question}
            </p>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => {
                const state = picked === undefined ? '' : oi === q.correct ? 'bg-white/85 text-[#202020]' : oi === picked ? 'bg-black/40 line-through opacity-70' : 'opacity-60';
                return (
                  <button
                    key={oi}
                    disabled={picked !== undefined}
                    onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    className={`rounded-2xl px-4 py-3 text-left font-light ring-1 ring-white/15 transition enabled:hover:ring-white/50 ${state}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {picked !== undefined && <p className="mt-3 text-sm font-light text-ink/75">{q.explanation}</p>}
          </Card>
        );
      })}
      {answered === questions.length && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p>
            Результат: {correct} из {questions.length}
          </p>
          <button onClick={load} disabled={busy} className={ghostButton}>
            {busy ? 'Собираю…' : 'Новый тест'}
          </button>
        </Card>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <CourseView />
    </Suspense>
  );
}

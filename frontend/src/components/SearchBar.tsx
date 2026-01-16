"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
// Removed mockStore imports - using API directly
import { useGraphStore } from '@/store/graphStore';
import {
  generateCourse,
  checkApiHealth,
  previewCourseStructure,
  CourseStructurePlan,
  CourseStructureModule,
  CourseStructureLesson,
} from '@/services/api';
import CourseStructureEditorModal from './CourseStructureEditorModal';

export default function SearchBar() {
  type EditableLesson = CourseStructureLesson & { id: string };
  type EditableModule = CourseStructureModule & { id: string; lessons: EditableLesson[] };

  const [isFocused, setIsFocused] = useState(false);
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { regenerateGraph } = useGraphStore();
  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [structureDraft, setStructureDraft] = useState<EditableModule[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<any | null>(null);
  const [logVisible, setLogVisible] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const logTimer = useRef<NodeJS.Timeout | null>(null);
  const logIndex = useRef(0);

  // Проверяем доступность API при загрузке
  useEffect(() => {
    checkApiHealth().then(setApiAvailable);
  }, []);

  /* Redirect to Chat Interface */
  const { setCurrentPage } = useUIStore(); // Need to import this hook

  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      setCurrentPage('chat');
      // Optionally pass the topic to chat? For now just redirect.
    }
  };

  // handleGenerateCourse removed as it was part of the legacy modal flow

  const buildFallbackStructure = (courseTopic: string): CourseStructurePlan => ({
    modules: [
      {
        title: `Модуль 1: Основы ${courseTopic}`,
        description: `Ключевые понятия и контекст темы "${courseTopic}"`,
        lessons: [
          { title: `Что такое ${courseTopic}?`, content: 'Краткое введение', duration_minutes: 25 },
          { title: 'Ключевые термины и примеры', content: 'Главные определения', duration_minutes: 30 },
        ],
      },
      {
        title: 'Модуль 2: Практика и применение',
        description: 'Разбираем практику и кейсы',
        lessons: [
          { title: 'Мини-проект', content: 'Практическое задание', duration_minutes: 40 },
          { title: 'Проверка знаний', content: 'Закрепление материала', duration_minutes: 30 },
        ],
      },
    ],
  });

  const applyIds = (structure: CourseStructurePlan): EditableModule[] =>
    structure.modules.map((mod) => ({
      id: crypto.randomUUID(),
      ...mod,
      lessons: (mod.lessons || []).map((lesson) => ({
        id: crypto.randomUUID(),
        ...lesson,
      })),
    }));

  const handleGenerateFromStructure = async (plan: CourseStructurePlan) => {
    if (!settingsDraft) return;

    setIsGenerating(true);
    startLogSession('generate');
    setError(null);

    try {
      let course;

      if (apiAvailable) {
        try {
          course = await generateCourse(topic, settingsDraft, plan);
          // Course is automatically saved to database by backend
          // Regenerate graph to show new course
        } catch (apiError: any) {
          console.error('API error:', apiError);
          setError('Ошибка при генерации курса. Проверьте подключение к API.');
          throw apiError; // Don't fallback to local - require API
        }
      } else {
        setError('API недоступен. Пожалуйста, проверьте подключение к серверу.');
        throw new Error('API недоступен');
      }

      setTopic('');
      setStructureModalOpen(false);
      regenerateGraph();
      return course;
    } catch (err: any) {
      console.error('Error generating course:', err);
      setError(err.message || 'Ошибка при генерации курса');
    } finally {
      setIsGenerating(false);
      stopLogSession();
    }
  };

  // Removed buildLocalCourse - using API only

  const previewMessages = [
    'Получаем черновик структуры…',
    'Подбираем модули по объёму курса…',
    'Равномерно распределяем уроки…',
    'Уточняем формулировки модулей…',
    'Джаспер шепчет идеи…',
  ];

  const generateMessages = [
    'Готовим промпт для уроков…',
    'Ищем практику и примеры…',
    'Собираем материалы и видео…',
    'Формируем финальный курс…',
    'Почти готово! 🎉',
  ];

  const startLogSession = (phase: 'preview' | 'generate') => {
    setLogVisible(true);
    setLogLines([]);
    logIndex.current = 0;
    const source = phase === 'preview' ? previewMessages : generateMessages;
    setLogLines([source[0]]);
    if (logTimer.current) clearInterval(logTimer.current);
    logTimer.current = setInterval(() => {
      logIndex.current += 1;
      if (logIndex.current >= source.length) {
        return;
      }
      setLogLines((prev) => [...prev, source[logIndex.current]]);
    }, 900);
  };

  const stopLogSession = () => {
    if (logTimer.current) clearInterval(logTimer.current);
    logTimer.current = null;
    setTimeout(() => setLogVisible(false), 800);
  };

  return (
    <>
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40">
        <motion.form
          onSubmit={handleTopicSubmit}
          className="relative"
          animate={{
            scale: isFocused ? 1.05 : 1,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Input */}
          <motion.input
            type="text"
            placeholder="Введите тему для создания курса"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isGenerating}
            className="relative w-[600px] px-8 py-5 pr-16 bg-[#252525] backdrop-blur-glass border border-[#3a3a3a] rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-[#4a4a4a] transition-all text-lg"
            whileFocus={{
              borderColor: 'rgba(107, 114, 128, 0.7)',
              boxShadow: '0 0 20px rgba(107, 114, 128, 0.2)',
            }}
          />

          {/* Icon */}
          <motion.div
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400"
            animate={{
              opacity: isFocused ? 1 : 0.6,
            }}
          >
            {isGenerating || isPreviewing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles size={24} />
              </motion.div>
            ) : (
              <Sparkles size={24} />
            )}
          </motion.div>
        </motion.form>

        {/* Status indicator */}
        {apiAvailable && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-green-400 flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            API подключен
          </div>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20"
          >
            {error}
          </motion.div>
        )}
      </div>

      <CourseStructureEditorModal
        isOpen={structureModalOpen}
        topic={topic}
        modules={structureDraft}
        onChange={setStructureDraft}
        onBackToSettings={() => {
          setStructureModalOpen(false);
          setCurrentPage('chat'); // Redirect to chat instead of modal
        }}
        onClose={() => setStructureModalOpen(false)}
        onGenerate={(plan) => handleGenerateFromStructure(plan)}
        isGenerating={isGenerating}
      />

      <AnimatePresence>
        {logVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 z-50 w-80 bg-[#111] border border-[#2f2f2f] rounded-xl shadow-xl"
          >
            <div className="px-4 py-3 border-b border-[#2f2f2f] flex items-center gap-2 text-sm text-gray-200">
              <Sparkles size={16} className="text-sky-400 animate-pulse" />
              Генерация идёт…
            </div>
            <div className="max-h-48 overflow-hidden px-4 py-3 space-y-2 text-xs text-gray-300">
              {logLines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-sky-500 mt-1 animate-ping" />
                  <span className="leading-relaxed">{line}</span>
                </div>
              ))}
              {(isGenerating || isPreviewing) && (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-ping" />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  >
                    ИИ пишет…
                  </motion.span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


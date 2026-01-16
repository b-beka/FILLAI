'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, Clock, Target, BarChart, Play, ExternalLink, FileText, Youtube, Share2, Eye,
  CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Search, Bookmark, BookmarkCheck,
  Menu, X as CloseIcon, Download, Printer, Star, TrendingUp, Zap, List, Grid,
  ChevronDown, ChevronUp, Edit3, Save, Trash2, Plus, Code, Brain, Puzzle,
  Image as ImageIcon, Video, Music, Layers, Lightbulb, HelpCircle
} from 'lucide-react';
import { Course, PracticeExercise, VideoMaterial, AdditionalMaterial, TermExplanation, Lesson } from '@/data/mockStore';
import { gradeExercise } from '@/services/api';
import { coursesApi, usersApi } from '@/services/apiClient';
import YouTubePlayer from './YouTubePlayer';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';

interface CoursePreviewProps {
  course: Course | null;
  onClose: () => void;
}

export default function CoursePreview({ course, onClose }: CoursePreviewProps) {
  if (!course) return null;

  const { setCurrentPage, setSelectedCourseId } = useUIStore();
  const { user } = useAuth();
  const [alreadyShared, setAlreadyShared] = useState(course.isPublic !== false);
  const [isPublic, setIsPublic] = useState(course.isPublic !== false);
  const [isOwner, setIsOwner] = useState(false);
  const [creator, setCreator] = useState<{ name: string; avatar: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load enrollment status and creator info
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check if enrolled
        const enrolledCourses = await coursesApi.getEnrolledCourses();
        setSaved(enrolledCourses.some(c => c.id === course.id));

        // Check if owner
        if (course.created_by && user?.id) {
          setIsOwner(course.created_by === user.id);
        }

        // Load creator info
        if (course.created_by) {
          try {
            const creatorUser = await usersApi.getById(course.created_by);
            setCreator({
              name: creatorUser.full_name || creatorUser.username,
              avatar: creatorUser.avatar_url || (creatorUser.full_name || creatorUser.username).substring(0, 2).toUpperCase()
            });
          } catch (err) {
            console.error('Error loading creator:', err);
            setCreator({ name: 'Неизвестный автор', avatar: '??' });
          }
        }
      } catch (err) {
        console.error('Error loading course data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [course.id, course.created_by, user?.id]);

  // Функция для открытия полного курса
  const handleOpenCoursePage = () => {
    // Сохраняем курс в sessionStorage для передачи в CoursePage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('currentCourse', JSON.stringify(course));
    }
    setSelectedCourseId(course.id);
    setCurrentPage('course');
    onClose(); // Закрываем превью
  };

  const handleShare = async () => {
    try {
      await coursesApi.update(course.id, { is_public: true });
      setIsPublic(true);
      setAlreadyShared(true);
      alert('Курс добавлен в коммьюнити. Откройте вкладку «Коммьюнити», чтобы увидеть его в маркетплейсе знаний.');
    } catch (e) {
      console.error('Error sharing course to community', e);
      alert('Ошибка при публикации курса. Попробуйте позже.');
    }
  };

  const handleSaveToLibrary = async () => {
    if (saved) return;
    try {
      await coursesApi.enroll(course.id);
      setSaved(true);
      alert('Курс сохранён в вашей библиотеке.');
    } catch (e) {
      console.error('Error enrolling in course:', e);
      alert('Ошибка при записи на курс. Попробуйте позже.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот курс? Это действие нельзя отменить.')) return;
    try {
      await coursesApi.delete(course.id);
      alert('Курс удалён.');
      onClose();
      // Refresh graph/library if possible
      window.location.reload();
    } catch (e) {
      console.error('Error deleting course:', e);
      alert('Ошибка при удалении курса.');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#151515] w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden border border-[#333] shadow-2xl flex flex-col relative"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white transition-colors border border-white/10"
          >
            <X size={20} />
          </button>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Hero Section */}
            <div className="relative h-[400px] w-full flex flex-col justify-end p-10 overflow-hidden group">
              {/* Dynamic Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-purple-900/40 to-black z-0" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0" />

              {/* Content */}
              <div className="relative z-10">
                {/* Badge */}
                <div className="flex gap-2 mb-6">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase rounded-full tracking-wider border border-emerald-500/30">
                    {course.level || 'Beginner'}
                  </span>
                  {course.category_id && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold uppercase rounded-full tracking-wider border border-blue-500/30">
                      Course
                    </span>
                  )}
                </div>

                <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-8 leading-tight max-w-4xl drop-shadow-xl">
                  {course.title}
                </h1>

                {/* Author & Stats Row */}
                <div className="flex flex-wrap items-center gap-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 p-[2px]">
                      <div className="w-full h-full rounded-full bg-black overflow-hidden relative">
                        {creator?.avatar && creator.avatar.length > 2 ? (
                          <img src={creator.avatar} className="w-full h-full object-cover" alt="Author" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white font-bold text-xl">
                            {creator?.name?.[0] || 'A'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Автор курса</p>
                      <p className="text-white font-bold text-lg">{creator?.name || 'Unknown Author'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 p-10 bg-[#151515]">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-12">
                {/* Description */}
                <section>
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <BookOpen className="text-emerald-400" size={24} />
                    </div>
                    О курсе
                  </h3>
                  <div className="text-gray-300 leading-relaxed text-lg space-y-4 font-light">
                    {course.description ? (
                      <p>{course.description}</p>
                    ) : (
                      <p className="italic text-gray-500">Описание отсутствует.</p>
                    )}
                  </div>
                </section>

                {/* What you'll learn (Mocked for now as we don't have this field yet, or use Summary) */}
                <section>
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg">
                      <Target className="text-violet-400" size={24} />
                    </div>
                    Чему вы научитесь
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "Глубокое понимание темы",
                      "Практические навыки применения",
                      "Анализ реальных кейсов",
                      "Работа с современными инструментами"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={18} />
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Curriculum */}
                <section>
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Layers className="text-blue-400" size={24} />
                    </div>
                    Программа курса
                  </h3>
                  <div className="space-y-4">
                    {course.modules.length > 0 ? (
                      course.modules.map((mod, idx) => (
                        <div
                          key={idx}
                          className="bg-[#222] border border-[#333] rounded-2xl overflow-hidden hover:border-[#444] transition-all group"
                        >
                          <div className="p-5 flex justify-between items-center">
                            <div className="flex items-center gap-5">
                              <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#333] text-gray-400 font-mono text-lg font-bold group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <div>
                                <h4 className="font-bold text-gray-200 text-lg group-hover:text-white transition-colors">{mod.title}</h4>
                                <p className="text-sm text-gray-500 mt-1">{mod.description || "Модуль курса"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500 font-medium px-3 py-1 bg-[#2a2a2a] rounded-full">
                                {mod.lessons.length} уроков
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 border border-dashed border-[#333] rounded-2xl">
                        <p className="text-gray-500">Модули пока не добавлены</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-8">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-8 space-y-8 shadow-xl sticky top-0">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-[#333]">
                      <div className="flex items-center gap-3 text-gray-400">
                        <Clock size={20} /> <span className="font-medium">Длительность</span>
                      </div>
                      <span className="text-white font-bold text-lg">{course.duration || '2ч 30мин'}</span>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-[#333]">
                      <div className="flex items-center gap-3 text-gray-400">
                        <BarChart size={20} /> <span className="font-medium">Уровень</span>
                      </div>
                      <span className="text-white font-bold text-lg capitalize">{course.level || 'Любой'}</span>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-[#333]">
                      <div className="flex items-center gap-3 text-gray-400">
                        <FileText size={20} /> <span className="font-medium">Всего уроков</span>
                      </div>
                      <span className="text-white font-bold text-lg">
                        {course.modules.reduce((acc, m) => acc + m.lessons.length, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-gray-400">
                        <Zap size={20} /> <span className="font-medium">Доступ</span>
                      </div>
                      <span className="text-emerald-400 font-bold text-lg">Бесплатно</span>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenCoursePage}
                    className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xl rounded-2xl transition-all transform hover:scale-[1.02] shadow-2xl shadow-emerald-900/40 flex items-center justify-center gap-3"
                  >
                    {saved ? "Продолжить" : "Начать обучение"}
                    <ChevronRight size={24} />
                  </button>

                  <div className="pt-4 border-t border-[#333]">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>Сертификат после окончания</span>
                    </div>
                    <button onClick={handleSaveToLibrary} className="w-full py-3 bg-[#222] hover:bg-[#2a2a2a] text-gray-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 border border-[#333]">
                      <Bookmark size={18} />
                      {saved ? "Сохранено в библиотеку" : "Сохранить на потом"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

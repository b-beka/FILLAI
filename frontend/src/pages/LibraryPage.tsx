'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Clock, Target, BarChart, Search, Share2, Network,
  Zap, Trophy, Star, Filter, ArrowUpRight, Trash2
} from 'lucide-react';
import { Course } from '@/data/mockStore';
import { useUIStore } from '@/store/uiStore';
import CoursePreview from '@/components/CoursePreview';
import { useEnrolledCourses, useMyCourses } from '@/hooks/useCourses';
import { progressApi, coursesApi } from '@/services/apiClient';


import { useAuth } from '@/contexts/AuthContext';
// ... other imports

export default function LibraryPage() {
  const { setCurrentPage } = useUIStore();
  const { user } = useAuth(); // Get current user
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});

  // Load enrolled AND created courses
  const { courses: enrolledCourses, loading: loadingEnrolled, error: errorEnrolled, refetch: refetchEnrolled } = useEnrolledCourses();
  const { courses: myCourses, loading: loadingMy, error: errorMy, refetch: refetchMy } = useMyCourses();

  // Merge courses, avoiding duplicates
  const courses = useMemo(() => {
    const all = [...enrolledCourses];
    myCourses.forEach(mc => {
      if (!all.find(c => c.id === mc.id)) {
        all.push(mc);
      }
    });
    return all;
  }, [enrolledCourses, myCourses]);

  const loading = loadingEnrolled || loadingMy;
  const error = errorEnrolled || errorMy;

  const refetch = () => {
    refetchEnrolled();
    refetchMy();
  };

  const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Вы уверены, что хотите удалить этот курс? Навсегда.')) {
      try {
        await coursesApi.delete(courseId);
        // Refresh lists
        refetch();
      } catch (err) {
        alert('Ошибка удаления курса');
        console.error(err);
      }
    }
  };

  // Rest of the code... loadProgress logic needs to use `courses`


  // Load progress for each course
  useEffect(() => {
    const loadProgress = async () => {
      if (!courses.length) return;

      const progressMap: Record<string, number> = {};
      for (const course of courses) {
        try {
          const progress = await progressApi.getCourseProgress(course.id);
          progressMap[course.id] = progress.progress_percent;
        } catch (err) {
          console.error(`Error loading progress for course ${course.id}:`, err);
          progressMap[course.id] = 0;
        }
      }
      setCourseProgress(progressMap);
    };

    loadProgress();
  }, [courses]);

  // Group courses by category
  const categoriesMap = useMemo(() => {
    const map = new Map<string, { id: string; label: string; courses: Course[] }>();

    courses.forEach((course) => {
      const categoryId = course.category || 'other';
      const categoryLabel = course.category || 'Без категории';

      if (!map.has(categoryId)) {
        map.set(categoryId, { id: categoryId, label: categoryLabel, courses: [] });
      }
      map.get(categoryId)!.courses.push(course);
    });

    return Array.from(map.values());
  }, [courses]);

  // Flattened list for display
  const flattened = useMemo(
    () =>
      categoriesMap.flatMap((cat) =>
        cat.courses.map((course) => ({ course, category: cat }))
      ),
    [categoriesMap]
  );

  const filteredCourses = useMemo(
    () =>
      flattened.filter(({ course, category }) => {
        if (selectedCategory !== 'all' && category.id !== selectedCategory) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();

        const inTitle = course.title.toLowerCase().includes(q);
        const inDesc = course.description.toLowerCase().includes(q);

        return inTitle || inDesc;
      }),
    [flattened, selectedCategory, searchQuery]
  );

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0a] text-white">
      {/* Header Section */}
      <div className="relative border-b border-[#262626] bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_70%)]"></div>
        <div className="max-w-7xl mx-auto px-8 py-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <BookOpen size={20} />
                <span className="text-sm font-bold uppercase tracking-widest">Мое обучение</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
                Библиотека курсов
              </h1>
              <p className="text-gray-400 max-w-xl text-lg">
                Ваша персональная коллекция знаний. Отслеживайте прогресс и продолжайте обучение.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white leading-none">{courses.length}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Курсов</div>
                </div>
              </div>
              <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
                  <Target size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white leading-none">
                    {Object.values(courseProgress).filter(p => p === 100).length}
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Завершено</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[#141414] border border-[#262626] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <button
            onClick={() => setCurrentPage('community')}
            className="px-6 py-4 bg-[#141414] hover:bg-[#1e1e1e] border border-[#262626] text-white font-bold rounded-xl flex items-center gap-2 transition-all hover:border-emerald-500/30"
          >
            <Zap size={20} className="text-emerald-400" />
            <span>Найти новые курсы</span>
          </button>
        </div>

        {/* Categories */}
        {categoriesMap.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${selectedCategory === 'all'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                : 'bg-[#141414] border-[#262626] text-gray-400 hover:text-white hover:border-gray-600'
                }`}
            >
              Все
            </button>
            {categoriesMap.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${selectedCategory === cat.id
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                  : 'bg-[#141414] border-[#262626] text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Загрузка вашей библиотеки...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#141414] border border-red-900/30 rounded-3xl">
            <div className="p-4 bg-red-500/10 rounded-full mb-4">
              <BookOpen size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Не удалось загрузить курсы</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#141414] border border-dashed border-[#262626] rounded-3xl">
            <div className="p-6 bg-[#1e1e1e] rounded-full mb-6">
              <BookOpen size={48} className="text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Здесь пока пусто</h3>
            <p className="text-gray-400 mb-8 max-w-md text-center">
              Вы еще не записались ни на один курс. Перейдите в сообщество, чтобы найти интересные материалы.
            </p>
            <button
              onClick={() => setCurrentPage('community')}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xl shadow-emerald-900/20 flex items-center gap-3 transition-transform hover:-translate-y-1"
            >
              <Zap size={20} />
              Перейти в каталог
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCourses.map(({ course, category }, index) => {
              const progress = courseProgress[course.id] || 0;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedCourse(course)}
                  className="group bg-[#141414] border border-[#262626] rounded-3xl p-6 hover:border-emerald-500/50 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-[#1e1e1e] flex items-center justify-center text-emerald-400 border border-[#262626] group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-colors">
                          <Zap size={24} />
                        </div>
                        {/* Delete Button for Owner */}
                        {user?.id && (course.createdBy === user.id || (course as any).created_by === user.id) && (
                          <button
                            onClick={(e) => handleDeleteCourse(course.id, e)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30 z-20"
                            title="Удалить курс"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-[#1e1e1e] text-gray-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-[#262626]">
                          {course.level}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                      {course.title}
                    </h3>

                    <p className="text-sm text-gray-400 line-clamp-2 mb-6 flex-1">
                      {course.description}
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500 font-bold">Прогресс</span>
                        <span className="text-emerald-400 font-bold">{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-[#0a0a0a] rounded-full overflow-hidden border border-[#262626]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ delay: 0.2, duration: 1 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-sky-500"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[#262626]">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {course.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy size={14} />
                            {category.label}
                          </span>
                        </div>
                        <div className="p-2 rounded-full bg-[#1e1e1e] text-gray-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                          <ArrowUpRight size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {selectedCourse && (
        <CoursePreview
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  );
}

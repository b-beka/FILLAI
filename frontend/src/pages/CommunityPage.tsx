'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, Filter, TrendingUp, Users as UsersIcon, Clock, Star,
  Trophy, Award, Zap, ChevronDown, Check, X as CloseIcon, Plus,
  Settings, BarChart3, Eye, EyeOff, Link as LinkIcon, Copy,
  GraduationCap, Briefcase, Building, ShoppingCart, DollarSign,
  UserCheck, UserX, FileText, Edit2, Trash2, Share2, MessageSquare,
  Heart, Reply, Pin, Send, MoreVertical, LayoutGrid, List, Sparkles
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { Course } from '@/data/mockStore';
import { Discussion, DiscussionReply } from '@/data/discussions';
import CoursePreview from '@/components/CoursePreview';
import { useCourses, useMyCourses, useEnrolledCourses, useEnrollCourse } from '@/hooks/useCourses';
import { coursesApi, discussionsApi, usersApi } from '@/services/apiClient';
import { adaptApiCourseToCourse, adaptCourseToApiCourse } from '@/services/courseAdapter';
import { adaptApiDiscussionsToDiscussions, adaptApiDiscussionToDiscussion, adaptApiReplyToReply } from '@/services/discussionsAdapter';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'student' | 'teacher' | 'organization';
type Tab = 'marketplace' | 'my-courses' | 'create' | 'analytics' | 'discussions';
type PaidFilter = 'all' | 'free' | 'paid';
type LevelFilter = 'all' | 'Beginner' | 'Intermediate' | 'Advanced';
type SortOption = 'relevance' | 'newest' | 'price_low' | 'price_high';

export default function CommunityPage() {
  // Роль пользователя (можно будет получать из профиля)
  const [userRole, setUserRole] = useState<Role>('student');
  const [activeTab, setActiveTab] = useState<Tab>('marketplace');

  // Используем хуки для загрузки данных из API
  const { courses: allCourses, loading: coursesLoading } = useCourses();
  const { courses: myCourses, loading: myCoursesLoading } = useMyCourses();
  const { courses: enrolledCourses, loading: enrolledLoading } = useEnrolledCourses();
  const { enroll: enrollInCourse, loading: enrollLoading } = useEnrollCourse();

  // Публичные курсы для маркетплейса - только те, которые автор опубликовал
  const marketplaceCourses: Course[] = useMemo(() => {
    return allCourses.filter((c) => c.isPublic === true);
  }, [allCourses]);

  const [searchQuery, setSearchQuery] = useState('');
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Фильтрация курсов
  const filteredCourses = useMemo(() => {
    const base = marketplaceCourses.filter((course) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const inTitle = course.title.toLowerCase().includes(q);
        const inDesc = course.description.toLowerCase().includes(q);
        const inTags = (course.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags) return false;
      }
      if (paidFilter === 'free' && course.isPaid) return false;
      if (paidFilter === 'paid' && !course.isPaid) return false;
      if (levelFilter !== 'all' && course.level !== levelFilter) return false;
      return true;
    });

    const sorted = [...base];
    switch (sortOption) {
      case 'newest':
        sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        break;
      case 'price_low':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
    }
    return sorted;
  }, [marketplaceCourses, searchQuery, paidFilter, levelFilter, sortOption]);

  // Табы в зависимости от роли
  const tabs: { id: Tab; label: string; icon: any; roles: Role[] }[] = [
    { id: 'marketplace', label: 'Каталог', icon: LayoutGrid, roles: ['student', 'teacher', 'organization'] },
    { id: 'discussions', label: 'Обсуждения', icon: MessageSquare, roles: ['student', 'teacher', 'organization'] },
    { id: 'my-courses', label: 'Мои курсы', icon: FileText, roles: ['teacher', 'organization'] },
    { id: 'create', label: 'Создать', icon: Plus, roles: ['teacher', 'organization'] },
    { id: 'analytics', label: 'Аналитика', icon: BarChart3, roles: ['teacher', 'organization'] },
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(userRole));

  // Автоматически переключаем на первый доступный таб при смене роли
  React.useEffect(() => {
    const availableTabIds = visibleTabs.map(tab => tab.id);
    if (!availableTabIds.includes(activeTab)) {
      setActiveTab(availableTabIds[0] || 'marketplace');
    }
  }, [userRole, visibleTabs, activeTab]);

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0a] text-white">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(14,165,233,0.1),transparent_70%)]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Сообщество</h1>
            <p className="text-gray-400">Обменивайтесь знаниями, создавайте курсы и развивайтесь.</p>
          </div>

          {/* Role Switcher */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-1.5 flex items-center gap-1 shadow-xl shadow-black/20">
            {(['student', 'teacher', 'organization'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setUserRole(r)}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${userRole === r
                  ? 'bg-[#262626] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]'
                  }`}
              >
                {r === 'student' && <GraduationCap size={16} />}
                {r === 'teacher' && <Briefcase size={16} />}
                {r === 'organization' && <Building size={16} />}
                <span className="capitalize">
                  {r === 'student' ? 'Ученик' : r === 'teacher' ? 'Учитель' : 'Орг.'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${isActive
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                  : 'bg-[#141414] border-[#262626] text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="min-h-[500px] relative">
          <AnimatePresence mode="wait">
            {activeTab === 'marketplace' && (
              <MarketplaceView
                key={`marketplace-${userRole}`}
                courses={filteredCourses}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                paidFilter={paidFilter}
                setPaidFilter={setPaidFilter}
                levelFilter={levelFilter}
                setLevelFilter={setLevelFilter}
                sortOption={sortOption}
                setSortOption={setSortOption}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                onCourseSelect={setSelectedCourse}
                loading={coursesLoading}
                enrolledCourses={enrolledCourses}
                onEnroll={enrollInCourse}
                enrollLoading={enrollLoading}
              />
            )}
            {activeTab === 'discussions' && (
              <DiscussionsView
                key={`discussions-${userRole}`}
                courses={marketplaceCourses}
                onCourseSelect={setSelectedCourse}
              />
            )}
            {activeTab === 'my-courses' && (
              <MyCoursesView
                key={`my-courses-${userRole}`}
                courses={myCourses}
                onCourseSelect={setSelectedCourse}
                onCreateCourseClick={() => setActiveTab('create')}
              />
            )}
            {activeTab === 'create' && (
              <CreateCourseView
                key={`create-${userRole}`}
                onCourseCreated={async (course) => {
                  setSelectedCourse(course);
                  setActiveTab('my-courses');
                }}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsView
                key={`analytics-${userRole}`}
                courses={myCourses}
                role={userRole}
              />
            )}
          </AnimatePresence>
        </div>

        {selectedCourse && (
          <CoursePreview course={selectedCourse} onClose={() => setSelectedCourse(null)} />
        )}
      </div>
    </div>
  );
}

// Marketplace View
function MarketplaceView({
  courses,
  searchQuery,
  setSearchQuery,
  paidFilter,
  setPaidFilter,
  levelFilter,
  setLevelFilter,
  sortOption,
  setSortOption,
  showFilters,
  setShowFilters,
  onCourseSelect,
  loading,
  enrolledCourses,
  onEnroll,
  enrollLoading,
}: {
  courses: Course[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  paidFilter: PaidFilter;
  setPaidFilter: (f: PaidFilter) => void;
  levelFilter: LevelFilter;
  setLevelFilter: (f: LevelFilter) => void;
  sortOption: SortOption;
  setSortOption: (s: SortOption) => void;
  showFilters: boolean;
  setShowFilters: (s: boolean) => void;
  onCourseSelect: (course: Course) => void;
  loading?: boolean;
  enrolledCourses?: Course[];
  onEnroll?: (courseId: string) => Promise<boolean>;
  enrollLoading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#262626] bg-[#141414] p-10">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 to-sky-900/20 opacity-50" />
        <div className="absolute right-0 top-0 w-2/3 h-full bg-gradient-to-l from-emerald-500/10 to-transparent" />

        <div className="relative z-10 max-w-2xl">
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            Откройте новые горизонты <span className="text-emerald-400">знаний</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl">
            Тысячи курсов от профессионалов. Изучайте, создавайте и делитесь опытом в сообществе нового поколения.
          </p>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform hover:-translate-y-1">
              Начать обучение
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-400 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Что вы хотите изучить?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-[#141414] border border-[#262626] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-6 py-4 rounded-xl border flex items-center gap-3 font-bold transition-all ${showFilters
            ? 'bg-[#262626] border-emerald-500/50 text-emerald-400'
            : 'bg-[#141414] border-[#262626] text-gray-400 hover:border-gray-600 hover:text-white'
            }`}
        >
          <Filter size={20} />
          <span>Фильтры</span>
          <ChevronDown size={16} className={`transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-[#141414] border border-[#262626] rounded-2xl p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Type Filter */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Тип доступа</h4>
                <div className="space-y-2">
                  {(['all', 'free', 'paid'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPaidFilter(type)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all ${paidFilter === type
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#1a1a1a] text-gray-400 border border-transparent hover:border-[#333]'
                        }`}
                    >
                      <span className="capitalize">{type === 'all' ? 'Все' : type === 'free' ? 'Бесплатные' : 'Платные'}</span>
                      {paidFilter === type && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Level Filter */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Уровень</h4>
                <div className="space-y-2">
                  {(['all', 'Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLevelFilter(lvl)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all ${levelFilter === lvl
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#1a1a1a] text-gray-400 border border-transparent hover:border-[#333]'
                        }`}
                    >
                      <span>{lvl === 'all' ? 'Любой' : lvl}</span>
                      {levelFilter === lvl && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Сортировка</h4>
                <div className="space-y-2">
                  {[
                    { id: 'relevance', label: 'Релевантность' },
                    { id: 'newest', label: 'Новинки' },
                    { id: 'price_low', label: 'Дешевле' },
                    { id: 'price_high', label: 'Дороже' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSortOption(opt.id as SortOption)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all ${sortOption === opt.id
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#1a1a1a] text-gray-400 border border-transparent hover:border-[#333]'
                        }`}
                    >
                      <span>{opt.label}</span>
                      {sortOption === opt.id && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <LayoutGrid size={20} className="text-emerald-400" />
          <h3 className="text-xl font-bold text-white">
            {loading ? 'Загрузка...' : `Найдено курсов: ${courses.length}`}
          </h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#141414] rounded-3xl h-[400px] animate-pulse border border-[#262626]" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="py-20 text-center bg-[#141414] rounded-3xl border border-dashed border-[#262626]">
            <Search size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">Ничего не найдено</p>
            <button onClick={() => setSearchQuery('')} className="text-emerald-400 font-bold mt-2 hover:underline">
              Сбросить поиск
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
                onClick={() => onCourseSelect(course)}
                className="group bg-[#141414] border border-[#262626] rounded-3xl overflow-hidden hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-900/10 transition-all cursor-pointer flex flex-col h-full"
              >
                {/* Card Header/Preview */}
                <div className="h-48 bg-[#1a1a1a] relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#262626] to-[#141414]" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                    <BookOpen size={64} />
                  </div>

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-2.5 py-1 bg-black/50 backdrop-blur-md border border-white/10 text-xs font-bold text-white rounded-lg">
                      {course.level}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4">
                    {course.isPaid ? (
                      <span className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-lg">
                        {course.price}₽
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-lg">
                        Бесплатно
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={14} className="fill-current" />
                      <span className="text-sm font-bold text-white">4.9</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">• 1.2k отзывов</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {course.title}
                  </h3>

                  <p className="text-sm text-gray-400 line-clamp-3 mb-6 flex-1">
                    {course.description}
                  </p>

                  <div className="pt-4 border-t border-[#262626] mt-auto">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-2">
                        <UsersIcon size={14} />
                        <span>{course.enrolledStudents?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{course.duration}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEnroll) {
                          // Simple enrollment logic
                          const isEnrolled = enrolledCourses?.some(c => c.id === course.id);
                          if (isEnrolled) {
                            alert('Вы уже записаны!');
                          } else {
                            onEnroll(course.id).then((ok) => {
                              if (ok) alert('Успешно записаны!');
                            });
                          }
                        }
                      }}
                      className="w-full py-3 bg-[#262626] hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 group-hover:bg-emerald-600"
                    >
                      <Zap size={16} />
                      {enrolledCourses?.some(c => c.id === course.id) ? 'Открыть' : 'Записаться'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Discussions View
function DiscussionsView({ courses, onCourseSelect }: { courses: Course[], onCourseSelect: (c: Course) => void }) {
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createFormData, setCreateFormData] = useState({ title: '', content: '', courseId: '' });

  // Load discussions from API
  React.useEffect(() => {
    const loadDiscussions = async () => {
      try {
        setLoading(true);
        const apiDiscussions = await discussionsApi.list(selectedCourseId || undefined);
        const adaptedDiscussions = await adaptApiDiscussionsToDiscussions(apiDiscussions);
        setDiscussions(adaptedDiscussions);
      } catch (error) {
        console.error('Error loading discussions:', error);
        setDiscussions([]);
      } finally {
        setLoading(false);
      }
    };
    loadDiscussions();
  }, [selectedCourseId]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Обсуждения</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Создать
        </button>
      </div>

      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex gap-4 items-center">
        <Filter size={20} className="text-gray-500" />
        <select
          className="bg-transparent text-white font-bold focus:outline-none w-full"
          value={selectedCourseId || ''}
          onChange={(e) => setSelectedCourseId(e.target.value || null)}
        >
          <option value="">Все обсуждения</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {/* Create Discussion Form */}
      {showCreateForm && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Создать обсуждение</h3>
          <div className="space-y-4">
            <select
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-white focus:outline-none focus:border-emerald-500"
              value={createFormData.courseId}
              onChange={(e) => setCreateFormData({ ...createFormData, courseId: e.target.value })}
            >
              <option value="">Выберите курс</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <input
              type="text"
              placeholder="Заголовок"
              value={createFormData.title}
              onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-white focus:outline-none focus:border-emerald-500"
            />
            <textarea
              placeholder="Содержание"
              value={createFormData.content}
              onChange={(e) => setCreateFormData({ ...createFormData, content: e.target.value })}
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-white focus:outline-none focus:border-emerald-500 min-h-[100px]"
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!createFormData.courseId || !createFormData.title || !createFormData.content) {
                    alert('Заполните все поля');
                    return;
                  }
                  try {
                    await discussionsApi.create({
                      course_id: createFormData.courseId,
                      title: createFormData.title,
                      content: createFormData.content
                    });
                    setCreateFormData({ title: '', content: '', courseId: '' });
                    setShowCreateForm(false);
                    // Reload discussions
                    const apiDiscussions = await discussionsApi.list(selectedCourseId || undefined);
                    const adaptedDiscussions = await adaptApiDiscussionsToDiscussions(apiDiscussions);
                    setDiscussions(adaptedDiscussions);
                  } catch (error) {
                    console.error('Error creating discussion:', error);
                    alert('Ошибка при создании обсуждения');
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
              >
                Создать
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-xl font-bold"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discussion List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-10">Загрузка...</div>
        ) : discussions.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Нет обсуждений</div>
        ) : (
          discussions.map(d => (
            <div key={d.id} className="bg-[#141414] border border-[#262626] rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center font-bold text-gray-400">
                  {d.authorAvatar}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1 hover:text-emerald-400 cursor-pointer">{d.title}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{d.content}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="font-bold text-gray-300">{d.authorName}</span>
                    <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={async () => {
                        try {
                          await discussionsApi.likeDiscussion(d.id);
                          // Reload discussions to update likes
                          const apiDiscussions = await discussionsApi.list(selectedCourseId || undefined);
                          const adaptedDiscussions = await adaptApiDiscussionsToDiscussions(apiDiscussions);
                          setDiscussions(adaptedDiscussions);
                        } catch (error) {
                          console.error('Error liking discussion:', error);
                        }
                      }}
                      className="flex items-center gap-1 hover:text-emerald-400"
                    >
                      <Heart size={14} /> {d.likes}
                    </button>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={14} /> {d.replies.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// My Courses View (Constructor)
function MyCoursesView({ courses, onCourseSelect, onCreateCourseClick }: { courses: Course[], onCourseSelect: (c: Course) => void, onCreateCourseClick: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white">Мои курсы</h2>
        <button
          onClick={onCreateCourseClick}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20"
        >
          <Plus size={20} />
          Создать курс
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-[#262626] rounded-3xl">
          <div className="text-gray-500 font-bold text-xl mb-2">Нет созданных курсов</div>
          <p className="text-gray-600">Начните делиться знаниями прямо сейчас</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all">
              <div className="h-32 bg-[#1a1a1a] relative">
                <div className="absolute top-4 left-4">
                  {course.isPublic ? (
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">Публичный</span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded">Приватный</span>
                  )}
                </div>
                <div className="absolute top-4 right-4">
                  <button className="p-2 bg-black/50 rounded-lg hover:bg-black/70 text-white"><Settings size={14} /></button>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2 truncate">{course.title}</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                  <span className="flex items-center gap-1"><UsersIcon size={14} /> {course.enrolledStudents?.length || 0}</span>
                  <span className="flex items-center gap-1"><Star size={14} /> 4.9</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onCourseSelect(course)} className="flex-1 py-2 bg-[#262626] rounded-lg text-sm font-bold text-white hover:bg-[#333]">Просмотр</button>
                  <button className="flex-1 py-2 bg-emerald-600/10 text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-600/20">Редактировать</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Create Course View
function CreateCourseView({ onCourseCreated }: { onCourseCreated: (c: Course) => void }) {
  const { setCurrentPage } = useUIStore();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    format: 'Video',
    level: 'Beginner',
    intensity: 'Middle',
    goal: 'Skills'
  });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!formData.title) return;
    setCreating(true);
    try {
      // Call real API
      const apiCourse = await coursesApi.create({
        ...formData,
        description: formData.description || 'Новый курс',
        duration: '4 недели', // Default
      });

      // Auto-enroll the creator
      await coursesApi.enroll(apiCourse.id).catch(err => console.warn('Auto-enroll failed', err));

      const newCourse = adaptApiCourseToCourse(apiCourse);
      onCourseCreated(newCourse);
      alert('Курс успешно создан!');
    } catch (error: any) {
      console.error('Failed to create course:', error);
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        alert('Для создания курса необходимо войти в систему.');
        setCurrentPage('login');
      } else {
        alert('Ошибка при создании курса. ' + (error.message || ''));
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="bg-[#141414] border border-[#262626] rounded-3xl p-8">
        <h2 className="text-2xl font-black text-white mb-6">Создание курса</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Название курса</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-white focus:outline-none focus:border-emerald-500"
              placeholder="Например: Основы React"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Описание</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-white focus:outline-none focus:border-emerald-500 h-32"
              placeholder="О чем этот курс?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Уровень</label>
              <select
                value={formData.level}
                onChange={e => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-white focus:outline-none"
              >
                <option value="Beginner">Новичок</option>
                <option value="Intermediate">Средний</option>
                <option value="Advanced">Продвинутый</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Формат</label>
              <select
                value={formData.format}
                onChange={e => setFormData({ ...formData, format: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-white focus:outline-none"
              >
                <option value="Video">Видео</option>
                <option value="Text">Текст</option>
                <option value="Interactive">Интерактивный</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !formData.title}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {creating ? (<><Sparkles className="animate-spin" /> Создание...</>) : 'Создать курс'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Analytics View
function AnalyticsView({ courses, role }: { courses: Course[], role: Role }) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-white">Аналитика</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
          <div className="text-gray-500 text-xs font-bold uppercase mb-2">Активные студенты</div>
          <div className="text-4xl font-black text-emerald-400">1,248</div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
          <div className="text-gray-500 text-xs font-bold uppercase mb-2">Всего курсов</div>
          <div className="text-4xl font-black text-white">{courses.length}</div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
          <div className="text-gray-500 text-xs font-bold uppercase mb-2">Средний рейтинг</div>
          <div className="text-4xl font-black text-yellow-500">4.9</div>
        </div>
      </div>
    </div>
  );
}

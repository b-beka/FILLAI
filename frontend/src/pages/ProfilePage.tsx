'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Calendar, BookOpen, Trophy, Settings, Edit2, Save, Bell,
  Shield, Moon, Globe, X, Star, Users as UsersIcon, Send,
  Search, MessageSquare, Award, Zap, Heart, Target, TrendingUp,
  ChevronRight, Bookmark, Clock, Crown, Flame, Medal, Gem,
  BarChart3, Activity, PlayCircle, CheckCircle2, Sparkles,
  Gift, Coins, TrendingDown, ArrowUp, ArrowDown, Gamepad2, LogOut
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import CoursePreview from '@/components/CoursePreview';
import { authApi, coursesApi, ApiUser, ApiCourse, categoriesApi, ApiCategory } from '@/services/apiClient';
import { adaptApiCourseToCourse } from '@/services/courseAdapter';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'learning' | 'created' | 'achievements' | 'messages' | 'stats'>('overview');
  const { setCurrentPage } = useUIStore();

  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [myCourses, setMyCourses] = useState<ApiCourse[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<ApiCourse[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    darkMode: true,
    language: 'ru',
    privacy: 'public',
  });

  // Calculated user data based on real information
  const userExtendedData = useMemo(() => {
    // Calculate level based on courses (more realistic)
    const totalCourses = enrolledCourses.length + myCourses.length;
    const level = Math.max(1, Math.floor(totalCourses / 2) + 1);
    const xp = totalCourses * 100;
    const nextLevelXp = (level + 1) * 200;

    return {
      level,
      xp,
      nextLevelXp,
      rank: level >= 10 ? 'Исследователь' : level >= 5 ? 'Студент' : 'Новичок',
      streak: 0, // Will be implemented with real tracking
      totalXp: xp,
      rankPosition: 0,
      joinDate: new Date(user?.created_at || Date.now()).toLocaleDateString('ru', { month: 'long', year: 'numeric' })
    };
  }, [enrolledCourses, myCourses, user]);

  const levelProgress = ((userExtendedData.level - 1) / 50) * 100;
  const xpProgress = (userExtendedData.xp / userExtendedData.nextLevelXp) * 100;

  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userData, myCoursesData, enrolledCoursesData, categoriesData] = await Promise.all([
          authApi.getCurrentUser(),
          coursesApi.getMyCourses(),
          coursesApi.getEnrolledCourses(),
          categoriesApi.list().catch(() => [])
        ]);
        setUser(userData);
        setMyCourses(myCoursesData);
        setEnrolledCourses(enrolledCoursesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    authApi.logout();
    setCurrentPage('login');
  };



  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Пользователь не найден</p>
          <button onClick={() => setCurrentPage('login')} className="text-emerald-400 hover:underline">Войти</button>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Курсы пройдено', value: enrolledCourses.length, icon: Trophy, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', change: '+2', trend: 'up' },
    { label: 'Часов обучения', value: 124, icon: Clock, color: 'text-sky-400', bgColor: 'bg-sky-500/10', change: '+15', trend: 'up' },
    { label: 'Создано курсов', value: myCourses.length, icon: Edit2, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', change: '+1', trend: 'up' },
    { label: 'Очков опыта', value: userExtendedData.xp, icon: Zap, color: 'text-orange-400', bgColor: 'bg-orange-500/10', change: '+250', trend: 'up' },
  ];

  const achievements = [
    { id: 1, title: 'Первый шаг', desc: 'Начните свой первый курс', icon: Target, color: 'bg-emerald-500', unlocked: enrolledCourses.length > 0, rarity: 'common', xp: 50 },
    { id: 2, title: 'Создатель', desc: 'Создайте свой первый курс', icon: Edit2, color: 'bg-sky-500', unlocked: myCourses.length > 0, rarity: 'common', xp: 100 },
    { id: 3, title: 'Активный ученик', desc: 'Запишитесь на 3 курса', icon: BookOpen, color: 'bg-blue-500', unlocked: enrolledCourses.length >= 3, rarity: 'rare', xp: 200 },
    { id: 4, title: 'Автор', desc: 'Создайте 3 курса', icon: Trophy, color: 'bg-amber-500', unlocked: myCourses.length >= 3, rarity: 'epic', xp: 300 },
    { id: 5, title: 'Мастер знаний', desc: 'Достигните 10 уровня', icon: Crown, color: 'bg-purple-500', unlocked: userExtendedData.level >= 10, rarity: 'rare', xp: 500 },
  ];

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0a] text-white">
      {/* Hero Section */}
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[#0a0a0a] border-b border-[#262626]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(14,165,233,0.1),transparent_70%)]"></div>
        <div className="relative max-w-7xl mx-auto px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-2 bg-[#141414]/80 backdrop-blur-xl border border-[#262626] rounded-3xl p-8 relative overflow-hidden shadow-2xl group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                  {/* Avatar */}
                  <div className="relative group">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-500 to-sky-600 p-1 shadow-2xl shadow-emerald-500/20">
                        <div className="w-full h-full rounded-[20px] bg-[#141414] flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl font-black text-white">{user.username[0].toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="absolute -bottom-3 -right-3 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 border-4 border-[#141414] flex items-center justify-center font-black text-white shadow-xl"
                      >
                        <div className="text-center">
                          <div className="text-[10px] leading-tight opacity-80">LVL</div>
                          <div className="text-2xl">{userExtendedData.level}</div>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="flex-1 w-full text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
                      <div>
                        <h2 className="text-4xl font-black mb-2 text-white tracking-tight">
                          {user.full_name || user.username}
                        </h2>
                        <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                          <span className="px-3 py-1 bg-amber-500/10 text-amber-300 rounded-lg text-xs font-bold uppercase tracking-widest border border-amber-500/20 flex items-center gap-1">
                            <Crown size={12} />
                            {userExtendedData.rank}
                          </span>
                          <span className="text-gray-400 text-sm font-medium flex items-center gap-1">
                            <Calendar size={14} />
                            С {userExtendedData.joinDate}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="px-5 py-2.5 bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-[#262626] rounded-xl transition-all flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white hover:border-emerald-500/30"
                        >
                          <Edit2 size={16} />
                          {isEditing ? 'Закрыть' : 'Изменить'}
                        </button>
                        <button
                          onClick={handleLogout}
                          className="p-2.5 bg-[#1e1e1e] hover:bg-red-500/10 border border-[#262626] rounded-xl transition-all text-gray-400 hover:text-red-400 hover:border-red-500/30"
                          title="Выйти"
                        >
                          <LogOut size={18} />
                        </button>
                      </div>
                    </div>

                    {/* XP Progress Bar */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Прогресс уровня</span>
                        <span className="text-xs font-bold text-emerald-400">{userExtendedData.xp} / {userExtendedData.nextLevelXp} XP</span>
                      </div>
                      <div className="w-full h-3 bg-[#1e1e1e] rounded-full overflow-hidden border border-[#262626] relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${xpProgress}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        </motion.div>
                      </div>
                    </div>

                    <p className="mt-6 text-gray-400 text-sm leading-relaxed max-w-2xl">
                      {user.bio || 'Расскажите немного о себе...'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats Summary Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 hover:border-emerald-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                    <Zap size={24} className="text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Всего XP</span>
                </div>
                <div className="text-4xl font-black text-white mb-1 group-hover:text-emerald-50 transition-colors">{userExtendedData.totalXp.toLocaleString()}</div>
                <div className="flex items-center gap-2 text-sm text-emerald-400/80">
                  <TrendingUp size={14} />
                  <span>Топ 5% студентов</span>
                </div>
              </div>

              <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 hover:border-orange-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                    <Flame size={24} className="text-orange-400" />
                  </div>
                  <span className="text-[10px] font-bold text-orange-300 uppercase tracking-widest">Серия</span>
                </div>
                <div className="text-4xl font-black text-white mb-1 group-hover:text-orange-50 transition-colors">{userExtendedData.streak}</div>
                <div className="text-sm text-orange-400/80">Дней подряд</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#141414] border border-[#262626] rounded-2xl p-6 hover:border-emerald-500/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                  {stat.trend === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {stat.change}
                </div>
              </div>
              <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            { id: 'overview', label: 'Обзор', icon: BarChart3 },
            { id: 'learning', label: 'Мое обучение', icon: BookOpen },
            { id: 'created', label: 'Созданные курсы', icon: Edit2 },
            { id: 'achievements', label: 'Достижения', icon: Award },
            { id: 'stats', label: 'Статистика', icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all ${activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40'
                : 'bg-[#1e1e1e] text-gray-400 hover:text-white border border-[#262626] hover:border-emerald-500/50'
                }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-[400px]"
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recent Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                    <PlayCircle size={20} className="text-sky-400" />
                    Недавняя активность
                  </h3>
                  <div className="space-y-4">
                    {[
                      { action: 'Записались на курс', course: enrolledCourses[0]?.title || 'Нет данных', time: 'Недавно', icon: CheckCircle2, color: 'text-emerald-400' },
                      { action: 'Создали курс', course: myCourses[0]?.title || 'Нет данных', time: 'Недавно', icon: Edit2, color: 'text-sky-400' },
                      { action: 'Получили достижение', course: achievements.find(a => a.unlocked)?.title || 'Нет данных', time: 'Недавно', icon: Award, color: 'text-amber-400' },
                    ].map((activity, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-[#0a0a0a] rounded-xl border border-[#262626]">
                        <div className={`p-2 rounded-lg bg-[#1e1e1e] ${activity.color}`}>
                          <activity.icon size={18} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{activity.action}</div>
                          <div className="text-xs text-gray-400">{activity.course}</div>
                        </div>
                        <div className="text-xs text-gray-500">{activity.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'learning' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {enrolledCourses.length === 0 ? (
                <div className="col-span-3 py-10 text-center text-gray-500">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Вы пока не записаны ни на один курс.</p>
                </div>
              ) : enrolledCourses.map((course, idx) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedCourse(adaptApiCourseToCourse(course))}
                  className="group bg-[#141414] border border-[#262626] rounded-3xl p-6 hover:border-emerald-500/50 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                        <Zap size={24} />
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-tighter px-2 py-1 bg-[#0a0a0a] rounded-lg text-gray-500 border border-[#262626]">
                        {course.level}
                      </div>
                    </div>
                    <h4 className="text-xl font-bold mb-4 line-clamp-2 text-white group-hover:text-emerald-400 transition-colors">{course.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1.5">
                        <Trophy size={14} className="text-amber-500" />
                        80% пройден
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {course.duration}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#0a0a0a] rounded-full overflow-hidden border border-[#262626]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '80%' }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-sky-500"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'created' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-black mb-2 text-white">Созданные курсы</h3>
                  <p className="text-gray-400">Курсы, которые вы создали в графе знаний или сообществе</p>
                </div>
                <button
                  onClick={() => setCurrentPage('community')}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold flex items-center gap-2 transition-colors text-white"
                >
                  <Edit2 size={18} />
                  Создать новый
                </button>
              </div>

              {myCourses.length === 0 ? (
                <div className="py-20 text-center bg-[#141414] rounded-3xl border border-dashed border-[#262626]">
                  <BookOpen size={64} className="mx-auto text-gray-600 mb-4" />
                  <div className="text-gray-400 text-lg mb-2">У вас пока нет созданных курсов</div>
                  <p className="text-gray-500 text-sm mb-4">Создайте курс в графе знаний или в сообществе</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setCurrentPage('graph')}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition-colors text-white"
                    >
                      Граф знаний
                    </button>
                    <button
                      onClick={() => setCurrentPage('community')}
                      className="px-6 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg font-semibold transition-colors text-white"
                    >
                      Сообщество
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {myCourses.map((course, idx) => {
                    const category = categories.find(cat => cat.id === course.category_id);
                    const isPublished = course.is_public;
                    return (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => setSelectedCourse(adaptApiCourseToCourse(course))}
                        className="group bg-[#141414] border border-[#262626] rounded-3xl p-6 hover:border-emerald-500/50 transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                              <Zap size={24} />
                            </div>
                            <div className="flex items-center gap-2">
                              {isPublished && (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded border border-green-500/30">
                                  Опубликован
                                </span>
                              )}
                              <span className="text-[10px] font-black uppercase tracking-tighter px-2 py-1 bg-[#0a0a0a] rounded-lg text-gray-500 border border-[#262626]">
                                {course.level}
                              </span>
                            </div>
                          </div>
                          <h4 className="text-xl font-bold mb-2 line-clamp-2 text-white group-hover:text-emerald-400 transition-colors">{course.title}</h4>
                          <p className="text-sm text-gray-400 line-clamp-2 mb-4 h-10">{course.description}</p>
                          <div className="space-y-2 mb-4">
                            {category && (
                              <div className="text-xs text-gray-500">
                                Категория: <span className="text-emerald-400">{category.label}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 pt-4 border-t border-[#262626]">
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} />
                              <span>{course.duration}</span>
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black mb-2 text-white">Достижения</h3>
                  <p className="text-gray-400">Разблокируйте все достижения и станьте легендой!</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">
                    {achievements.filter(a => a.unlocked).length} / {achievements.length}
                  </div>
                  <div className="text-sm text-gray-400">Разблокировано</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {achievements.map((ach, idx) => {
                  const rarityColors = {
                    common: 'from-gray-500 to-gray-600',
                    rare: 'from-blue-500 to-cyan-500',
                    epic: 'from-sky-500 to-blue-600',
                    legendary: 'from-amber-500 via-orange-500 to-red-500',
                  };
                  return (
                    <motion.div
                      key={ach.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`bg-[#141414] border-2 rounded-3xl p-8 flex flex-col items-center text-center transition-all relative overflow-hidden ${ach.unlocked
                        ? `border-${ach.color.split('-')[1]}-500/50 shadow-2xl shadow-${ach.color.split('-')[1]}-500/20`
                        : 'border-[#262626] opacity-50 grayscale'
                        }`}
                    >
                      {ach.unlocked && (
                        <div className={`absolute inset-0 bg-gradient-to-br ${rarityColors[ach.rarity as keyof typeof rarityColors]}/10 opacity-50`}></div>
                      )}
                      <div className={`relative w-24 h-24 rounded-3xl ${ach.color} flex items-center justify-center text-white mb-6 shadow-2xl ${ach.unlocked ? 'animate-pulse' : ''
                        }`}>
                        <ach.icon size={48} />
                        {ach.unlocked && (
                          <div className="absolute -top-2 -right-2">
                            <Sparkles size={20} className="text-yellow-400 fill-current animate-pulse" />
                          </div>
                        )}
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2 relative z-10">{ach.title}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed mb-4 relative z-10">{ach.desc}</p>
                      <div className="flex items-center gap-2 relative z-10">
                        <Coins size={14} className="text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400">{ach.xp} XP</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#141414] border border-[#262626] rounded-3xl p-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                    <BarChart3 size={20} className="text-emerald-400" />
                    Прогресс обучения
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Общий прогресс</span>
                        <span className="text-sm font-bold text-white">{Math.round(levelProgress)}%</span>
                      </div>
                      <div className="w-full h-3 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#262626]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${levelProgress}%` }}
                          transition={{ duration: 1 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


        </motion.div>

        {/* Settings Button */}
        <div className="mt-8">
          <motion.button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full px-6 py-4 bg-[#141414] hover:bg-[#1e1e1e] border border-[#262626] rounded-xl transition-colors flex items-center justify-center gap-3 text-white"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings size={20} />
            <span>Настройки аккаунта</span>
          </motion.button>
        </div>

        {/* Settings Modal - Simplified */}
        <AnimatePresence>
          {isSettingsOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                onClick={() => setIsSettingsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div
                  className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 bg-[#141414] border-b border-[#262626] p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Настройки</h2>
                    <button
                      onClick={() => setIsSettingsOpen(false)}
                      className="p-2 hover:bg-[#1e1e1e] rounded-lg transition-colors"
                    >
                      <X size={24} className="text-gray-400" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <p className="text-gray-400">Настройки временно недоступны.</p>
                    <div className="pt-4 border-t border-[#262626]">
                      <button
                        onClick={() => setIsSettingsOpen(false)}
                        className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors text-white font-semibold"
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {selectedCourse && (
        <CoursePreview course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}
    </div>
  );
}

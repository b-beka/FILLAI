'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Menu, ChevronLeft, ChevronRight, CheckCircle2, Circle, Search,
    BookOpen, Clock, TrendingUp, Edit3, Save, MessageSquare, ChevronDown,
    ChevronUp, Play, FileText, Lightbulb, Target, Image as ImageIcon
} from 'lucide-react';
import { Course } from '@/data/mockStore';
import { useUIStore } from '@/store/uiStore';
import MarkdownRenderer from './MarkdownRenderer';
import YouTubePlayer from './YouTubePlayer';
import JasperMentor from './JasperMentor';
import InteractiveExercise from './experience/InteractiveExercise';
import { coursesApi } from '@/services/apiClient';
import { adaptApiCourseToCourse } from '@/services/courseAdapter';
import CourseMap from './CourseMap';
import ModuleLayerRenderer from './ModuleLayerRenderer';
import ExperienceRenderer from './experience/ExperienceRenderer';
import CourseGraph from './CourseGraph';
import PresentationMode from './PresentationMode';

interface CoursePageProps {
    course?: Course;
}

export default function CoursePage({ course: courseProp }: CoursePageProps = {}) {
    const { selectedCourseId, setCurrentPage, setSelectedCourseId } = useUIStore();
    const [course, setCourse] = useState<Course | null>(courseProp || null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeModuleIdx, setActiveModuleIdx] = useState(0);
    const [activeLessonIdx, setActiveLessonIdx] = useState(0);
    const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]));
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [currentNote, setCurrentNote] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [jasperOpen, setJasperOpen] = useState(false);
    const [notesExpanded, setNotesExpanded] = useState(false);
    const [loading, setLoading] = useState(!courseProp);
    const [viewMode, setViewMode] = useState<'graph' | 'lesson'>('graph');

    // Load course data from API if not provided via props
    useEffect(() => {
        if (courseProp) {
            setCourse(courseProp);
            setLoading(false);
            return;
        }

        // Try to load from sessionStorage first
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('currentCourse');
            if (stored) {
                try {
                    const parsedCourse = JSON.parse(stored);
                    setCourse(parsedCourse);
                    setLoading(false);
                    sessionStorage.removeItem('currentCourse'); // Clean up
                    return;
                } catch (e) {
                    console.error('Error parsing stored course:', e);
                }
            }
        }

        if (selectedCourseId) {
            const loadCourse = async () => {
                try {
                    setLoading(true);
                    const apiCourse = await coursesApi.getById(selectedCourseId);
                    const adaptedCourse = adaptApiCourseToCourse(apiCourse);
                    setCourse(adaptedCourse);
                } catch (error) {
                    console.error('Error loading course:', error);
                    setCourse(null);
                } finally {
                    setLoading(false);
                }
            };
            loadCourse();
        }
    }, [selectedCourseId, courseProp]);

    // Load progress from localStorage
    useEffect(() => {
        if (!course) return;

        try {
            const progressKey = `course_progress_${course.id}`;
            const notesKey = `course_notes_${course.id}`;

            const savedProgress = localStorage.getItem(progressKey);
            if (savedProgress) {
                setCompletedLessons(new Set(JSON.parse(savedProgress)));
            }

            const savedNotes = localStorage.getItem(notesKey);
            if (savedNotes) {
                setNotes(JSON.parse(savedNotes));
            }
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    }, [course]);

    // Save progress to localStorage
    useEffect(() => {
        if (!course) return;

        try {
            const progressKey = `course_progress_${course.id}`;
            localStorage.setItem(progressKey, JSON.stringify(Array.from(completedLessons)));
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }, [completedLessons, course]);

    // Save notes to localStorage
    useEffect(() => {
        if (!course) return;

        try {
            const notesKey = `course_notes_${course.id}`;
            localStorage.setItem(notesKey, JSON.stringify(notes));
        } catch (error) {
            console.error('Error saving notes:', error);
        }
    }, [notes, course]);

    // Update current note when lesson changes
    useEffect(() => {
        const lessonId = `${activeModuleIdx}-${activeLessonIdx}`;
        setCurrentNote(notes[lessonId] || '');
    }, [activeModuleIdx, activeLessonIdx, notes]);

    // Calculate values (safe even if course is null, will just use empty arrays)
    const currentModule = course?.modules[activeModuleIdx];
    const currentLesson = currentModule?.lessons[activeLessonIdx];
    const currentLessonId = `${activeModuleIdx}-${activeLessonIdx}`;
    const isLessonCompleted = completedLessons.has(currentLessonId);

    // Calculate progress
    const totalLessons = course ? course.modules.reduce((sum, m) => sum + m.lessons.length, 0) : 0;
    const completedCount = completedLessons.size;
    const progressPercentage = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

    // Filter modules by search
    const filteredModules = useMemo(() => {
        if (!course) return [];
        if (!searchQuery.trim()) return course.modules;

        const query = searchQuery.toLowerCase();
        return course.modules
            .map(module => ({
                ...module,
                lessons: module.lessons.filter(lesson =>
                    lesson.title.toLowerCase().includes(query) ||
                    lesson.content.toLowerCase().includes(query)
                )
            }))
            .filter(module => module.lessons.length > 0);
    }, [course, searchQuery]);

    const toggleModule = (moduleIdx: number) => {
        setExpandedModules(prev => {
            const newSet = new Set(prev);
            if (newSet.has(moduleIdx)) {
                newSet.delete(moduleIdx);
            } else {
                newSet.add(moduleIdx);
            }
            return newSet;
        });
    };

    const goToLesson = (moduleIdx: number, lessonIdx: number) => {
        setActiveModuleIdx(moduleIdx);
        setActiveLessonIdx(lessonIdx);
        setExpandedModules(prev => new Set([...prev, moduleIdx]));
        setViewMode('lesson');
    };

    const toggleLessonComplete = () => {
        setCompletedLessons(prev => {
            const newSet = new Set(prev);
            if (newSet.has(currentLessonId)) {
                newSet.delete(currentLessonId);
            } else {
                newSet.add(currentLessonId);
            }
            return newSet;
        });
    };

    const saveNote = () => {
        setNotes(prev => ({ ...prev, [currentLessonId]: currentNote }));
    };

    const goToNext = () => {
        if (!currentModule || !course) return;

        if (activeLessonIdx < currentModule.lessons.length - 1) {
            setActiveLessonIdx(activeLessonIdx + 1);
        } else if (activeModuleIdx < course.modules.length - 1) {
            setActiveModuleIdx(activeModuleIdx + 1);
            setActiveLessonIdx(0);
        }
    };

    const goToPrev = () => {
        if (!course) return;

        if (activeLessonIdx > 0) {
            setActiveLessonIdx(activeLessonIdx - 1);
        } else if (activeModuleIdx > 0) {
            const prevModuleIdx = activeModuleIdx - 1;
            setActiveModuleIdx(prevModuleIdx);
            setActiveLessonIdx(course.modules[prevModuleIdx].lessons.length - 1);
        }
    };

    const hasNext = course && (activeModuleIdx < course.modules.length - 1 || (currentModule && activeLessonIdx < currentModule.lessons.length - 1));
    const hasPrev = activeModuleIdx > 0 || activeLessonIdx > 0;

    const handleClose = () => {
        setCurrentPage('library');
        setSelectedCourseId(null);
    };

    // NOW check loading/course state AFTER all hooks
    if (loading) {
        return (
            <div className="w-full h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                    <p className="text-gray-400">Загрузка курса...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="w-full h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">Курс не найден</p>
                    <button
                        onClick={() => setCurrentPage('library')}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                    >
                        Вернуться в библиотеку
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-[#141414] border-b border-[#262626] px-6 py-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-[#1f1f1f] rounded-lg transition-colors"
                        title={sidebarOpen ? "Скрыть меню" : "Показать меню"}
                    >
                        <Menu size={20} className="text-gray-400" />
                    </button>
                    {viewMode === 'lesson' && (
                        <button
                            onClick={() => setViewMode('graph')}
                            className="flex items-center gap-2 px-3 py-2 bg-[#1f1f1f] hover:bg-[#252525] rounded-lg text-sm text-gray-300 transition-colors"
                        >
                            <Target size={16} />
                            <span className="hidden sm:inline">Карта курса</span>
                        </button>
                    )}
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-100 truncate">{course.title}</h1>
                        <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <TrendingUp size={14} />
                                <span>Прогресс: {Math.round(progressPercentage)}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <CheckCircle2 size={14} />
                                <span>{completedCount}/{totalLessons} уроков</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-48 hidden md:block mr-4">
                    <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>

                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-[#1f1f1f] rounded-lg transition-colors"
                >
                    <X size={24} className="text-gray-400" />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-[#141414] border-r border-[#262626] overflow-y-auto flex-shrink-0"
                        >
                            <div className="p-4 space-y-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Поиск по курсу..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-[#1f1f1f] border border-[#262626] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>

                                {/* Progress Stats */}
                                <div className="bg-[#1f1f1f] rounded-lg p-4 space-y-3">
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Статистика</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Прогресс</span>
                                            <span className="text-gray-100 font-bold">{Math.round(progressPercentage)}%</span>
                                        </div>
                                        <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-green-600"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressPercentage}%` }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Завершено</span>
                                            <span className="text-gray-100 font-bold">{completedCount}/{totalLessons}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Modules List or Course Map */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">{course?.passport ? 'Карта курса' : 'Содержание'}</h3>

                                    {course?.passport ? (
                                        <CourseMap
                                            modules={course.modules}
                                            currentModuleIndex={activeModuleIdx}
                                            onModuleSelect={(idx) => {
                                                setActiveModuleIdx(idx);
                                                setActiveLessonIdx(0);
                                                setExpandedModules(prev => new Set([...prev, idx]));
                                            }}
                                        />
                                    ) : (
                                        <div className="space-y-1">
                                            {filteredModules.map((module, moduleIdx) => {
                                                const isExpanded = expandedModules.has(moduleIdx);
                                                const moduleLessons = module.lessons;
                                                const completedInModule = moduleLessons.filter((_, lessonIdx) =>
                                                    completedLessons.has(`${moduleIdx}-${lessonIdx}`)
                                                ).length;

                                                return (
                                                    <div key={module.id} className="bg-[#1f1f1f] rounded-lg overflow-hidden">
                                                        <button
                                                            onClick={() => toggleModule(moduleIdx)}
                                                            className="w-full p-3 flex items-center justify-between hover:bg-[#252525] transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3 flex-1 text-left">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${moduleIdx === activeModuleIdx
                                                                    ? 'bg-emerald-500 text-white'
                                                                    : 'bg-[#0a0a0a] text-gray-400'
                                                                    }`}>
                                                                    {moduleIdx + 1}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-semibold text-gray-100 truncate">
                                                                        {module.title}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {completedInModule}/{moduleLessons.length} уроков
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isExpanded ? (
                                                                <ChevronUp size={16} className="text-gray-400" />
                                                            ) : (
                                                                <ChevronDown size={16} className="text-gray-400" />
                                                            )}
                                                        </button>

                                                        {isExpanded && (
                                                            <div className="border-t border-[#262626]">
                                                                {moduleLessons.map((lesson, lessonIdx) => {
                                                                    const lessonId = `${moduleIdx}-${lessonIdx}`;
                                                                    const isActive = activeModuleIdx === moduleIdx && activeLessonIdx === lessonIdx;
                                                                    const isCompleted = completedLessons.has(lessonId);

                                                                    return (
                                                                        <button
                                                                            key={lesson.id}
                                                                            onClick={() => goToLesson(moduleIdx, lessonIdx)}
                                                                            className={`w-full p-3 pl-12 flex items-center justify-between hover:bg-[#252525] transition-colors border-l-2 ${isActive
                                                                                ? 'bg-[#252525] border-emerald-500'
                                                                                : 'border-transparent'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-center gap-3 flex-1 text-left">
                                                                                {isCompleted ? (
                                                                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                                                                ) : (
                                                                                    <Circle size={16} className="text-gray-600" />
                                                                                )}
                                                                                <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-gray-300'}`}>
                                                                                    {lesson.title}
                                                                                </span>
                                                                            </div>
                                                                            {lesson.duration_minutes && (
                                                                                <span className="text-xs text-gray-500">{lesson.duration_minutes} мин</span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <div className={`flex-1 flex overflow-hidden ${jasperOpen ? 'mr-[400px]' : ''} relative`}>

                    {/* Graph View */}
                    {viewMode === 'graph' && course && (
                        <div className="absolute inset-0 z-10">
                            <CourseGraph
                                course={course as any}
                                completedLessons={completedLessons}
                                onLessonSelect={(modId, lessonId) => {
                                    // Find indices
                                    const modIdx = course.modules.findIndex(m => m.id === modId);
                                    // If modId is constructed like 'mod-0', parse it
                                    const parsedModIdx = modId.startsWith('mod-') ? parseInt(modId.split('-')[1]) : modIdx;

                                    const targetMod = course.modules[parsedModIdx];
                                    if (targetMod) {
                                        const lessonIdx = targetMod.lessons.findIndex(l => l.id === lessonId);
                                        const parsedLessonIdx = lessonId.startsWith('lesson-') ? parseInt(lessonId.split('-')[2]) : lessonIdx;

                                        if (parsedModIdx >= 0 && parsedLessonIdx >= 0) {
                                            goToLesson(parsedModIdx, parsedLessonIdx);
                                        }
                                    }
                                }}
                            />
                        </div>
                    )}

                    <div className={`flex-1 overflow-y-auto ${viewMode === 'graph' ? 'hidden' : ''}`}>
                        <div className="max-w-4xl mx-auto px-6 py-8">
                            {course?.passport && currentModule?.layers ? (
                                <div className="space-y-12 pb-20">
                                    <div className="mb-12">
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
                                                    Модуль {activeModuleIdx + 1} из {course.modules.length}
                                                </span>
                                            </div>
                                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">{currentModule.title}</h1>
                                            <p className="text-xl text-gray-400 leading-relaxed">{currentModule.description}</p>
                                        </motion.div>
                                    </div>

                                    <div className="space-y-16">
                                        {currentModule.layers.map((layer, idx) => (
                                            <ModuleLayerRenderer key={idx} layer={layer} />
                                        ))}
                                    </div>

                                    <div className="flex justify-between pt-12 border-t border-[#262626]">
                                        <button
                                            onClick={goToPrev}
                                            disabled={!hasPrev}
                                            className={`px-6 py-3 rounded-lg font-medium border border-[#262626] transition-colors flex items-center gap-2 ${!hasPrev ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1a1a1a] text-white'}`}
                                        >
                                            <ChevronLeft size={20} />
                                            <span>Предыдущий модуль</span>
                                        </button>
                                        <button
                                            onClick={goToNext}
                                            disabled={!hasNext}
                                            className={`px-8 py-3 rounded-lg font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-2 ${!hasNext ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span>Следующий модуль</span>
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                currentLesson ? (
                                    <>
                                        {/* Lesson Header */}
                                        <div className="mb-8">
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                                <span>{currentModule.title}</span>
                                                <ChevronRight size={16} />
                                                <span className="text-emerald-400">Урок {activeLessonIdx + 1}</span>
                                            </div>
                                            <h2 className="text-4xl font-bold text-white mb-4">{currentLesson.title}</h2>
                                            <div className="flex items-center gap-4">
                                                {currentLesson.duration_minutes && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                                        <Clock size={16} />
                                                        <span>{currentLesson.duration_minutes} минут</span>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={toggleLessonComplete}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isLessonCompleted
                                                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                                                        : 'bg-[#1f1f1f] border border-[#262626] text-gray-400 hover:border-emerald-500/30'
                                                        }`}
                                                >
                                                    {isLessonCompleted ? (
                                                        <>
                                                            <CheckCircle2 size={16} />
                                                            <span>Завершено</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Circle size={16} />
                                                            <span>Отметить как завершенное</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Embedded Presentation Mode REMOVED */}
                                        {/* We are switching to Rich Markdown View via ExperienceRenderer */}

                                        {/* Videos (Top) */}
                                        {currentLesson.videos && currentLesson.videos.length > 0 && (
                                            <div className="mb-8">
                                                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                                    <Play size={24} className="text-emerald-400" />
                                                    Видеоматериалы
                                                </h3>
                                                <div className="space-y-4">
                                                    {currentLesson.videos.map((video, idx) => (
                                                        <YouTubePlayer key={idx} video={video} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Images */}
                                        {currentLesson.images && currentLesson.images.length > 0 && (
                                            <div className="mb-8">
                                                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                                    <ImageIcon size={24} className="text-emerald-400" />
                                                    Иллюстрации
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {currentLesson.images.map((img, idx) => (
                                                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-[#262626] group">
                                                            <img
                                                                src={img}
                                                                alt={`Illustration ${idx + 1}`}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Lesson Content */}
                                        <div className="mb-8 w-full">
                                            <ExperienceRenderer
                                                lesson={currentLesson}
                                                onComplete={() => {
                                                    if (!isLessonCompleted) toggleLessonComplete();
                                                }}
                                            />
                                        </div>

                                        {/* Practice Exercises */}
                                        {currentLesson.practice_exercises && currentLesson.practice_exercises.length > 0 && (
                                            <div className="mb-8">
                                                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                                    <Target size={24} className="text-emerald-400" />
                                                    Практические задания
                                                </h3>
                                                <div className="space-y-8">
                                                    {currentLesson.practice_exercises.map((exercise, idx) => (
                                                        <InteractiveExercise
                                                            key={idx}
                                                            exercise={exercise as any}
                                                            courseTitle={course.title}
                                                            lessonTitle={currentLesson.title}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Additional Materials */}
                                        {currentLesson.additional_materials && currentLesson.additional_materials.length > 0 && (
                                            <div className="mb-8">
                                                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                                    <FileText size={24} className="text-emerald-400" />
                                                    Дополнительные материалы
                                                </h3>
                                                <div className="space-y-2">
                                                    {currentLesson.additional_materials.map((material, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={material.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block p-4 bg-[#141414] border border-[#262626] hover:border-emerald-500/30 rounded-lg transition-colors"
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <h4 className="text-white font-medium mb-1">{material.title}</h4>
                                                                    {material.description && (
                                                                        <p className="text-sm text-gray-400">{material.description}</p>
                                                                    )}
                                                                </div>
                                                                <span className="px-2 py-1 bg-[#1f1f1f] rounded text-xs text-gray-400">
                                                                    {material.type}
                                                                </span>
                                                            </div>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Notes Section */}
                                        <div className="mb-8">
                                            <button
                                                onClick={() => setNotesExpanded(!notesExpanded)}
                                                className="w-full flex items-center justify-between p-4 bg-[#141414] border border-[#262626] rounded-lg hover:bg-[#1a1a1a] transition-colors"
                                            >
                                                <div className="flex items-center gap-2 text-white font-semibold">
                                                    <Edit3 size={20} className="text-emerald-400" />
                                                    <span>Заметки к уроку</span>
                                                </div>
                                                {notesExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </button>

                                            {notesExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-2 p-4 bg-[#141414] border border-[#262626] rounded-lg"
                                                >
                                                    <textarea
                                                        value={currentNote}
                                                        onChange={(e) => setCurrentNote(e.target.value)}
                                                        onBlur={saveNote}
                                                        placeholder="Запишите свои мысли и заметки об этом уроке..."
                                                        className="w-full h-32 bg-[#1f1f1f] border border-[#262626] rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                                                    />
                                                    <div className="flex items-center justify-between mt-2">
                                                        <p className="text-xs text-gray-500">Заметки сохраняются автоматически</p>
                                                        <button
                                                            onClick={saveNote}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded text-sm text-emerald-400 transition-colors"
                                                        >
                                                            <Save size={14} />
                                                            <span>Сохранить</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>

                                        {/* Navigation Buttons */}
                                        <div className="flex items-center justify-between pt-8 border-t border-[#262626]">
                                            <button
                                                onClick={goToPrev}
                                                disabled={!hasPrev}
                                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${hasPrev
                                                    ? 'bg-[#1f1f1f] border border-[#262626] text-white hover:bg-[#252525]'
                                                    : 'bg-[#1a1a1a] border border-[#1f1f1f] text-gray-600 cursor-not-allowed'
                                                    }`}
                                            >
                                                <ChevronLeft size={20} />
                                                <span>Предыдущий урок</span>
                                            </button>

                                            <button
                                                onClick={goToNext}
                                                disabled={!hasNext}
                                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${hasNext
                                                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
                                                    : 'bg-[#1a1a1a] border border-[#1f1f1f] text-gray-600 cursor-not-allowed'
                                                    }`}
                                            >
                                                <span>Следующий урок</span>
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-16">
                                        <p className="text-gray-400">Урок не найден</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* Jasper AI Panel */}
                <AnimatePresence>
                    {jasperOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 400, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed right-0 top-0 h-full bg-[#141414] border-l border-[#262626] overflow-hidden z-30"
                        >
                            <JasperMentor
                                course={course}
                                currentLesson={currentLesson || null}
                                currentModuleTitle={currentModule?.title || ''}
                                isOpen={jasperOpen}
                                onToggle={() => setJasperOpen(!jasperOpen)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Jasper Toggle Button */}
                <button
                    onClick={() => setJasperOpen(!jasperOpen)}
                    className={`fixed right-6 bottom-6 p-4 rounded-full shadow-2xl transition-all z-40 ${jasperOpen
                        ? 'bg-[#1f1f1f] border border-[#262626] text-gray-400'
                        : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-emerald-500/50'
                        }`}
                >
                    <MessageSquare size={24} />
                </button>
            </div>
        </div>
    );
}

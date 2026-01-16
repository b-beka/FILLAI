'use client';

import { motion } from 'framer-motion';
import { Star, Clock, Users, BookOpen, Target, Play, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Course } from '@/data/mockStore';
import CoursePassport from './CoursePassport';

interface CourseIntroProps {
    course: Course;
    onStart: () => void;
    onClose: () => void;
}

export default function CourseIntro({ course, onStart, onClose }: CourseIntroProps) {
    // Mock reviews data - в будущем получать из API
    const reviews = [
        {
            id: 1,
            author: 'Анна Петрова',
            avatar: '👩‍🎓',
            rating: 5,
            text: 'Отличный курс! Всё очень понятно объяснено, особенно понравились практические задания.',
            date: '2 недели назад'
        },
        {
            id: 2,
            author: 'Дмитрий Смирнов',
            avatar: '👨‍💼',
            rating: 5,
            text: 'Прошёл курс за неделю. Материал структурирован идеально, ИИ-ментор очень помогает.',
            date: '1 месяц назад'
        },
        {
            id: 3,
            author: 'Елена Козлова',
            avatar: '👩‍💻',
            rating: 4,
            text: 'Хороший курс для начинающих. Рекомендую!',
            date: '3 недели назад'
        }
    ];

    const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
    const totalStudents = Math.floor(Math.random() * 1000) + 200;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Hero Section */}
            <section className="relative pt-24 pb-16 px-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_70%)]" />

                <div className="relative z-10 max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Category badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-6">
                            <Target size={16} className="text-emerald-400" />
                            <span className="text-sm text-emerald-300 font-semibold">{course.category || 'Общее'}</span>
                        </div>

                        {/* Course title */}
                        <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
                            {course.title}
                        </h1>

                        {/* Course description or Passport */}
                        {course.passport ? (
                            <div className="mb-12 max-w-4xl">
                                <CoursePassport passport={course.passport} />
                            </div>
                        ) : (
                            <p className="text-xl text-gray-300 mb-8 max-w-3xl">
                                {course.description || 'Комплексный курс для изучения темы с нуля до продвинутого уровня'}
                            </p>
                        )}

                        {/* Stats row */}
                        <div className="flex flex-wrap items-center gap-6 mb-8">
                            <div className="flex items-center gap-2">
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            size={20}
                                            className={i < Math.floor(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                                        />
                                    ))}
                                </div>
                                <span className="text-gray-300 font-semibold">{avgRating.toFixed(1)}</span>
                                <span className="text-gray-500">({reviews.length} отзывов)</span>
                            </div>

                            <div className="flex items-center gap-2 text-gray-300">
                                <Users size={20} className="text-emerald-400" />
                                <span>{totalStudents} студентов</span>
                            </div>

                            <div className="flex items-center gap-2 text-gray-300">
                                <Clock size={20} className="text-emerald-400" />
                                <span>{course.duration}</span>
                            </div>

                            <div className="flex items-center gap-2 text-gray-300">
                                <BookOpen size={20} className="text-emerald-400" />
                                <span>{course.modules.length} модулей</span>
                            </div>
                        </div>

                        {/* CTA button */}
                        <div className="flex items-center gap-4">
                            <motion.button
                                onClick={onStart}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold text-lg flex items-center gap-2 shadow-xl shadow-emerald-900/50"
                            >
                                <Play size={20} />
                                <span>Начать курс</span>
                                <ArrowRight size={20} />
                            </motion.button>

                            <button
                                onClick={onClose}
                                className="px-6 py-4 bg-[#141414] border border-[#262626] hover:bg-[#1a1a1a] rounded-xl font-semibold transition-all"
                            >
                                Вернуться назад
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Author Section */}
            <section className="py-16 px-6 bg-[#0a0a0a]">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex flex-col md:flex-row items-start gap-8 p-8 bg-[#141414] border border-[#262626] rounded-2xl"
                    >
                        {/* Author avatar */}
                        <div className="flex-shrink-0">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-4xl font-bold shadow-xl shadow-emerald-900/30">
                                {course.createdBy === 'Fill AI' ? '🤖' : (course.createdBy?.[0] || '?')}
                            </div>
                        </div>

                        {/* Author info */}
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold mb-2">Об авторе</h3>
                            <p className="text-xl text-emerald-400 font-semibold mb-4">{course.createdBy}</p>
                            <p className="text-gray-300 leading-relaxed mb-4">
                                {course.createdBy === 'Fill AI'
                                    ? 'Fill AI - это платформа с искусственным интеллектом, которая создает персонализированные курсы на основе ваших потребностей и целей обучения.'
                                    : 'Опытный преподаватель с многолетним стажем, создающий качественные образовательные материалы.'}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <CheckCircle2 size={16} className="text-emerald-400" />
                                <span>Верифицированный автор</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* What you'll learn */}
            <section className="py-16 px-6 bg-[#0a0a0a]">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl font-bold mb-8">Что вы изучите</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {course.modules.slice(0, 6).map((module, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex items-start gap-3 p-4 bg-[#141414] border border-[#262626] rounded-xl hover:border-emerald-500/30 transition-all"
                                >
                                    <CheckCircle2 size={20} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-300">{module.title}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Reviews Section */}
            <section className="py-16 px-6 bg-[#0a0a0a]">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl font-bold mb-8">Отзывы студентов</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {reviews.map((review, idx) => (
                                <motion.div
                                    key={review.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="p-6 bg-[#141414] border border-[#262626] rounded-xl"
                                >
                                    {/* Rating */}
                                    <div className="flex items-center gap-1 mb-4">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={16}
                                                className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                                            />
                                        ))}
                                    </div>

                                    {/* Review text */}
                                    <p className="text-gray-300 mb-4 leading-relaxed">
                                        "{review.text}"
                                    </p>

                                    {/* Author */}
                                    <div className="flex items-center gap-3 pt-4 border-t border-[#262626]">
                                        <div className="text-3xl">{review.avatar}</div>
                                        <div>
                                            <div className="font-semibold text-white">{review.author}</div>
                                            <div className="text-sm text-gray-500">{review.date}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-16 px-6 bg-gradient-to-br from-emerald-500/10 to-green-500/10">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl font-bold mb-6">
                            Готовы начать обучение?
                        </h2>
                        <p className="text-xl text-gray-300 mb-8">
                            Присоединяйтесь к {totalStudents}+ студентам уже изучающим этот курс
                        </p>
                        <motion.button
                            onClick={onStart}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold text-xl flex items-center gap-3 mx-auto shadow-2xl shadow-emerald-900/50"
                        >
                            <Play size={24} />
                            <span>Начать курс бесплатно</span>
                            <ArrowRight size={24} />
                        </motion.button>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}

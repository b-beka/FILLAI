'use client';

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { usersApi, coursesApi, ApiCourse, ApiUser } from '@/services/apiClient';
import { adaptApiCourseToCourse } from '@/services/courseAdapter';
import { Course } from '@/data/mockStore';
import { motion } from 'framer-motion';
import {
    User, MapPin, Calendar, Link as LinkIcon, Mail,
    BookOpen, Star, Award, Zap, MessageCircle, Share2,
    MoreVertical, Check, Plus
} from 'lucide-react';
import CoursePreview from '@/components/CoursePreview';

// Helper for 'stat' cards
function StatCard({ icon: Icon, value, label, color }: any) {
    return (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center text-${color}-500`}>
                <Icon size={24} />
            </div>
            <div>
                <div className="text-2xl font-black text-white leading-none mb-1">{value}</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</div>
            </div>
        </div>
    );
}

export default function PublicProfilePage() {
    const router = useRouter();
    const { userId } = router.query;

    const [user, setUser] = useState<ApiUser | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const loadData = async () => {
            try {
                setLoading(true);
                // Load User
                const userData = await usersApi.getById(userId as string);
                setUser(userData);

                // Load User's Created Courses (Assuming public courses)
                const allCourses = await coursesApi.list();
                const userCourses = allCourses.filter(c => c.created_by === userId);
                setCourses(userCourses.map(adaptApiCourseToCourse));

            } catch (err) {
                console.error(err);
                setError('Пользователь не найден');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userId]);

    if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500">Загрузка...</div>;
    if (error || !user) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-red-500">{error || 'Профиль не найден'}</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white overflow-auto pb-20">
            {/* Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_70%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(14,165,233,0.1),transparent_70%)]"></div>
            </div>

            {/* Cover Image */}
            <div className="h-64 relative bg-gradient-to-r from-emerald-900 to-sky-900 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
            </div>

            <div className="max-w-6xl mx-auto px-6 -mt-32 relative z-10">
                <div className="flex flex-col md:flex-row items-end gap-8 mb-8">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-40 h-40 rounded-3xl bg-[#141414] border-4 border-[#0a0a0a] p-1 shadow-2xl">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-sky-500 rounded-2xl flex items-center justify-center text-5xl font-black text-white">
                                    {user.username[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-[#0a0a0a] p-1.5 rounded-xl border border-[#262626]">
                            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white">
                                <Check size={16} strokeWidth={4} />
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl font-black text-white mb-2">{user.full_name || user.username}</h1>
                                <p className="text-gray-400 text-lg flex items-center gap-2">
                                    <span className="text-emerald-400">@{user.username}</span>
                                    <span>•</span>
                                    <span className="capitalize">{user.role === 'teacher' ? 'Преподаватель' : 'Студент'}</span>
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsFollowing(!isFollowing)}
                                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isFollowing ? 'bg-[#262626] text-white' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                                >
                                    {isFollowing ? <Check size={20} /> : <Plus size={20} />}
                                    {isFollowing ? 'Вы подписаны' : 'Подписаться'}
                                </button>
                                <button className="px-4 py-3 bg-[#262626] hover:bg-[#333] text-white rounded-xl">
                                    <MessageCircle size={20} />
                                </button>
                                <button className="px-4 py-3 bg-[#262626] hover:bg-[#333] text-white rounded-xl">
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Stats & Bio */}
                    <div className="space-y-6">
                        <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">О себе</h3>
                            <p className="text-gray-400 leading-relaxed mb-6">
                                {user.bio || 'Пользователь не указал информацию о себе.'}
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-gray-400">
                                    <MapPin size={18} className="text-emerald-500" />
                                    <span>Москва, Россия</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <LinkIcon size={18} className="text-emerald-500" />
                                    <a href="#" className="hover:text-emerald-400">website.com</a>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <Calendar size={18} className="text-emerald-500" />
                                    <span>На платформе с 2024</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <StatCard icon={BookOpen} value={courses.length} label="Курсов" color="emerald" />
                            <StatCard icon={Star} value="4.9" label="Рейтинг" color="yellow" />
                            <StatCard icon={Award} value="12" label="Наград" color="purple" />
                            <StatCard icon={Zap} value="2.4k" label="XP" color="sky" />
                        </div>
                    </div>

                    {/* Right Column: Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                <BookOpen className="text-emerald-500" />
                                Созданные курсы
                            </h3>

                            {courses.length === 0 ? (
                                <div className="bg-[#141414] border border-dashed border-[#262626] rounded-3xl p-10 text-center">
                                    <p className="text-gray-500 text-lg">У пользователя нет публичных курсов</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {courses.map(course => (
                                        <motion.div
                                            key={course.id}
                                            whileHover={{ y: -4 }}
                                            onClick={() => setSelectedCourse(course)}
                                            className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all group"
                                        >
                                            <div className="h-32 bg-[#1a1a1a] relative">
                                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-black/50"></div>
                                                <div className="absolute bottom-4 left-4 right-4">
                                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-900/50 px-2 py-1 rounded-lg border border-emerald-500/20">
                                                        {course.level}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-5">
                                                <h4 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-emerald-400 transition-colors">
                                                    {course.title}
                                                </h4>
                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <span>{course.duration}</span>
                                                    <div className="flex items-center gap-1">
                                                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                                        <span>4.9</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {selectedCourse && (
                <CoursePreview course={selectedCourse} onClose={() => setSelectedCourse(null)} />
            )}
        </div>
    );
}

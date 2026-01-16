'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, TrendingUp, AlertCircle, CheckCircle,
    X, Search, Filter, Sparkles
} from 'lucide-react';
import { useState } from 'react';

// Mock Data for "Student Tracking"
const MOCK_STUDENTS = [
    { id: 1, name: 'Анна К.', progress: 92, status: 'excellent', lastActive: '2m ago', avatar: null },
    { id: 2, name: 'Михаил Д.', progress: 78, status: 'good', lastActive: '1h ago', avatar: null },
    { id: 3, name: 'Елена В.', progress: 45, status: 'at_risk', lastActive: '3d ago', avatar: null },
    { id: 4, name: 'Дмитрий С.', progress: 88, status: 'excellent', lastActive: '5m ago', avatar: null },
    { id: 5, name: 'Ольга П.', progress: 30, status: 'critical', lastActive: '1w ago', avatar: null },
];

interface StudentTrackingDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerateReport: () => void;
    toggleHeatmap: () => void;
    heatmapActive: boolean;
}

export default function StudentTrackingDashboard({
    isOpen, onClose, onGenerateReport, toggleHeatmap, heatmapActive
}: StudentTrackingDashboardProps) {
    const [filter, setFilter] = useState<'all' | 'at_risk'>('all');
    const [generating, setGenerating] = useState(false);
    const [report, setReport] = useState<string | null>(null);

    const filteredStudents = filter === 'all'
        ? MOCK_STUDENTS
        : MOCK_STUDENTS.filter(s => s.status === 'at_risk' || s.status === 'critical');

    const handleGenerate = () => {
        setGenerating(true);
        // Mock AI delay
        setTimeout(() => {
            setGenerating(false);
            setReport("Джаспер проанализировал данные: 2 студента (Елена В. и Ольга П.) находятся в зоне риска. Рекомендуется назначить им дополнительные материалы по модулю 'React Hooks' и отправить напоминание о дедлайне.");
        }, 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0.5 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-[450px] bg-[#141414] border-l border-[#262626] z-50 overflow-hidden flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-[#262626] bg-[#0a0a0a]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Трекинг Учеников</h2>
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Группа А-24 • 24 Студента</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-[#262626] rounded-full text-gray-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#262626]">
                                    <div className="text-2xl font-black text-white">88%</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">Ср. прогресс</div>
                                </div>
                                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#262626]">
                                    <div className="text-2xl font-black text-emerald-500">18</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">Активны</div>
                                </div>
                                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#262626]">
                                    <div className="text-2xl font-black text-red-500">2</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">В риске</div>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="p-4 border-b border-[#262626] flex gap-3">
                            <button
                                onClick={toggleHeatmap}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all border ${heatmapActive
                                        ? 'bg-emerald-600 border-emerald-500 text-white'
                                        : 'bg-[#1a1a1a] border-[#262626] text-gray-400 hover:text-white'
                                    }`}
                            >
                                {heatmapActive ? 'Heatmap: ON' : 'Show Heatmap'}
                            </button>
                            <div className="flex bg-[#1a1a1a] rounded-lg border border-[#262626] p-1">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filter === 'all' ? 'bg-[#262626] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Все
                                </button>
                                <button
                                    onClick={() => setFilter('at_risk')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filter === 'at_risk' ? 'bg-red-500/20 text-red-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    В риске
                                </button>
                            </div>
                        </div>

                        {/* Student List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {filteredStudents.map(student => (
                                <div key={student.id} className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#262626] rounded-xl group hover:border-emerald-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${student.status === 'excellent' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                                                student.status === 'good' ? 'border-sky-500 bg-sky-500/10 text-sky-400' :
                                                    student.status === 'at_risk' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' :
                                                        'border-red-500 bg-red-500/10 text-red-500'
                                            }`}>
                                            {student.name[0]}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-sm">{student.name}</div>
                                            <div className="text-xs text-gray-500">Last active: {student.lastActive}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white font-bold text-sm">{student.progress}%</div>
                                        <div className={`w-16 h-1 rounded-full mt-1 ${student.progress > 80 ? 'bg-emerald-500' :
                                                student.progress > 50 ? 'bg-sky-500' : 'bg-red-500'
                                            }`} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Jasper Report Section */}
                        <div className="p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 to-[#0a0a0a] border-t border-[#262626]">
                            {!report ? (
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50"
                                >
                                    {generating ? (
                                        <>
                                            <Sparkles className="animate-spin" size={18} />
                                            Creating Report...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            Create Jasper Report
                                        </>
                                    )}
                                </button>
                            ) : (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-sm">
                                        <Sparkles size={14} />
                                        Jasper Insights
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed mb-3">
                                        {report}
                                    </p>
                                    <button onClick={() => setReport(null)} className="text-xs text-gray-500 hover:text-white underline">
                                        Сбросить
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

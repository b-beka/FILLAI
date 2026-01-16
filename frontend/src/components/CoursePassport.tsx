
import { motion } from 'framer-motion';
import { Shield, Brain, AlertTriangle, Target, Gauge, CheckCircle } from 'lucide-react';
import { CoursePassport as PassportType } from '@/services/api';

interface CoursePassportProps {
    passport: PassportType;
    className?: string;
}

export default function CoursePassport({ passport, className = '' }: CoursePassportProps) {
    if (!passport) return null;

    const riskColor = {
        low: 'text-emerald-400',
        medium: 'text-yellow-400',
        high: 'text-red-400'
    };

    const riskLabel = {
        low: 'Низкий',
        medium: 'Средний',
        high: 'Высокий'
    };

    return (
        <div className={`bg-[#0a0a0a] border border-[#262626] rounded-2xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-[#141414] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="text-emerald-500" size={24} />
                    <h3 className="font-bold text-white text-lg tracking-wide uppercase">Паспорт курса Fill AI</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-[#1a1a1a] px-3 py-1 rounded-full border border-[#262626]">
                    <CheckCircle size={12} className="text-emerald-500" />
                    <span>VERIFIED</span>
                </div>
            </div>

            {/* Grid Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 text-gray-400 mb-2 font-medium">
                            <Target size={18} />
                            <span>КОНЕЧНЫЙ РЕЗУЛЬТАТ</span>
                        </div>
                        <p className="text-xl text-white font-medium leading-relaxed">
                            {passport.target_result}
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 text-gray-400 mb-2 font-medium">
                            <AlertTriangle size={18} />
                            <span>ОГРАНИЧЕНИЯ (ЧЕМУ НЕ УЧИТ)</span>
                        </div>
                        <p className="text-gray-300 leading-relaxed border-l-2 border-yellow-500/30 pl-4">
                            {passport.limitations}
                        </p>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 text-gray-400 mb-2 font-medium">
                            <Brain size={18} />
                            <span>УРОВЕНЬ МЫШЛЕНИЯ</span>
                        </div>
                        <div className="bg-[#141414] border border-[#262626] rounded-xl p-3 inline-block">
                            <span className="text-emerald-400 font-semibold">{passport.thinking_level}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 mb-2 text-sm">
                                <Gauge size={16} />
                                <span>ГЛУБИНА</span>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-white">{passport.depth_score}</span>
                                <span className="text-gray-500 mb-1">/ 10</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#262626] rounded-full mt-2 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${passport.depth_score * 10}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-emerald-500 rounded-full"
                                />
                            </div>
                        </div>

                        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 mb-2 text-sm">
                                <AlertTriangle size={16} />
                                <span>РИСК ГАЛЛЮЦИНАЦИЙ</span>
                            </div>
                            <div className={`text-2xl font-bold ${riskColor[passport.hallucination_risk] || 'text-white'}`}>
                                {riskLabel[passport.hallucination_risk] || passport.hallucination_risk}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Оценка достоверности</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-[#141414] px-6 py-3 border-t border-[#262626] flex items-center justify-center gap-2">
                <span className="text-sm text-gray-400">👉 ИИ берёт ответственность за структуру этого курса.</span>
            </div>
        </div>
    );
}

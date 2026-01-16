import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/services/api';

interface InteractiveExerciseProps {
    exercise: {
        title: string;
        description: string;
        difficulty: string;
        estimated_time?: string;
        solution_hint?: string;
    };
    courseTitle: string;
    lessonTitle: string;
}

interface GradeResult {
    score: number;
    verdict: string;
    strengths: string[];
    improvements: string[];
    ai_feedback: string;
}

export default function InteractiveExercise({ exercise, courseTitle, lessonTitle }: InteractiveExerciseProps) {
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GradeResult | null>(null);
    const [showHint, setShowHint] = useState(false);

    const handleCheck = async () => {
        if (!answer.trim()) return;

        setLoading(true);
        try {
            const response = await api.post('/api/ai/grade-exercise', {
                course_title: courseTitle,
                lesson_title: lessonTitle,
                exercise_title: exercise.title,
                exercise_description: exercise.description,
                user_answer: answer
            });

            // Backend returns GradeResponse directly
            setResult(response as unknown as GradeResult);
        } catch (error) {
            console.error("Failed to grade exercise:", error);
            // Fallback mock result if API fails (or for demo)
            setResult({
                score: 0,
                verdict: "Ошибка сети",
                strengths: [],
                improvements: [],
                ai_feedback: "Не удалось соединиться с сервером проверки. Попробуйте позже."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-lg">
            {/* Header */}
            <div className="p-6 border-b border-[#262626] bg-gradient-to-r from-[#1a1a1a] to-[#141414]">
                <div className="flex items-start justify-between mb-2">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-400" />
                        {exercise.title}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${exercise.difficulty === 'easy' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                        exercise.difficulty === 'hard' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                        {exercise.difficulty || 'Intermediate'}
                    </span>
                </div>
                <p className="text-gray-300 leading-relaxed">{exercise.description}</p>
                {exercise.estimated_time && (
                    <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                        ⏱️ {exercise.estimated_time}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-6 bg-[#0a0a0a]">
                {!result ? (
                    <div className="space-y-4">
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Введите ваш ответ или код здесь..."
                            className="w-full h-40 bg-[#1f1f1f] border border-[#333] rounded-lg p-4 text-gray-200 focus:outline-none focus:border-emerald-500/50 resize-y font-mono text-sm"
                        />

                        <div className="flex items-center justify-between">
                            {exercise.solution_hint && (
                                <button
                                    onClick={() => setShowHint(!showHint)}
                                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                                >
                                    {showHint ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    {showHint ? 'Скрыть подсказку' : 'Показать подсказку'}
                                </button>
                            )}

                            <button
                                onClick={handleCheck}
                                disabled={loading || !answer.trim()}
                                className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${loading || !answer.trim()
                                    ? 'bg-[#1f1f1f] text-gray-500 cursor-not-allowed'
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Проверка...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Проверить ответ
                                    </>
                                )}
                            </button>
                        </div>

                        <AnimatePresence>
                            {showHint && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <p className="text-sm text-blue-300 font-medium mb-1">💡 Подсказка:</p>
                                        <p className="text-sm text-gray-400">{exercise.solution_hint}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        {/* Score Header */}
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4 ${result.score >= 80 ? 'border-green-500 text-green-500 bg-green-500/10' :
                                result.score >= 50 ? 'border-amber-500 text-amber-500 bg-amber-500/10' :
                                    'border-red-500 text-red-500 bg-red-500/10'
                                }`}>
                                {result.score}%
                            </div>
                            <div>
                                <h3 className={`text-xl font-bold ${result.score >= 80 ? 'text-green-400' :
                                    result.score >= 50 ? 'text-amber-400' :
                                        'text-red-400'
                                    }`}>
                                    {result.verdict}
                                </h3>
                                <p className="text-gray-500 text-sm">Проверено ИИ-наставником</p>
                            </div>
                        </div>

                        {/* Feedback Body */}
                        <div className="bg-[#1f1f1f] rounded-lg p-5 border border-[#262626]">
                            <p className="text-gray-200 whitespace-pre-wrap">{result.ai_feedback}</p>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {result.strengths.length > 0 && (
                                <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4">
                                    <h5 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                                        <CheckCircle2 size={16} /> Что хорошо
                                    </h5>
                                    <ul className="space-y-1">
                                        {result.strengths.map((item, i) => (
                                            <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                                <span className="mt-1 block w-1 h-1 rounded-full bg-green-500 flex-shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.improvements.length > 0 && (
                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4">
                                    <h5 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
                                        <AlertCircle size={16} /> Что улучшить
                                    </h5>
                                    <ul className="space-y-1">
                                        {result.improvements.map((item, i) => (
                                            <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                                <span className="mt-1 block w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-4 border-t border-[#262626]">
                            <button
                                onClick={() => setResult(null)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Решить заново
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

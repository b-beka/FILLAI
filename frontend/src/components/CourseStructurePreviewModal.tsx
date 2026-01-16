'use client';

import { useEffect, useState } from 'react';
import { X, Plus, ArrowLeft, Sparkles, Send, Info, Trash2, GripVertical, CheckCircle2 } from 'lucide-react';
import { CourseStructureModule, CourseStructurePlan } from '@/services/api';
import { assistantChat, AssistantChatMessage } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

type EditableLesson = {
    id: string;
    title: string;
    content?: string;
    duration_minutes?: number;
};

type EditableModule = Omit<CourseStructureModule, 'lessons'> & {
    id: string;
    lessons: EditableLesson[];
};

interface CourseStructurePreviewModalProps {
    isOpen: boolean;
    topic: string;
    modules: EditableModule[];
    onChange: (modules: EditableModule[]) => void;
    onBack: () => void;
    onClose: () => void;
    onGenerate: (plan: CourseStructurePlan) => void;
    isGenerating: boolean;
}

export default function CourseStructurePreviewModal({
    isOpen,
    topic,
    modules,
    onChange,
    onBack,
    onClose,
    onGenerate,
    isGenerating,
}: CourseStructurePreviewModalProps) {
    const [localModules, setLocalModules] = useState<EditableModule[]>(modules);
    const [assistantHistory, setAssistantHistory] = useState<AssistantChatMessage[]>([]);
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantLoading, setAssistantLoading] = useState(false);

    useEffect(() => {
        setLocalModules(modules);
    }, [modules]);

    if (!isOpen) return null;

    const updateModule = (moduleId: string, updater: (mod: EditableModule) => EditableModule) => {
        const updated = localModules.map((mod) => (mod.id === moduleId ? updater(mod) : mod));
        setLocalModules(updated);
        onChange(updated);
    };

    const updateLesson = (
        moduleId: string,
        lessonId: string,
        updater: (lesson: EditableLesson) => EditableLesson
    ) => {
        updateModule(moduleId, (mod) => ({
            ...mod,
            lessons: mod.lessons.map((lesson) => (lesson.id === lessonId ? updater(lesson) : lesson)),
        }));
    };

    const addModule = () => {
        const newModule: EditableModule = {
            id: crypto.randomUUID(),
            title: 'Новый модуль',
            description: '',
            lessons: [
                {
                    id: crypto.randomUUID(),
                    title: 'Новый урок',
                    content: '',
                    duration_minutes: 30,
                },
            ],
        };
        const updated = [...localModules, newModule];
        setLocalModules(updated);
        onChange(updated);
    };

    const addLesson = (moduleId: string) => {
        updateModule(moduleId, (mod) => ({
            ...mod,
            lessons: [
                ...mod.lessons,
                { id: crypto.randomUUID(), title: 'Новый урок', content: '', duration_minutes: 30 },
            ],
        }));
    };

    const removeLesson = (moduleId: string, lessonId: string) => {
        updateModule(moduleId, (mod) => ({
            ...mod,
            lessons: mod.lessons.filter((lesson) => lesson.id !== lessonId),
        }));
    };

    const removeModule = (moduleId: string) => {
        const updated = localModules.filter((mod) => mod.id !== moduleId);
        setLocalModules(updated);
        onChange(updated);
    };

    const handleGenerate = () => {
        const plan: CourseStructurePlan = {
            modules: localModules.map((mod) => ({
                title: mod.title,
                description: mod.description,
                lessons: mod.lessons.map((lesson) => ({
                    title: lesson.title,
                    content: lesson.content,
                    duration_minutes: lesson.duration_minutes || 30,
                })),
            })),
        };
        onGenerate(plan);
    };

    const handleAssistantAsk = async () => {
        const text = assistantInput.trim();
        if (!text || assistantLoading) return;
        setAssistantLoading(true);
        setAssistantInput('');

        const history = assistantHistory.map((m) => ({ role: m.role, content: m.content }));
        const userMsg: AssistantChatMessage = { role: 'user', content: text };
        setAssistantHistory((prev) => [...prev, userMsg]);

        const structurePreview = localModules
            .map((m, i) => `${i + 1}. ${m.title} (${m.lessons.length} уроков)`)
            .join('\n');

        try {
            const resp = await assistantChat({
                message: `Помоги улучшить структуру курса "${topic}". Текущее содержание:\n${structurePreview}\nВопрос: ${text}`,
                language: 'ru',
                history,
                user_context: {
                    name: 'Создатель курса',
                    goals: ['сделать понятный и цельный курс'],
                },
            });

            const replyText =
                resp.success && resp.reply
                    ? resp.reply
                    : 'Не получилось получить ответ. Попробуйте ещё раз.';

            setAssistantHistory((prev) => [...prev, { role: 'assistant', content: replyText }]);
        } catch (e) {
            setAssistantHistory((prev) => [
                ...prev,
                { role: 'assistant', content: 'Связь с ассистентом не удалась. Повторите позже.' },
            ]);
        } finally {
            setAssistantLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0f1115] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col"
            >
                {/* Decorator */}
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

                {/* Header with improved context */}
                <div className="bg-[#0f1115] border-b border-white/10 p-6 flex items-start justify-between">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Структура курса готова</h2>
                        </div>

                        <div className="flex gap-3 bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl mt-2">
                            <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-200 leading-relaxed">
                                    Мы создали эту структуру на основе ваших ответов.
                                    <span className="text-emerald-400 font-medium"> Это ваш шанс повлиять на содержание.</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Удалите темы, которые вы уже знаете, или добавьте то, чего не хватает.
                                    После нажатия кнопки "Сгенерировать курс", ИИ напишет подробный контент для каждого урока.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

                    {/* Main Structure Editor */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0a0a0a]">
                        <div className="space-y-6">
                            {localModules.map((module, modIndex) => (
                                <div
                                    key={module.id}
                                    className="group bg-[#141414] border border-white/5 hover:border-white/10 rounded-xl p-5 transition-all"
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="mt-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Модуль {modIndex + 1}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input
                                                value={module.title}
                                                onChange={(e) =>
                                                    updateModule(module.id, (mod) => ({ ...mod, title: e.target.value }))
                                                }
                                                className="w-full bg-transparent border-0 border-b border-white/10 focus:border-emerald-500 px-0 py-1 text-lg font-medium text-white placeholder-gray-600 focus:ring-0 transition-colors"
                                                placeholder="Название модуля"
                                            />
                                            <input
                                                value={module.description || ''}
                                                onChange={(e) =>
                                                    updateModule(module.id, (mod) => ({ ...mod, description: e.target.value }))
                                                }
                                                className="w-full bg-transparent text-sm text-gray-400 placeholder-gray-600 border-0 focus:ring-0 px-0"
                                                placeholder="Краткое описание модуля..."
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeModule(module.id)}
                                            className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Удалить модуль"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-2 pl-4 border-l-2 border-white/5 ml-2">
                                        {module.lessons.map((lesson, lessonIndex) => (
                                            <div
                                                key={lesson.id}
                                                className="flex items-center gap-3 group/lesson py-1"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
                                                <div className="flex-1 flex gap-3">
                                                    <input
                                                        value={lesson.title}
                                                        onChange={(e) =>
                                                            updateLesson(module.id, lesson.id, (l) => ({ ...l, title: e.target.value }))
                                                        }
                                                        className="flex-1 bg-transparent border border-transparent hover:border-white/10 focus:border-emerald-500/50 rounded px-2 py-1 text-sm text-gray-300 placeholder-gray-600 transition-colors"
                                                        placeholder="Название урока"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={lesson.duration_minutes || 30}
                                                        onChange={(e) =>
                                                            updateLesson(module.id, lesson.id, (l) => ({ ...l, duration_minutes: Number(e.target.value) }))
                                                        }
                                                        className="w-16 bg-transparent text-right text-xs text-gray-500 border-b border-transparent hover:border-white/10 focus:border-emerald-500"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeLesson(module.id, lesson.id)}
                                                    className="p-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover/lesson:opacity-100 transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            onClick={() => addLesson(module.id)}
                                            className="mt-2 flex items-center gap-2 text-xs font-medium text-emerald-500/70 hover:text-emerald-400 transition-colors py-1 px-2 rounded hover:bg-emerald-500/5 w-fit"
                                        >
                                            <Plus size={14} />
                                            Добавить урок
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addModule}
                                className="w-full border border-dashed border-white/10 rounded-xl py-6 text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all flex flex-col items-center gap-2"
                            >
                                <Plus size={24} />
                                <span className="font-medium">Добавить новый модуль</span>
                            </button>
                        </div>
                    </div>

                    {/* AI Assistant Sidebar */}
                    <div className="w-80 border-l border-white/10 bg-[#0f1115] flex flex-col">
                        <div className="p-4 border-b border-white/10 bg-[#141414]">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                <Sparkles size={16} className="text-emerald-400" />
                                AI Помощник
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Попросите добавить тему или перестроить порядок
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {assistantHistory.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-xl text-xs leading-relaxed ${msg.role === 'user'
                                            ? 'bg-emerald-500/10 text-emerald-200 ml-4'
                                            : 'bg-white/5 text-gray-300 mr-4'
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            ))}
                            {assistantLoading && (
                                <div className="flex gap-2 items-center text-xs text-gray-500">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-75" />
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-150" />
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 bg-[#141414]">
                            <div className="flex gap-2">
                                <input
                                    value={assistantInput}
                                    onChange={(e) => setAssistantInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAssistantAsk()}
                                    placeholder="Например: Добавь модуль про..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                                />
                                <button
                                    onClick={handleAssistantAsk}
                                    disabled={!assistantInput.trim() || assistantLoading}
                                    className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white disabled:opacity-50"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-[#0f1115] flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Назад к вопросам
                    </button>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Sparkles size={18} />
                        {isGenerating ? 'Создаем уроки...' : 'Создать курс'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Upload, ArrowRight, Loader2 } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { api, generateClarifyingQuestions, ClarifyingQuestion, QuestionAnswer, CourseStructurePlan } from '@/services/api';
import { ClarifyingQuestionsModal } from './ClarifyingQuestionsModal';
import CourseStructurePreviewModal from './CourseStructurePreviewModal';
import { useGraphStore } from '@/store/graphStore'; // If needed to refresh graph

// Types for local state
type WizardStep = 'input' | 'questions' | 'structure' | 'generating' | 'complete';

export default function CourseCreationWizard() {
    const [step, setStep] = useState<WizardStep>('input');
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');

    // Data state
    const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
    const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
    const [structure, setStructure] = useState<any>(null); // CourseStructurePlan (complex type)
    const [referenceFiles, setReferenceFiles] = useState<{ name: string, content: string, size_kb?: number, type?: string }[]>([]);

    const { setCurrentPage } = useUIStore();

    // Handlers
    const handleTopicSubmit = async () => {
        if (!topic.trim()) return;

        setLoading(true);
        setLoadingText('ИИ анализирует тему...');

        try {
            // 1. Generate clarifying questions
            const generatedQuestions = await generateClarifyingQuestions(topic);
            setQuestions(generatedQuestions);
            setStep('questions');
        } catch (error) {
            console.error("Failed to generate questions:", error);
            // Fallback: go directly to structure or show error
            // For now, let's try to generate structure directly if questions fail, 
            // or just alert the user.
            alert("Не удалось сгенерировать вопросы. Попробуем создать сокращенный курс.");
            // Logic to skip could go here, but let's stick to the flow.
        } finally {
            setLoading(false);
        }
    };

    const handleQuestionsSubmit = async (submittedAnswers: QuestionAnswer[]) => {
        setAnswers(submittedAnswers);
        // setStep('structure'); // Moved to after success
        setLoading(true);
        setLoadingText('ИИ создает структуру курса...');

        try {
            // 2. Generate initial structure
            // We need to format answers into a string context for the API
            const context = submittedAnswers.map(a => {
                const q = questions.find(q => q.id === a.questionId);
                return `${q?.question}: ${a.answer}`;
            }).join('\n');

            const fullTopicWithContext = `${topic}\n\nКонтекст и пожелания:\n${context}`;

            const response = await api.post<{ structure: CourseStructurePlan }>('/api/courses/structure/preview', {
                topic: fullTopicWithContext,
                settings: {
                    title: topic,
                    target_audience: 'General', // Default, will be refined by backend or prompts
                    difficulty: 'intermediate',
                    duration_hours: 5,
                    reference_files: referenceFiles
                }
            });


            setStructure(response.structure);
            setStep('structure');
        } catch (error) {
            console.error("Failed to generate structure:", error);
            alert("Ошибка создания структуры.");
            setStep('input'); // Reset to start
        } finally {
            setLoading(false);
        }
    };

    const handleQuestionsSkip = async () => {
        // If skipped, we just pass empty answers, effectively sending just the topic
        handleQuestionsSubmit([]);
    };

    const handleStructureGenerate = async (finalStructure: CourseStructurePlan) => {
        setStep('generating');
        setLoading(true);
        setLoadingText('ИИ пишет уроки, создает тесты и подбирает материалы...');

        try {
            const context = answers.map(a => {
                const q = questions.find(q => q.id === a.questionId);
                return `${q?.question}: ${a.answer}`;
            }).join('\n');

            // Use the structure override in generation request
            const response = await api.post<{ success: boolean, error?: string, course?: any }>('/api/courses/generate', {
                settings: {
                    title: topic,
                    description: `Курс по теме ${topic}`,
                    target_audience: 'Generated based on wizard',
                    difficulty: 'intermediate',
                    duration_hours: 10,
                    additional_requirements: context,
                    reference_files: referenceFiles
                },
                structure_override: finalStructure,
            });

            if (!response.success) {
                throw new Error(response.error || "Unknown generation error");
            }

            // Success
            setLoading(false);
            setStep('complete');

            // Refresh graph data to show new course
            await useGraphStore.getState().fetchGraphData();

            // Navigate to library or show success message then navigate
            // For now, let's redirect to library after a short delay
            setTimeout(() => {
                setCurrentPage('library');
            }, 1000);

        } catch (error: any) {
            console.error("Course generation failed:", error);
            alert(`Ошибка генерации курса: ${error.message || error}`);
            setStep('structure'); // Go back to structure to try again
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles: { name: string, content: string, size_kb?: number, type?: string }[] = [];
            for (const file of Array.from(e.target.files)) {
                try {
                    const content = await file.text();
                    newFiles.push({
                        name: file.name,
                        content,
                        size_kb: Math.round(file.size / 1024),
                        type: file.type
                    });
                } catch (err) {
                    console.error("Error reading file", err);
                }
            }
            setReferenceFiles(prev => [...prev, ...newFiles]);
        }
    };

    return (
        <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden flex flex-col items-center justify-center p-6">

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]" />
            </div>

            {/* Step 1: Input */}
            <AnimatePresence mode="wait">
                {step === 'input' && !loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="w-full max-w-2xl z-10 flex flex-col gap-8 text-center"
                    >
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20"
                            >
                                <Sparkles className="w-8 h-8 text-white" />
                            </motion.div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                Чему хотите научиться?
                            </h1>
                            <p className="text-lg text-gray-400 max-w-lg mx-auto">
                                Создайте персональный курс с ИИ-учителем за пару минут.
                            </p>
                        </div>

                        <div className="bg-[#141414] border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-2 relative group focus-within:border-emerald-500/50 transition-colors">
                            <textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleTopicSubmit();
                                    }
                                }}
                                placeholder="Например: Основы Python, История Древнего Рима, Маркетинг в соцсетях..."
                                className="w-full bg-transparent border-none text-white text-lg p-4 focus:ring-0 resize-none min-h-[80px]"
                                autoFocus
                            />

                            <div className="flex items-center justify-between px-4 pb-2">
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors text-xs text-gray-400 hover:text-white">
                                        <Upload size={14} />
                                        <span>{referenceFiles.length > 0 ? `${referenceFiles.length} файл(ов)` : 'Добавить материалы'}</span>
                                        <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>

                                <button
                                    onClick={handleTopicSubmit}
                                    disabled={!topic.trim()}
                                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
                                >
                                    Начать
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center mt-8">
                            {['Python с нуля', 'Лидерские качества', 'Финансовая грамотность'].map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => setTopic(tag)}
                                    className="px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Step: Questions Modal */}
            <ClarifyingQuestionsModal
                isOpen={step === 'questions'}
                questions={questions}
                onClose={() => setStep('input')}
                onSubmit={handleQuestionsSubmit}
                onSkip={handleQuestionsSkip}
                isGenerating={loading}
            />

            {/* Step: Structure Modal */}
            <CourseStructurePreviewModal
                isOpen={step === 'structure'}
                topic={topic}
                modules={structure?.modules || []} // Assuming structure matches expected type or needs adapting
                onChange={(newModules) => setStructure({ ...structure, modules: newModules })}
                onBack={() => setStep('questions')}
                onClose={() => setStep('input')}
                onGenerate={handleStructureGenerate}
                isGenerating={loading && step === 'generating'}
            />

            {/* Loading State (Overlay for big transitions not covered by modals) */}
            <AnimatePresence>
                {loading && step !== 'questions' && step !== 'structure' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center"
                    >
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-8" />
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+32px)] text-emerald-400 w-8 h-8 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{loadingText}</h2>
                        <p className="text-gray-400">Это может занять от 30 до 60 секунд</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Complete State */}
            {step === 'complete' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-12 h-12 text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Курс готов!</h2>
                    <p className="text-gray-400">Перенаправляем в библиотеку...</p>
                </motion.div>
            )}

        </div>
    );
}

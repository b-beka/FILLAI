'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, SkipForward, AlertCircle, Check, Info } from 'lucide-react';
import { ClarifyingQuestion, QuestionAnswer } from '@/services/api';

interface ClarifyingQuestionsModalProps {
    isOpen: boolean;
    questions: ClarifyingQuestion[];
    onClose: () => void;
    onSubmit: (answers: QuestionAnswer[]) => void;
    onSkip: () => void;
    isGenerating?: boolean;
}

export const ClarifyingQuestionsModal = ({
    isOpen,
    questions,
    onClose,
    onSubmit,
    onSkip,
    isGenerating = false,
}: ClarifyingQuestionsModalProps) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string | number>>({});
    const [showSkipWarning, setShowSkipWarning] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            setAnswers({});
            setShowSkipWarning(false);
        }
    }, [isOpen, questions]);

    if (!isOpen) return null;

    const currentQuestion = questions[currentStep];
    const isLastStep = currentStep === questions.length - 1;
    const progress = ((currentStep + 1) / questions.length) * 100;

    const hasAnswer = currentQuestion && (
        answers[currentQuestion.id] !== undefined &&
        answers[currentQuestion.id] !== ''
    );

    const handleAnswer = (value: string | number) => {
        if (!currentQuestion) return;
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    };

    const handleNext = () => {
        if (isLastStep) {
            handleSubmit();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        // Convert answers object to array format
        const answersList: QuestionAnswer[] = Object.entries(answers).map(([id, answer]) => ({
            questionId: id,
            answer
        }));
        onSubmit(answersList);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Decorator Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <Info className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Уточнение деталей</h2>
                            <p className="text-sm text-gray-400">Помогите нам создать идеальный курс для вас</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/5 h-1">
                    <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto min-h-[300px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                                    Вопрос {currentStep + 1} из {questions.length}
                                </span>
                                <h3 className="text-2xl font-medium text-white leading-relaxed">
                                    {currentQuestion?.question}
                                </h3>
                            </div>

                            {/* Dynamic Input Types */}
                            <div className="pt-4">
                                {currentQuestion?.type === 'choice' && currentQuestion.options && (
                                    <div className="grid grid-cols-1 gap-3">
                                        {currentQuestion.options.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(option)}
                                                className={`
                          p-4 rounded-xl text-left transition-all border
                          flex items-center justify-between group
                          ${answers[currentQuestion.id] === option
                                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                                                        : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'
                                                    }
                        `}
                                            >
                                                <span>{option}</span>
                                                {answers[currentQuestion.id] === option && (
                                                    <Check className="w-5 h-5 text-emerald-400" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {currentQuestion?.type === 'text' && (
                                    <div className="relative">
                                        <textarea
                                            value={(answers[currentQuestion.id] as string) || ''}
                                            onChange={(e) => handleAnswer(e.target.value)}
                                            placeholder={currentQuestion.placeholder || "Введите ваш ответ..."}
                                            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all resize-none"
                                            autoFocus
                                        />
                                        <div className="absolute bottom-4 right-4 text-xs text-gray-500 pointer-events-none">
                                            Shift + Enter для новой строки
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex items-center justify-between bg-[#0f1115]">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${currentStep === 0
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }
              `}
                        >
                            <ArrowLeft size={16} />
                            Назад
                        </button>

                        {/* Skip Button with verification */}
                        {!isLastStep && (
                            <div className="relative group">
                                <button
                                    onClick={() => setShowSkipWarning(true)}
                                    className="text-gray-500 hover:text-gray-300 text-sm font-medium px-4 py-2 transition-colors flex items-center gap-2"
                                >
                                    <SkipForward size={14} />
                                    Пропустить все
                                </button>

                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={currentQuestion?.required && !hasAnswer}
                        className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all
              ${(currentQuestion?.required && !hasAnswer)
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                            }
            `}
                    >
                        {isLastStep ? 'Завершить' : 'Далее'}
                        {!isLastStep && <ArrowRight size={18} />}
                    </button>
                </div>

                {/* Skip Warning Overlay */}
                <AnimatePresence>
                    {showSkipWarning && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
                        >
                            <motion.div
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                className="bg-[#1a1c20] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center"
                            >
                                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Вы уверены?</h3>
                                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                    Пропуск уточняющих вопросов может сделать курс менее уникальным и персонализированным. ИИ будет использовать стандартные настройки.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowSkipWarning(false)}
                                        className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                                    >
                                        Вернуться
                                    </button>
                                    <button
                                        onClick={onSkip}
                                        className="flex-1 py-2 rounded-lg bg-yellow-600/80 hover:bg-yellow-600 text-white font-medium transition-colors"
                                    >
                                        Всё равно пропустить
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Loading Overlay */}
                {isGenerating && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                            <p className="text-white font-medium">Обработка ответов...</p>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

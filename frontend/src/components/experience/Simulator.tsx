import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';

interface SimulatorOption {
    text: string;
    feedback: string;
    is_correct: boolean;
    consequence?: string;
}

interface SimulatorContent {
    situation: string;
    context: string;
    role: string;
    options: SimulatorOption[];
}

interface SimulatorProps {
    content: SimulatorContent;
    onComplete?: () => void;
}

export default function Simulator({ content, onComplete }: SimulatorProps) {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);

    const handleOptionSelect = (idx: number) => {
        if (showFeedback) return;
        setSelectedOption(idx);
        setShowFeedback(true);
        if (content.options[idx].is_correct && onComplete) {
            onComplete();
        }
    };

    const handleRetry = () => {
        setSelectedOption(null);
        setShowFeedback(false);
    };

    const currentOption = selectedOption !== null ? content.options[selectedOption] : null;

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            {/* Scenario Card */}
            <div className="relative bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />

                <div className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold uppercase tracking-wider">
                            Симулятор
                        </span>
                        <span className="text-gray-500 text-sm flex items-center gap-1">
                            <AlertCircle size={14} />
                            Роль: <span className="text-gray-300 font-medium">{content.role}</span>
                        </span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
                        {content.situation}
                    </h2>

                    <div className="prose prose-invert bg-[#222] p-4 rounded-xl border border-[#333]">
                        <MarkdownRenderer content={content.context} />
                    </div>
                </div>

                {/* Options */}
                <div className="bg-[#222] p-8 border-t border-[#333] space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                        Ваше решение:
                    </h3>

                    <div className="grid gap-3">
                        {content.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(idx)}
                                disabled={showFeedback}
                                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${showFeedback
                                        ? selectedOption === idx
                                            ? option.is_correct
                                                ? 'bg-green-500/10 border-green-500/50'
                                                : 'bg-red-500/10 border-red-500/50'
                                            : 'bg-[#1a1a1a] border-[#333] opacity-50'
                                        : 'bg-[#1a1a1a] border-[#333] hover:bg-[#2a2a2a] hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-900/10'
                                    }`}
                            >
                                <span className={`font-medium ${showFeedback && selectedOption === idx
                                        ? option.is_correct ? 'text-green-400' : 'text-red-400'
                                        : 'text-gray-300 group-hover:text-white'
                                    }`}>
                                    {option.text}
                                </span>

                                {showFeedback && selectedOption === idx && (
                                    option.is_correct
                                        ? <CheckCircle2 className="text-green-500" />
                                        : <XCircle className="text-red-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Feedback Area */}
                    {showFeedback && currentOption && (
                        <div className={`mt-6 p-6 rounded-xl border animate-in fade-in slide-in-from-bottom-4 duration-500 ${currentOption.is_correct
                                ? 'bg-green-500/5 border-green-500/20'
                                : 'bg-red-500/5 border-red-500/20'
                            }`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-full ${currentOption.is_correct ? 'bg-green-500/20' : 'bg-red-500/20'
                                    }`}>
                                    {currentOption.is_correct
                                        ? <CheckCircle2 size={24} className="text-green-500" />
                                        : <XCircle size={24} className="text-red-500" />
                                    }
                                </div>
                                <div className="flex-1">
                                    <h4 className={`font-bold text-lg mb-2 ${currentOption.is_correct ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {currentOption.is_correct ? 'Верное решение!' : 'Не совсем так...'}
                                    </h4>
                                    <p className="text-gray-300 text-lg mb-4 leading-relaxed">
                                        {currentOption.feedback}
                                    </p>

                                    {currentOption.consequence && (
                                        <div className="flex items-start gap-2 text-sm text-gray-400 bg-black/20 p-3 rounded-lg">
                                            <ArrowRight size={16} className="mt-0.5 flex-shrink-0" />
                                            <span><strong className="text-gray-300">Последствия:</strong> {currentOption.consequence}</span>
                                        </div>
                                    )}

                                    {!currentOption.is_correct && (
                                        <button
                                            onClick={handleRetry}
                                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#333] hover:bg-[#444] rounded-lg text-white transition-colors"
                                        >
                                            <RotateCcw size={16} />
                                            Попробовать снова
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

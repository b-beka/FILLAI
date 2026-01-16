import React, { useState } from 'react';
import { Eye, CheckCircle2 } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';

interface VisualContent {
    image_query: string;
    description_for_ai: string;
    question: string;
}

interface VisualReasoningProps {
    content: VisualContent;
    onComplete?: () => void;
}

export default function VisualReasoning({ content, onComplete }: VisualReasoningProps) {
    const [revealed, setRevealed] = useState(false);

    // Mock image search - in real app would use an API or the pre-generated image URL
    // For now we use Unsplash source with the query keywords
    const imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(content.image_query)}`;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden">
                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                    <img
                        src={imageUrl}
                        alt={content.description_for_ai}
                        className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8">
                        <div className="flex items-center gap-2 mb-2">
                            <Eye className="text-cyan-400" />
                            <span className="text-cyan-400 font-bold uppercase tracking-wider text-sm">Visual Analysis</span>
                        </div>
                        <p className="text-white text-lg font-medium max-w-2xl text-shadow-lg">
                            {content.description_for_ai}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-[#1a1a1a] border border-[#333] rounded-xl p-8">
                    <h3 className="text-2xl font-bold text-white mb-6">Вопрос к изображению</h3>
                    <p className="text-xl text-gray-300 leading-relaxed mb-8">
                        {content.question}
                    </p>

                    <div className="bg-[#222] p-6 rounded-lg border border-[#333]">
                        <textarea
                            className="w-full bg-transparent border-none text-white focus:outline-none resize-none h-24 placeholder-gray-600"
                            placeholder="Напишите ваш анализ здесь..."
                        />
                    </div>
                </div>

                <div className="flex flex-col justify-center gap-4">
                    <button
                        onClick={() => { setRevealed(true); if (onComplete) onComplete(); }}
                        className={`p-6 rounded-xl border text-left transition-all ${revealed
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-[#222] border-[#333] hover:border-cyan-500/50'
                            }`}
                    >
                        {revealed ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 mb-2 text-green-400">
                                    <CheckCircle2 size={20} />
                                    <span className="font-bold">Анализ завершен</span>
                                </div>
                                <p className="text-sm text-gray-400">
                                    Отличная работа! Визуальный анализ помогает развивать насмотренность.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h4 className="font-bold text-white mb-1">Готово?</h4>
                                <p className="text-sm text-gray-500">Нажмите, чтобы продолжить урок</p>
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

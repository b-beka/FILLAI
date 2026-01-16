import React, { useState } from 'react';
import { FileText, Search, BookOpen, AlertCircle } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';

interface CaseStudyContent {
    title: string;
    scenario: string;
    documents: string[];
    analysis_questions: string[];
    expected_insight: string;
}

interface CaseStudyProps {
    content: CaseStudyContent;
    onComplete?: () => void;
}

export default function CaseStudy({ content, onComplete }: CaseStudyProps) {
    const [activeTab, setActiveTab] = useState<'scenario' | 'documents'>('scenario');
    const [showInsight, setShowInsight] = useState(false);

    return (
        <div className="grid md:grid-cols-2 gap-6 h-[700px]">
            {/* Left Column: Case Materials */}
            <div className="flex flex-col bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
                <div className="flex border-b border-[#333]">
                    <button
                        onClick={() => setActiveTab('scenario')}
                        className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'scenario'
                                ? 'bg-[#222] text-amber-500 border-b-2 border-amber-500'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-[#222]'
                            }`}
                    >
                        <BookOpen size={16} />
                        История
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'documents'
                                ? 'bg-[#222] text-amber-500 border-b-2 border-amber-500'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-[#222]'
                            }`}
                    >
                        <FileText size={16} />
                        Документы ({content.documents.length})
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-[#1a1a1a]">
                    {activeTab === 'scenario' ? (
                        <div className="prose prose-invert max-w-none">
                            <h3>{content.title}</h3>
                            <MarkdownRenderer content={content.scenario} />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {content.documents.map((doc, idx) => (
                                <div key={idx} className="bg-[#fff] text-black p-6 rounded-lg font-mono text-sm shadow-xl relative transform rotate-1 hover:rotate-0 transition-transform duration-300">
                                    <div className="absolute top-0 right-0 p-2 bg-gray-200 text-gray-500 text-xs rounded-bl-lg">
                                        DOC-00{idx + 1}
                                    </div>
                                    <MarkdownRenderer content={doc} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Analysis */}
            <div className="flex flex-col space-y-4">
                <div className="bg-[#222] border border-[#333] rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4 text-amber-500">
                        <Search size={20} />
                        <h3 className="font-bold text-lg">Задачи для анализа</h3>
                    </div>
                    <ul className="space-y-3">
                        {content.analysis_questions.map((q, idx) => (
                            <li key={idx} className="flex gap-3 text-gray-300">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm font-bold">
                                    {idx + 1}
                                </span>
                                <span>{q}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 flex flex-col items-center justify-center flex-1 text-center">
                    {!showInsight ? (
                        <>
                            <AlertCircle size={48} className="text-gray-600 mb-4" />
                            <h4 className="text-xl font-bold text-white mb-2">Проанализировали кейс?</h4>
                            <p className="text-gray-400 mb-6">Подумайте над решениями, прежде чем смотреть разбор.</p>
                            <button
                                onClick={() => { setShowInsight(true); if (onComplete) onComplete(); }}
                                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors"
                            >
                                Показать выводы эксперта
                            </button>
                        </>
                    ) : (
                        <div className="w-full text-left animate-in fade-in zoom-in duration-300">
                            <h4 className="text-lg font-bold text-amber-500 mb-3 uppercase tracking-wider">Выводы</h4>
                            <div className="prose prose-invert bg-[#252525] p-5 rounded-lg border border-[#333]">
                                <MarkdownRenderer content={content.expected_insight} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

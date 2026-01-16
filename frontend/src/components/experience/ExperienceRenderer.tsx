import React from 'react';
import { Lesson } from '@/data/mockStore';
import InteractiveTutor from './InteractiveTutor';
import Simulator from './Simulator';
import VisualReasoning from './VisualReasoning';
import VideoDriven from './VideoDriven';
import CaseStudy from './CaseStudy';
import MarkdownRenderer from '../MarkdownRenderer';

interface ExperienceRendererProps {
    lesson: Lesson;
    onComplete?: () => void;
}

export default function ExperienceRenderer({ lesson, onComplete }: ExperienceRendererProps) {
    const { type, content } = lesson;

    // Legacy or Text Fallback
    if (!type || type === 'text' || typeof content === 'string') {
        const textContent = typeof content === 'string' ? content : (content.content || '');
        const images = lesson.images || [];

        return (
            <div className="max-w-4xl mx-auto py-8">
                {/* Presentation Title Style */}
                <div className="mb-12 border-b border-gray-800 pb-8">
                    <div className="w-20 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500 mb-6 rounded-full" />
                </div>

                {/* Image Gallery */}
                {images.length > 0 && (
                    <div className="mb-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {images.map((img: string, idx: number) => (
                                <div key={idx} className="relative group overflow-hidden rounded-2xl border border-gray-800 shadow-xl">
                                    <img
                                        src={img}
                                        alt={`Illustration ${idx + 1}`}
                                        className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Markdown Content */}
                <div className="prose prose-2xl prose-invert max-w-none 
                    prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white
                    prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
                    prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
                    prose-p:text-xl prose-p:text-gray-200 prose-p:leading-relaxed
                    prose-li:text-xl prose-li:text-gray-200
                    prose-strong:text-emerald-400
                    prose-blockquote:text-lg prose-blockquote:bg-[#1a1a1a] prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:p-4 prose-blockquote:rounded-r-xl
                    prose-img:rounded-3xl prose-img:shadow-2xl prose-img:border prose-img:border-gray-800
                    prose-pre:bg-[#111] prose-pre:border prose-pre:border-gray-800 prose-pre:rounded-2xl prose-pre:text-lg
                    prose-table:border-collapse prose-th:bg-[#1f1f1f] prose-th:border prose-th:border-gray-700 prose-th:p-4 prose-th:text-lg
                    prose-td:border prose-td:border-gray-800 prose-td:p-4 prose-td:text-lg
                ">
                    <MarkdownRenderer content={textContent} />
                </div>
            </div>
        );
    }

    switch (type) {
        case 'interactive_tutor':
            return <InteractiveTutor content={content} onComplete={onComplete} />;
        case 'simulator':
            return <Simulator content={content} onComplete={onComplete} />;
        case 'case_study':
            return <CaseStudy content={content} onComplete={onComplete} />;
        case 'visual_reasoning':
            return <VisualReasoning content={content} onComplete={onComplete} />;
        case 'video_driven':
            return <VideoDriven content={content} video={lesson.videos?.[0]} onComplete={onComplete} />;
        case 'practice':
            // For now practice acts like a tutor or simple assignment
            return <div className="p-6 bg-[#1f1f1f] rounded-xl border border-[#333]">
                <h3 className="text-xl font-bold mb-4">Практическое задание</h3>
                <div className="prose prose-invert">
                    <MarkdownRenderer content={content.content || "Выполните задание"} />
                </div>
            </div>;
        default:
            return (
                <div className="prose prose-invert max-w-none">
                    <p className="text-red-400">Unknown experience type: {type}</p>
                    <MarkdownRenderer content={JSON.stringify(content)} />
                </div>
            );
    }
}

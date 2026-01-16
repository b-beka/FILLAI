'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { motion } from 'framer-motion';
import { Lightbulb, AlertCircle, CheckCircle, XCircle, Code } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

/**
 * Rich Markdown Renderer with support for:
 * - GitHub Flavored Markdown (tables, strikethrough, task lists)
 * - Syntax highlighting for code blocks
 * - Special callout boxes (💡, ⚠️, ✅, ❌)
 * - Mermaid diagrams
 * - Styled tables and lists
 */
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    const mermaidRef = useRef<HTMLDivElement>(null);
    const safeContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    // Process Mermaid diagrams after render
    useEffect(() => {
        const renderMermaid = async () => {
            if (typeof window === 'undefined') return;

            try {
                const { default: mermaid } = await import('mermaid');
                mermaid.initialize({
                    startOnLoad: true,
                    theme: 'dark',
                    themeVariables: {
                        primaryColor: '#0ea5e9',
                        primaryTextColor: '#fff',
                        primaryBorderColor: '#0284c7',
                        lineColor: '#64748b',
                        secondaryColor: '#1e293b',
                        tertiaryColor: '#0f172a',
                    },
                });

                const mermaidBlocks = mermaidRef.current?.querySelectorAll('.mermaid-block');
                if (mermaidBlocks) {
                    mermaidBlocks.forEach(async (block) => {
                        const code = block.textContent || '';
                        try {
                            const { svg } = await mermaid.render(`mermaid-${Date.now()}-${Math.random()}`, code);
                            block.innerHTML = svg;
                        } catch (err) {
                            console.error('Mermaid render error:', err);
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to load mermaid:', err);
            }
        };

        renderMermaid();
    }, [content]);

    return (
        <div ref={mermaidRef} className={`markdown-renderer prose prose-invert max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    // Headings with animations
                    h1: ({ node, children, id, className, ...rest }) => (
                        <motion.h1
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold text-gray-100 mt-8 mb-4 flex items-center gap-2"
                            id={id}
                        >
                            {children}
                        </motion.h1>
                    ),
                    h2: ({ node, children, id, className, ...rest }) => (
                        <motion.h2
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-2xl font-bold text-gray-200 mt-6 mb-3 border-b border-[#3a3a3a] pb-2"
                            id={id}
                        >
                            {children}
                        </motion.h2>
                    ),
                    h3: ({ node, ...props }) => (
                        <h3 className="text-xl font-semibold text-gray-300 mt-4 mb-2" {...props} />
                    ),

                    // Styled paragraphs
                    p: ({ node, ...props }) => (
                        <p className="text-gray-300 leading-relaxed mb-4" {...props} />
                    ),

                    // Enhanced code blocks
                    code: ({ node, inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const lang = match ? match[1] : '';

                        // Check if it's a mermaid diagram
                        if (lang === 'mermaid' && !inline) {
                            return (
                                <div className="mermaid-block my-6 p-4 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl overflow-auto">
                                    {children}
                                </div>
                            );
                        }

                        if (!inline) {
                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="my-4 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-4 py-2 bg-[#252525] border-b border-[#3a3a3a]">
                                        <div className="flex items-center gap-2">
                                            <Code size={16} className="text-sky-400" />
                                            <span className="text-xs text-gray-400 uppercase">{lang || 'code'}</span>
                                        </div>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(String(children).trim())}
                                            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                                        >
                                            Копировать
                                        </button>
                                    </div>
                                    <pre className="p-4 overflow-x-auto">
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    </pre>
                                </motion.div>
                            );
                        }

                        return (
                            <code className="px-1.5 py-0.5 bg-[#2a2a2a] text-sky-400 rounded text-sm font-mono" {...props}>
                                {children}
                            </code>
                        );
                    },

                    // Enhanced blockquotes for callouts
                    blockquote: ({ node, children, ...props }: any) => {
                        const text = String(children);

                        // Detect callout type based on emoji
                        if (text.includes('💡')) {
                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="my-4 p-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-xl"
                                >
                                    <div className="flex items-start gap-3">
                                        <Lightbulb size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1 text-sm text-gray-200">{children}</div>
                                    </div>
                                </motion.div>
                            );
                        }

                        if (text.includes('⚠️')) {
                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="my-4 p-4 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl"
                                >
                                    <div className="flex items-start gap-3">
                                        <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1 text-sm text-gray-200">{children}</div>
                                    </div>
                                </motion.div>
                            );
                        }

                        if (text.includes('✅')) {
                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="my-4 p-4 bg-green-500/10 border-l-4 border-green-500 rounded-r-xl"
                                >
                                    <div className="flex items-start gap-3">
                                        <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1 text-sm text-gray-200">{children}</div>
                                    </div>
                                </motion.div>
                            );
                        }

                        if (text.includes('❌')) {
                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="my-4 p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl"
                                >
                                    <div className="flex items-start gap-3">
                                        <XCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1 text-sm text-gray-200">{children}</div>
                                    </div>
                                </motion.div>
                            );
                        }

                        // Default blockquote
                        return (
                            <blockquote className="my-4 pl-4 border-l-4 border-gray-600 italic text-gray-400" {...props}>
                                {children}
                            </blockquote>
                        );
                    },

                    // Styled tables
                    table: ({ node, ...props }) => (
                        <div className="my-6 overflow-x-auto">
                            <table className="min-w-full border border-[#3a3a3a] rounded-lg overflow-hidden" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }) => (
                        <thead className="bg-[#2a2a2a]" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200 border-b border-[#3a3a3a]" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                        <td className="px-4 py-3 text-sm text-gray-300 border-b border-[#3a3a3a]" {...props} />
                    ),
                    tbody: ({ node, ...props }) => (
                        <tbody className="bg-[#1f1f1f]" {...props} />
                    ),

                    // Enhanced lists
                    ul: ({ node, ...props }) => (
                        <ul className="my-4 ml-6 space-y-2 list-disc text-gray-300" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                        <ol className="my-4 ml-6 space-y-2 list-decimal text-gray-300" {...props} />
                    ),
                    li: ({ node, children, ...props }: any) => {
                        // Check if it's a task list item
                        const text = String(children);
                        if (text.includes('[ ]') || text.includes('[x]')) {
                            const isChecked = text.includes('[x]');
                            const cleanText = text.replace(/\[(x| )\]\s*/, '');
                            return (
                                <li className="flex items-start gap-2 list-none" {...props}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        readOnly
                                        className="mt-1 rounded border-gray-600 bg-[#2a2a2a] text-sky-500 focus:ring-sky-500"
                                    />
                                    <span>{cleanText}</span>
                                </li>
                            );
                        }
                        return <li className="text-gray-300" {...props}>{children}</li>;
                    },

                    // Links with styling
                    a: ({ node, ...props }) => (
                        <a
                            className="text-sky-400 hover:text-sky-300 underline transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                        />
                    ),

                    // Strong and emphasis
                    strong: ({ node, ...props }) => (
                        <strong className="font-bold text-white" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                        <em className="italic text-gray-200" {...props} />
                    ),

                    // Horizontal rule
                    hr: ({ node, ...props }) => (
                        <hr className="my-8 border-t border-[#3a3a3a]" {...props} />
                    ),
                }}
            >
                {safeContent}
            </ReactMarkdown>
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';

interface Slide {
    title: string;
    content: string[];
    image_prompt: string;
    speaker_notes: string;
    image?: string;
}

interface PresentationModeProps {
    slides: Slide[];
    onClose: () => void;
    onComplete: () => void;
    courseTitle?: string;
    lessonTitle?: string;
    inline?: boolean;
}

export default function PresentationMode(props: PresentationModeProps) {
    const { slides, onClose, onComplete, courseTitle, lessonTitle, inline = false } = props;
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [showNotes, setShowNotes] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const displayMode = isFullscreen ? 'fullscreen' : (inline ? 'inline' : 'fullscreen');
    const currentSlide = slides[currentSlideIndex];
    const isLastSlide = currentSlideIndex === slides.length - 1;

    // handlers must be defined BEFORE use
    const handleNext = () => {
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    // Keyboard navigation
    useEffect(() => {
        // Disable keyboard nav if inline and not fullscreen, to prevent scrolling clashes
        if (inline && !isFullscreen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Space') {
                e.preventDefault(); // prevent scroll
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === 'Escape') {
                if (isFullscreen) {
                    setIsFullscreen(false);
                } else if (!inline) {
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlideIndex, isFullscreen, inline]);

    // Calculate progress
    const progress = ((currentSlideIndex + 1) / slides.length) * 100;

    const containerClasses = displayMode === 'inline'
        ? "relative w-full h-[600px] bg-black text-white flex flex-col overflow-hidden rounded-3xl border border-[#333] shadow-2xl mb-12"
        : "fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden font-sans";

    return (
        <div className={containerClasses}>
            {/* Header / Toolbar */}
            <div className="h-16 flex items-center justify-between px-6 bg-[#111] border-b border-[#333] z-20">
                <div className="flex items-center gap-4">
                    {displayMode !== 'inline' && (
                        <button onClick={onClose} className="p-2 hover:bg-[#222] rounded-full transition-colors">
                            <X size={20} className="text-gray-400 hover:text-white" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-sm font-bold text-gray-200">{courseTitle}</h2>
                        <div className="text-xs text-gray-500">{lessonTitle}</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-400 font-mono">
                        {currentSlideIndex + 1} / {slides.length}
                    </div>
                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className={`p-2 rounded-lg transition-colors ${showNotes ? 'bg-indigo-600 text-white' : 'hover:bg-[#222] text-gray-400'}`}
                        title="Speaker Notes"
                    >
                        <MessageSquare size={18} />
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-[#222] rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlideIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="w-full h-full flex flex-col md:flex-row"
                    >
                        {/* Visual / Image Side */}
                        <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center p-8 md:p-16 relative">
                            {/* Decorative Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 to-emerald-900/10" />
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />

                            {/* Image Placeholder or Actual Image */}
                            <div className="relative w-full aspect-video max-w-4xl bg-[#151515] rounded-2xl border border-[#333] shadow-2xl flex items-center justify-center overflow-hidden group">
                                {currentSlide.image ? (
                                    <img src={currentSlide.image} alt="Slide Visual" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-8">
                                        <div className="w-20 h-20 mx-auto bg-[#222] rounded-full flex items-center justify-center mb-4 text-gray-600 group-hover:text-emerald-500 transition-colors">
                                            <ImageIcon size={40} />
                                        </div>
                                        <p className="text-gray-500 text-sm italic max-w-md mx-auto">"{currentSlide.image_prompt}"</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Text / Content Side */}
                        <div className="md:w-[400px] lg:w-[500px] bg-[#111] border-l border-[#222] flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <motion.h1
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-3xl font-bold text-white mb-8 leading-tight"
                                >
                                    {currentSlide.title}
                                </motion.h1>

                                <div className="space-y-6">
                                    {currentSlide.content.map((point, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + (idx * 0.1) }}
                                            className="flex gap-4"
                                        >
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2.5 flex-shrink-0" />
                                            <p className="text-lg text-gray-300 leading-relaxed font-light">{point}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Speaker Notes (Bottom Panel) */}
                            {showNotes && (
                                <div className="p-6 bg-[#1a1a1a] border-t border-[#333]">
                                    <p className="text-xs uppercase text-gray-500 font-bold mb-2">Заметки спикера</p>
                                    <p className="text-sm text-gray-400 italic leading-relaxed">
                                        {currentSlide.speaker_notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-[#222]">
                <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            {/* Navigation Controls (Floating) */}
            <div className="absolute bottom-8 right-8 flex gap-4 z-30">
                <button
                    onClick={handlePrev}
                    disabled={currentSlideIndex === 0}
                    className={`p-4 rounded-full backdrop-blur-md border transition-all transform hover:scale-105 ${currentSlideIndex === 0
                        ? 'bg-black/20 border-white/5 text-gray-600 cursor-not-allowed'
                        : 'bg-black/50 border-white/10 text-white hover:bg-white/10 shadow-lg'
                        }`}
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={handleNext}
                    className="p-4 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 transition-all transform hover:scale-105 flex items-center gap-2"
                >
                    {isLastSlide ? (
                        <span className="font-bold px-2">Завершить</span>
                    ) : (
                        <ChevronRight size={24} />
                    )}
                </button>
            </div>
        </div>
    );
}

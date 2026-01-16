'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { StickyNote } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import { X, Check } from 'lucide-react';

interface StickyNoteProps {
    note: StickyNote;
    graphCenterX: number;
    graphCenterY: number;
}

export default function StickyNoteComponent({ note, graphCenterX, graphCenterY }: StickyNoteProps) {
    const { updateNote, deleteNote } = useGraphStore();
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(note.text);
    const nodeRef = useRef<HTMLDivElement>(null);

    // Position relative to graph center
    const x = graphCenterX + note.x;
    const y = graphCenterY + note.y;

    const handleDragEnd = (_: any, info: any) => {
        updateNote(note.id, {
            x: note.x + info.offset.x,
            y: note.y + info.offset.y,
        });
    };

    const handleSave = () => {
        updateNote(note.id, { text });
        setIsEditing(false);
    };

    return (
        <motion.div
            ref={nodeRef}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x, y }}
            drag
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.05, cursor: 'grabbing', zIndex: 100 }}
            className="absolute w-48 p-4 rounded-xl shadow-lg cursor-grab group backdrop-blur-md border border-white/10"
            style={{
                backgroundColor: note.color,
                left: 0, // Positioned by framer-motion x/y
                top: 0,
                boxShadow: `0 4px 30px rgba(0, 0, 0, 0.1)`,
            }}
        >
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1 bg-red-500 rounded-full text-white shadow-md hover:scale-110 transition-transform"
                >
                    <X size={12} />
                </button>
            </div>

            {isEditing ? (
                <div className="flex flex-col gap-2">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-full bg-transparent text-gray-900 placeholder-gray-600 outline-none resize-none font-medium text-sm"
                        rows={4}
                        autoFocus
                        onBlur={handleSave}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSave();
                            }
                        }}
                    />
                    <div className="flex justify-end">
                        <button onClick={handleSave} className="p-1 rounded-full bg-white/20 hover:bg-white/40 text-gray-900">
                            <Check size={14} />
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onDoubleClick={() => setIsEditing(true)}
                    className="text-gray-900 font-medium text-sm whitespace-pre-wrap min-h-[60px]"
                >
                    {note.text || 'Double click to edit'}
                </div>
            )}
        </motion.div>
    );
}

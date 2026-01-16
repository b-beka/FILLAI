'use client';

import { motion } from 'framer-motion';
import { MousePointer2, Circle, XCircle, Users, StickyNote, Save, GraduationCap } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useGraphStore } from '@/store/graphStore';
import { useState } from 'react';

export default function Toolbar() {
    const { activeTool, setActiveTool } = useUIStore();
    const { addNote, saveNodePositions, isHeatmapMode, toggleHeatmapMode } = useGraphStore();

    const tools = [
        {
            id: 'move',
            label: 'Move',
            icon: MousePointer2,
            action: () => setActiveTool('move'),
        },
        {
            id: 'mark-green',
            label: 'Mark Green',
            icon: Circle,
            color: '#10b981',
            action: () => setActiveTool('mark-green'),
        },
        {
            id: 'mark-red',
            label: 'Mark Red',
            icon: Circle,
            color: '#ef4444',
            action: () => setActiveTool('mark-red'),
        },
        {
            id: 'note',
            label: 'Add Note',
            icon: StickyNote,
            color: '#fcd34d',
            action: () => {
                addNote({
                    id: Math.random().toString(36).substr(2, 9),
                    x: 100 + Math.random() * 50,
                    y: 100 + Math.random() * 50,
                    text: 'New Note',
                    color: '#fef3c7'
                });
            }
        },
        {
            id: 'save',
            label: 'Save Layout',
            icon: Save,
            action: () => {
                saveNodePositions();
                alert('Layout saved!');
            }
        }
    ];

    return (
        <>
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-xl glass border border-white/10 shadow-xl"
            >
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={tool.action}
                        className={`
            relative p-2.5 rounded-lg transition-all duration-200 group
            ${activeTool === tool.id
                                ? 'bg-white/10 text-white shadow-inner'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }
          `}
                        title={tool.label}
                    >
                        <tool.icon
                            size={20}
                            className={activeTool === tool.id ? 'scale-110' : 'scale-100'}
                            color={tool.color}
                        />

                        {/* Active Indicator */}
                        {activeTool === tool.id && (
                            <motion.div
                                layoutId="activeTool"
                                className="absolute inset-0 bg-white/5 rounded-lg -z-10"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}

                        {/* Tooltip on hover */}
                        <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {tool.label}
                        </span>
                    </button>
                ))}
            </motion.div>
        </>
    );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Node, Link, StickyNote } from '@/types/graph';
import { ApiCourse } from '@/services/apiClient';
import { adaptCourseToGraph } from '@/services/graphAdapter';
import * as Icons from 'lucide-react';
import { ZoomIn, ZoomOut, MousePointer2, Sticker, Highlighter, X } from 'lucide-react';

const DynamicIcon = ({ name, size, className }: { name?: string, size: number, className?: string }) => {
    const IconComponent = (Icons as any)[name || 'Circle'];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
};

interface CourseGraphProps {
    course: ApiCourse;
    completedLessons: Set<string>;
    onLessonSelect: (moduleId: string, lessonId: string) => void;
}

type Tool = 'cursor' | 'note' | 'marker';

export default function CourseGraph({ course, completedLessons, onLessonSelect }: CourseGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [graphCenter, setGraphCenter] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(0.8);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [activeTool, setActiveTool] = useState<Tool>('cursor');
    const [notes, setNotes] = useState<StickyNote[]>([]);
    const [markedNodes, setMarkedNodes] = useState<Set<string>>(new Set());

    // STATIC NODES - No physics
    useEffect(() => {
        const { nodes: newNodes, links: newLinks } = adaptCourseToGraph(course, expandedModules, completedLessons);
        const staticNodes = newNodes.map(n => ({ ...n, marked: markedNodes.has(n.id) }));
        setNodes(staticNodes);
        setLinks(newLinks);
    }, [course, expandedModules, completedLessons, markedNodes]);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setGraphCenter({ x: width / 2, y: height / 2 });
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool === 'cursor') {
            setIsPanning(true);
            setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning && activeTool === 'cursor') {
            setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        }
    };

    const handleMouseUp = () => setIsPanning(false);

    const handleNodeClick = (node: Node, e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeTool === 'marker') {
            setMarkedNodes(prev => {
                const next = new Set(prev);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
            });
            return;
        }
        if (node.locked) {
            alert('Этот модуль заблокирован. Завершите предыдущие модули.');
            return;
        }
        if (node.type === 'primary') {
            setExpandedModules(prev => {
                const next = new Set(prev);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
            });
        } else if (node.type === 'sub') {
            if (node.data?.moduleId) onLessonSelect(node.data.moduleId, node.id);
        }
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (activeTool === 'note') {
            const rect = svgRef.current?.getBoundingClientRect();
            if (rect) {
                const clickX = (e.clientX - rect.left - graphCenter.x - panOffset.x) / scale;
                const clickY = (e.clientY - rect.top - graphCenter.y - panOffset.y) / scale;
                setNotes(prev => [...prev, { id: Date.now().toString(), x: clickX, y: clickY, text: 'Новая заметка', color: '#fbbf24' }]);
                setActiveTool('cursor');
            }
        }
    };

    const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));
    const updateNoteText = (id: string, text: string) => setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
    const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.3));

    return (
        <div ref={containerRef} className="absolute inset-0 bg-[#0a0a0a] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.03),transparent_80%)]" />
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }}
            />

            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
                <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-[#333] p-2 rounded-2xl shadow-2xl flex items-center gap-2">
                    <button onClick={() => setActiveTool('cursor')} className={`p-3 rounded-xl transition-all ${activeTool === 'cursor' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:bg-[#252525]'}`} title="Курсор"><MousePointer2 size={20} /></button>
                    <button onClick={() => setActiveTool('note')} className={`p-3 rounded-xl transition-all ${activeTool === 'note' ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-400 hover:bg-[#252525]'}`} title="Добавить заметку"><Sticker size={20} /></button>
                    <button onClick={() => setActiveTool('marker')} className={`p-3 rounded-xl transition-all ${activeTool === 'marker' ? 'bg-pink-500 text-white shadow-lg' : 'text-gray-400 hover:bg-[#252525]'}`} title="Выделить модуль"><Highlighter size={20} /></button>
                </div>
            </div>

            <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-30">
                <button onClick={handleZoomIn} className="p-4 bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-2xl shadow-xl border border-[#333]" title="Приблизить"><ZoomIn size={24} /></button>
                <button onClick={handleZoomOut} className="p-4 bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-2xl shadow-xl border border-[#333]" title="Отдалить"><ZoomOut size={24} /></button>
            </div>

            <div className="absolute top-6 left-6 z-20 pointer-events-none">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-[#1a1a1a]/80 backdrop-blur-md border border-[#333] p-5 rounded-2xl shadow-2xl max-w-xs">
                    <h3 className="text-white font-bold mb-3 text-lg">{course.title}</h3>
                    <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#2563eb] shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div> Модули</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div> Уроки</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3f3f46]"></div> Закрыто</div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">💡 Зажмите и тащите для прокрутки карты</div>
                </motion.div>
            </div>

            <div className="w-full h-full" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleCanvasClick}>
                <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing">
                    <g transform={`translate(${graphCenter.x + panOffset.x}, ${graphCenter.y + panOffset.y}) scale(${scale})`}>
                        {links.map(link => {
                            const source = nodes.find(n => n.id === (typeof link.source === 'object' ? (link.source as any).id : link.source));
                            const target = nodes.find(n => n.id === (typeof link.target === 'object' ? (link.target as any).id : link.target));
                            if (!source || !target) return null;
                            const dx = target.x - source.x, dy = target.y - source.y;
                            const controlX = (source.x + target.x) / 2 + (-dy * 0.2);
                            const controlY = (source.y + target.y) / 2 + (dx * 0.2);
                            const pathD = `M ${source.x},${source.y} Q ${controlX},${controlY} ${target.x},${target.y}`;
                            return (
                                <g key={link.id}>
                                    <path d={pathD} stroke={target.color} strokeWidth={4} strokeOpacity={0.1} fill="none" filter="blur(4px)" />
                                    <path d={pathD} stroke={target.type === 'sub' ? target.color : source.color} strokeWidth={2.5} strokeOpacity={0.4} fill="none" strokeLinecap="round" />
                                </g>
                            );
                        })}

                        {nodes.map(node => (
                            <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={(e) => handleNodeClick(node, e)} className="cursor-pointer">
                                {node.marked && <circle r={node.radius + 12} fill="none" stroke="#ec4899" strokeWidth={3} strokeDasharray="6 4" className="animate-[spin_4s_linear_infinite]" opacity={0.7} />}
                                <circle r={node.radius * 1.5} fill={node.glowColor || 'transparent'} opacity={0.4} filter="blur(15px)" />
                                <circle r={node.radius} fill={node.locked ? '#18181b' : 'rgba(20,20,20,0.7)'} stroke={node.color} strokeWidth={2} className="backdrop-blur-sm" />
                                <foreignObject x={-node.radius / 2} y={-node.radius / 2 - 5} width={node.radius} height={node.radius} className="pointer-events-none flex items-center justify-center">
                                    <div className={`flex items-center justify-center w-full h-full ${node.locked ? 'text-gray-600' : 'text-white'}`}>
                                        <DynamicIcon name={node.icon} size={node.radius * 0.8} />
                                    </div>
                                </foreignObject>
                                <text y={node.radius + 20} textAnchor="middle" fill={node.locked ? '#52525b' : '#e4e4e7'} fontSize={12} fontWeight="600" className="pointer-events-none select-none drop-shadow-md">{node.label}</text>
                            </g>
                        ))}
                    </g>
                </svg>

                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0" style={{ transform: `translate(${graphCenter.x + panOffset.x}px, ${graphCenter.y + panOffset.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
                        {notes.map(note => (
                            <div key={note.id} className="absolute pointer-events-auto bg-[#fbbf24] text-black p-3 rounded-tr-xl rounded-bl-xl shadow-xl w-48 min-h-[100px] flex flex-col transform -translate-x-1/2 -translate-y-1/2" style={{ left: note.x, top: note.y, backgroundColor: note.color }}>
                                <div className="flex justify-end mb-1">
                                    <button onClick={() => deleteNote(note.id)} className="opacity-50 hover:opacity-100"><X size={14} /></button>
                                </div>
                                <textarea value={note.text} onChange={(e) => updateNoteText(note.id, e.target.value)} className="w-full h-full bg-transparent resize-none focus:outline-none text-sm leading-relaxed" placeholder="Заметка..." />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

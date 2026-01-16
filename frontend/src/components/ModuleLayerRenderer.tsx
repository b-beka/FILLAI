
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModuleLayer, ModuleLayerType } from '@/services/api';
import { AlertCircle, Brain, Check, ChevronRight, HelpCircle, Layout, Play, Shield, Target, X, CheckCircle } from 'lucide-react';

interface ModuleLayerRendererProps {
    layer: ModuleLayer;
}

export default function ModuleLayerRenderer({ layer }: ModuleLayerRendererProps) {
    const { type, content, title } = layer;

    // Helper to render distinct layers
    const renderContent = () => {
        switch (type) {
            case 'meaning':
                return <MeaningLayer content={content} />;
            case 'core':
                return <CoreLayer content={content} />;
            case 'simulation':
                return <SimulationLayer content={content} />;
            case 'practice':
                return <PracticeLayer content={content} />;
            case 'control':
                return <ControlLayer content={content} />;
            default:
                return <div className="p-4 text-red-500">Unknown layer type: {type}</div>;
        }
    };

    return (
        <section className="py-12 border-b border-[#262626] last:border-0 relative">
            {/* Header of the Layer */}
            <div className="mb-8 pl-4 border-l-2 border-emerald-500/50">
                <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold bg-emerald-900/20 px-2 py-1 rounded">
                    {getLayerLabel(type)}
                </span>
            </div>

            {/* Content */}
            <div className="relative">
                {renderContent()}
            </div>
        </section>
    );
}

function getLayerLabel(type: ModuleLayerType) {
    const labels = {
        meaning: '1. Смысл',
        core: '2. Ядро',
        simulation: '3. Симуляция',
        practice: '4. Практика',
        control: '5. Контроль'
    };
    return labels[type] || type;
}

// --- Layer Components ---

function MeaningLayer({ content }: { content: any }) {
    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-8">
                <div>
                    <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 block">
                        Зачем тебе это знать?
                    </h3>
                    <p className="text-xl text-gray-200 leading-relaxed font-light">
                        {content.why_it_matters}
                    </p>
                </div>

                <div className="bg-red-500/5 border-l-4 border-red-500 p-6 rounded-r-xl">
                    <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                        <AlertCircle size={20} />
                        Цена незнания
                    </h4>
                    <p className="text-gray-300">
                        {content.what_if_not}
                    </p>
                </div>
            </div>

            <div className="bg-[#141414] border border-[#262626] p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Brain size={120} />
                </div>
                <div className="relative z-10">
                    <h4 className="text-emerald-400 font-bold mb-4 uppercase text-sm tracking-widest">Сдвиг мышления</h4>
                    <p className="text-lg text-white font-medium italic">
                        "{content.thinking_shift}"
                    </p>
                </div>
            </div>
        </div>
    );
}

function CoreLayer({ content }: { content: any }) {
    const assertions = content.assertions || [];

    return (
        <div className="space-y-6">
            {assertions.map((item: any, idx: number) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
                >
                    <div className="p-6 md:p-8 flex items-start gap-6">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/20">
                            {idx + 1}
                        </div>
                        <div className="space-y-4 flex-1">
                            <h3 className="text-2xl font-bold text-white border-b border-[#262626] pb-4">
                                {item.statement}
                            </h3>
                            <p className="text-gray-300 text-lg leading-relaxed">
                                {item.explanation}
                            </p>

                            <div className="grid md:grid-cols-2 gap-4 mt-4 bg-[#0a0a0a] rounded-xl p-1">
                                <div className="p-4 rounded-lg border border-green-900/20 bg-green-900/10">
                                    <div className="text-green-400 font-bold text-sm mb-2 flex items-center gap-2">
                                        <Check size={16} /> Пример
                                    </div>
                                    <p className="text-gray-400 text-sm">{item.example}</p>
                                </div>
                                <div className="p-4 rounded-lg border border-red-900/20 bg-red-900/10">
                                    <div className="text-red-400 font-bold text-sm mb-2 flex items-center gap-2">
                                        <X size={16} /> Миф / Антипример
                                    </div>
                                    <p className="text-gray-400 text-sm">{item.counter_example}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

function SimulationLayer({ content }: { content: any }) {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);

    return (
        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6 md:p-8">
            <div className="mb-8">
                <div className="flex items-center gap-2 text-indigo-400 mb-4 font-bold uppercase text-sm tracking-wider">
                    <Play size={16} /> Сценарий
                </div>
                <div className="bg-[#0a0a0a]/50 p-4 rounded-xl border border-white/5 mb-4 inline-block text-sm text-indigo-300">
                    Роль: {content.role}
                </div>
                <p className="text-xl text-white font-medium leading-relaxed">
                    {content.scenario}
                </p>
                <div className="mt-4 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <p className="text-indigo-200">Выбери стратегию действий:</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {content.options?.map((opt: any, idx: number) => (
                    <button
                        key={idx}
                        onClick={() => setSelectedOption(idx)}
                        className={`text-left p-6 rounded-xl border transition-all ${selectedOption === idx
                            ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-900/50'
                            : 'bg-[#141414] border-[#262626] hover:bg-[#1a1a1a] hover:border-indigo-500/30'
                            }`}
                    >
                        <div className="font-bold text-white mb-2">{opt.action}</div>
                        {selectedOption === idx && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-sm text-indigo-100 mt-3 pt-3 border-t border-indigo-500/30"
                            >
                                {opt.consequence}
                            </motion.div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

function PracticeLayer({ content }: { content: any }) {
    return (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

            <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Target size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Диагностическая практика</h3>
                    <p className="text-gray-400">Не тест. Проверка глубины понимания.</p>
                </div>
            </div>

            <div className="bg-[#0a0a0a] p-6 rounded-xl border border-[#262626] mb-6">
                <p className="text-lg text-white font-medium">
                    {content.task}
                </p>
            </div>

            <div className="space-y-3">
                <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Критерии мастерства:</p>
                <div className="space-y-2">
                    {content.criteria?.map((crit: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 text-gray-300">
                            <CheckCircle size={16} className="text-emerald-500/50 flex-shrink-0" />
                            <span>{crit}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button className="px-6 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg text-sm font-medium transition-colors">
                    Выполнить у себя в заметках
                </button>
            </div>
        </div>
    );
}

function ControlLayer({ content }: { content: any }) {
    return (
        <div className="text-center py-12 px-6 bg-gradient-to-b from-[#141414] to-[#0a0a0a] border border-[#262626] rounded-3xl">
            <div className="mb-6 mx-auto w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                <HelpCircle size={32} className="text-gray-400" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 max-w-2xl mx-auto leading-tight">
                {content.question}
            </h3>
            <p className="text-gray-500 max-w-lg mx-auto">
                Попробуйте ответить на этот вопрос, чтобы закрепить понимание связей, а не фактов.
            </p>
        </div>
    );
}


import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Lock } from 'lucide-react';

interface ModuleSummary {
    title: string;
    description?: string;
}

interface CourseMapProps {
    modules: ModuleSummary[];
    currentModuleIndex: number;
    onModuleSelect: (index: number) => void;
}

export default function CourseMap({ modules, currentModuleIndex, onModuleSelect }: CourseMapProps) {
    return (
        <div className="relative py-8 pl-4">
            {/* Vertical Line */}
            <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-[#262626]" />

            <div className="space-y-12">
                {modules.map((module, index) => {
                    const isCompleted = index < currentModuleIndex;
                    const isCurrent = index === currentModuleIndex;
                    const isLocked = index > currentModuleIndex;

                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative flex items-start gap-6 group cursor-pointer"
                            onClick={() => !isLocked && onModuleSelect(index)}
                        >
                            {/* Node Indicator */}
                            <div className={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors bg-[#0a0a0a] ${isCompleted ? 'border-emerald-500 text-emerald-500' :
                                isCurrent ? 'border-emerald-500 bg-emerald-500/20' :
                                    'border-[#333] text-gray-600'
                                }`}>
                                {isCompleted ? <CheckCircle2 size={14} /> :
                                    isCurrent ? <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> :
                                        isLocked ? <Lock size={12} /> : <Circle size={12} />}
                            </div>

                            {/* Card */}
                            <div className={`flex-1 p-5 rounded-xl border transition-all ${isCurrent ? 'bg-[#141414] border-emerald-500/50 shadow-lg shadow-emerald-900/20' :
                                isLocked ? 'bg-[#0a0a0a] border-[#1a1a1a] opacity-50' :
                                    'bg-[#141414] border-[#262626] hover:border-emerald-500/30'
                                }`}>
                                <h3 className={`font-bold mb-1 ${isCurrent ? 'text-white' : 'text-gray-300'}`}>
                                    {module.title}
                                </h3>
                                {/* Assuming description is short or we truncate it */}
                                <p className="text-sm text-gray-500 line-clamp-2">
                                    {module.description}
                                </p>

                                {isCurrent && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                                        <span>Текущий модуль</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

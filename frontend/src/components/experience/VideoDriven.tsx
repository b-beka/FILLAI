import React from 'react';
import { Play, ListChecks } from 'lucide-react';
import YouTubePlayer from '../YouTubePlayer';
import { VideoMaterial } from '@/data/mockStore';

interface VideoContent {
    video_query: string;
    video_url?: string;
    observation_task: string;
    discussion_points: string[];
}

interface VideoDrivenProps {
    content: VideoContent;
    video?: VideoMaterial;
    onComplete?: () => void;
}

export default function VideoDriven({ content, video, onComplete }: VideoDrivenProps) {
    // If no video was found/passed, we might need a fallback, but assuming coordinator passed one found by query

    return (
        <div className="space-y-8">
            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-500/20 rounded-lg">
                        <Play className="text-red-500 w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Видео-разбор</h3>
                        <p className="text-gray-300 text-lg">
                            <strong className="text-red-400">Задача:</strong> {content.observation_task}
                        </p>
                    </div>
                </div>
            </div>

            {video ? (
                <YouTubePlayer video={video} />
            ) : (
                <div className="aspect-video bg-black flex items-center justify-center rounded-xl border border-[#333]">
                    <p className="text-gray-500">Видео не найдено по запросу: {content.video_query}</p>
                </div>
            )}

            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8">
                <div className="flex items-center gap-2 mb-6">
                    <ListChecks className="text-emerald-500" />
                    <h3 className="text-xl font-bold text-white">Вопросы для самопроверки</h3>
                </div>

                <div className="grid gap-4">
                    {content.discussion_points.map((point, idx) => (
                        <div key={idx} className="flex gap-4 p-4 bg-[#222] rounded-lg border border-[#333]">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-300">
                                {idx + 1}
                            </span>
                            <p className="text-gray-200 mt-1">{point}</p>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onComplete}
                    className="mt-8 w-full py-4 bg-[#252525] hover:bg-[#333] border border-[#333] rounded-lg text-gray-400 hover:text-white transition-all font-medium"
                >
                    Я просмотрел и проанализировал видео
                </button>
            </div>
        </div>
    );
}

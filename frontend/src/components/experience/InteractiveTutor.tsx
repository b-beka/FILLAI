import React, { useState, useEffect } from 'react';
import { Send, User, Bot, Sparkles } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';

interface TutorContent {
    concept_explanation: string;
    initial_question: string;
    key_points: string[];
    character_persona: string;
}

interface InteractiveTutorProps {
    content: TutorContent;
    onComplete?: () => void;
}

interface Message {
    role: 'ai' | 'user';
    content: string;
}

export default function InteractiveTutor({ content, onComplete }: InteractiveTutorProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        // Initial welcome message
        setMessages([
            { role: 'ai', content: content.concept_explanation },
            { role: 'ai', content: content.initial_question }
        ]);
    }, [content]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setIsTyping(true);

        // Simulation of AI response (placeholder for real API call later)
        setTimeout(() => {
            const responses = [
                "Отличный ответ! Давай углубимся в детали.",
                "Интересная мысль. А как это связано с предыдущим пунктом?",
                "Почти так! Но есть нюанс...",
                "В точку! Продолжай.",
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];

            setMessages(prev => [...prev, { role: 'ai', content: randomResponse }]);
            setIsTyping(false);

            if (onComplete) {
                // Mark as complete after first interaction or specific logic
                // onComplete(); 
            }
        }, 1500);
    };

    return (
        <div className="flex flex-col h-[600px] bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#222] p-4 border-b border-[#333] flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-full">
                    <Bot className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-100">{content.character_persona || "AI Tutor"}</h3>
                    <p className="text-xs text-gray-400">Интерактивный урок</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && (
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                                <Bot size={16} className="text-indigo-400" />
                            </div>
                        )}

                        <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-[#2a2a2a] text-gray-200 rounded-bl-none'
                            }`}>
                            <MarkdownRenderer content={msg.content} />
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                                <User size={16} className="text-white" />
                            </div>
                        )}
                    </div>
                ))}
                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot size={16} className="text-indigo-400" />
                        </div>
                        <div className="bg-[#2a2a2a] p-3 rounded-2xl rounded-bl-none">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#222] border-t border-[#333]">
                {content.key_points && messages.length < 3 && (
                    <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
                        {content.key_points.map((kp, idx) => (
                            <button
                                key={idx}
                                onClick={() => setInput(`Расскажи подробнее про ${kp}`)}
                                className="whitespace-nowrap px-3 py-1 bg-[#333] hover:bg-[#444] rounded-full text-xs text-indigo-300 transition-colors border border-indigo-500/20"
                            >
                                <Sparkles size={12} className="inline mr-1" />
                                {kp}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ответьте на вопрос или спросите..."
                        className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

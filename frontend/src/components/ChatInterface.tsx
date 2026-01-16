'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, FileText, Sparkles, X, BookOpen, Loader2 } from 'lucide-react';
import { generateCourse, previewCourseStructure } from '@/services/api';
import { useGraphStore } from '@/store/graphStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import CoursePreview from './CoursePreview';
import { Course } from '@/data/mockStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ReferenceFile {
  name: string;
  content: string;
  size_kb?: number;
  type?: string;
}

export default function ChatInterface() {
  const { user } = useAuth();
  const { regenerateGraph } = useGraphStore();
  const { setCurrentPage, setSelectedCourseId } = useUIStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Привет! Я помогу вам создать курс. О чем будет курс?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([]);
  const [showFileInput, setShowFileInput] = useState(false);
  const [courseTopic, setCourseTopic] = useState('');
  const [courseSettings, setCourseSettings] = useState<any>(null);
  const [generatedCourse, setGeneratedCourse] = useState<Course | null>(null);
  const [conversationStage, setConversationStage] = useState<'topic' | 'level' | 'files' | 'ready'>('topic');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: ReferenceFile[] = [];
    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        newFiles.push({
          name: file.name,
          content,
          size_kb: Math.round(file.size / 1024),
          type: file.type,
        });
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
    }

    setReferenceFiles((prev) => [...prev, ...newFiles]);
    addMessage('assistant', `Добавлено файлов: ${newFiles.length}. Могу использовать их при создании курса.`);
  };

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage = inputValue.trim();
    addMessage('user', userMessage);
    setInputValue('');

    setIsGenerating(true);

    try {
      if (conversationStage === 'topic') {
        setCourseTopic(userMessage);
        addMessage('assistant', `Отлично! Курс будет про "${userMessage}". Какой уровень сложности? (Начинающий / Средний / Продвинутый)`);
        setConversationStage('level');
      } else if (conversationStage === 'level') {
        const levelMap: Record<string, string> = {
          'начинающий': 'beginner',
          'средний': 'intermediate',
          'продвинутый': 'advanced',
          'beginner': 'beginner',
          'intermediate': 'intermediate',
          'advanced': 'advanced',
        };
        const normalizedLevel = userMessage.toLowerCase();
        const level = levelMap[normalizedLevel] || 'intermediate';

        setCourseSettings({
          level: level === 'beginner' ? 'Начинающий' : level === 'advanced' ? 'Продвинутый' : 'Средний',
          difficulty: level,
          duration: '4 недели',
          format: 'Онлайн',
          intensity: 'Средняя',
        });

        if (referenceFiles.length === 0) {
          addMessage('assistant', 'Хорошо! Хотите прикрепить файлы для использования в курсе? (Нажмите на иконку файла или просто напишите "нет" для продолжения)');
          setConversationStage('files');
        } else {
          setConversationStage('ready');
          await generateCourseFromChat();
        }
      } else if (conversationStage === 'files') {
        if (userMessage.toLowerCase().includes('нет') || userMessage.toLowerCase().includes('продолжить')) {
          setConversationStage('ready');
          await generateCourseFromChat();
        } else {
          addMessage('assistant', 'Используйте кнопку загрузки файлов или напишите "продолжить" для генерации курса.');
        }
      }
    } catch (error: any) {
      console.error('Error in chat:', error);
      addMessage('assistant', `Извините, произошла ошибка: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCourseFromChat = async () => {
    if (!courseTopic || !courseSettings) return;

    addMessage('assistant', 'Отлично! Начинаю генерацию курса. Это может занять минуту...');
    setIsGenerating(true);

    try {
      const settings = {
        ...courseSettings,
        preferences: `Курс создан через чат. Тема: ${courseTopic}`,
        referenceFiles: referenceFiles.length > 0 ? referenceFiles : undefined,
      };

      const course = await generateCourse(courseTopic, settings);
      setGeneratedCourse(course);
      regenerateGraph();

      addMessage('assistant', `✅ Курс "${course.title}" успешно создан! Вы можете просмотреть его сейчас.`);
      addMessage('system', 'Курс готов к просмотру. Нажмите на карточку курса для детального просмотра.');

      // Reset for next course
      setConversationStage('topic');
      setCourseTopic('');
      setCourseSettings(null);
      setReferenceFiles([]);
    } catch (error: any) {
      console.error('Error generating course:', error);
      addMessage('assistant', `Ошибка при генерации курса: ${error.message || 'Попробуйте еще раз'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartNewCourse = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Привет! Я помогу вам создать курс. О чем будет курс?',
        timestamp: new Date(),
      },
    ]);
    setCourseTopic('');
    setCourseSettings(null);
    setReferenceFiles([]);
    setConversationStage('topic');
    setGeneratedCourse(null);
  };

  const handleViewCourse = (course: Course) => {
    setSelectedCourseId(course.id);
    setCurrentPage('course');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#262626] bg-[#141414] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Генератор курсов</h1>
            <p className="text-sm text-gray-400">Создайте курс через диалог</p>
          </div>
        </div>
        {generatedCourse && (
          <button
            onClick={handleStartNewCourse}
            className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Новый курс
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : message.role === 'system'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-[#1a1a1a] text-gray-200 border border-[#262626]'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-gray-300">
                  {user?.username?.substring(0, 2).toUpperCase() || 'ВЫ'}
                </span>
              </div>
            )}
          </motion.div>
        ))}

        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="text-emerald-400 animate-spin" />
                <span className="text-sm text-gray-400">Генерирую курс...</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Generated Course Preview */}
        {generatedCourse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6"
          >
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <BookOpen size={24} className="text-emerald-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{generatedCourse.title}</h3>
                  <p className="text-sm text-gray-400 mb-4">{generatedCourse.description}</p>
                  <button
                    onClick={() => handleViewCourse(generatedCourse)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Открыть курс
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Reference Files List */}
        {referenceFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-500 font-semibold">Прикрепленные файлы:</p>
            {referenceFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-400 bg-[#141414] px-3 py-2 rounded-lg">
                <FileText size={16} />
                <span>{file.name}</span>
                <button
                  onClick={() => setReferenceFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="ml-auto text-gray-500 hover:text-red-400"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[#262626] bg-[#141414] p-4">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            accept=".txt,.md,.pdf,.doc,.docx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-[#262626] hover:bg-[#333] text-gray-300 rounded-xl transition-colors flex-shrink-0"
            title="Прикрепить файлы"
          >
            <FileText size={20} />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Напишите сообщение..."
            disabled={isGenerating}
            className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#262626] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isGenerating}
            className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
        {referenceFiles.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Файлы будут использованы при создании курса. Всего: {referenceFiles.length}
          </p>
        )}
      </div>
    </div>
  );
}


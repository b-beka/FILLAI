'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Sparkles, BookOpen, Users, CheckCircle2, Star, ArrowRight,
  Zap, Target, Clock, Brain, Award, Network, Menu, X,
  TrendingUp, BarChart3, DollarSign, Heart, Coffee, Moon,
  Briefcase, GraduationCap, MessageSquare, Infinity, Play
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

export default function LandingPage() {
  const { setCurrentPage } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTryFree = () => {
    setCurrentPage('login');
  };

  const testimonials = [
    {
      name: "Алексей Смирнов",
      role: "Преподаватель истории, ВШЭ",
      avatar: "https://i.pravatar.cc/150?u=alex",
      text: "Fill AI изменил мой подход к лекциям. Теперь я трачу 15 минут на то, что раньше занимало выходные. Презентации выглядят так, будто их делала студия дизайна.",
      rating: 5
    },
    {
      name: "Елена Кузнецова",
      role: "Учитель физики, Лицей №1",
      avatar: "https://i.pravatar.cc/150?u=elena",
      text: "Мои ученики в восторге от интерактивных тестов. Геймификация реально работает — вовлеченность выросла в разы. Спасибо разработчикам!",
      rating: 5
    },
    {
      name: "Дмитрий Волков",
      role: "Бизнес-тренер",
      avatar: "https://i.pravatar.cc/150?u=dima",
      text: "Использую для корпоративных тренингов. Генерация кейсов и симуляций — киллер-фича. Клиенты думают, я готовил это неделю.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-black border border-white/10 shadow-lg shadow-emerald-900/20">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Fill AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">Возможности</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Как это работает</a>
            <a href="#reviews" className="hover:text-white transition-colors">Отзывы</a>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentPage('login')} className="hidden md:block text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Войти
            </button>
            <button onClick={handleTryFree} className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              Попробовать бесплатно
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-300">
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] -z-10 mix-blend-screen animate-pulse-slow" />
        <div className="absolute top-40 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] -z-10 mix-blend-screen" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
              <Sparkles size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-emerald-200">ИИ-ассистент для образования №1</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
              Создавайте курсы <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">силой мысли.</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              Забудьте о рутине. Fill AI генерирует презентации, тесты и интерактивные задания за секунды.
              Вы — творец, ИИ — ваш инструмент.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button onClick={handleTryFree} className="w-full sm:w-auto px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold rounded-2xl transition-all shadow-xl shadow-emerald-900/50 flex items-center justify-center gap-3 transform hover:scale-105">
                <Zap className="fill-current" size={20} />
                Создать курс бесплатно
              </button>
              <button className="w-full sm:w-auto px-10 py-5 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-white text-lg font-medium rounded-2xl transition-all flex items-center justify-center gap-3">
                <Play size={20} />
                Демо видео
              </button>
            </div>

            {/* Social Proof */}
            <div className="mt-16 flex items-center justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Fake Logos */}
              <span className="text-xl font-bold font-serif">Harvard</span>
              <span className="text-xl font-bold font-mono">MIT</span>
              <span className="text-xl font-bold">Stanford</span>
              <span className="text-xl font-bold font-sans">Coursera</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="py-24 bg-[#0a0a0a] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(16,185,129,0.1)] group">
            {/* Mock UI */}
            <div className="absolute inset-0 bg-[#111]">
              <div className="absolute top-0 left-0 right-0 h-14 bg-[#1a1a1a] border-b border-[#333] flex items-center px-6 gap-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
              </div>

              {/* Content Area */}
              <div className="p-12 flex gap-12 h-full pt-20">
                {/* Visual */}
                <div className="flex-1 bg-[#222] rounded-2xl animate-pulse-slow flex items-center justify-center text-gray-600 border border-[#333]">
                  <div className="text-center">
                    <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                    <p>AI Generating Course Structure...</p>
                  </div>
                </div>
                {/* Text lines */}
                <div className="w-1/3 space-y-4">
                  <div className="h-8 bg-[#333] rounded w-3/4" />
                  <div className="h-4 bg-[#222] rounded w-full" />
                  <div className="h-4 bg-[#222] rounded w-5/6" />
                  <div className="h-4 bg-[#222] rounded w-4/5" />
                  <div className="mt-8 flex gap-2">
                    <div className="h-10 bg-emerald-600/20 rounded w-1/3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent" />
            <div className="absolute bottom-12 left-12 right-12 text-center">
              <h3 className="text-2xl font-bold mb-2">Интерфейс будущего</h3>
              <p className="text-gray-400">Чистый, сфокусированный, мощный.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 md:px-0 bg-[#050505] relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 animate-on-scroll">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Возможности без границ</h2>
            <p className="text-xl text-gray-400">Всё, что нужно для современного образования</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Brain, title: "Умная Структура", desc: "ИИ анализирует тему и строит идеальный педагогический маршрут." },
              { icon: MessageSquare, title: "ИИ-Тьютор", desc: "Персональный ассистент отвечает на вопросы учеников 24/7." },
              { icon: BarChart3, title: "Глубокая Аналитика", desc: "Понимайте, где ученики теряют интерес или не понимают тему." },
              { icon: Zap, title: "Мгновенные Тесты", desc: "Автоматическая генерация и проверка заданий любого типа." },
              { icon: Play, title: "Видео и Медиа", desc: "Автоматический подбор релевантных видео и изображений." },
              { icon: Target, title: "Персонализация", desc: "Адаптация сложности курса под уровень каждого ученика." }
            ].map((feature, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-[#111] border border-[#222] hover:border-emerald-500/30 transition-all hover:bg-[#151515] group">
                <div className="w-14 h-14 rounded-2xl bg-[#222] flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                  <feature.icon size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed font-light">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="py-32 bg-[#0a0a0a] border-t border-[#222]">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center">Им доверяют</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="p-8 rounded-3xl bg-[#111] border border-[#222] relative">
                <div className="absolute -top-6 left-8 bg-[#1a1a1a] p-2 rounded-xl border border-[#333]">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, j) => <Star key={j} size={16} className="fill-emerald-500 text-emerald-500" />)}
                  </div>
                </div>
                <p className="text-gray-300 mb-8 mt-4 leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full border-2 border-[#333]" />
                  <div>
                    <h4 className="font-bold text-white">{t.name}</h4>
                    <p className="text-sm text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-br from-emerald-900 via-[#0a0a0a] to-black border border-emerald-900/50 p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">Готовы изменить образование?</h2>
            <p className="text-xl text-emerald-100/60 mb-12 max-w-2xl mx-auto">Присоединяйтесь к тысячам преподавателей, которые уже используют Fill AI.</p>
            <button onClick={handleTryFree} className="px-12 py-6 bg-white text-black text-xl font-bold rounded-full hover:bg-emerald-50 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] transform hover:scale-105">
              Начать бесплатно
            </button>
            <p className="mt-6 text-sm text-gray-500">Кредитная карта не требуется • 14 дней пробный период</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#222] text-center text-gray-500 text-sm">
        <p>© 2026 Fill AI. Все права защищены. Сделано с любовью к знаниям.</p>
      </footer>
    </div>
  );
}

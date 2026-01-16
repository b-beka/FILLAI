'use client';

import { motion } from 'framer-motion';
import { BookOpen, Users, User, Network, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen, showGraph, showCommunity } = useUIStore();
  const { user } = useAuth();

  // Simplified sidebar items - только библиотека и профиль
  const sidebarItems: SidebarItem[] = [
    { id: 'library', label: 'Мои курсы', icon: <BookOpen size={20} /> },
    // Community скрыт через флаг showCommunity
    ...(showCommunity ? [{ id: 'community', label: 'Коммьюнити', icon: <Users size={20} /> }] : []),
    { id: 'profile', label: 'Профиль', icon: <User size={20} /> },
  ];

  // Когда панель закрыта — показываем только маленькую кнопку у левого края экрана
  if (!sidebarOpen) {
    return (
      <motion.button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-24 left-4 z-50 p-3 bg-[#252525] border border-[#3a3a3a] rounded-full text-gray-200 hover:text-white hover:bg-[#2d2d2d] transition-colors shadow-xl flex items-center gap-2"
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.96 }}
      >
        <ChevronRight size={20} />
        <span className="text-sm font-semibold tracking-wide">Меню</span>
      </motion.button>
    );
  }

  return (
    <motion.aside
      className="relative z-40 flex-shrink-0 bg-[#0a0a0a] border-r border-[#262626] flex flex-col h-full w-80 shadow-2xl overflow-hidden"
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -40, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.05),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(14,165,233,0.05),transparent_50%)]"></div>

      {/* Основная навигация */}
      <nav className="flex-1 px-7 py-8 space-y-3 pt-20">
        {/* Главная страница - чат для генерации курсов */}
        <motion.button
          onClick={() => setCurrentPage('chat')}
          className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-left transition-colors relative group mb-2 ${currentPage === 'chat'
            ? 'text-white bg-[#2d2d2d]'
            : 'text-gray-200 hover:text-white hover:bg-[#2d2d2d]/60'
            }`}
        >
          <Sparkles size={22} className="text-emerald-400" />
          <span className="text-[15px] font-semibold">Создать курс</span>
        </motion.button>

        {/* Граф знаний - скрыт через флаг showGraph */}
        {showGraph && (
          <motion.button
            onClick={() => setCurrentPage('graph')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-left transition-colors relative group mb-2 ${currentPage === 'graph'
              ? 'text-white bg-[#2d2d2d]'
              : 'text-gray-200 hover:text-white hover:bg-[#2d2d2d]/60'
              }`}
          >
            <Network size={22} />
            <span className="text-[15px] font-semibold">Граф знаний</span>
          </motion.button>
        )}

        {sidebarItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => setCurrentPage(item.id as 'library' | 'community' | 'profile')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-left transition-colors relative group ${currentPage === item.id
              ? 'text-white bg-[#2d2d2d]'
              : 'text-gray-200 hover:text-white hover:bg-[#2d2d2d]/40'
              }`}
            whileHover={{ x: 4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <span className={`relative z-10 ${currentPage === item.id ? 'text-white' : 'text-gray-300 group-hover:text-gray-200'}`}>
              {item.icon}
            </span>
            <span className="relative z-10 font-semibold text-[15px]">{item.label}</span>
          </motion.button>
        ))}
      </nav>

      {/* Профиль внизу */}
      <motion.div
        className="px-7 py-5 border-t border-[#3a3a3a]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-11 h-11 rounded-full bg-[#2d2d2d] flex items-center justify-center text-gray-100 font-semibold text-sm overflow-hidden"
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.username || 'User'} className="w-full h-full object-cover" />
            ) : (
              <span>{user?.username?.[0]?.toUpperCase() || 'ID'}</span>
            )}
          </motion.div>
          <div>
            <div className="text-gray-100 font-semibold text-sm leading-tight">{user?.full_name || user?.username || 'Гость'}</div>
            <div className="text-gray-400 text-[11px]">{user?.email || 'Войдите в аккаунт'}</div>
          </div>
        </div>
      </motion.div>

      {/* Кнопка закрытия, "прилипшая" к правому краю панели */}
      <motion.button
        onClick={() => setSidebarOpen(false)}
        className="absolute top-7 -right-4 z-50 p-2.5 bg-[#252525] border border-[#3a3a3a] rounded-full text-gray-300 hover:text-white hover:bg-[#2d2d2d] transition-colors shadow-lg flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Закрыть панель"
      >
        <ChevronLeft size={18} />
      </motion.button>
    </motion.aside>
  );
}

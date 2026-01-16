'use client';

import Sidebar from '@/components/Sidebar';
import GraphCanvas from '@/components/GraphCanvas';
import FloatingPanel from '@/components/FloatingPanel';
import SearchBar from '@/components/SearchBar';
import BackgroundEnvironment from '@/components/BackgroundEnvironment';
import JasperAssistant from '@/components/JasperAssistant';
import ChatInterface from '@/components/ChatInterface';
import CourseCreationWizard from '@/components/CourseCreationWizard';
import CommunityPage from '@/pages/CommunityPage';
import LibraryPage from '@/pages/LibraryPage';
import ProfilePage from '@/pages/ProfilePage';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import CoursePage from '@/components/CoursePage';
import TopBar from '@/components/TopBar';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function Home() {
  const { currentPage, setCurrentPage } = useUIStore();
  const { isAuthenticated, loading } = useAuth();

  // Redirect to landing if not authenticated and not already on landing/login
  useEffect(() => {
    if (!loading && !isAuthenticated && currentPage !== 'landing' && currentPage !== 'login') {
      setCurrentPage('landing');
    }
    // Если авторизован и на главной - переключаем на чат
    if (!loading && isAuthenticated && currentPage === 'landing') {
      setCurrentPage('chat');
    }
  }, [isAuthenticated, loading, currentPage, setCurrentPage]);

  // Show landing without sidebar and topbar
  if (currentPage === 'landing') {
    return <LandingPage />;
  }

  // Show course page fullscreen
  if (currentPage === 'course') {
    return <CoursePage />;
  }

  // Показываем страницу логина
  if (currentPage === 'login') {
    return <LoginPage />;
  }

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#1a1a1a] flex flex-col">
      {/* Top Bar */}
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="flex-1 relative bg-[#1a1a1a]">
          {/* Background Graph - hide on chat/wizard page to avoid clutter */}
          {currentPage !== 'chat' && (
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
              <BackgroundEnvironment />
            </div>
          )}

          <div className="absolute inset-0 z-10 flex flex-col">
            {currentPage === 'chat' ? (
              <CourseCreationWizard />
            ) : currentPage === 'graph' ? (
              <div className="relative w-full h-full flex items-center justify-center text-gray-500">
                {/* Global Graph disabled for now */}
                <div>Граф знаний доступен внутри курсов</div>
              </div>
            ) : currentPage === 'community' ? (
              <CommunityPage />
            ) : currentPage === 'library' ? (
              <LibraryPage />
            ) : currentPage === 'profile' ? (
              <ProfilePage />
            ) : null}
          </div>

        </div>
      </div>
      {/* Глобальный ИИ-помощник Джаспер */}
      <JasperAssistant />
    </main>
  );
}


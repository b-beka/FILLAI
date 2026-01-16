import { create } from 'zustand';

interface UIState {
  cursorPosition: { x: number; y: number };
  panelVisible: boolean;
  panelPosition: { x: number; y: number };
  searchQuery: string;
  currentPage: 'landing' | 'graph' | 'library' | 'community' | 'profile' | 'login' | 'course' | 'chat';
  sidebarOpen: boolean;
  selectedCourseId: string | null;
  // Feature flags for hiding features
  showGraph: boolean;
  showCommunity: boolean;
  setCursorPosition: (x: number, y: number) => void;
  showPanel: (x: number, y: number) => void;
  hidePanel: () => void;
  updatePanelPosition: (x: number, y: number) => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: 'landing' | 'graph' | 'library' | 'community' | 'profile' | 'login' | 'course' | 'chat') => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedCourseId: (courseId: string | null) => void;
  subscriptionModalOpen: boolean;
  setSubscriptionModalOpen: (open: boolean) => void;
  activeTool: 'move' | 'mark-green' | 'mark-red' | 'group';
  setActiveTool: (tool: 'move' | 'mark-green' | 'mark-red' | 'group') => void;
}

export const useUIStore = create<UIState>((set) => ({
  cursorPosition: { x: 0, y: 0 },
  panelVisible: false,
  panelPosition: { x: 100, y: 100 },
  searchQuery: '',
  currentPage: 'chat',
  sidebarOpen: true,
  selectedNodeId: null,
  selectedCourseId: null,
  // Feature flags - скрываем граф и коммьюнити
  showGraph: false,
  showCommunity: false,

  setCursorPosition: (x, y) => set({ cursorPosition: { x, y } }),

  showPanel: (x, y) =>
    set({
      panelVisible: true,
      panelPosition: { x, y },
    }),

  hidePanel: () => set({ panelVisible: false }),

  updatePanelPosition: (x, y) => set({ panelPosition: { x, y } }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setCurrentPage: (page) => set({ currentPage: page }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setSelectedCourseId: (courseId) => set({ selectedCourseId: courseId }),

  subscriptionModalOpen: false,
  setSubscriptionModalOpen: (open) => set({ subscriptionModalOpen: open }),

  activeTool: 'move',
  setActiveTool: (tool) => set({ activeTool: tool }),
}));

import { create } from 'zustand';
import { GraphState, Node, Link, StickyNote } from '@/types/graph';
import { PhysicsEngine } from '@/lib/physicsEngine';
import { coursesApi, categoriesApi, ApiCourse, ApiCategory } from '@/services/apiClient';
import { adaptApiDataToGraph } from '@/services/graphAdapter';

interface GraphStore extends GraphState {
  // Data
  nodes: Node[];
  links: Link[];
  rawCourses: ApiCourse[];
  rawCategories: ApiCategory[];
  notes: StickyNote[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchGraphData: () => Promise<void>;
  setNodes: (nodes: Node[]) => void;
  setLinks: (links: Link[]) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  renameNode: (id: string, newLabel: string) => void;
  selectNode: (id: string | null) => void;
  startDrag: (id: string) => void;
  stopDrag: () => void;
  updatePhysics: (engine: PhysicsEngine, cursorX?: number, cursorY?: number) => void;
  getNodes: () => Node[];
  resetGraph: () => void;
  regenerateGraph: () => void;
  centerGraph: () => void;
  saveNodePositions: () => void;
  loadNodePositions: () => Record<string, { x: number; y: number }>;
  loadNotes: () => StickyNote[]; // Internal helper exposed if needed
  expandedCategories: Set<string>;
  toggleCategory: (categoryId: string) => void;
  isCategoryExpanded: (categoryId: string) => boolean;
  toggleNodeMark: (nodeId: string, color?: string) => void;
  addNote: (note: StickyNote) => void;
  updateNote: (id: string, updates: Partial<StickyNote>) => void;
  deleteNote: (id: string) => void;
  isHeatmapMode: boolean;
  toggleHeatmapMode: () => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  links: [],
  rawCourses: [],
  rawCategories: [],
  notes: [],
  isLoading: false,
  error: null,
  selectedNodeId: null,
  isDragging: false,
  dragNodeId: null,
  expandedCategories: new Set<string>(),

  fetchGraphData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [courses, categories, myCourses, enrolledCourses] = await Promise.all([
        coursesApi.list(),
        categoriesApi.list(),
        coursesApi.getMyCourses().catch(() => []),
        coursesApi.getEnrolledCourses().catch(() => [])
      ]);

      // Merge unique courses
      const allCoursesMap = new Map();
      [...courses, ...myCourses, ...enrolledCourses].forEach(c => {
        allCoursesMap.set(c.id, c);
      });
      const uniqueCourses = Array.from(allCoursesMap.values());

      set({ rawCourses: uniqueCourses, rawCategories: categories });

      // Auto-expand all categories by default so courses are visible
      const allCategoryIds = new Set(categories.map(c => c.id));
      set({ expandedCategories: allCategoryIds });

      get().regenerateGraph();
    } catch (err: any) {
      console.error("Failed to fetch graph data:", err);
      set({ error: err.message || 'Failed to load graph data' });
    } finally {
      set({ isLoading: false });
    }
  },

  setNodes: (nodes) => set({ nodes }),
  setLinks: (links) => set({ links }),

  updateNode: (id, updates) =>
    set((state) => {
      const newNodes = state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      );
      if (updates.x !== undefined || updates.y !== undefined) {
        get().saveNodePositions();
      }
      return { nodes: newNodes };
    }),

  renameNode: (id, newLabel) =>
    set((state) => {
      const newNodes = state.nodes.map((node) =>
        node.id === id ? { ...node, label: newLabel } : node
      );
      // Logic for saving renames can be re-added here if backend supports it
      return { nodes: newNodes };
    }),

  selectNode: (id) => set({ selectedNodeId: id }),
  startDrag: (id) => set({ isDragging: true, dragNodeId: id }),
  stopDrag: () => set({ isDragging: false, dragNodeId: null }),

  updatePhysics: (engine, cursorX, cursorY) => {
    // Determine if we should apply forces. 
    // If not dragging, and we have an engine, update it.
    // The engine update logic usually modifies node positions in place (if they are objects ref), 
    // but Zustand needs immutable updates to trigger re-renders. 
    // However, for high-frequency physics, we often mutate refs and only sync to state occasionally 
    // OR we put physics in a ref and sync.
    // The existing implementation seemed to pass engine around.

    // For now, keep it simple stub or similar to previous if generic.
    // Previous implementation called engine.update() and seemed to rely on GraphCanvas animation loop to re-read nodes? 
    // Actually GraphStore `updatePhysics` implementation was:
    // set((state) => { engine.update(...); return { nodes: [...engine.nodes] } }) ?
    // The previous implementation was:
    /*
      updatePhysics: (engine, cursorX, cursorY) => {
         // ... implementation details weren't fully shown in my view_code but hinted ...
         // Wait, the previous view_code for graphStore.ts had `updatePhysics: () => { return; }` // Disabled!
      }
    */
    // So I will keep it disabled or minimal for now until "Constructor Mode" needs it.
  },

  resetGraph: () => set({ nodes: [], links: [], expandedCategories: new Set() }),

  regenerateGraph: () => {
    const state = get();
    // Use adapter
    const { nodes, links } = adaptApiDataToGraph(state.rawCourses, state.rawCategories, state.expandedCategories);

    // Load positions
    const savedPositions = get().loadNodePositions();
    const savedNotes = get().loadNotes();
    if (savedNotes) {
      set({ notes: savedNotes });
    }
    const nodesWithPositions = nodes.map(node => {
      if (node.type === 'center') return node;
      const saved = savedPositions[node.id];
      if (saved) {
        return { ...node, x: saved.x, y: saved.y };
      }
      return node;
    });

    set({ nodes: nodesWithPositions, links });
  },

  centerGraph: () => {
    // Re-run generation but keep positions (or reset? "Center" usually implies reset view or pan. 
    // Previous impl reset positions to calculated ones EXCEPT saved ones? Setup was complex.
    // Simple version: just regenerate.
    get().regenerateGraph();
  },

  saveNodePositions: () => {
    if (typeof window === 'undefined') return;
    const state = get();
    try {
      const positions: Record<string, { x: number; y: number }> = {};
      state.nodes.forEach(node => {
        if (node.type !== 'center') {
          positions[node.id] = { x: node.x, y: node.y };
        }
      });
      const notes = state.notes;
      localStorage.setItem('graph_node_positions', JSON.stringify(positions));
      localStorage.setItem('graph_notes', JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving positions:', error);
    }
  },

  loadNodePositions: () => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('graph_node_positions');
      if (saved) {
        return JSON.parse(saved) as Record<string, { x: number; y: number }>;
      }
    } catch (error) {
      console.error('Error loading positions:', error);
    }
    return {};
  },

  loadNotes: () => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('graph_notes');
      if (saved) {
        return JSON.parse(saved) as StickyNote[];
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
    return [];
  },

  toggleCategory: (categoryId: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedCategories);
      if (newExpanded.has(categoryId)) {
        newExpanded.delete(categoryId);
      } else {
        newExpanded.add(categoryId);
      }
      return { expandedCategories: newExpanded };
    });
    // Valid to call get() here? Yes.
    get().regenerateGraph();
  },

  isCategoryExpanded: (categoryId: string) => {
    return get().expandedCategories.has(categoryId);
  },

  toggleNodeMark: (nodeId, color) => {
    set((state) => {
      const newNodes = state.nodes.map((node) => {
        if (node.id === nodeId) {
          // If already marked with same color, unmark. If different color/not marked, mark.
          const isSameColor = node.marked && node.markColor === color;
          return {
            ...node,
            marked: !isSameColor,
            markColor: isSameColor ? undefined : color
          };
        }
        return node;
      });
      return { nodes: newNodes };
    });
  },

  getNodes: () => get().nodes,

  addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),

  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map(n => n.id === id ? { ...n, ...updates } : n)
  })),

  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter(n => n.id !== id)
  })),

  isHeatmapMode: false,
  toggleHeatmapMode: () => set((state) => ({ isHeatmapMode: !state.isHeatmapMode })),
}));

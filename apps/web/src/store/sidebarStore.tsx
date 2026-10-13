import { create } from "zustand";

interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  isPermanentlyClosed: boolean;
  closeSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
}

const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: true, // Começa aberto por padrão
  isCollapsed: false,
  isPermanentlyClosed: false,
  closeSidebar: () => set({ isOpen: false, isPermanentlyClosed: true }),
  setSidebarOpen: (open: boolean) => set((state) => ({ 
    isOpen: state.isPermanentlyClosed ? false : open 
  })),
  collapseSidebar: () => set({ isOpen: false, isCollapsed: true }),
  expandSidebar: () => set((state) => ({ 
    isOpen: state.isPermanentlyClosed ? false : true, 
    isCollapsed: false 
  })),
}));

export default useSidebarStore;

import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';

interface UiState {
  selectedSessionId: string | null;
  theme: ThemeMode;
  sidebarOpen: boolean;
  sidebarArchivedOpen: boolean;
  setSelectedSessionId: (sessionId: string | null) => void;
  toggleTheme: () => void;
  setSidebarOpen: (value: boolean) => void;
  setSidebarArchivedOpen: (value: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedSessionId: null,
  theme: 'light',
  sidebarOpen: false,
  sidebarArchivedOpen: false,
  setSelectedSessionId: (selectedSessionId) => set({ selectedSessionId }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSidebarArchivedOpen: (sidebarArchivedOpen) => set({ sidebarArchivedOpen }),
}));

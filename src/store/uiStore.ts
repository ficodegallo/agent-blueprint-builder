import { create } from 'zustand';

interface UIState {
  // Selection state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  focusNodeId: string | null;

  // Panel visibility
  isDetailPanelOpen: boolean;
  isTemplatePanelOpen: boolean;
  isValidationPanelOpen: boolean;
  isHeaderExpanded: boolean;

  // Dialogs
  activeDialog: 'export' | 'import' | 'saveLoad' | 'newBlueprint' | 'smartImport' | 'apiKeySettings' | 'aiPromptAdmin' | null;

  // Actions
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  focusNode: (id: string) => void;
  clearSelection: () => void;

  toggleDetailPanel: () => void;
  toggleTemplatePanel: () => void;
  toggleValidationPanel: () => void;
  toggleHeader: () => void;

  setDetailPanelOpen: (open: boolean) => void;
  setTemplatePanelOpen: (open: boolean) => void;
  setValidationPanelOpen: (open: boolean) => void;
  setHeaderExpanded: (expanded: boolean) => void;

  openDialog: (dialog: UIState['activeDialog']) => void;
  closeDialog: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  selectedNodeId: null,
  selectedEdgeId: null,
  focusNodeId: null,
  isDetailPanelOpen: true,
  isTemplatePanelOpen: true,
  isValidationPanelOpen: false,
  isHeaderExpanded: false,
  activeDialog: null,

  // Selection actions
  selectNode: (id) =>
    set({
      selectedNodeId: id,
      selectedEdgeId: null,
      isDetailPanelOpen: id !== null,
    }),

  selectEdge: (id) =>
    set({
      selectedNodeId: null,
      selectedEdgeId: id,
    }),

  focusNode: (id) =>
    set({
      selectedNodeId: id,
      selectedEdgeId: null,
      isDetailPanelOpen: true,
      focusNodeId: id,
    }),

  clearSelection: () =>
    set({
      selectedNodeId: null,
      selectedEdgeId: null,
    }),

  // Panel toggle actions
  toggleDetailPanel: () =>
    set((state) => ({ isDetailPanelOpen: !state.isDetailPanelOpen })),

  toggleTemplatePanel: () =>
    set((state) => ({ isTemplatePanelOpen: !state.isTemplatePanelOpen })),

  toggleValidationPanel: () =>
    set((state) => ({ isValidationPanelOpen: !state.isValidationPanelOpen })),

  toggleHeader: () =>
    set((state) => ({ isHeaderExpanded: !state.isHeaderExpanded })),

  // Panel set actions
  setDetailPanelOpen: (open) => set({ isDetailPanelOpen: open }),
  setTemplatePanelOpen: (open) => set({ isTemplatePanelOpen: open }),
  setValidationPanelOpen: (open) => set({ isValidationPanelOpen: open }),
  setHeaderExpanded: (expanded) => set({ isHeaderExpanded: expanded }),

  // Dialog actions
  openDialog: (dialog) => set({ activeDialog: dialog }),
  closeDialog: () => set({ activeDialog: null }),
}));

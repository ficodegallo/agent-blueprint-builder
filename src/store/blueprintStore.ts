import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { BlueprintMetadata, Status, ChangeLogEntry } from '../types';

interface BlueprintState extends BlueprintMetadata {
  // Actions
  updateMetadata: (partial: Partial<BlueprintMetadata>) => void;
  setStatus: (status: Status) => void;
  addChangeLogEntry: (description: string, author?: string) => void;
  reset: () => void;
  loadFromData: (data: BlueprintMetadata) => void;
}

const createDefaultMetadata = (): BlueprintMetadata => ({
  id: uuidv4(),
  title: 'Untitled Blueprint',
  description: '',
  impactedAudiences: [],
  businessBenefits: [],
  clientContacts: [],
  createdBy: '',
  lastModifiedBy: '',
  lastModifiedDate: new Date().toISOString(),
  version: '1.0',
  status: 'Draft',
  changeLog: [],
});

export const useBlueprintStore = create<BlueprintState>((set) => ({
  ...createDefaultMetadata(),

  updateMetadata: (partial) =>
    set((state) => ({
      ...state,
      ...partial,
      lastModifiedDate: new Date().toISOString(),
    })),

  setStatus: (status) =>
    set((state) => {
      const entry: ChangeLogEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        author: state.lastModifiedBy || 'System',
        description: `Status changed from "${state.status}" to "${status}"`,
      };
      return {
        status,
        lastModifiedDate: new Date().toISOString(),
        changeLog: [...state.changeLog, entry],
      };
    }),

  addChangeLogEntry: (description, author) =>
    set((state) => {
      const entry: ChangeLogEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        author: author || state.lastModifiedBy || 'System',
        description,
      };
      return {
        changeLog: [...state.changeLog, entry],
        lastModifiedDate: new Date().toISOString(),
      };
    }),

  reset: () => set(createDefaultMetadata()),

  loadFromData: (data) => set({ ...data }),
}));

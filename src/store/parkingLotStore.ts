import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ParkingLotItem } from '../types';

interface ParkingLotState {
  items: ParkingLotItem[];

  addItem: (item: Omit<ParkingLotItem, 'id' | 'createdAt' | 'updatedAt' | 'resolvedAt'>) => string;
  updateItem: (id: string, updates: Partial<ParkingLotItem>) => void;
  deleteItem: (id: string) => void;
  setItems: (items: ParkingLotItem[]) => void;
  reset: () => void;
}

export const useParkingLotStore = create<ParkingLotState>((set) => ({
  items: [],

  addItem: (item) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const newItem: ParkingLotItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };

    set((state) => ({
      items: [...state.items, newItem],
    }));

    return id;
  },

  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, ...updates, updatedAt: new Date().toISOString() };

        // Auto-stamp resolvedAt when status changes to Resolved
        if (updates.status === 'Resolved' && item.status !== 'Resolved') {
          updated.resolvedAt = new Date().toISOString();
        }
        // Clear resolvedAt when status changes from Resolved
        if (updates.status && updates.status !== 'Resolved' && item.status === 'Resolved') {
          updated.resolvedAt = null;
        }

        return updated;
      }),
    })),

  deleteItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  setItems: (items) => set({ items }),

  reset: () => set({ items: [] }),
}));

// Selectors
export const selectUnresolvedParkingLotCount = (state: ParkingLotState) =>
  state.items.filter((item) => item.status !== 'Resolved').length;

export const selectUnresolvedParkingLotCountForNode =
  (nodeId: string) => (state: ParkingLotState) =>
    state.items.filter(
      (item) => item.linkedNodeId === nodeId && item.status !== 'Resolved'
    ).length;

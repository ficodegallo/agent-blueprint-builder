import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { EvalItem } from '../types';

/** Content fields — changing one of these on an AI eval marks it edited. */
const CONTENT_FIELDS: Array<keyof EvalItem> = [
  'title',
  'dimension',
  'graderType',
  'question',
  'passCriteria',
  'dataNeeded',
  'failureMode',
  'linkedNodeId',
  'priority',
];

type NewEvalItem = Omit<EvalItem, 'id' | 'createdAt' | 'updatedAt' | 'edited'> &
  Partial<Pick<EvalItem, 'edited'>>;

interface EvalsState {
  items: EvalItem[];

  addItem: (item: NewEvalItem) => string;
  /** Bulk-insert generated proposals; existing items are left untouched. */
  addProposals: (items: EvalItem[]) => void;
  updateItem: (id: string, updates: Partial<EvalItem>) => void;
  deleteItem: (id: string) => void;
  setItems: (items: EvalItem[]) => void;
  reset: () => void;
}

export const useEvalsStore = create<EvalsState>((set) => ({
  items: [],

  addItem: (item) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const newItem: EvalItem = {
      ...item,
      edited: item.edited ?? false,
      id,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ items: [...state.items, newItem] }));

    return id;
  },

  addProposals: (proposals) =>
    set((state) => ({ items: [...state.items, ...proposals] })),

  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) return item;

        // An AI-generated eval is "edited" once a person changes its content.
        // Review actions (accept/dismiss) are status-only and don't count.
        const contentChanged = CONTENT_FIELDS.some(
          (field) => field in updates && updates[field] !== item[field]
        );

        return {
          ...item,
          ...updates,
          edited: item.edited || (item.origin === 'ai' && contentChanged),
          updatedAt: new Date().toISOString(),
        };
      }),
    })),

  deleteItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

  setItems: (items) => set({ items }),

  reset: () => set({ items: [] }),
}));

// Selectors
export const selectAcceptedEvalCount = (state: EvalsState) =>
  state.items.filter((item) => item.status === 'accepted').length;

export const selectProposedEvalCount = (state: EvalsState) =>
  state.items.filter((item) => item.status === 'proposed').length;

/** Accepted + proposed — what the header badge and the W012 check care about. */
export const selectActiveEvalCount = (state: EvalsState) =>
  state.items.filter((item) => item.status !== 'dismissed').length;

export const selectEvalCountForNode = (nodeId: string) => (state: EvalsState) =>
  state.items.filter(
    (item) => item.linkedNodeId === nodeId && item.status !== 'dismissed'
  ).length;

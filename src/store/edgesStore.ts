import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  applyEdgeChanges,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from '@xyflow/react';
import type { BlueprintEdge, EdgeData } from '../types';

interface EdgesState {
  edges: BlueprintEdge[];

  // Actions
  addEdge: (edge: BlueprintEdge) => void;
  updateEdge: (id: string, data: Partial<EdgeData>) => void;
  deleteEdge: (id: string) => void;
  setEdges: (edges: BlueprintEdge[]) => void;
  onEdgesChange: OnEdgesChange<BlueprintEdge>;
  onConnect: OnConnect;
  getEdge: (id: string) => BlueprintEdge | undefined;
  getEdgesForNode: (nodeId: string) => BlueprintEdge[];
  reset: () => void;
}

export const useEdgesStore = create<EdgesState>((set, get) => ({
  edges: [],

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  updateEdge: (id, data) =>
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === id ? { ...edge, data: { ...edge.data, ...data } } : edge
      ),
    })),

  deleteEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    })),

  setEdges: (edges) => set({ edges }),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as BlueprintEdge[],
    })),

  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const newEdge: BlueprintEdge = {
      id: uuidv4(),
      type: 'customBezier',
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      data: {
        conditionLabel: '',
        description: '',
        controlPointOffsetY: 0,
      },
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
    }));
  },

  getEdge: (id) => get().edges.find((edge) => edge.id === id),

  getEdgesForNode: (nodeId) =>
    get().edges.filter(
      (edge) => edge.source === nodeId || edge.target === nodeId
    ),

  reset: () => set({ edges: [] }),
}));

// Selectors
export const selectIncomingEdges = (nodeId: string) => (state: EdgesState) =>
  state.edges.filter((edge) => edge.target === nodeId);

export const selectOutgoingEdges = (nodeId: string) => (state: EdgesState) =>
  state.edges.filter((edge) => edge.source === nodeId);

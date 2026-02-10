import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  applyNodeChanges,
  type Node,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import type { NodeData } from '../types';

// Use a generic Node type with NodeData for simpler type handling
export type AppNode = Node<NodeData>;

interface NodesState {
  nodes: AppNode[];

  // Actions
  addNode: (data: NodeData, position?: XYPosition) => string;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  setNodes: (nodes: AppNode[]) => void;
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  getNode: (id: string) => AppNode | undefined;
  reset: () => void;
}

const DEFAULT_POSITION: XYPosition = { x: 250, y: 150 };

export const useNodesStore = create<NodesState>((set, get) => ({
  nodes: [],

  addNode: (data, position = DEFAULT_POSITION) => {
    const id = uuidv4();
    const newNode: AppNode = {
      id,
      type: data.nodeType,
      position,
      data,
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));

    return id;
  },

  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...data } as NodeData }
          : node
      ),
    })),

  deleteNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
    })),

  setNodes: (nodes) => set({ nodes }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),

  getNode: (id) => get().nodes.find((node) => node.id === id),

  reset: () => set({ nodes: [] }),
}));

// Selectors
export const selectNodesByType = (type: string) => (state: NodesState) =>
  state.nodes.filter((node) => node.data.nodeType === type);

export const selectTriggerNodes = (state: NodesState) =>
  state.nodes.filter((node) => node.data.nodeType === 'trigger');

export const selectEndNodes = (state: NodesState) =>
  state.nodes.filter((node) => node.data.nodeType === 'end');

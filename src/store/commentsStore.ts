import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Comment } from '../types';

interface CommentsState {
  comments: Comment[];

  // Actions
  addComment: (nodeId: string, text: string, author?: string) => string;
  updateComment: (id: string, partial: Partial<Comment>) => void;
  deleteComment: (id: string) => void;
  resolveComment: (id: string) => void;
  unresolveComment: (id: string) => void;
  getCommentsForNode: (nodeId: string) => Comment[];
  setComments: (comments: Comment[]) => void;
  reset: () => void;
}

export const useCommentsStore = create<CommentsState>((set, get) => ({
  comments: [],

  addComment: (nodeId, text, author = '') => {
    const id = uuidv4();
    const newComment: Comment = {
      id,
      nodeId,
      author,
      timestamp: new Date().toISOString(),
      text,
      resolved: false,
    };

    set((state) => ({
      comments: [...state.comments, newComment],
    }));

    return id;
  },

  updateComment: (id, partial) =>
    set((state) => ({
      comments: state.comments.map((comment) =>
        comment.id === id ? { ...comment, ...partial } : comment
      ),
    })),

  deleteComment: (id) =>
    set((state) => ({
      comments: state.comments.filter((comment) => comment.id !== id),
    })),

  resolveComment: (id) =>
    set((state) => ({
      comments: state.comments.map((comment) =>
        comment.id === id ? { ...comment, resolved: true } : comment
      ),
    })),

  unresolveComment: (id) =>
    set((state) => ({
      comments: state.comments.map((comment) =>
        comment.id === id ? { ...comment, resolved: false } : comment
      ),
    })),

  getCommentsForNode: (nodeId) =>
    get().comments.filter((comment) => comment.nodeId === nodeId),

  setComments: (comments) => set({ comments }),

  reset: () => set({ comments: [] }),
}));

// Selectors
export const selectUnresolvedComments = (state: CommentsState) =>
  state.comments.filter((comment) => !comment.resolved);

export const selectCommentsCount = (nodeId: string) => (state: CommentsState) =>
  state.comments.filter((comment) => comment.nodeId === nodeId).length;

export const selectUnresolvedCommentsCount =
  (nodeId: string) => (state: CommentsState) =>
    state.comments.filter(
      (comment) => comment.nodeId === nodeId && !comment.resolved
    ).length;

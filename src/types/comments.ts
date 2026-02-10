export interface Comment {
  id: string;
  nodeId: string;
  author: string;
  timestamp: string;
  text: string;
  resolved: boolean;
}

export function createComment(partial: Partial<Comment> & { nodeId: string; text: string }): Comment {
  return {
    id: crypto.randomUUID(),
    author: '',
    timestamp: new Date().toISOString(),
    resolved: false,
    ...partial,
  };
}

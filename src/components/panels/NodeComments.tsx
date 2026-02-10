import { useState } from 'react';
import { MessageSquare, Send, Trash2, Check, RotateCcw } from 'lucide-react';
import { useCommentsStore } from '../../store';

interface NodeCommentsProps {
  nodeId: string;
}

export function NodeComments({ nodeId }: NodeCommentsProps) {
  const comments = useCommentsStore((state) => state.comments);
  const addComment = useCommentsStore((state) => state.addComment);
  const deleteComment = useCommentsStore((state) => state.deleteComment);
  const resolveComment = useCommentsStore((state) => state.resolveComment);
  const unresolveComment = useCommentsStore((state) => state.unresolveComment);

  const [newCommentText, setNewCommentText] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const nodeComments = comments.filter((c) => c.nodeId === nodeId);
  const unresolvedComments = nodeComments.filter((c) => !c.resolved);
  const resolvedComments = nodeComments.filter((c) => c.resolved);
  const displayedComments = showResolved ? nodeComments : unresolvedComments;

  const handleAddComment = () => {
    if (newCommentText.trim()) {
      addComment(nodeId, newCommentText.trim());
      setNewCommentText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4" />
          Comments
          {unresolvedComments.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {unresolvedComments.length}
            </span>
          )}
        </h3>
        {resolvedComments.length > 0 && (
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showResolved ? 'Hide resolved' : `Show resolved (${resolvedComments.length})`}
          </button>
        )}
      </div>

      {/* New comment input */}
      <div className="flex gap-2 mb-3">
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment..."
          rows={2}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        <button
          onClick={handleAddComment}
          disabled={!newCommentText.trim()}
          className="self-end p-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Comments list */}
      {displayedComments.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          {nodeComments.length === 0 ? 'No comments yet' : 'No unresolved comments'}
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {displayedComments.map((comment) => (
            <div
              key={comment.id}
              className={`
                p-2 rounded-md text-sm
                ${comment.resolved ? 'bg-gray-50 text-gray-500' : 'bg-blue-50'}
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`flex-1 ${comment.resolved ? 'line-through' : ''}`}>
                  {comment.text}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  {comment.resolved ? (
                    <button
                      onClick={() => unresolveComment(comment.id)}
                      title="Unresolve"
                      className="p-1 text-gray-400 hover:text-yellow-600 hover:bg-yellow-100 rounded"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => resolveComment(comment.id)}
                      title="Resolve"
                      className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteComment(comment.id)}
                    title="Delete"
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatTimestamp(comment.timestamp)}
                {comment.author && ` by ${comment.author}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useNodesStore, useUIStore } from '../../store';

const DOT_COLORS: Record<string, string> = {
  trigger: 'bg-emerald-500',
  agent: 'bg-orange-500',
  automation: 'bg-yellow-500',
  human: 'bg-blue-500',
  decision: 'bg-amber-500',
  end: 'bg-red-500',
  workflow: 'bg-purple-500',
};

function getNodeTypeLabel(data: Record<string, unknown>): { label: string; dotColor: string } {
  const nodeType = data.nodeType as string;
  if (nodeType === 'work') {
    const workerType = (data.workerType as string) || 'agent';
    return {
      label: workerType.charAt(0).toUpperCase() + workerType.slice(1),
      dotColor: DOT_COLORS[workerType] || DOT_COLORS.agent,
    };
  }
  return {
    label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
    dotColor: DOT_COLORS[nodeType] || 'bg-gray-400',
  };
}

export function NodeSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const nodes = useNodesStore((state) => state.nodes);
  const focusNode = useUIStore((state) => state.focusNode);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return nodes.filter((n) => (n.data.name as string)?.toLowerCase().includes(q));
  }, [nodes, query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Click-outside to close
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const selectResult = useCallback(
    (nodeId: string) => {
      focusNode(nodeId);
      setQuery('');
      setIsOpen(false);
    },
    [focusNode],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Escape') {
        setQuery('');
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        selectResult(results[selectedIndex].id);
        inputRef.current?.blur();
        break;
      case 'Escape':
        e.preventDefault();
        setQuery('');
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.trim() && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes..."
          className="w-56 pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((node, index) => {
            const { label, dotColor } = getNodeTypeLabel(node.data as Record<string, unknown>);
            return (
              <button
                key={node.id}
                onClick={() => selectResult(node.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  index === selectedIndex ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50 text-gray-800'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
                <span className="truncate flex-1">{node.data.name as string}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-50 px-3 py-2 text-sm text-gray-500">
          No nodes found
        </div>
      )}
    </div>
  );
}

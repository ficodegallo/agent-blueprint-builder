import { useState, useRef, useEffect } from 'react';
import { Plus, X, GripVertical, Sparkles } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

interface ListEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  showAutoOrder?: boolean;
  onAutoOrder?: () => void;
  isAutoOrdering?: boolean;
  suggestions?: string[]; // Available inputs/outputs for autocomplete
}

interface AutocompleteState {
  show: boolean;
  matches: string[];
  selectedIndex: number;
  inputIndex: number;
  cursorPosition: number;
  wordStart: number;
}

export function ListEditor({
  label,
  items,
  onChange,
  placeholder = 'Add item...',
  showAutoOrder = false,
  onAutoOrder,
  isAutoOrdering = false,
  suggestions = [],
}: ListEditorProps) {
  const [newItem, setNewItem] = useState('');
  const [autocomplete, setAutocomplete] = useState<AutocompleteState>({
    show: false,
    matches: [],
    selectedIndex: 0,
    inputIndex: -1,
    cursorPosition: 0,
    wordStart: 0,
  });
  const inputRefs = useRef<Map<number, HTMLInputElement | HTMLTextAreaElement>>(new Map());


  const handleAdd = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleItemChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    onChange(reorderedItems);
  };

  // Get word at cursor position
  const getWordAtCursor = (text: string, cursorPos: number): { word: string; start: number; end: number } => {
    // Find word boundaries
    let start = cursorPos;
    let end = cursorPos;

    // Move start backward to find word start
    while (start > 0 && /\w/.test(text[start - 1])) {
      start--;
    }

    // Move end forward to find word end
    while (end < text.length && /\w/.test(text[end])) {
      end++;
    }

    return {
      word: text.substring(start, end),
      start,
      end,
    };
  };

  // Handle input change with autocomplete
  const handleItemChangeWithAutocomplete = (index: number, value: string, cursorPos: number) => {
    handleItemChange(index, value);

    if (!suggestions.length) {
      setAutocomplete({ show: false, matches: [], selectedIndex: 0, inputIndex: -1, cursorPosition: 0, wordStart: 0 });
      return;
    }

    const { word, start } = getWordAtCursor(value, cursorPos);

    // Show suggestions if word is 3+ chars and matches
    if (word.length >= 3) {
      const matches = suggestions.filter((s) =>
        s.toLowerCase().startsWith(word.toLowerCase())
      );

      if (matches.length > 0) {
        setAutocomplete({
          show: true,
          matches,
          selectedIndex: 0,
          inputIndex: index,
          cursorPosition: cursorPos,
          wordStart: start,
        });
        return;
      }
    }

    setAutocomplete({ show: false, matches: [], selectedIndex: 0, inputIndex: -1, cursorPosition: 0, wordStart: 0 });
  };

  // Insert selected suggestion
  const insertSuggestion = (suggestion: string) => {
    if (autocomplete.inputIndex === -1) return;

    const input = inputRefs.current.get(autocomplete.inputIndex);
    if (!input) return;

    const currentValue = items[autocomplete.inputIndex];
    const { end } = getWordAtCursor(currentValue, autocomplete.cursorPosition);

    // Replace the word with the suggestion
    const newValue = currentValue.substring(0, autocomplete.wordStart) + suggestion + currentValue.substring(end);

    handleItemChange(autocomplete.inputIndex, newValue);

    // Close autocomplete
    setAutocomplete({ show: false, matches: [], selectedIndex: 0, inputIndex: -1, cursorPosition: 0, wordStart: 0 });

    // Restore focus
    setTimeout(() => {
      input.focus();
      const newCursorPos = autocomplete.wordStart + suggestion.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle keyboard navigation in autocomplete
  const handleAutocompleteKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (!autocomplete.show || autocomplete.inputIndex !== index) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setAutocomplete({
          ...autocomplete,
          selectedIndex: (autocomplete.selectedIndex + 1) % autocomplete.matches.length,
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setAutocomplete({
          ...autocomplete,
          selectedIndex: autocomplete.selectedIndex === 0 ? autocomplete.matches.length - 1 : autocomplete.selectedIndex - 1,
        });
        break;
      case 'Enter':
        if (autocomplete.matches.length > 0) {
          e.preventDefault();
          insertSuggestion(autocomplete.matches[autocomplete.selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setAutocomplete({ show: false, matches: [], selectedIndex: 0, inputIndex: -1, cursorPosition: 0, wordStart: 0 });
        break;
    }
  };

  // Click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocomplete.show) {
        const target = e.target as HTMLElement;
        if (!target.closest('.autocomplete-dropdown')) {
          setAutocomplete({ show: false, matches: [], selectedIndex: 0, inputIndex: -1, cursorPosition: 0, wordStart: 0 });
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [autocomplete.show]);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {showAutoOrder && items.length > 1 && onAutoOrder && (
          <button
            onClick={onAutoOrder}
            disabled={isAutoOrdering}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={12} />
            {isAutoOrdering ? 'Ordering...' : 'Auto-order'}
          </button>
        )}
      </div>

      {/* Existing items with drag and drop */}
      {items.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="list-items">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`space-y-1.5 mb-2 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded p-1' : ''}`}
              >
                {items.map((item, index) => (
                  <Draggable key={`item-${index}`} draggableId={`item-${index}`} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        style={provided.draggableProps.style}
                        className={`flex items-center gap-1.5 relative ${snapshot.isDragging ? 'bg-white shadow-lg' : ''}`}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                          title="Drag to reorder"
                        >
                          <GripVertical size={14} />
                        </div>
                        <div className="flex-1 relative">
                          <textarea
                            ref={(el) => {
                              if (el) inputRefs.current.set(index, el);
                            }}
                            id={`task-item-${index}`}
                            name={`task-item-${index}`}
                            value={item}
                            onChange={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              const cursorPos = target.selectionStart || 0;
                              handleItemChangeWithAutocomplete(index, target.value, cursorPos);
                            }}
                            onKeyUp={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              const cursorPos = target.selectionStart || 0;
                              handleItemChangeWithAutocomplete(index, target.value, cursorPos);
                            }}
                            onKeyDown={(e) => handleAutocompleteKeyDown(e, index)}
                            rows={2}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            aria-label={`Task ${index + 1}`}
                          />
                          {/* Autocomplete dropdown */}
                          {autocomplete.show && autocomplete.inputIndex === index && (
                            <div className="autocomplete-dropdown absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                              {autocomplete.matches.map((match, matchIndex) => (
                                <button
                                  key={match}
                                  onClick={() => insertSuggestion(match)}
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                                    matchIndex === autocomplete.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                                  }`}
                                >
                                  {match}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemove(index)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Add new item */}
      <div className="flex items-center gap-1.5">
        <input
          id={`add-${label.toLowerCase().replace(/\s+/g, '-')}`}
          name={`add-${label.toLowerCase().replace(/\s+/g, '-')}`}
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label={`Add new ${label.toLowerCase()}`}
        />
        <button
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400"
          title="Add"
        >
          <Plus size={14} />
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-gray-400 mt-1 italic">No items yet</p>
      )}
    </div>
  );
}

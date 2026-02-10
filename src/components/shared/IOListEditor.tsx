import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { IOItem } from '../../types';

interface IOListEditorProps {
  label: string;
  items: IOItem[];
  onChange: (items: IOItem[]) => void;
  placeholder?: string;
}

export function IOListEditor({
  label,
  items,
  onChange,
  placeholder = 'Add item...',
}: IOListEditorProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onChange([...items, { name: newItem.trim(), required: true }]);
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

  const handleNameChange = (index: number, name: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], name };
    onChange(updated);
  };

  const handleRequiredChange = (index: number, required: boolean) => {
    const updated = [...items];
    updated[index] = { ...updated[index], required };
    onChange(updated);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>

      {/* Existing items */}
      {items.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <input
                id={`${label.toLowerCase().replace(/\s+/g, '-')}-item-${index}`}
                name={`${label.toLowerCase().replace(/\s+/g, '-')}-item-${index}`}
                type="text"
                value={item.name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label={`${label} ${index + 1}`}
              />
              <button
                onClick={() => handleRequiredChange(index, !item.required)}
                className={`px-2 py-1.5 text-xs font-medium rounded border transition-colors ${
                  item.required
                    ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                    : 'bg-gray-50 text-gray-500 border-gray-300 hover:bg-gray-100'
                }`}
                title={item.required ? 'Click to mark as optional' : 'Click to mark as required'}
              >
                {item.required ? 'Required' : 'Optional'}
              </button>
              <button
                onClick={() => handleRemove(index)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Remove"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
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

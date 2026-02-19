import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { getBestPracticesText, saveBestPractices, clearBestPractices } from '../../utils/bestPracticesStorage';

interface BestPracticesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BestPracticesDialog({ isOpen, onClose }: BestPracticesDialogProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText(getBestPracticesText());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveBestPractices(text);
    onClose();
  };

  const handleClear = () => {
    setText('');
    clearBestPractices();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Best Practices" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Define your team's best practices for building agent workflows. When you check a blueprint
          against these practices, violations will appear as warnings in the validation panel.
        </p>

        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={`Enter your best practices, one per line. For example:\n\n- Every workflow must start with a validation step\n- Human approval is required before sending external communications\n- All agent nodes must have at least 2 inputs defined\n- Decision nodes should have descriptive branch labels\n- Every workflow must end with a notification step`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y"
          />
          <div className="text-xs text-gray-400 mt-1 text-right">
            {text.length} characters
          </div>
        </div>

        <div className="flex justify-between pt-2 border-t border-gray-200">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            Clear
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

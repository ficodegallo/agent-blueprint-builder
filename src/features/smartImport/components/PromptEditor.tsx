import { useState, useEffect } from 'react';
import { RotateCcw, Save, AlertCircle } from 'lucide-react';
import { Modal } from '../../../components/shared/Modal';
import {
  getActivePrompts,
  getDefaultPrompts,
  saveCustomPrompts,
  resetToDefaultPrompts,
} from '../utils/promptStorage';

interface PromptEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PromptEditor({ isOpen, onClose }: PromptEditorProps) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPromptTemplate, setUserPromptTemplate] = useState('');
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load prompts when dialog opens
  useEffect(() => {
    if (isOpen) {
      const prompts = getActivePrompts();
      setSystemPrompt(prompts.systemPrompt);
      setUserPromptTemplate(prompts.userPromptTemplate);
      setLastModified(prompts.lastModified);
      setHasChanges(false);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleUserPromptTemplateChange = (value: string) => {
    setUserPromptTemplate(value);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = () => {
    try {
      saveCustomPrompts({
        systemPrompt,
        userPromptTemplate,
      });
      setHasChanges(false);
      setSaveSuccess(true);
      setLastModified(new Date().toISOString());

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save prompts:', error);
      alert('Failed to save prompts. Please try again.');
    }
  };

  const handleReset = () => {
    if (
      confirm(
        'Are you sure you want to reset to default prompts? This will discard any custom changes.'
      )
    ) {
      resetToDefaultPrompts();
      const defaults = getDefaultPrompts();
      setSystemPrompt(defaults.systemPrompt);
      setUserPromptTemplate(defaults.userPromptTemplate);
      setLastModified(defaults.lastModified);
      setHasChanges(false);
      setSaveSuccess(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Smart Import Prompts" maxWidth="xl">
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Customize how Claude analyzes documents</p>
            <p className="text-blue-700">
              Edit these prompts to improve blueprint generation with domain-specific best practices.
              Changes are saved locally in your browser.
            </p>
          </div>
        </div>

        {/* System Prompt Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Prompt
            <span className="text-xs text-gray-500 ml-2 font-normal">
              Sets Claude's role and overall behavior
            </span>
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => handleSystemPromptChange(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            placeholder="Enter system prompt..."
          />
        </div>

        {/* User Prompt Template Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User Prompt Template
            <span className="text-xs text-gray-500 ml-2 font-normal">
              Instructions sent with each document
            </span>
          </label>
          <textarea
            value={userPromptTemplate}
            onChange={(e) => handleUserPromptTemplateChange(e.target.value)}
            rows={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            placeholder="Enter user prompt template..."
          />
        </div>

        {/* Placeholder Help */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Available Placeholders:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
            <div>
              <code className="bg-white px-1 py-0.5 rounded border border-gray-300">
                {'{{EXTRACTED_CONTENT}}'}
              </code>
              <span className="ml-1">- Document text</span>
            </div>
            <div>
              <code className="bg-white px-1 py-0.5 rounded border border-gray-300">
                {'{{PROCESS_NAME}}'}
              </code>
              <span className="ml-1">- Process name</span>
            </div>
            <div>
              <code className="bg-white px-1 py-0.5 rounded border border-gray-300">
                {'{{OPTIMIZATION_GOAL}}'}
              </code>
              <span className="ml-1">- Goal type</span>
            </div>
            <div>
              <code className="bg-white px-1 py-0.5 rounded border border-gray-300">
                {'{{OPTIMIZATION_INSTRUCTIONS}}'}
              </code>
              <span className="ml-1">- Goal details</span>
            </div>
            <div>
              <code className="bg-white px-1 py-0.5 rounded border border-gray-300">
                {'{{GRANULARITY}}'}
              </code>
              <span className="ml-1">- Detail level</span>
            </div>
            <div>
              <code className="bg-white px-1 py-0.5 rounded border border-gray-300">
                {'{{GRANULARITY_INSTRUCTIONS}}'}
              </code>
              <span className="ml-1">- Detail instructions</span>
            </div>
            <div className="col-span-2">
              <code className="bg-white px-1 py-0.5 rounded border border-gray-300">
                {'{{ADDITIONAL_INSTRUCTIONS}}'}
              </code>
              <span className="ml-1">- User's additional notes</span>
            </div>
          </div>
        </div>

        {/* Last Modified */}
        {lastModified && (
          <p className="text-xs text-gray-500">
            Last modified:{' '}
            {new Date(lastModified).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        )}

        {/* Success Message */}
        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm text-green-800">Prompts saved successfully!</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <RotateCcw size={16} />
            Reset to Default
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

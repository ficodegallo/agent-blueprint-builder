import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../shared/Modal';
import {
  FileUp,
  BookOpen,
  Target,
  ArrowUpDown,
  Search,
  RotateCcw,
} from 'lucide-react';
import {
  getFeatureConfigs,
  getActivePrompts,
  getDefaultPrompts,
  saveCustomPrompts,
  resetFeaturePrompts,
  isFeatureCustomized,
  type AIFeatureKey,
  type AIFeaturePrompts,
} from '../../utils/aiPromptStorage';

interface AIPromptAdminDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURE_ICONS: Record<AIFeatureKey, typeof FileUp> = {
  smartImport: FileUp,
  goalEvaluate: Target,
  taskAutoOrder: ArrowUpDown,
  apiDiscovery: Search,
  bestPracticesAnalysis: BookOpen,
};

export function AIPromptAdminDialog({ isOpen, onClose }: AIPromptAdminDialogProps) {
  const configs = getFeatureConfigs();
  const [activeTab, setActiveTab] = useState<AIFeatureKey>('smartImport');
  const [drafts, setDrafts] = useState<Record<AIFeatureKey, AIFeaturePrompts>>({} as Record<AIFeatureKey, AIFeaturePrompts>);
  const [customized, setCustomized] = useState<Record<AIFeatureKey, boolean>>({} as Record<AIFeatureKey, boolean>);
  const [confirmReset, setConfirmReset] = useState<AIFeatureKey | null>(null);

  // Load all prompts when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    const newDrafts: Record<string, AIFeaturePrompts> = {};
    const newCustomized: Record<string, boolean> = {};
    for (const cfg of configs) {
      newDrafts[cfg.key] = getActivePrompts(cfg.key);
      newCustomized[cfg.key] = isFeatureCustomized(cfg.key);
    }
    setDrafts(newDrafts as Record<AIFeatureKey, AIFeaturePrompts>);
    setCustomized(newCustomized as Record<AIFeatureKey, boolean>);
    setConfirmReset(null);
  }, [isOpen]);

  const activeConfig = configs.find((c) => c.key === activeTab)!;
  const activeDraft = drafts[activeTab];
  const activeDefaults = getDefaultPrompts(activeTab);

  const hasChanges = useCallback(() => {
    for (const cfg of configs) {
      const stored = getActivePrompts(cfg.key);
      const draft = drafts[cfg.key];
      if (!draft) continue;
      if (draft.systemPrompt !== stored.systemPrompt || draft.userPromptTemplate !== stored.userPromptTemplate) {
        return true;
      }
    }
    return false;
  }, [drafts]);

  const updateDraft = (field: keyof AIFeaturePrompts, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [field]: value },
    }));
  };

  const handleSave = () => {
    for (const cfg of configs) {
      const draft = drafts[cfg.key];
      if (!draft) continue;
      const defaults = getDefaultPrompts(cfg.key);
      // Only save if different from defaults
      if (draft.systemPrompt !== defaults.systemPrompt || draft.userPromptTemplate !== defaults.userPromptTemplate) {
        saveCustomPrompts(cfg.key, draft);
      }
    }
    // Refresh customized state
    const newCustomized: Record<string, boolean> = {};
    for (const cfg of configs) {
      newCustomized[cfg.key] = isFeatureCustomized(cfg.key);
    }
    setCustomized(newCustomized as Record<AIFeatureKey, boolean>);
    onClose();
  };

  const handleReset = (feature: AIFeatureKey) => {
    if (confirmReset !== feature) {
      setConfirmReset(feature);
      return;
    }
    resetFeaturePrompts(feature);
    setDrafts((prev) => ({
      ...prev,
      [feature]: getDefaultPrompts(feature),
    }));
    setCustomized((prev) => ({
      ...prev,
      [feature]: false,
    }));
    setConfirmReset(null);
  };

  const handleCancel = () => {
    if (hasChanges()) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    onClose();
  };

  if (!activeDraft) return null;

  const isCurrentDefault =
    activeDraft.systemPrompt === activeDefaults.systemPrompt &&
    activeDraft.userPromptTemplate === activeDefaults.userPromptTemplate;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="AI Prompt Administration" maxWidth="4xl">
      <div className="flex gap-0 -mx-4 -mb-4 -mt-2 min-h-[520px]">
        {/* Left Sidebar — Tab List */}
        <nav className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 py-3 rounded-bl-lg">
          {configs.map((cfg) => {
            const Icon = FEATURE_ICONS[cfg.key];
            const isActive = activeTab === cfg.key;
            return (
              <button
                key={cfg.key}
                onClick={() => { setActiveTab(cfg.key); setConfirmReset(null); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{cfg.label}</span>
                {customized[cfg.key] && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-purple-500 shrink-0" title="Customized" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Feature Header */}
            <div>
              <h3 className="text-base font-semibold text-gray-900">{activeConfig.label}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{activeConfig.description}</p>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
              <textarea
                value={activeDraft.systemPrompt}
                onChange={(e) => updateDraft('systemPrompt', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y"
              />
            </div>

            {/* User Prompt Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Prompt Template</label>
              <textarea
                value={activeDraft.userPromptTemplate}
                onChange={(e) => updateDraft('userPromptTemplate', e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y"
              />
            </div>

            {/* Placeholders Reference */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Available Placeholders</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-1.5 font-medium text-gray-600">Token</th>
                      <th className="text-left px-3 py-1.5 font-medium text-gray-600">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeConfig.placeholders.map((p) => (
                      <tr key={p.token} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-1.5 font-mono text-purple-700 text-xs whitespace-nowrap">{p.token}</td>
                        <td className="px-3 py-1.5 text-gray-600">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-1">
              {confirmReset === activeTab ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-700">Reset this feature's prompts to defaults?</span>
                  <button
                    onClick={() => handleReset(activeTab)}
                    className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(null)}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleReset(activeTab)}
                  disabled={isCurrentDefault}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Default
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-br-lg">
            <button
              onClick={handleCancel}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

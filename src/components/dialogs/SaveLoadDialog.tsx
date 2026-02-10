import { useState, useEffect } from 'react';
import { Save, Folder, Trash2, Plus, Clock } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useUIStore, useBlueprintStore } from '../../store';

interface SavedBlueprintSummary {
  id: string;
  title: string;
  lastModifiedDate: string;
  status: string;
}

export function SaveLoadDialog() {
  const activeDialog = useUIStore((state) => state.activeDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const currentId = useBlueprintStore((state) => state.id);
  const currentTitle = useBlueprintStore((state) => state.title);

  const {
    saveNamedBlueprint,
    loadNamedBlueprint,
    deleteNamedBlueprint,
    getSavedBlueprintsList,
    createNewBlueprint,
  } = useLocalStorage();

  const [savedBlueprints, setSavedBlueprints] = useState<SavedBlueprintSummary[]>([]);
  const [newName, setNewName] = useState('');
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('save');

  const isOpen = activeDialog === 'saveLoad';

  useEffect(() => {
    if (isOpen) {
      setSavedBlueprints(getSavedBlueprintsList());
      setNewName(currentTitle);
    }
  }, [isOpen, getSavedBlueprintsList, currentTitle]);

  const handleSave = () => {
    saveNamedBlueprint(newName || undefined);
    setSavedBlueprints(getSavedBlueprintsList());
    closeDialog();
  };

  const handleLoad = (id: string) => {
    loadNamedBlueprint(id);
    closeDialog();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this blueprint?')) {
      deleteNamedBlueprint(id);
      setSavedBlueprints(getSavedBlueprintsList());
    }
  };

  const handleCreateNew = () => {
    if (confirm('Create a new blueprint? Any unsaved changes will be lost.')) {
      createNewBlueprint();
      closeDialog();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={closeDialog} title="Save / Load Blueprint" maxWidth="lg">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('save')}
            className={`
              px-4 py-2 text-sm font-medium -mb-px
              ${activeTab === 'save'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            <Save className="w-4 h-4 inline mr-1.5" />
            Save
          </button>
          <button
            onClick={() => setActiveTab('load')}
            className={`
              px-4 py-2 text-sm font-medium -mb-px
              ${activeTab === 'load'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            <Folder className="w-4 h-4 inline mr-1.5" />
            Load
          </button>
        </div>

        {/* Save tab */}
        {activeTab === 'save' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blueprint Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter blueprint name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Blueprint
            </button>
          </div>
        )}

        {/* Load tab */}
        {activeTab === 'load' && (
          <div className="space-y-3">
            {/* New blueprint button */}
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center gap-3 p-3 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">Create New Blueprint</span>
            </button>

            {/* Saved blueprints list */}
            {savedBlueprints.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No saved blueprints yet
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {savedBlueprints.map((blueprint) => (
                  <button
                    key={blueprint.id}
                    onClick={() => handleLoad(blueprint.id)}
                    className={`
                      w-full flex items-center justify-between p-3 rounded-lg text-left
                      ${blueprint.id === currentId
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'}
                      transition-colors
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {blueprint.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(blueprint.lastModifiedDate)}
                        <span
                          className={`
                            px-1.5 py-0.5 rounded text-xs font-medium
                            ${blueprint.status === 'Draft' ? 'bg-gray-100 text-gray-600' : ''}
                            ${blueprint.status === 'In Review' ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${blueprint.status === 'Approved' ? 'bg-green-100 text-green-700' : ''}
                            ${blueprint.status === 'Archived' ? 'bg-slate-100 text-slate-600' : ''}
                          `}
                        >
                          {blueprint.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(blueprint.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-gray-100">
          <button
            onClick={closeDialog}
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

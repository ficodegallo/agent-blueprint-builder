import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import { useBlueprintStore, useUIStore } from '../../store';
import { STATUS_OPTIONS } from '../../data/statusOptions';
import type { Status } from '../../types';

export function BlueprintHeader() {
  const isExpanded = useUIStore((state) => state.isHeaderExpanded);
  const toggleHeader = useUIStore((state) => state.toggleHeader);

  const title = useBlueprintStore((state) => state.title);
  const description = useBlueprintStore((state) => state.description);
  const status = useBlueprintStore((state) => state.status);
  const version = useBlueprintStore((state) => state.version);
  const createdBy = useBlueprintStore((state) => state.createdBy);
  const lastModifiedBy = useBlueprintStore((state) => state.lastModifiedBy);
  const lastModifiedDate = useBlueprintStore((state) => state.lastModifiedDate);
  const impactedAudiences = useBlueprintStore((state) => state.impactedAudiences);
  const businessBenefits = useBlueprintStore((state) => state.businessBenefits);
  const clientContacts = useBlueprintStore((state) => state.clientContacts);
  const changeLog = useBlueprintStore((state) => state.changeLog);
  const updateMetadata = useBlueprintStore((state) => state.updateMetadata);
  const setStatus = useBlueprintStore((state) => state.setStatus);

  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const handleTitleSave = () => {
    updateMetadata({ title: tempTitle });
    setEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTempTitle(title);
    setEditingTitle(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  type ArrayField = 'impactedAudiences' | 'businessBenefits' | 'clientContacts';

  const handleArrayItemChange = (field: ArrayField, items: string[], index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    updateMetadata({ [field]: updated });
  };

  const handleArrayItemAdd = (field: ArrayField, items: string[]) => {
    updateMetadata({ [field]: [...items, ''] });
  };

  const handleArrayItemRemove = (field: ArrayField, items: string[], index: number) => {
    updateMetadata({ [field]: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      {/* Collapsed header bar */}
      <button
        onClick={toggleHeader}
        className="w-full px-4 py-2 flex items-center gap-2 text-left hover:bg-gray-100 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <span className="text-sm font-medium text-gray-600">Blueprint Metadata</span>
        {!isExpanded && (
          <span className="text-xs text-gray-400 ml-2">
            v{version} | {status} | Last modified {formatDate(lastModifiedDate)}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-4">
            {/* Title (inline edit) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Title
              </label>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleTitleSave}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleTitleCancel}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-800">{title}</span>
                  <button
                    onClick={() => {
                      setTempTitle(title);
                      setEditingTitle(true);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => updateMetadata({ description: e.target.value })}
                rows={2}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this blueprint..."
              />
            </div>

            {/* Status and Version */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => updateMetadata({ version: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="1.0"
                />
              </div>
            </div>

            {/* Created By / Last Modified By */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Created By
                </label>
                <input
                  type="text"
                  value={createdBy}
                  onChange={(e) => updateMetadata({ createdBy: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Last Modified By
                </label>
                <input
                  type="text"
                  value={lastModifiedBy}
                  onChange={(e) => updateMetadata({ lastModifiedBy: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Impacted Audiences */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Impacted Audiences
                </label>
                <button
                  onClick={() => handleArrayItemAdd('impactedAudiences', impactedAudiences)}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-1.5 py-0.5 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              <div className="space-y-1.5">
                {impactedAudiences.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleArrayItemChange('impactedAudiences', impactedAudiences, index, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Sales Team"
                    />
                    <button
                      onClick={() => handleArrayItemRemove('impactedAudiences', impactedAudiences, index)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {impactedAudiences.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No audiences added yet</p>
                )}
              </div>
            </div>

            {/* Business Benefits */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Business Benefits
                </label>
                <button
                  onClick={() => handleArrayItemAdd('businessBenefits', businessBenefits)}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-1.5 py-0.5 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              <div className="space-y-1.5">
                {businessBenefits.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleArrayItemChange('businessBenefits', businessBenefits, index, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Reduced processing time"
                    />
                    <button
                      onClick={() => handleArrayItemRemove('businessBenefits', businessBenefits, index)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {businessBenefits.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No benefits added yet</p>
                )}
              </div>
            </div>

            {/* Client Contacts */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Client Contacts
                </label>
                <button
                  onClick={() => handleArrayItemAdd('clientContacts', clientContacts)}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-1.5 py-0.5 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              <div className="space-y-1.5">
                {clientContacts.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleArrayItemChange('clientContacts', clientContacts, index, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. John Doe - john@example.com"
                    />
                    <button
                      onClick={() => handleArrayItemRemove('clientContacts', clientContacts, index)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {clientContacts.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No contacts added yet</p>
                )}
              </div>
            </div>

            {/* Last Modified Info */}
            <div className="text-xs text-gray-400">
              Last modified: {formatDate(lastModifiedDate)}
              {changeLog.length > 0 && (
                <span className="ml-2">({changeLog.length} change log entries)</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

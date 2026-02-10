import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react';
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

  const handleArrayFieldChange = (
    field: 'impactedAudiences' | 'businessBenefits' | 'clientContacts',
    value: string
  ) => {
    const items = value.split('\n').filter((item) => item.trim());
    updateMetadata({ [field]: items });
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
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Impacted Audiences (one per line)
              </label>
              <textarea
                value={impactedAudiences.join('\n')}
                onChange={(e) => handleArrayFieldChange('impactedAudiences', e.target.value)}
                rows={2}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Sales Team&#10;Customer Support"
              />
            </div>

            {/* Business Benefits */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Business Benefits (one per line)
              </label>
              <textarea
                value={businessBenefits.join('\n')}
                onChange={(e) => handleArrayFieldChange('businessBenefits', e.target.value)}
                rows={2}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Reduced processing time&#10;Improved accuracy"
              />
            </div>

            {/* Client Contacts */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Client Contacts (one per line)
              </label>
              <textarea
                value={clientContacts.join('\n')}
                onChange={(e) => handleArrayFieldChange('clientContacts', e.target.value)}
                rows={2}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe - john@example.com"
              />
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

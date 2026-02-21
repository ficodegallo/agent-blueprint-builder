import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Search,
  ExternalLink,
  Plus,
  X,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../shared/Modal';
import { useApiDiscovery } from '../../hooks/useApiDiscovery';
import { useUIStore } from '../../store';
import type { ApiEndpoint, IOItem } from '../../types';

interface ApiDiscoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  integrationName: string;
  nodeName: string;
  goal: string;
  tasks: string[];
  inputs: IOItem[];
  outputs: IOItem[];
  onAddEndpoint: (endpoint: ApiEndpoint) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
};

const CONFIDENCE_CONFIG = {
  high: { bg: 'bg-green-100', text: 'text-green-700', Icon: CheckCircle, label: 'High' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', Icon: AlertTriangle, label: 'Medium' },
  low: { bg: 'bg-red-100', text: 'text-red-700', Icon: AlertCircle, label: 'Low' },
};

export function ApiDiscoveryDialog({
  isOpen,
  onClose,
  integrationName,
  nodeName,
  goal,
  tasks,
  inputs,
  outputs,
  onAddEndpoint,
}: ApiDiscoveryDialogProps) {
  const { discoverApis, isDiscovering, discoveredEndpoints, error, clearError } = useApiDiscovery();
  const openDialog = useUIStore((state) => state.openDialog);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Auto-trigger discovery when dialog opens
  useEffect(() => {
    if (isOpen && integrationName) {
      setExpandedIds(new Set());
      setAddedIds(new Set());
      setDismissedIds(new Set());
      discoverApis({ integrationName, nodeName, goal, tasks, inputs, outputs });
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchAgain = () => {
    setExpandedIds(new Set());
    setAddedIds(new Set());
    setDismissedIds(new Set());
    clearError();
    discoverApis({ integrationName, nodeName, goal, tasks, inputs, outputs });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = (endpoint: ApiEndpoint) => {
    onAddEndpoint(endpoint);
    setAddedIds((prev) => new Set(prev).add(endpoint.id));
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const visibleEndpoints = discoveredEndpoints.filter(
    (ep) => !addedIds.has(ep.id) && !dismissedIds.has(ep.id)
  );

  const allHandled = discoveredEndpoints.length > 0 && visibleEndpoints.length === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Discover APIs: ${integrationName}`} maxWidth="lg">
      <div className="space-y-4">
        {/* Context summary */}
        <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div><span className="font-medium text-gray-700">Integration:</span> {integrationName}</div>
            <div><span className="font-medium text-gray-700">Node:</span> {nodeName}</div>
            <div className="col-span-2"><span className="font-medium text-gray-700">Goal:</span> {goal || 'Not specified'}</div>
            <div><span className="font-medium text-gray-700">Inputs:</span> {inputs.length}</div>
            <div><span className="font-medium text-gray-700">Outputs:</span> {outputs.length}</div>
          </div>
        </div>

        {/* Loading state */}
        {isDiscovering && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-700">Searching {integrationName} API...</p>
            <p className="text-xs text-gray-500 mt-1">This may take 15-30 seconds</p>
          </div>
        )}

        {/* Error state */}
        {error && !isDiscovering && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
            {error.includes('API key') && (
              <button
                onClick={() => {
                  clearError();
                  onClose();
                  openDialog('smartImport');
                }}
                className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
              >
                Configure API Key
              </button>
            )}
          </div>
        )}

        {/* All handled state */}
        {allHandled && !isDiscovering && (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
            <p className="text-sm font-medium text-gray-700">All endpoints handled</p>
            <p className="text-xs text-gray-500 mt-1">
              {addedIds.size} added, {dismissedIds.size} dismissed
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isDiscovering && !error && discoveredEndpoints.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <Search className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700">No endpoints found</p>
            <p className="text-xs text-gray-500 mt-1">
              Claude doesn't have reliable API knowledge for "{integrationName}"
            </p>
          </div>
        )}

        {/* Results list */}
        {!isDiscovering && visibleEndpoints.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Found {discoveredEndpoints.length} endpoint{discoveredEndpoints.length !== 1 ? 's' : ''} — review and add the ones you need
            </p>
            {visibleEndpoints.map((endpoint) => {
              const isExpanded = expandedIds.has(endpoint.id);
              const confidence = CONFIDENCE_CONFIG[endpoint.ai_confidence || 'medium'];

              return (
                <div key={endpoint.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Endpoint header */}
                  <div className="p-3 bg-white">
                    <div className="flex items-start gap-2">
                      {/* Method badge */}
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${METHOD_COLORS[endpoint.method] || 'bg-gray-100 text-gray-700'}`}>
                        {endpoint.method}
                      </span>

                      {/* URL and name */}
                      <div className="flex-1 min-w-0">
                        {endpoint.name && (
                          <div className="text-sm font-medium text-gray-900">{endpoint.name}</div>
                        )}
                        <div className="text-xs font-mono text-gray-600 truncate">{endpoint.url}</div>
                        {endpoint.description && (
                          <p className="text-xs text-gray-500 mt-1">{endpoint.description}</p>
                        )}
                      </div>

                      {/* Confidence badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${confidence.bg} ${confidence.text}`}>
                        <confidence.Icon className="w-3 h-3" />
                        {confidence.label}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => toggleExpanded(endpoint.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'Less' : 'Details'}
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => handleDismiss(endpoint.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        <X size={12} />
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleAdd(endpoint)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
                      >
                        <Plus size={12} />
                        Add to Node
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 bg-gray-50 border-t border-gray-200 space-y-3">
                      {/* Auth & Rate limit */}
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        {endpoint.auth_type && (
                          <div>
                            <span className="block text-xs font-medium text-gray-500 mb-0.5">Authentication</span>
                            <span className="text-xs text-gray-700">{endpoint.auth_type}</span>
                          </div>
                        )}
                        {endpoint.rate_limit && (
                          <div>
                            <span className="block text-xs font-medium text-gray-500 mb-0.5">Rate Limit</span>
                            <span className="text-xs text-gray-700">{endpoint.rate_limit}</span>
                          </div>
                        )}
                      </div>

                      {/* Parameters table */}
                      {endpoint.parameters && endpoint.parameters.length > 0 && (
                        <div>
                          <span className="block text-xs font-medium text-gray-500 mb-1">Parameters</span>
                          <div className="border border-gray-200 rounded overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-1 text-left font-medium text-gray-600">Name</th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-600">Type</th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-600">In</th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-600">Req</th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-600">Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                {endpoint.parameters.map((param, i) => (
                                  <tr key={i} className="border-t border-gray-100">
                                    <td className="px-2 py-1 font-mono text-gray-800">{param.name}</td>
                                    <td className="px-2 py-1 text-gray-600">{param.type}</td>
                                    <td className="px-2 py-1 text-gray-600">{param.location}</td>
                                    <td className="px-2 py-1">{param.required ? <span className="text-red-500">*</span> : '-'}</td>
                                    <td className="px-2 py-1 text-gray-600">{param.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Response fields table */}
                      {endpoint.response_fields && endpoint.response_fields.length > 0 && (
                        <div>
                          <span className="block text-xs font-medium text-gray-500 mb-1">Response Fields</span>
                          <div className="border border-gray-200 rounded overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-1 text-left font-medium text-gray-600">Field</th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-600">Type</th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-600">JSON Path</th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-600">Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                {endpoint.response_fields.map((field, i) => (
                                  <tr key={i} className="border-t border-gray-100">
                                    <td className="px-2 py-1 font-mono text-gray-800">{field.name}</td>
                                    <td className="px-2 py-1 text-gray-600">{field.type}</td>
                                    <td className="px-2 py-1 font-mono text-gray-600 text-[10px]">{field.json_path}</td>
                                    <td className="px-2 py-1 text-gray-600">{field.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* AI reasoning */}
                      {endpoint.ai_notes && (
                        <div>
                          <span className="block text-xs font-medium text-gray-500 mb-0.5">AI Notes</span>
                          <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">{endpoint.ai_notes}</p>
                        </div>
                      )}

                      {/* Documentation link */}
                      {endpoint.documentation_url && (
                        <div>
                          <a
                            href={endpoint.documentation_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink size={12} />
                            API Documentation
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
          {!isDiscovering && (
            <button
              onClick={handleSearchAgain}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
            >
              <RefreshCw size={14} />
              Search Again
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

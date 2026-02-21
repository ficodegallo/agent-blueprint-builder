import { useState, useEffect, useRef } from 'react';
import { Plus, X, Globe, Database, ArrowRight, ChevronDown, Sparkles, CheckCircle, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '../shared/Modal';
import type {
  IntegrationDetail,
  IntegrationIOMapping,
  ApiEndpoint,
  IOItem,
} from '../../types';

interface IntegrationDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  integration: IntegrationDetail | null;
  nodeInputs: IOItem[];
  nodeOutputs: IOItem[];
  onSave: (integration: IntegrationDetail) => void;
}

export function IntegrationDetailsDialog({
  isOpen,
  onClose,
  integration,
  nodeInputs,
  nodeOutputs,
  onSave,
}: IntegrationDetailsDialogProps) {
  // Local state for form
  const [formData, setFormData] = useState<IntegrationDetail>({
    name: '',
    action: '',
    inputs: [],
    outputs: [],
    apiEndpoints: [],
  });

  // State for dropdowns
  const [showInputDropdown, setShowInputDropdown] = useState(false);
  const [showOutputDropdown, setShowOutputDropdown] = useState(false);

  // Refs for click-outside detection
  const inputDropdownRef = useRef<HTMLDivElement>(null);
  const outputDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize form when integration changes
  useEffect(() => {
    if (integration) {
      setFormData(integration);
    }
  }, [integration]);

  // Click-outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputDropdownRef.current && !inputDropdownRef.current.contains(event.target as Node)) {
        setShowInputDropdown(false);
      }
      if (outputDropdownRef.current && !outputDropdownRef.current.contains(event.target as Node)) {
        setShowOutputDropdown(false);
      }
    };

    if (showInputDropdown || showOutputDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showInputDropdown, showOutputDropdown]);

  // Input mapping handlers
  const addInputMapping = () => {
    setFormData({
      ...formData,
      inputs: [
        ...formData.inputs,
        {
          description: '',
          databaseField: '',
        },
      ],
    });
  };

  const removeInputMapping = (index: number) => {
    setFormData({
      ...formData,
      inputs: formData.inputs.filter((_, i) => i !== index),
    });
  };

  const updateInputMapping = (
    index: number,
    field: keyof IntegrationIOMapping,
    value: string
  ) => {
    setFormData({
      ...formData,
      inputs: formData.inputs.map((input, i) =>
        i === index ? { ...input, [field]: value } : input
      ),
    });
  };

  // Output mapping handlers
  const addOutputMapping = () => {
    setFormData({
      ...formData,
      outputs: [
        ...formData.outputs,
        {
          description: '',
          databaseField: '',
        },
      ],
    });
  };

  const removeOutputMapping = (index: number) => {
    setFormData({
      ...formData,
      outputs: formData.outputs.filter((_, i) => i !== index),
    });
  };

  const updateOutputMapping = (
    index: number,
    field: keyof IntegrationIOMapping,
    value: string
  ) => {
    setFormData({
      ...formData,
      outputs: formData.outputs.map((output, i) =>
        i === index ? { ...output, [field]: value } : output
      ),
    });
  };

  // API Endpoint handlers
  const addApiEndpoint = () => {
    setFormData({
      ...formData,
      apiEndpoints: [
        ...formData.apiEndpoints,
        {
          id: uuidv4(),
          url: '',
          method: 'GET',
        },
      ],
    });
  };

  const removeApiEndpoint = (id: string) => {
    setFormData({
      ...formData,
      apiEndpoints: formData.apiEndpoints.filter((endpoint) => endpoint.id !== id),
    });
  };

  const updateApiEndpoint = (id: string, field: keyof ApiEndpoint, value: string) => {
    setFormData({
      ...formData,
      apiEndpoints: formData.apiEndpoints.map((endpoint) =>
        endpoint.id === id ? { ...endpoint, [field]: value } : endpoint
      ),
    });
  };

  // Check if a node input/output is already in the integration mappings
  const isInputInIntegration = (inputName: string): boolean => {
    return formData.inputs.some((input) => input.description === inputName);
  };

  const isOutputInIntegration = (outputName: string): boolean => {
    return formData.outputs.some((output) => output.description === outputName);
  };

  // Toggle node input in integration (add if not present, remove if present)
  const toggleNodeInput = (inputName: string) => {
    if (isInputInIntegration(inputName)) {
      // Remove it
      setFormData({
        ...formData,
        inputs: formData.inputs.filter((input) => input.description !== inputName),
      });
    } else {
      // Add it
      setFormData({
        ...formData,
        inputs: [
          ...formData.inputs,
          {
            description: inputName,
            databaseField: '',
          },
        ],
      });
    }
  };

  // Toggle node output in integration (add if not present, remove if present)
  const toggleNodeOutput = (outputName: string) => {
    if (isOutputInIntegration(outputName)) {
      // Remove it
      setFormData({
        ...formData,
        outputs: formData.outputs.filter((output) => output.description !== outputName),
      });
    } else {
      // Add it
      setFormData({
        ...formData,
        outputs: [
          ...formData.outputs,
          {
            description: outputName,
            databaseField: '',
          },
        ],
      });
    }
  };

  // Handle save
  const handleSave = () => {
    // Basic validation
    if (!formData.name.trim()) {
      alert('Please enter an integration name');
      return;
    }
    if (!formData.action.trim()) {
      alert('Please enter an action description');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Integration: ${formData.name || 'New Integration'}`}
      maxWidth="xl"
    >
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {/* Name Field */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Integration Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Workday, Salesforce, Internal Database"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Action Field */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action Summary *
          </label>
          <textarea
            value={formData.action}
            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
            placeholder="One-sentence summary of what this integration does (e.g., 'Retrieve employee data from HR system')"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Input Mappings Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-gray-600" />
              <label className="text-sm font-medium text-gray-700">Input Mappings</label>
            </div>
            <div className="flex items-center gap-2">
              {/* Dropdown for selecting from node */}
              <div className="relative" ref={inputDropdownRef}>
                <button
                  onClick={() => setShowInputDropdown(!showInputDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                >
                  <ChevronDown size={16} />
                  Select from Node
                </button>
                {showInputDropdown && (
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {nodeInputs.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 italic">
                        No inputs defined on this node
                      </div>
                    ) : (
                      <div className="p-2">
                        {nodeInputs.map((input) => (
                          <label
                            key={input.name}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isInputInIntegration(input.name)}
                              onChange={() => toggleNodeInput(input.name)}
                              className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">{input.name}</span>
                            {input.required && (
                              <span className="text-xs text-red-500 font-medium">*</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={addInputMapping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              >
                <Plus size={16} />
                Add Custom
              </button>
            </div>
          </div>

          {formData.inputs.length === 0 ? (
            <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg">
              No input mappings defined yet. Click "Add Input" to add one.
            </p>
          ) : (
            <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
              {formData.inputs.map((input, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={input.description}
                        onChange={(e) =>
                          updateInputMapping(index, 'description', e.target.value)
                        }
                        placeholder="e.g., Employee ID"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Database Field</label>
                      <input
                        type="text"
                        value={input.databaseField}
                        onChange={(e) =>
                          updateInputMapping(index, 'databaseField', e.target.value)
                        }
                        placeholder="e.g., employee.id"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeInputMapping(index)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-5"
                    title="Remove input"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Output Mappings Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowRight size={18} className="text-gray-600" />
              <label className="text-sm font-medium text-gray-700">Output Mappings</label>
            </div>
            <div className="flex items-center gap-2">
              {/* Dropdown for selecting from node */}
              <div className="relative" ref={outputDropdownRef}>
                <button
                  onClick={() => setShowOutputDropdown(!showOutputDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                >
                  <ChevronDown size={16} />
                  Select from Node
                </button>
                {showOutputDropdown && (
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {nodeOutputs.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 italic">
                        No outputs defined on this node
                      </div>
                    ) : (
                      <div className="p-2">
                        {nodeOutputs.map((output) => (
                          <label
                            key={output.name}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isOutputInIntegration(output.name)}
                              onChange={() => toggleNodeOutput(output.name)}
                              className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">{output.name}</span>
                            {output.required && (
                              <span className="text-xs text-red-500 font-medium">*</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={addOutputMapping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              >
                <Plus size={16} />
                Add Custom
              </button>
            </div>
          </div>

          {formData.outputs.length === 0 ? (
            <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg">
              No output mappings defined yet. Click "Add Output" to add one.
            </p>
          ) : (
            <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
              {formData.outputs.map((output, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={output.description}
                        onChange={(e) =>
                          updateOutputMapping(index, 'description', e.target.value)
                        }
                        placeholder="e.g., Employee Name"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Database Field</label>
                      <input
                        type="text"
                        value={output.databaseField}
                        onChange={(e) =>
                          updateOutputMapping(index, 'databaseField', e.target.value)
                        }
                        placeholder="e.g., employee.fullName"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeOutputMapping(index)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-5"
                    title="Remove output"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Endpoints Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-gray-600" />
              <label className="text-sm font-medium text-gray-700">API Endpoints</label>
            </div>
            <button
              onClick={addApiEndpoint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            >
              <Plus size={16} />
              Add Endpoint
            </button>
          </div>

          {formData.apiEndpoints.length === 0 ? (
            <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg">
              No API endpoints defined yet. Click "Add Endpoint" to add one.
            </p>
          ) : (
            <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
              {formData.apiEndpoints.map((endpoint) => (
                <div key={endpoint.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  {/* Endpoint header with URL + method (editable for manual, display for discovered) */}
                  <div className="flex items-start gap-2 p-3">
                    <div className="flex-1">
                      {/* Source badge for discovered endpoints */}
                      {endpoint.source === 'discovered' && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            <Sparkles className="w-3 h-3" />
                            AI Discovered
                          </span>
                          {endpoint.ai_confidence && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              endpoint.ai_confidence === 'high' ? 'bg-green-100 text-green-700' :
                              endpoint.ai_confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {endpoint.ai_confidence === 'high' && <CheckCircle className="w-3 h-3" />}
                              {endpoint.ai_confidence === 'medium' && <AlertTriangle className="w-3 h-3" />}
                              {endpoint.ai_confidence === 'low' && <AlertCircle className="w-3 h-3" />}
                              {endpoint.ai_confidence.charAt(0).toUpperCase() + endpoint.ai_confidence.slice(1)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Endpoint name (discovered only) */}
                      {endpoint.name && (
                        <div className="text-sm font-medium text-gray-900 mb-1">{endpoint.name}</div>
                      )}

                      {/* URL + Method */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={endpoint.url}
                            onChange={(e) => updateApiEndpoint(endpoint.id, 'url', e.target.value)}
                            placeholder="https://api.example.com/endpoint"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <select
                            value={endpoint.method}
                            onChange={(e) => updateApiEndpoint(endpoint.id, 'method', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                          </select>
                        </div>
                      </div>

                      {/* Description (discovered only) */}
                      {endpoint.description && (
                        <p className="text-xs text-gray-500 mt-1.5">{endpoint.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeApiEndpoint(endpoint.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remove endpoint"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Rich details for discovered endpoints */}
                  {endpoint.source === 'discovered' && (
                    <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                      {/* Auth & Rate limit */}
                      {(endpoint.auth_type || endpoint.rate_limit) && (
                        <div className="grid grid-cols-2 gap-2">
                          {endpoint.auth_type && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-500">Auth:</span>{' '}
                              <span className="text-gray-700">{endpoint.auth_type}</span>
                            </div>
                          )}
                          {endpoint.rate_limit && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-500">Rate Limit:</span>{' '}
                              <span className="text-gray-700">{endpoint.rate_limit}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Parameters */}
                      {endpoint.parameters && endpoint.parameters.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">Parameters:</span>
                          <div className="mt-1 space-y-0.5">
                            {endpoint.parameters.map((param, i) => (
                              <div key={i} className="text-xs text-gray-600 flex gap-1">
                                <span className="font-mono text-gray-800">{param.name}</span>
                                <span className="text-gray-400">({param.type}, {param.location})</span>
                                {param.required && <span className="text-red-500">*</span>}
                                {param.description && <span className="text-gray-500">— {param.description}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Response fields */}
                      {endpoint.response_fields && endpoint.response_fields.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">Response Fields:</span>
                          <div className="mt-1 space-y-0.5">
                            {endpoint.response_fields.map((field, i) => (
                              <div key={i} className="text-xs text-gray-600 flex gap-1">
                                <span className="font-mono text-gray-800">{field.name}</span>
                                <span className="text-gray-400">({field.type})</span>
                                {field.json_path && <span className="font-mono text-gray-400 text-[10px]">{field.json_path}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI notes */}
                      {endpoint.ai_notes && (
                        <p className="text-xs text-gray-500 italic">{endpoint.ai_notes}</p>
                      )}

                      {/* Documentation link */}
                      {endpoint.documentation_url && (
                        <a
                          href={endpoint.documentation_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink size={12} />
                          Documentation
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Integration
        </button>
      </div>
    </Modal>
  );
}

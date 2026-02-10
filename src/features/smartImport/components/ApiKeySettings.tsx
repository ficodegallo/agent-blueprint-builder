import { useState, useCallback, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, Zap } from 'lucide-react';
import { Modal } from '../../../components/shared/Modal';
import { useUIStore } from '../../../store';
import { SMART_IMPORT_CONFIG } from '../constants';
import { testApiConnection, type ApiTestResult } from '../utils/apiTest';

export function ApiKeySettings() {
  const activeDialog = useUIStore((state) => state.activeDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const isOpen = activeDialog === 'apiKeySettings';

  // Load existing key on open
  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY);
      if (storedKey) {
        try {
          setApiKey(atob(storedKey));
        } catch {
          setApiKey('');
        }
      }
      setSaved(false);
    }
  }, [isOpen]);

  const handleSave = useCallback(() => {
    if (apiKey.trim()) {
      // Store with basic obfuscation (not true encryption)
      localStorage.setItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY, btoa(apiKey.trim()));
      setSaved(true);
      setTimeout(() => {
        closeDialog();
      }, 1000);
    }
  }, [apiKey, closeDialog]);

  const handleClear = useCallback(() => {
    localStorage.removeItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY);
    setApiKey('');
    setSaved(false);
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    // Temporarily save the key for testing
    const previousKey = localStorage.getItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY);
    localStorage.setItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY, btoa(apiKey.trim()));

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testApiConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsTesting(false);

      // Restore previous key if test failed
      if (previousKey) {
        localStorage.setItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY, previousKey);
      } else {
        localStorage.removeItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY);
      }
    }
  }, [apiKey]);

  const handleClose = useCallback(() => {
    setTestResult(null);
    closeDialog();
  }, [closeDialog]);

  const isValidKey = apiKey.trim().startsWith('sk-ant-');
  const hasExistingKey = !!localStorage.getItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Claude API Settings" maxWidth="md">
      <div className="space-y-6">
        {/* Info */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            To generate blueprints with AI, you need a Claude API key from Anthropic.
            Your key is stored locally in your browser and never sent to our servers.
          </p>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            Get an API key from Anthropic
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* API Key Input */}
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className="w-4 h-4 text-gray-400" />
            </div>
            <input
              id="apiKey"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSaved(false);
              }}
              placeholder="sk-ant-api03-..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showKey ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Validation feedback */}
          {apiKey && (
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isValidKey ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">Valid key format</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-amber-600">
                      Key should start with "sk-ant-"
                    </span>
                  </>
                )}
              </div>

              {/* Test Connection Button */}
              {isValidKey && (
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
              )}
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div
              className={`mt-2 flex items-start gap-2 p-3 rounded-lg border ${
                testResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {testResult.message}
                </p>
                {testResult.responseTime && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    Response time: {testResult.responseTime}ms
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Success message */}
        {saved && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700">API key saved successfully!</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          {hasExistingKey ? (
            <button
              onClick={handleClear}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Remove saved key
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey.trim() || saved}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

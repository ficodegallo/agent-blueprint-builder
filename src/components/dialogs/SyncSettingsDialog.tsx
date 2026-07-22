import { useState } from 'react';
import { CheckCircle, Cloud, Loader2, XCircle } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { clearSyncToken, getSyncToken, isApiConfigured, setSyncToken } from '../../lib/apiConfig';
import { checkHealth } from '../../lib/apiBlueprints';
import { useBlueprintsLibraryStore } from '../../store/blueprintsLibraryStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok' }
  | { kind: 'fail'; message: string };

export function SyncSettingsDialog({ isOpen, onClose }: Props) {
  const [token, setToken] = useState(() => getSyncToken() || '');
  const [test, setTest] = useState<TestState>({ kind: 'idle' });
  const loadFromServer = useBlueprintsLibraryStore((s) => s.loadFromServer);

  const handleSave = () => {
    const trimmed = token.trim();
    if (trimmed) {
      setSyncToken(trimmed);
    } else {
      clearSyncToken();
    }
    // Re-hydrate so the sync status reflects the new credentials immediately
    loadFromServer();
    onClose();
  };

  const handleTest = async () => {
    const trimmed = token.trim();
    if (trimmed) setSyncToken(trimmed);
    else clearSyncToken();

    setTest({ kind: 'testing' });
    const result = await checkHealth();
    setTest(result.ok ? { kind: 'ok' } : { kind: 'fail', message: result.error || 'Connection failed' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sync Settings">
      <div className="space-y-4">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <Cloud className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
          <p>
            Blueprints sync to the hosted database. If the deployment is protected with a sync
            token, paste it here — it's stored only in this browser.
          </p>
        </div>

        {!isApiConfigured() && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            No sync API is configured for this build — the app is running in offline (local-only)
            mode. This is normal for local development.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sync Token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setTest({ kind: 'idle' });
            }}
            placeholder="Paste the API token for this deployment"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {test.kind === 'ok' && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" /> Connected — database reachable.
          </div>
        )}
        {test.kind === 'fail' && (
          <div className="flex items-center gap-2 text-sm text-red-700">
            <XCircle className="w-4 h-4 shrink-0" /> {test.message}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleTest}
            disabled={test.kind === 'testing' || !isApiConfigured()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {test.kind === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
            Test Connection
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

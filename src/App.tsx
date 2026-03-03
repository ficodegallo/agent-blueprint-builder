import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
import './index.css';

import { HomePage } from './components/pages/HomePage';
import { BlueprintEditor } from './components/pages/BlueprintEditor';
import { migrateToSupabase } from './utils/migrateToSupabase';
import { useBlueprintsLibraryStore } from './store/blueprintsLibraryStore';

function App() {
  const loadFromServer = useBlueprintsLibraryStore((state) => state.loadFromServer);
  const retrySyncPending = useBlueprintsLibraryStore((state) => state.retrySyncPending);

  useEffect(() => {
    // Run migration then hydrate from Supabase
    migrateToSupabase().then(() => loadFromServer());

    // Sync pending changes when coming back online
    const handleOnline = () => {
      retrySyncPending();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadFromServer, retrySyncPending]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/blueprint/:blueprintId" element={<BlueprintEditor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

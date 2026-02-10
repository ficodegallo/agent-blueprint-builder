import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { importBlueprintFromFile, type ImportResult } from '../utils/import';

export function useImport() {
  const { loadBlueprint } = useLocalStorage();

  const importFromFile = useCallback(
    async (file: File): Promise<ImportResult> => {
      const result = await importBlueprintFromFile(file);
      if (result.success && result.blueprint) {
        loadBlueprint(result.blueprint);
      }
      return result;
    },
    [loadBlueprint]
  );

  return {
    importFromFile,
  };
}

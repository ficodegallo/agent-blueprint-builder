import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { importBlueprintFromFile, type ImportResult } from '../utils/import';

/**
 * Hook that provides blueprint import from a JSON file.
 *
 * Reads a .blueprint.json file, validates its structure via importBlueprintFromFile,
 * and loads it into all Zustand stores on success.
 *
 * @returns {{
 *   importFromFile: (file: File) => Promise<ImportResult>
 * }}
 */
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

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { downloadJSON, exportToExcel, exportToPDF } from '../utils/export';
import { exportToWord } from '../utils/exportWord';
import { captureFullCanvas } from '../utils/canvasExport';

/**
 * Hook that provides blueprint export actions.
 *
 * Each export function reads the current blueprint from the store via
 * useLocalStorage and triggers a browser download in the appropriate format.
 * exportPDF and exportWord additionally capture the React Flow canvas as a PNG
 * before generating the document.
 *
 * @returns {{
 *   exportJSON: () => void,
 *   exportExcel: () => void,
 *   exportPDF: () => Promise<void>,
 *   exportWord: () => Promise<void>
 * }}
 */
export function useExport() {
  const { getCurrentBlueprint } = useLocalStorage();

  const exportJSON = useCallback(() => {
    const blueprint = getCurrentBlueprint();
    downloadJSON(blueprint);
  }, [getCurrentBlueprint]);

  const exportExcel = useCallback(() => {
    const blueprint = getCurrentBlueprint();
    exportToExcel(blueprint);
  }, [getCurrentBlueprint]);

  const exportPDF = useCallback(async () => {
    const blueprint = getCurrentBlueprint();

    // Capture the canvas diagram
    const canvasImage = await captureFullCanvas();

    // Export to PDF with the canvas image
    exportToPDF(blueprint, undefined, canvasImage);
  }, [getCurrentBlueprint]);

  const exportWord = useCallback(async () => {
    const blueprint = getCurrentBlueprint();
    const canvasImage = await captureFullCanvas();
    await exportToWord(blueprint, canvasImage);
  }, [getCurrentBlueprint]);

  return {
    exportJSON,
    exportExcel,
    exportPDF,
    exportWord,
  };
}

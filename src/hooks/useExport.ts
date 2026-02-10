import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { downloadJSON, exportToExcel, exportToPDF } from '../utils/export';
import { captureFullCanvas } from '../utils/canvasExport';

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

  return {
    exportJSON,
    exportExcel,
    exportPDF,
  };
}

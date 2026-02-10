import { FileJson, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { useExport } from '../../hooks/useExport';
import { useUIStore } from '../../store';

export function ExportDialog() {
  const activeDialog = useUIStore((state) => state.activeDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const { exportJSON, exportExcel, exportPDF } = useExport();

  const isOpen = activeDialog === 'export';

  const handleExportJSON = () => {
    exportJSON();
    closeDialog();
  };

  const handleExportExcel = () => {
    exportExcel();
    closeDialog();
  };

  const handleExportPDF = async () => {
    await exportPDF();
    closeDialog();
  };

  return (
    <Modal isOpen={isOpen} onClose={closeDialog} title="Export Blueprint" maxWidth="sm">
      <div className="space-y-3">
        <p className="text-sm text-gray-600 mb-4">
          Choose a format to export your blueprint:
        </p>

        <button
          onClick={handleExportJSON}
          className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
        >
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileJson className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">JSON Format</div>
            <div className="text-sm text-gray-500">
              Full blueprint data for import/sharing
            </div>
          </div>
          <Download className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={handleExportExcel}
          className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
        >
          <div className="p-2 bg-green-100 rounded-lg">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">Excel Format</div>
            <div className="text-sm text-gray-500">
              Multi-sheet workbook for documentation
            </div>
          </div>
          <Download className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={handleExportPDF}
          className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
        >
          <div className="p-2 bg-red-100 rounded-lg">
            <FileText className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">PDF Format</div>
            <div className="text-sm text-gray-500">
              Professional document for client sharing
            </div>
          </div>
          <Download className="w-5 h-5 text-gray-400" />
        </button>

        <div className="pt-3 border-t border-gray-100">
          <button
            onClick={closeDialog}
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

import { useNavigate } from 'react-router-dom';
import { Save, Download, Upload, FileText, ArrowLeft, Boxes, Sparkles } from 'lucide-react';
import { useBlueprintStore, useUIStore } from '../../store';

interface HeaderProps {
  showBackButton?: boolean;
}

export function Header({ showBackButton = false }: HeaderProps) {
  const navigate = useNavigate();
  const title = useBlueprintStore((state) => state.title);
  const status = useBlueprintStore((state) => state.status);
  const openDialog = useUIStore((state) => state.openDialog);

  return (
    <div className="h-full flex items-center justify-between px-4">
      {/* Left side - Title and status */}
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <FileText className="w-5 h-5 text-blue-600" />
          ) : (
            <Boxes className="w-5 h-5 text-purple-600" />
          )}
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        </div>
        <span
          className={`
            px-2 py-0.5 text-xs font-medium rounded-full
            ${status === 'Draft' ? 'bg-gray-100 text-gray-700' : ''}
            ${status === 'In Review' ? 'bg-yellow-100 text-yellow-700' : ''}
            ${status === 'Approved' ? 'bg-green-100 text-green-700' : ''}
            ${status === 'Archived' ? 'bg-slate-100 text-slate-700' : ''}
          `}
        >
          {status}
        </span>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => openDialog('smartImport')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Smart Import
        </button>
        <button
          onClick={() => openDialog('saveLoad')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
        <button
          onClick={() => openDialog('export')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        <button
          onClick={() => openDialog('import')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
      </div>
    </div>
  );
}

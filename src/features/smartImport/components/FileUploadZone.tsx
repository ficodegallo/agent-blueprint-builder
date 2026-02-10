import { useCallback, useRef, useState } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { UploadedFile } from '../types';
import { SMART_IMPORT_CONFIG } from '../constants';

interface FileUploadZoneProps {
  files: UploadedFile[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(status: UploadedFile['status']) {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
}

export function FileUploadZone({
  files,
  onAddFiles,
  onRemoveFile,
  disabled,
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onAddFiles(droppedFiles);
      }
    },
    [disabled, onAddFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        onAddFiles(Array.from(selectedFiles));
      }
      // Reset input to allow selecting the same file again
      e.target.value = '';
    },
    [onAddFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const acceptedExtensions = SMART_IMPORT_CONFIG.SUPPORTED_EXTENSIONS.join(',');
  const canAddMore = files.length < SMART_IMPORT_CONFIG.MAX_FILES;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${!canAddMore ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedExtensions}
          multiple
          onChange={handleFileChange}
          disabled={disabled || !canAddMore}
          className="hidden"
        />

        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragOver ? 'text-purple-500' : 'text-gray-400'}`} />

        <p className="text-sm font-medium text-gray-700">
          {isDragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supports: {SMART_IMPORT_CONFIG.SUPPORTED_EXTENSIONS.join(', ')} (max {SMART_IMPORT_CONFIG.MAX_FILE_SIZE_MB}MB each)
        </p>
        {!canAddMore && (
          <p className="text-xs text-amber-600 mt-2">
            Maximum {SMART_IMPORT_CONFIG.MAX_FILES} files allowed
          </p>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Uploaded Files ({files.length}/{SMART_IMPORT_CONFIG.MAX_FILES})
          </p>
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border
                  ${file.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}
                `}
              >
                {getFileIcon(file.status)}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                    {file.status === 'success' && file.extractedText && (
                      <span className="ml-2 text-green-600">
                        ({file.extractedText.length.toLocaleString()} characters extracted)
                      </span>
                    )}
                    {file.error && (
                      <span className="ml-2 text-red-600">{file.error}</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  disabled={disabled}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

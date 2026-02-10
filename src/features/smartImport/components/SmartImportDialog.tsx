import { useState, useCallback } from 'react';
import { Sparkles, Settings, AlertCircle, FileCode } from 'lucide-react';
import { Modal } from '../../../components/shared/Modal';
import { useUIStore } from '../../../store';
import { FileUploadZone } from './FileUploadZone';
import { GenerationOptions } from './GenerationOptions';
import { GenerationProgress } from './GenerationProgress';
import { GenerationSummary } from './GenerationSummary';
import { PromptEditor } from './PromptEditor';
import { useSmartImport } from '../hooks/useSmartImport';
import { SMART_IMPORT_CONFIG } from '../constants';
import type { GenerationStep } from '../types';

export function SmartImportDialog() {
  const activeDialog = useUIStore((state) => state.activeDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const openDialog = useUIStore((state) => state.openDialog);

  const {
    state,
    addFiles,
    removeFile,
    updateOptions,
    handleGenerate,
    loadGeneratedBlueprint,
    reset,
  } = useSmartImport();

  const [showSummary, setShowSummary] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  const isOpen = activeDialog === 'smartImport';

  const handleClose = useCallback(() => {
    reset();
    setShowSummary(false);
    closeDialog();
  }, [reset, closeDialog]);

  const handleGenerateClick = useCallback(async () => {
    const apiKey = localStorage.getItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY);
    if (!apiKey) {
      openDialog('apiKeySettings');
      return;
    }

    await handleGenerate();
  }, [handleGenerate, openDialog]);

  const handleGenerationComplete = useCallback(() => {
    setShowSummary(true);
  }, []);

  const handleLoadBlueprint = useCallback(() => {
    loadGeneratedBlueprint();
    handleClose();
  }, [loadGeneratedBlueprint, handleClose]);

  const handleOpenSettings = useCallback(() => {
    openDialog('apiKeySettings');
  }, [openDialog]);

  // Show progress view when generating
  const isGenerating = !['idle', 'complete', 'error'].includes(state.currentStep);

  // Show summary when complete
  if (showSummary && state.currentStep === 'complete' && state.generatedBlueprint) {
    return (
      <GenerationSummary
        isOpen={isOpen}
        blueprint={state.generatedBlueprint}
        onClose={handleClose}
        onLoadBlueprint={handleLoadBlueprint}
      />
    );
  }

  // Trigger summary display when generation completes
  if (state.currentStep === 'complete' && !showSummary) {
    handleGenerationComplete();
  }

  const hasApiKey = !!localStorage.getItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY);
  const canGenerate = state.files.length > 0 && state.files.some((f) => f.status === 'success');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Smart Import"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* API Key Warning */}
        {!hasApiKey && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-800">
                Claude API key required for AI generation.
              </p>
            </div>
            <button
              onClick={handleOpenSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </button>
          </div>
        )}

        {/* Generation Progress */}
        {isGenerating ? (
          <>
            <GenerationProgress
              step={state.currentStep as Exclude<GenerationStep, 'idle' | 'complete' | 'error'>}
              progress={state.stepProgress}
            />
            <div className="flex justify-center mt-6">
              <button
                onClick={() => {
                  reset();
                  console.log('Generation cancelled by user');
                }}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                Cancel Generation
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Error Display */}
            {state.error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Generation Failed</p>
                  <p className="text-sm text-red-700 mt-1">{state.error}</p>
                </div>
              </div>
            )}

            {/* File Upload Zone */}
            <FileUploadZone
              files={state.files}
              onAddFiles={addFiles}
              onRemoveFile={removeFile}
              disabled={isGenerating}
            />

            {/* Generation Options */}
            <GenerationOptions
              options={state.options}
              onChange={updateOptions}
              disabled={isGenerating}
            />
          </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={handleOpenSettings}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              API Settings
            </button>
            <button
              onClick={() => setShowPromptEditor(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              title="Edit AI prompts to customize blueprint generation"
            >
              <FileCode className="w-4 h-4" />
              Edit Prompts
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateClick}
              disabled={!canGenerate || isGenerating || !hasApiKey}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Generate Blueprint
            </button>
          </div>
        </div>
      </div>

      {/* Prompt Editor */}
      <PromptEditor isOpen={showPromptEditor} onClose={() => setShowPromptEditor(false)} />
    </Modal>
  );
}

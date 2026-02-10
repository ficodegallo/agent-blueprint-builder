// Components
export { SmartImportDialog } from './components/SmartImportDialog';
export { ApiKeySettings } from './components/ApiKeySettings';
export { FileUploadZone } from './components/FileUploadZone';
export { GenerationOptions } from './components/GenerationOptions';
export { GenerationProgress } from './components/GenerationProgress';
export { GenerationSummary } from './components/GenerationSummary';

// Hooks
export { useSmartImport } from './hooks/useSmartImport';
export { useClaudeApi, hasApiKey, getApiKey } from './hooks/useClaudeApi';

// Utilities
export { processFile, combineExtractedContent, isWithinTokenLimit } from './utils/fileProcessors';
export { parseClaudeResponse } from './utils/responseParser';
export { calculateAutoLayout, applyAutoLayout } from './utils/autoLayout';

// Types
export type {
  SmartImportState,
  SmartImportOptions,
  UploadedFile,
  GenerationStep,
  OptimizationGoal,
  Granularity,
  GenerationSummary as GenerationSummaryType,
  ClaudeResponse,
  ClaudeGeneratedBlueprint,
} from './types';

// Constants
export { SMART_IMPORT_CONFIG, SYSTEM_PROMPT, buildUserPrompt, STEP_LABELS } from './constants';

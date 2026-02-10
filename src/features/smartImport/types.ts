import type { NodeType, AIConfidence } from '../../types/nodes';
import type { Blueprint } from '../../types/blueprint';

// User preference types
export type OptimizationGoal = 'maximize_automation' | 'balanced' | 'human_in_loop';
export type Granularity = 'high_level' | 'detailed' | 'click_level';

// Generation process steps
export type GenerationStep =
  | 'idle'
  | 'reading'
  | 'analyzing'
  | 'generating'
  | 'layouting'
  | 'complete'
  | 'error';

// File upload state
export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  extractedText?: string;
}

// User options for generation
export interface SmartImportOptions {
  processName: string;
  additionalInstructions: string;
  optimizationGoal: OptimizationGoal;
  granularity: Granularity;
}

// State for the smart import feature
export interface SmartImportState {
  files: UploadedFile[];
  options: SmartImportOptions;
  currentStep: GenerationStep;
  stepProgress: number;
  error: string | null;
  generatedBlueprint: Blueprint | null;
}

// Summary of generated blueprint
export interface GenerationSummary {
  nodesByType: Partial<Record<NodeType, number>>;
  confidenceCounts: {
    high: number;
    medium: number;
    low: number;
  };
  lowConfidenceNodes: Array<{
    id: string;
    name: string;
    confidence: AIConfidence;
    notes: string;
  }>;
  totalNodes: number;
  totalEdges: number;
}

// Claude API response structure
export interface ClaudeGeneratedBlueprint {
  title: string;
  description: string;
  nodes: Array<{
    id: string;
    type: NodeType;
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
  }>;
}

export interface ClaudeResponse {
  blueprint: ClaudeGeneratedBlueprint;
  reasoning?: string;
}

// Default values
export const DEFAULT_OPTIONS: SmartImportOptions = {
  processName: '',
  additionalInstructions: '',
  optimizationGoal: 'balanced',
  granularity: 'detailed',
};

export const INITIAL_STATE: SmartImportState = {
  files: [],
  options: DEFAULT_OPTIONS,
  currentStep: 'idle',
  stepProgress: 0,
  error: null,
  generatedBlueprint: null,
};

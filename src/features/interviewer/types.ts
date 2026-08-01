import type { NodeData } from '../../types';
import type { OrchestrationPatternId } from '../patterns/types';

export type InterviewMode = 'discovery' | 'grill';

// A pattern the interviewer infers from what it has heard so far.
export interface InterviewerPatternRecommendation {
  id: OrchestrationPatternId;
  rationale: string;
  confidence: 'high' | 'medium' | 'low';
}

export type CoverageStatus = 'missing' | 'partial' | 'covered';

export type CoverageArea =
  | 'trigger'
  | 'steps'
  | 'systems'
  | 'decisions'
  | 'exceptions'
  | 'volumes'
  | 'oversight';

export type Coverage = Record<CoverageArea, CoverageStatus>;

export const COVERAGE_LABELS: Record<CoverageArea, string> = {
  trigger: 'Trigger',
  steps: 'Steps',
  systems: 'Systems',
  decisions: 'Decisions',
  exceptions: 'Exceptions',
  volumes: 'Volumes & SLAs',
  oversight: 'Human Oversight',
};

export function emptyCoverage(): Coverage {
  return {
    trigger: 'missing',
    steps: 'missing',
    systems: 'missing',
    decisions: 'missing',
    exceptions: 'missing',
    volumes: 'missing',
    oversight: 'missing',
  };
}

// A question the owner couldn't answer in the moment, parked for later.
export interface ParkedQuestion {
  // Stable client key: `${area}:${normalizedText}` (see parkedQuestionKey)
  id: string;
  question: string;
  area: CoverageArea;
  // Why this answer matters to the blueprint (model-authored)
  why: string;
  // Partial info the owner already gave, if any
  context?: string;
}

// Build a stable dedupe key for a parked question from its area + text.
export function parkedQuestionKey(area: CoverageArea, question: string): string {
  const normalized = question.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${area}:${normalized}`;
}

// The model's signal that the owner just answered a previously-parked question,
// so it can be removed from the parked list (resolve is the inverse of park).
export interface ParkedResolution {
  question: string;
  area: CoverageArea;
}

// Canvas mutations the interviewer can apply
export type CanvasAction =
  | { op: 'addNode'; id: string; data: NodeData }
  | { op: 'updateNode'; id: string; data: Partial<NodeData> }
  | { op: 'addEdge'; source: string; target: string; sourceHandle?: string; label?: string }
  | { op: 'removeNode'; id: string }
  | { op: 'removeEdge'; source: string; target: string };

export interface InterviewerTurn {
  message: string;
  actions: CanvasAction[];
  coverage: Coverage;
  done: boolean;
  // Optional pattern the model recommends based on what it has heard.
  recommendedPattern?: InterviewerPatternRecommendation;
  // Questions the owner deferred this turn (empty when nothing was parked).
  parkedQuestions: ParkedQuestion[];
  // Previously-parked questions the owner answered this turn (empty when none).
  resolvedParked: ParkedResolution[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  // What is displayed in the transcript (for assistant: turn.message, not raw JSON)
  displayText: string;
  // What is sent back to the API (for assistant: the raw JSON response)
  apiText: string;
  actionCount?: number;
}

// A persisted interview session, keyed per-blueprint so "come back later" works.
export interface InterviewSession {
  mode: InterviewMode;
  processContext: string;
  messages: ChatMessage[];
  coverage: Coverage;
  parkedQuestions: ParkedQuestion[];
  updatedAt: string;
}

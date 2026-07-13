import type { NodeData } from '../../types';

export type InterviewMode = 'discovery' | 'grill';

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
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  // What is displayed in the transcript (for assistant: turn.message, not raw JSON)
  displayText: string;
  // What is sent back to the API (for assistant: the raw JSON response)
  apiText: string;
  actionCount?: number;
}

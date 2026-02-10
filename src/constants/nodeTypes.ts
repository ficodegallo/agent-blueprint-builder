// Node type string constants for React Flow registration
export const NODE_TYPES = {
  TRIGGER: 'trigger',
  WORK: 'work',
  DECISION: 'decision',
  END: 'end',
} as const;

// Worker type constants
export const WORKER_TYPES = {
  AGENT: 'agent',
  AUTOMATION: 'automation',
  HUMAN: 'human',
} as const;

// Trigger type constants
export const TRIGGER_TYPES = {
  EVENT: 'event',
  SCHEDULED: 'scheduled',
  MANUAL: 'manual',
} as const;

// Node colors by type
export const NODE_COLORS = {
  trigger: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    text: 'text-emerald-700',
    accent: 'bg-emerald-500',
  },
  work: {
    agent: {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      text: 'text-orange-700',
      accent: 'bg-orange-500',
    },
    automation: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      text: 'text-yellow-700',
      accent: 'bg-yellow-500',
    },
    human: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-700',
      accent: 'bg-blue-500',
    },
  },
  decision: {
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    text: 'text-amber-700',
    accent: 'bg-amber-500',
  },
  end: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-700',
    accent: 'bg-red-500',
  },
  workflow: {
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    text: 'text-purple-700',
    accent: 'bg-purple-500',
  },
} as const;

// Status colors
export const STATUS_COLORS = {
  Draft: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
  },
  'In Review': {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    dot: 'bg-yellow-400',
  },
  Approved: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-400',
  },
  Archived: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  },
} as const;

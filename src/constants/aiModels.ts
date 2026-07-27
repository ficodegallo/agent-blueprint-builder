/**
 * Central AI model configuration for all AI-powered features.
 *
 * Model IDs are aliases (no date suffixes) so they track the latest snapshot.
 * Change a feature's model here — hooks and Smart Import read from this map.
 */

export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';

export const DEFAULT_MODEL = 'claude-opus-4-8';

export const AI_FEATURE_MODELS = {
  smartImport: DEFAULT_MODEL,
  goalEvaluate: DEFAULT_MODEL,
  taskAutoOrder: DEFAULT_MODEL,
  apiDiscovery: DEFAULT_MODEL,
  bestPracticesAnalysis: DEFAULT_MODEL,
  interviewer: DEFAULT_MODEL,
  patternRecommend: DEFAULT_MODEL,
} as const;

export type AIFeatureModelKey = keyof typeof AI_FEATURE_MODELS;

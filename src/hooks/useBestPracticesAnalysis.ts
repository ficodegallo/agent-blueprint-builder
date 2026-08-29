import { useState, useCallback } from 'react';
import { getApiKey } from '../features/smartImport/hooks/useClaudeApi';
import { getBestPracticesText } from '../utils/bestPracticesStorage';
import { BUILT_IN_BEST_PRACTICES } from '../data/defaultBestPractices';
import { getActivePrompts } from '../utils/aiPromptStorage';
import { serializeBlueprintForAnalysis } from '../utils/blueprintSerializer';
import type { AppNode } from '../store/nodesStore';
import type { BlueprintEdge } from '../types';
import type { ValidationIssue } from '../utils/validation';

import { AI_FEATURE_MODELS, ANTHROPIC_API_URL as API_URL } from '../constants/aiModels';

const MODEL = AI_FEATURE_MODELS.bestPracticesAnalysis;
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 60000;

interface BPWarning {
  code: string;
  message: string;
  nodeId: string | null;
  nodeName: string | null;
}

/**
 * Hook for AI-powered best practices compliance analysis.
 *
 * Serializes the current blueprint into a text description and sends it to
 * Claude Sonnet along with user-defined best practices text. Returns a list of
 * violations formatted as ValidationIssue[] so they can be displayed alongside
 * standard validation errors in the ValidationPanel.
 *
 * Requires best practices text to be configured via bestPracticesStorage and
 * a Claude API key to be set in Smart Import settings.
 *
 * @returns {{
 *   analyzeBestPractices: (nodes: AppNode[], edges: BlueprintEdge[]) => Promise<void>,
 *   isAnalyzing: boolean,
 *   warnings: ValidationIssue[],
 *   error: string | null,
 *   clearWarnings: () => void
 * }}
 */
export function useBestPracticesAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [warnings, setWarnings] = useState<ValidationIssue[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyzeBestPractices = useCallback(async (nodes: AppNode[], edges: BlueprintEdge[]) => {
    // Built-in rulebook always applies; user-defined practices are appended.
    const userPractices = getBestPracticesText().trim();
    const bestPracticesText = userPractices
      ? `${BUILT_IN_BEST_PRACTICES}\n## Organization-specific practices\n\n${userPractices}`
      : BUILT_IN_BEST_PRACTICES;

    const apiKey = getApiKey();
    if (!apiKey) {
      setError('API key not found. Please configure your Claude API key in Smart Import settings.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setWarnings([]);

    const blueprintText = serializeBlueprintForAnalysis(nodes, edges);

    const prompts = getActivePrompts('bestPracticesAnalysis');
    const systemPrompt = prompts.systemPrompt;

    const userPrompt = prompts.userPromptTemplate
      .replace('{{BEST_PRACTICES_TEXT}}', bestPracticesText)
      .replace('{{BLUEPRINT_TEXT}}', blueprintText);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `API request failed: ${response.status}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error('No content in API response');
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not parse analysis response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as BPWarning[];

      const issues: ValidationIssue[] = parsed.map((w, i) => ({
        id: `bp-${i}-${w.nodeId || 'global'}`,
        severity: 'warning' as const,
        code: w.code || `BP${String(i + 1).padStart(3, '0')}`,
        message: w.message,
        nodeId: w.nodeId || undefined,
        nodeName: w.nodeName || undefined,
      }));

      setWarnings(issues);
      setIsAnalyzing(false);
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : 'Failed to analyze best practices';
      setError(message);
      setIsAnalyzing(false);
    }
  }, []);

  const clearWarnings = useCallback(() => {
    setWarnings([]);
    setError(null);
  }, []);

  return {
    analyzeBestPractices,
    isAnalyzing,
    warnings,
    error,
    clearWarnings,
  };
}

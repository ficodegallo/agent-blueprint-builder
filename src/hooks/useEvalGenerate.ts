import { useState, useCallback, useRef } from 'react';
import { getApiKey } from '../features/smartImport/hooks/useClaudeApi';
import { getActivePrompts } from '../utils/aiPromptStorage';
import { BUILT_IN_EVAL_PRACTICES } from '../data/defaultEvalPractices';
import {
  serializeBlueprintForAnalysis,
  serializeBlueprintMetadata,
} from '../utils/blueprintSerializer';
import { parseEvalResponse } from '../features/evals/parseEvalResponse';
import { AI_FEATURE_MODELS, ANTHROPIC_API_URL as API_URL } from '../constants/aiModels';
import type { AppNode } from '../store/nodesStore';
import type { BlueprintEdge, BlueprintMetadata, EvalCandidate, EvalItem } from '../types';

const MODEL = AI_FEATURE_MODELS.evalGenerate;
const MAX_TOKENS = 8000;
// Longer than the small single-field features: this call serializes the whole
// canvas and asks for six structured objects back.
const TIMEOUT_MS = 90000;

function formatExistingEvals(evals: EvalItem[]): string {
  const active = evals.filter((e) => e.status !== 'dismissed');
  if (active.length === 0) return 'None yet — this is the first set.';

  return active
    .map((e) => `- [${e.dimension}] ${e.title} — ${e.question}`)
    .join('\n');
}

/**
 * Hook for AI-powered eval generation.
 *
 * Serializes the whole blueprint — metadata plus every node's spec — and asks
 * Claude for the evals that would tell the team whether the built workflow is
 * working. Returns candidates for review; it never writes to the eval store,
 * so a refresh can only ever add proposals, never edit existing evals.
 */
export function useEvalGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [candidates, setCandidates] = useState<EvalCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const generateEvals = useCallback(
    async (
      nodes: AppNode[],
      edges: BlueprintEdge[],
      metadata: Partial<BlueprintMetadata>,
      existingEvals: EvalItem[]
    ): Promise<EvalCandidate[]> => {
      const apiKey = getApiKey();
      if (!apiKey) {
        setError(
          'API key not found. Please configure your Claude API key in Smart Import settings.'
        );
        return [];
      }

      setIsGenerating(true);
      setError(null);
      setCandidates([]);

      const prompts = getActivePrompts('evalGenerate');
      // Replacer *functions* — blueprint text is user content and may contain
      // `$&`, `$\``, or `$'`, which String.replace treats as special patterns
      // in a string replacement and would silently corrupt the prompt.
      const userPrompt = prompts.userPromptTemplate
        .replace('{{EVAL_PRACTICES}}', () => BUILT_IN_EVAL_PRACTICES)
        .replace('{{BLUEPRINT_METADATA}}', () => serializeBlueprintMetadata(metadata))
        .replace('{{BLUEPRINT_TEXT}}', () => serializeBlueprintForAnalysis(nodes, edges))
        .replace('{{EXISTING_EVALS}}', () => formatExistingEvals(existingEvals));

      const controller = new AbortController();
      controllerRef.current = controller;
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
            system: prompts.systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message || `API request failed: ${response.status}`
          );
        }

        const data = await response.json();
        const content = data.content?.[0]?.text;
        if (!content) throw new Error('No content in API response');

        const nodeIds = new Set(nodes.map((n) => n.id));
        const { items } = parseEvalResponse(content, nodeIds);

        if (items.length === 0) {
          throw new Error(
            'Could not read any evals from the response. Try generating again.'
          );
        }

        setCandidates(items);
        setIsGenerating(false);
        return items;
      } catch (err) {
        clearTimeout(timeoutId);
        const message =
          err instanceof Error && err.name === 'AbortError'
            ? 'Eval generation timed out. Try again, or simplify the blueprint.'
            : err instanceof Error
              ? err.message
              : 'Failed to generate evals';
        setError(message);
        setIsGenerating(false);
        return [];
      } finally {
        controllerRef.current = null;
      }
    },
    []
  );

  const abort = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearCandidates = useCallback(() => setCandidates([]), []);

  return {
    generateEvals,
    isGenerating,
    candidates,
    error,
    clearError,
    clearCandidates,
    abort,
  };
}

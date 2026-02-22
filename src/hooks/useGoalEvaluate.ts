import { useState, useCallback } from 'react';
import { getApiKey } from '../features/smartImport/hooks/useClaudeApi';
import { getActivePrompts } from '../utils/aiPromptStorage';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-5-20251101';
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 60000;

export interface GoalEvaluation {
  rating: 'strong' | 'moderate' | 'weak';
  suggestion: string;
  reasoning: string;
}

interface EvaluateGoalParams {
  nodeName: string;
  goal: string;
  tasks: string[];
  inputs: Array<{ name: string; required: boolean }>;
  outputs: Array<{ name: string; required: boolean }>;
}

export function useGoalEvaluate() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [suggestedGoal, setSuggestedGoal] = useState<GoalEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evaluateGoal = useCallback(async (params: EvaluateGoalParams): Promise<GoalEvaluation | null> => {
    const apiKey = getApiKey();

    if (!apiKey) {
      const errorMsg = 'API key not found. Please configure your Claude API key in the Smart Import settings.';
      setError(errorMsg);
      return null;
    }

    setIsEvaluating(true);
    setError(null);
    setSuggestedGoal(null);

    const prompts = getActivePrompts('goalEvaluate');
    const systemPrompt = prompts.systemPrompt;

    const formattedTasks = params.tasks.length > 0 ? params.tasks.join('; ') : 'None specified';
    const formattedInputs = params.inputs.length > 0 ? params.inputs.map(i => `${i.name}${i.required ? ' (required)' : ''}`).join(', ') : 'None specified';
    const formattedOutputs = params.outputs.length > 0 ? params.outputs.map(o => `${o.name}${o.required ? ' (required)' : ''}`).join(', ') : 'None specified';

    const userPrompt = prompts.userPromptTemplate
      .replace('{{NODE_NAME}}', params.nodeName)
      .replace('{{GOAL}}', params.goal)
      .replace('{{TASKS}}', formattedTasks)
      .replace('{{INPUTS}}', formattedInputs)
      .replace('{{OUTPUTS}}', formattedOutputs);

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
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
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

      // Extract JSON object from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from response');
      }

      const evaluation = JSON.parse(jsonMatch[0]) as GoalEvaluation;

      // Validate the response structure
      if (!['strong', 'moderate', 'weak'].includes(evaluation.rating)) {
        throw new Error('Invalid rating in response');
      }
      if (!evaluation.suggestion || !evaluation.reasoning) {
        throw new Error('Missing suggestion or reasoning in response');
      }

      setSuggestedGoal(evaluation);
      setIsEvaluating(false);
      return evaluation;
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMessage = err instanceof Error ? err.message : 'Failed to evaluate goal';
      setError(errorMessage);
      setIsEvaluating(false);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuggestion = useCallback(() => {
    setSuggestedGoal(null);
  }, []);

  return {
    evaluateGoal,
    isEvaluating,
    suggestedGoal,
    error,
    clearError,
    clearSuggestion,
  };
}

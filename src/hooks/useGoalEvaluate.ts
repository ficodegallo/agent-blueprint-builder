import { useState, useCallback } from 'react';
import { getApiKey } from '../features/smartImport/hooks/useClaudeApi';

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

    const systemPrompt = `You are an expert business process designer who specializes in writing strong, outcome-focused goals for workflow nodes.

Your job is to evaluate a goal statement and suggest an improved version if needed.

Rules for strong goals:
1. Focus on OUTCOMES, not activities (e.g., "Ensure accurate employee data is updated in all downstream systems" not "Process the data")
2. Be specific about what success looks like
3. Include measurable or verifiable criteria when possible
4. Reference the business value or impact
5. Avoid vague verbs like "process", "handle", "manage" without specifics

Rate the goal as:
- "strong": Clear outcome focus, specific, measurable — little or no improvement needed
- "moderate": Has some outcome language but could be more specific or impactful
- "weak": Task-centric, vague, or missing outcome focus

Return ONLY a JSON object with this exact structure:
{
  "rating": "strong" | "moderate" | "weak",
  "suggestion": "The improved goal text",
  "reasoning": "Brief explanation of what was improved and why (1-2 sentences)"
}`;

    const userPrompt = `Evaluate and improve this goal for a workflow node:

Node Name: ${params.nodeName}
Current Goal: ${params.goal}

Context:
- Tasks performed: ${params.tasks.length > 0 ? params.tasks.join('; ') : 'None specified'}
- Inputs: ${params.inputs.length > 0 ? params.inputs.map(i => `${i.name}${i.required ? ' (required)' : ''}`).join(', ') : 'None specified'}
- Outputs: ${params.outputs.length > 0 ? params.outputs.map(o => `${o.name}${o.required ? ' (required)' : ''}`).join(', ') : 'None specified'}

Return ONLY the JSON object with rating, suggestion, and reasoning.`;

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

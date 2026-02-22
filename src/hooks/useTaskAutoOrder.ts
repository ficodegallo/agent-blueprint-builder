import { useState, useCallback } from 'react';
import { getApiKey } from '../features/smartImport/hooks/useClaudeApi';
import { getActivePrompts } from '../utils/aiPromptStorage';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-5-20251101';
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 60000;

interface AutoOrderParams {
  tasks: string[];
  goal: string;
  inputs: Array<{ name: string; required: boolean }>;
  outputs: Array<{ name: string; required: boolean }>;
}

export function useTaskAutoOrder() {
  const [isOrdering, setIsOrdering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoOrderTasks = useCallback(async (params: AutoOrderParams): Promise<string[] | null> => {
    console.log('Auto-order started with params:', params);

    const apiKey = getApiKey();

    if (!apiKey) {
      const errorMsg = 'API key not found. Please configure your Claude API key in the Smart Import settings.';
      console.error(errorMsg);
      setError(errorMsg);
      return null;
    }

    setIsOrdering(true);
    setError(null);

    const prompts = getActivePrompts('taskAutoOrder');
    const systemPrompt = prompts.systemPrompt;

    const formattedInputs = params.inputs.map((input) => `- ${input.name}${input.required ? ' (required)' : ''}`).join('\n');
    const formattedOutputs = params.outputs.map((output) => `- ${output.name}${output.required ? ' (required)' : ''}`).join('\n');
    const formattedTasks = params.tasks.map((task, i) => `${i + 1}. ${task}`).join('\n');

    const userPrompt = prompts.userPromptTemplate
      .replace('{{GOAL}}', params.goal)
      .replace('{{INPUTS}}', formattedInputs)
      .replace('{{OUTPUTS}}', formattedOutputs)
      .replace('{{TASKS}}', formattedTasks);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    console.log('Sending API request to Claude...');

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

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `API request failed: ${response.status}`;
        console.error('API error:', errorMsg, errorData);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('API response data:', data);

      const content = data.content?.[0]?.text;
      console.log('Extracted content:', content);

      if (!content) {
        throw new Error('No content in API response');
      }

      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('Could not find JSON array in content:', content);
        throw new Error('Could not extract JSON array from response');
      }

      console.log('Extracted JSON:', jsonMatch[0]);
      const reorderedTasks = JSON.parse(jsonMatch[0]) as string[];
      console.log('Parsed reordered tasks:', reorderedTasks);

      // Validate that we got the same tasks back
      if (reorderedTasks.length !== params.tasks.length) {
        console.error('Task count mismatch. Original:', params.tasks.length, 'Reordered:', reorderedTasks.length);
        throw new Error('Reordered tasks count does not match original');
      }

      console.log('Auto-order successful!');
      setIsOrdering(false);
      return reorderedTasks;
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-order tasks';
      console.error('Auto-order error:', err);
      setError(errorMessage);
      setIsOrdering(false);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    autoOrderTasks,
    isOrdering,
    error,
    clearError,
  };
}

import { getApiKey } from './hooks/useClaudeApi';
import { getActivePrompts } from '../../utils/aiPromptStorage';
import { AI_FEATURE_MODELS, ANTHROPIC_API_URL, ANTHROPIC_VERSION } from '../../constants/aiModels';
import { isOrchestrationPatternId, patternCatalogSummary } from '../patterns/patterns';
import type { OrchestrationPatternId } from '../patterns/types';

export interface PatternRecommendation {
  patternId: OrchestrationPatternId;
  rationale: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface RecommendResult {
  success: boolean;
  recommendation?: PatternRecommendation;
  error?: string;
}

/**
 * Parse the model's JSON response into a validated recommendation. Rejects an
 * unknown patternId rather than trusting free text — the caller then falls
 * back to no recommendation (generation still proceeds).
 */
export function parsePatternRecommendation(responseText: string): RecommendResult {
  const match = responseText.match(/\{[\s\S]*\}/);
  if (!match) {
    return { success: false, error: 'No JSON object found in the response' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { success: false, error: 'Failed to parse recommendation JSON' };
  }

  const obj = parsed as Record<string, unknown>;
  if (!isOrchestrationPatternId(obj.patternId)) {
    return { success: false, error: `Unknown pattern id: ${String(obj.patternId)}` };
  }

  const confidence =
    obj.confidence === 'high' || obj.confidence === 'medium' || obj.confidence === 'low'
      ? obj.confidence
      : 'medium';

  return {
    success: true,
    recommendation: {
      patternId: obj.patternId,
      rationale: typeof obj.rationale === 'string' ? obj.rationale : '',
      confidence,
    },
  };
}

/**
 * Ask Claude to recommend an orchestration pattern from the extracted document
 * content. Non-blocking by contract: any failure returns { success: false }
 * and the caller proceeds without a recommendation.
 */
export async function recommendPatternFromContent(extractedContent: string): Promise<RecommendResult> {
  const apiKey = getApiKey();
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    return { success: false, error: 'A valid Claude API key is required.' };
  }

  const prompts = getActivePrompts('patternRecommend');
  const userPrompt = prompts.userPromptTemplate
    .replace('{{PATTERN_CATALOG}}', patternCatalogSummary())
    .replace('{{EXTRACTED_CONTENT}}', extractedContent);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: AI_FEATURE_MODELS.patternRecommend,
        max_tokens: 1024,
        system: prompts.systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `Pattern recommendation failed (status ${response.status})` };
    }

    const data = await response.json();
    const textContent = Array.isArray(data.content)
      ? data.content.find((c: Record<string, unknown>) => c.type === 'text')
      : null;
    if (!textContent?.text) {
      return { success: false, error: 'Unexpected response format' };
    }

    return parsePatternRecommendation(textContent.text as string);
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Pattern recommendation failed',
    };
  }
}

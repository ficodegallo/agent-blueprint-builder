import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getApiKey } from '../features/smartImport/hooks/useClaudeApi';
import type { ApiEndpoint, IOItem } from '../types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-5-20251101';
const MAX_TOKENS = 8000;
const TIMEOUT_MS = 60000;

interface DiscoverApisParams {
  integrationName: string;
  nodeName: string;
  goal: string;
  tasks: string[];
  inputs: IOItem[];
  outputs: IOItem[];
}

export function useApiDiscovery() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<ApiEndpoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const discoverApis = useCallback(async (params: DiscoverApisParams): Promise<ApiEndpoint[] | null> => {
    const apiKey = getApiKey();

    if (!apiKey) {
      const errorMsg = 'API key not found. Please configure your Claude API key in the Smart Import settings.';
      setError(errorMsg);
      return null;
    }

    setIsDiscovering(true);
    setError(null);
    setDiscoveredEndpoints([]);

    const systemPrompt = `You are an API integration specialist with deep knowledge of popular enterprise and SaaS APIs.

Your job is to suggest relevant API endpoints for a given integration based on the context of what the workflow node needs to accomplish.

Rules:
1. Suggest 2-5 relevant API endpoints based on your knowledge of the integration's API
2. Only suggest endpoints you are confident exist (or closely match real API patterns)
3. Use realistic URL patterns, parameter names, and response structures
4. Include authentication type and rate limit info when known
5. Use confidence levels:
   - "high": You are certain this endpoint exists with these details
   - "medium": You are fairly confident this endpoint exists but some details may vary
   - "low": This endpoint likely exists but details are approximate
6. If you don't have reliable knowledge of the integration's API, return an empty array []

Return ONLY a JSON array with this structure (no other text):
[
  {
    "name": "Short endpoint name",
    "url": "https://api.example.com/v1/resource",
    "method": "GET",
    "description": "What this endpoint does",
    "auth_type": "OAuth 2.0 / API Key / Bearer Token / etc.",
    "rate_limit": "e.g., 100 requests/minute",
    "parameters": [
      {
        "name": "param_name",
        "type": "string",
        "location": "path|query|header|body",
        "required": true,
        "description": "What this parameter does"
      }
    ],
    "response_fields": [
      {
        "name": "field_name",
        "type": "string",
        "json_path": "$.data.field",
        "description": "What this field contains"
      }
    ],
    "documentation_url": "https://docs.example.com/api/endpoint",
    "ai_confidence": "high|medium|low",
    "ai_notes": "Any additional context or caveats"
  }
]`;

    const userPrompt = `Suggest relevant API endpoints for this integration:

Integration: ${params.integrationName}
Node Name: ${params.nodeName}
Goal: ${params.goal || 'Not specified'}

Tasks:
${params.tasks.length > 0 ? params.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'None specified'}

Inputs: ${params.inputs.length > 0 ? params.inputs.map(i => `${i.name}${i.required ? ' (required)' : ''}`).join(', ') : 'None specified'}
Outputs: ${params.outputs.length > 0 ? params.outputs.map(o => `${o.name}${o.required ? ' (required)' : ''}`).join(', ') : 'None specified'}

Return ONLY the JSON array of suggested endpoints.`;

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

      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Could be an empty response or no knowledge
        setDiscoveredEndpoints([]);
        setIsDiscovering(false);
        return [];
      }

      const rawEndpoints = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;

      if (!Array.isArray(rawEndpoints)) {
        throw new Error('Response is not an array');
      }

      // Add UUIDs and source to each endpoint
      const endpoints: ApiEndpoint[] = rawEndpoints.map((ep) => ({
        id: uuidv4(),
        url: String(ep.url || ''),
        method: (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(String(ep.method))
          ? String(ep.method)
          : 'GET') as ApiEndpoint['method'],
        name: ep.name ? String(ep.name) : undefined,
        description: ep.description ? String(ep.description) : undefined,
        auth_type: ep.auth_type ? String(ep.auth_type) : undefined,
        rate_limit: ep.rate_limit ? String(ep.rate_limit) : undefined,
        parameters: Array.isArray(ep.parameters) ? ep.parameters.map((p: Record<string, unknown>) => ({
          name: String(p.name || ''),
          type: String(p.type || 'string'),
          location: (['path', 'query', 'header', 'body'].includes(String(p.location))
            ? String(p.location)
            : 'query') as 'path' | 'query' | 'header' | 'body',
          required: Boolean(p.required),
          description: String(p.description || ''),
        })) : undefined,
        response_fields: Array.isArray(ep.response_fields) ? ep.response_fields.map((f: Record<string, unknown>) => ({
          name: String(f.name || ''),
          type: String(f.type || 'string'),
          json_path: String(f.json_path || ''),
          description: String(f.description || ''),
        })) : undefined,
        documentation_url: ep.documentation_url ? String(ep.documentation_url) : undefined,
        source: 'discovered' as const,
        ai_confidence: (['high', 'medium', 'low'].includes(String(ep.ai_confidence))
          ? String(ep.ai_confidence)
          : 'medium') as 'high' | 'medium' | 'low',
        ai_notes: ep.ai_notes ? String(ep.ai_notes) : undefined,
      }));

      setDiscoveredEndpoints(endpoints);
      setIsDiscovering(false);
      return endpoints;
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMessage = err instanceof Error
        ? (err.name === 'AbortError' ? 'Request timed out. Please try again.' : err.message)
        : 'Failed to discover APIs';
      setError(errorMessage);
      setIsDiscovering(false);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearDiscoveries = useCallback(() => {
    setDiscoveredEndpoints([]);
  }, []);

  return {
    discoverApis,
    isDiscovering,
    discoveredEndpoints,
    error,
    clearError,
    clearDiscoveries,
  };
}

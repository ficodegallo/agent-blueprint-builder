import { useCallback } from 'react';
import { SMART_IMPORT_CONFIG, getActiveSystemPrompt, buildUserPrompt } from '../constants';
import type { SmartImportOptions } from '../types';

export interface ClaudeApiResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export class ClaudeApiError extends Error {
  code: string;
  recoverable: boolean;
  retryDelay?: number;

  constructor(
    message: string,
    code: string,
    recoverable: boolean,
    retryDelay?: number
  ) {
    super(message);
    this.name = 'ClaudeApiError';
    this.code = code;
    this.recoverable = recoverable;
    this.retryDelay = retryDelay;
  }
}

/**
 * Get API key from localStorage
 */
export function getApiKey(): string | null {
  const encoded = localStorage.getItem(SMART_IMPORT_CONFIG.API_KEY_STORAGE_KEY);
  if (!encoded) return null;
  try {
    return atob(encoded);
  } catch {
    return null;
  }
}

/**
 * Check if API key exists
 */
export function hasApiKey(): boolean {
  return !!getApiKey();
}

/**
 * Hook for making Claude API calls
 */
export function useClaudeApi() {
  const callClaude = useCallback(
    async (
      extractedContent: string,
      options: SmartImportOptions,
      onProgress?: (message: string) => void
    ): Promise<ClaudeApiResponse> => {
      const apiKey = getApiKey();

      if (!apiKey) {
        console.error('API key not found');
        return {
          success: false,
          error: 'API key not found. Please configure your Claude API key.',
        };
      }

      // Basic API key validation (Claude API keys start with 'sk-ant-')
      if (!apiKey.startsWith('sk-ant-')) {
        console.error('Invalid API key format. Claude API keys should start with "sk-ant-"');
        return {
          success: false,
          error: 'Invalid API key format. Claude API keys should start with "sk-ant-". Please check your API key in settings.',
        };
      }

      console.log('API key validated (length:', apiKey.length, ')');

      const userPrompt = buildUserPrompt(extractedContent, options);
      const systemPrompt = getActiveSystemPrompt();

      console.log('Building Claude request...');
      console.log('User prompt length:', userPrompt.length);
      console.log('System prompt length:', systemPrompt.length);
      console.log('Model:', SMART_IMPORT_CONFIG.MODEL);
      console.log('Max tokens:', SMART_IMPORT_CONFIG.MAX_TOKENS);

      onProgress?.('Sending request to Claude...');

      // Create abort controller for timeout - reduce to 90 seconds for faster feedback
      const controller = new AbortController();
      const actualTimeout = 90000; // 90 seconds instead of 120
      const timeoutId = setTimeout(() => {
        console.error('Claude API timeout after', actualTimeout / 1000, 'seconds - aborting request');
        controller.abort();
      }, actualTimeout);

      console.log('Sending request to Claude API...');
      const requestBody = {
        model: SMART_IMPORT_CONFIG.MODEL,
        max_tokens: SMART_IMPORT_CONFIG.MAX_TOKENS,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      };

      console.log('Request body size:', JSON.stringify(requestBody).length, 'bytes');

      try {
        const fetchStartTime = Date.now();
        const response = await fetch(SMART_IMPORT_CONFIG.API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        const fetchDuration = Date.now() - fetchStartTime;
        console.log('Fetch completed in', fetchDuration, 'ms');

        clearTimeout(timeoutId);
        console.log('Received response from Claude API, status:', response.status);

        if (!response.ok) {
          console.error('Claude API returned error status:', response.status);
          // Handle specific error codes
          if (response.status === 401) {
            throw new ClaudeApiError(
              'Invalid API key. Please check your Claude API key.',
              'INVALID_API_KEY',
              true
            );
          }

          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
            throw new ClaudeApiError(
              `Rate limit exceeded. Please wait ${retryAfter} seconds.`,
              'RATE_LIMITED',
              true,
              retryAfter * 1000
            );
          }

          if (response.status === 400) {
            const errorBody = await response.json().catch(() => ({}));
            const errorMessage =
              (errorBody as Record<string, unknown>).error?.toString() ||
              'Invalid request';
            throw new ClaudeApiError(
              `Bad request: ${errorMessage}`,
              'BAD_REQUEST',
              false
            );
          }

          throw new ClaudeApiError(
            `API request failed with status ${response.status}`,
            'API_ERROR',
            true
          );
        }

        console.log('Parsing JSON response...');
        onProgress?.('Processing response...');

        const data = await response.json();
        console.log('Response parsed successfully');

        // Extract content from response
        if (
          data.content &&
          Array.isArray(data.content) &&
          data.content.length > 0
        ) {
          console.log('Found content array with', data.content.length, 'items');
          const textContent = data.content.find(
            (c: Record<string, unknown>) => c.type === 'text'
          );
          if (textContent && textContent.text) {
            console.log('Successfully extracted text content, length:', textContent.text.length);
            return {
              success: true,
              content: textContent.text,
            };
          }
        }

        console.error('Unexpected response format - no text content found');
        return {
          success: false,
          error: 'Unexpected response format from Claude API',
        };
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Claude API call exception:', error);

        if (error instanceof ClaudeApiError) {
          return {
            success: false,
            error: error.message,
          };
        }

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            return {
              success: false,
              error: `Request timed out after 90 seconds. The document may be too complex, or the API is experiencing delays. Try simplifying your document or try again later.`,
            };
          }

          // Network errors
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return {
              success: false,
              error: 'Network error: Unable to connect to Claude API. Please check your internet connection.',
            };
          }

          // CORS errors
          if (error.message.includes('CORS')) {
            return {
              success: false,
              error: 'Browser security error. Please ensure you are using a valid API key and have network access.',
            };
          }

          return {
            success: false,
            error: `API error: ${error.message}`,
          };
        }

        return {
          success: false,
          error: 'An unexpected error occurred while calling Claude API',
        };
      }
    },
    []
  );

  return { callClaude, hasApiKey, getApiKey };
}

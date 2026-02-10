import { SMART_IMPORT_CONFIG } from '../constants';
import { getApiKey } from '../hooks/useClaudeApi';

export interface ApiTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
}

/**
 * Test API connectivity with a minimal request
 */
export async function testApiConnection(): Promise<ApiTestResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      success: false,
      message: 'No API key found',
    };
  }

  if (!apiKey.startsWith('sk-ant-')) {
    return {
      success: false,
      message: 'Invalid API key format. Claude API keys start with "sk-ant-"',
    };
  }

  const startTime = Date.now();

  try {
    console.log('Testing API connection...');

    const response = await fetch(SMART_IMPORT_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: SMART_IMPORT_CONFIG.MODEL,
        max_tokens: 50,
        system: 'You are a helpful assistant.',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API key. Please check your API key in settings.',
          responseTime,
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          message: 'Rate limit exceeded. Please wait a moment and try again.',
          responseTime,
        };
      }

      return {
        success: false,
        message: `API returned error status ${response.status}`,
        responseTime,
      };
    }

    const data = await response.json();

    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      return {
        success: true,
        message: `API connection successful (${responseTime}ms)`,
        responseTime,
      };
    }

    return {
      success: false,
      message: 'Unexpected response format from API',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return {
          success: false,
          message: 'Connection timeout. Please check your internet connection.',
          responseTime,
        };
      }

      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          success: false,
          message: 'Network error. Please check your internet connection.',
          responseTime,
        };
      }

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        responseTime,
      };
    }

    return {
      success: false,
      message: 'Unknown error testing connection',
      responseTime,
    };
  }
}

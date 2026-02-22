/**
 * Storage utility for custom Smart Import prompts
 *
 * Delegates to the centralized aiPromptStorage with feature key 'smartImport'.
 */

import {
  getDefaultPrompts as getCentralDefaults,
  getActivePrompts as getCentralActive,
  saveCustomPrompts as saveCentral,
  resetFeaturePrompts,
} from '../../../utils/aiPromptStorage';

export interface StoredPrompts {
  systemPrompt: string;
  userPromptTemplate: string;
  lastModified: string;
}

/**
 * Get default prompts
 */
export function getDefaultPrompts(): StoredPrompts {
  const defaults = getCentralDefaults('smartImport');
  return {
    ...defaults,
    lastModified: new Date().toISOString(),
  };
}

/**
 * Load custom prompts from localStorage
 */
export function loadCustomPrompts(): StoredPrompts | null {
  const active = getCentralActive('smartImport');
  const defaults = getCentralDefaults('smartImport');
  // If active equals defaults, there are no custom prompts
  if (active.systemPrompt === defaults.systemPrompt && active.userPromptTemplate === defaults.userPromptTemplate) {
    return null;
  }
  return {
    ...active,
    lastModified: new Date().toISOString(),
  };
}

/**
 * Save custom prompts to localStorage
 */
export function saveCustomPrompts(prompts: Omit<StoredPrompts, 'lastModified'>): void {
  saveCentral('smartImport', {
    systemPrompt: prompts.systemPrompt,
    userPromptTemplate: prompts.userPromptTemplate,
  });
}

/**
 * Reset to default prompts
 */
export function resetToDefaultPrompts(): void {
  resetFeaturePrompts('smartImport');
}

/**
 * Get active prompts (custom if exists, otherwise default)
 */
export function getActivePrompts(): StoredPrompts {
  const active = getCentralActive('smartImport');
  return {
    ...active,
    lastModified: new Date().toISOString(),
  };
}

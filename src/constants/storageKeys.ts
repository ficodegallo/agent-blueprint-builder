// Local storage key constants
export const STORAGE_KEYS = {
  CURRENT_BLUEPRINT: 'blueprint-builder:current',
  BLUEPRINTS_LIST: 'blueprint-builder:blueprints',
  BLUEPRINT_PREFIX: 'blueprint-builder:blueprint:',
  USER_PREFERENCES: 'blueprint-builder:preferences',
} as const;

export function getBlueprintStorageKey(id: string): string {
  return `${STORAGE_KEYS.BLUEPRINT_PREFIX}${id}`;
}

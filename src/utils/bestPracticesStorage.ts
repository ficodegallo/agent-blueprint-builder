/**
 * Storage utility for best practices text used in blueprint analysis
 */

const STORAGE_KEY = 'blueprint-builder:best-practices';

export interface StoredBestPractices {
  text: string;
  lastModified: string;
}

export function loadBestPractices(): StoredBestPractices | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredBestPractices;
  } catch (error) {
    console.error('Failed to load best practices:', error);
    return null;
  }
}

export function saveBestPractices(text: string): void {
  try {
    const toSave: StoredBestPractices = {
      text,
      lastModified: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save best practices:', error);
    throw new Error('Failed to save best practices');
  }
}

export function clearBestPractices(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear best practices:', error);
  }
}

export function getBestPracticesText(): string {
  const stored = loadBestPractices();
  return stored?.text || '';
}

export function hasBestPractices(): boolean {
  const text = getBestPracticesText();
  return text.trim().length > 0;
}

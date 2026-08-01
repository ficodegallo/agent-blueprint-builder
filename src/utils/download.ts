// Shared browser-download helpers used by the various exporters so the
// Blob/createObjectURL/anchor-click/revoke sequence lives in one place.

/** Trigger a browser download of `content` as a file named `filename`. */
export function downloadBlob(content: BlobPart, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Turn a human title into a filesystem-safe kebab slug (never empty). */
export function sanitizeFilename(title: string | undefined, fallback = 'blueprint'): string {
  const safe = (title || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return safe || fallback;
}

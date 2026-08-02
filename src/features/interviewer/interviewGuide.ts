import { downloadBlob, sanitizeFilename } from '../../utils/download';
import { COVERAGE_LABELS, type CoverageArea, type ParkedQuestion } from './types';

/**
 * Render parked questions into a fillable Markdown "Interview Guide" — a
 * questionnaire the process owner can answer solo or hand to colleagues, then
 * bring back to fill in the blueprint's blanks.
 */
export function buildInterviewGuideMarkdown(
  parkedQuestions: ParkedQuestion[],
  blueprintTitle?: string
): string {
  const title = (blueprintTitle?.trim() || 'Blueprint') + ' — Interview Guide';
  const lines: string[] = [`# ${title}`, ''];

  if (parkedQuestions.length === 0) {
    lines.push('No open questions — nothing to collect. Every area was answered during the interview.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push(
    'These questions came up during the interview but did not have answers yet. Fill in what you',
    'can (or take them to whoever knows), then reopen the interview to close the gaps.',
    ''
  );

  // Group by coverage area, in the canonical COVERAGE_LABELS order.
  const areas = Object.keys(COVERAGE_LABELS) as CoverageArea[];
  for (const area of areas) {
    const inArea = parkedQuestions.filter((q) => q.area === area);
    if (inArea.length === 0) continue;

    lines.push(`## ${COVERAGE_LABELS[area]}`, '');
    for (const q of inArea) {
      lines.push(`### ${q.question}`);
      if (q.why) lines.push(`_Why it matters:_ ${q.why}`);
      if (q.context) lines.push(`_You mentioned:_ ${q.context}`);
      lines.push('', '**Answer:** _________________________________________________', '');
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** Trigger a browser download of the interview guide as a .md file. */
export function downloadInterviewGuide(
  parkedQuestions: ParkedQuestion[],
  blueprintTitle?: string
): void {
  const markdown = buildInterviewGuideMarkdown(parkedQuestions, blueprintTitle);
  downloadBlob(markdown, 'text/markdown', `${sanitizeFilename(blueprintTitle)}-interview-guide.md`);
}

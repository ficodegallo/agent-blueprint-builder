import { describe, it, expect } from 'vitest';
import { buildInterviewGuideMarkdown } from './interviewGuide';
import { parkedQuestionKey, type CoverageArea, type ParkedQuestion } from './types';

const mk = (area: CoverageArea, question: string, why = '', context?: string): ParkedQuestion => ({
  id: parkedQuestionKey(area, question),
  question,
  area,
  why,
  context,
});

describe('buildInterviewGuideMarkdown', () => {
  it('groups questions under their coverage-area sections in canonical order', () => {
    const md = buildInterviewGuideMarkdown([
      mk('oversight', 'Who approves refunds?', 'Names the gate owner.'),
      mk('trigger', 'What kicks this off?', 'Defines the entry point.'),
    ]);
    // trigger comes before oversight in COVERAGE_LABELS order
    expect(md.indexOf('## Trigger')).toBeLessThan(md.indexOf('## Human Oversight'));
    expect(md).toContain('### What kicks this off?');
    expect(md).toContain('### Who approves refunds?');
  });

  it('renders the why line and an answer blank for each question', () => {
    const md = buildInterviewGuideMarkdown([mk('volumes', 'What is the SLA?', 'Sets timeout budgets.')]);
    expect(md).toContain('_Why it matters:_ Sets timeout budgets.');
    expect(md).toMatch(/\*\*Answer:\*\*/);
  });

  it('includes a "You mentioned" line only when context is present', () => {
    const withCtx = buildInterviewGuideMarkdown([mk('systems', 'Which CRM?', 'Determines integration.', 'Maybe Salesforce.')]);
    const withoutCtx = buildInterviewGuideMarkdown([mk('systems', 'Which CRM?', 'Determines integration.')]);
    expect(withCtx).toContain('_You mentioned:_ Maybe Salesforce.');
    expect(withoutCtx).not.toContain('_You mentioned:_');
  });

  it('uses the blueprint title in the heading', () => {
    const md = buildInterviewGuideMarkdown([mk('steps', 'Q', 'w')], 'Invoice Approval');
    expect(md).toContain('# Invoice Approval — Interview Guide');
  });

  it('returns a friendly body (no throw) when there are no parked questions', () => {
    const md = buildInterviewGuideMarkdown([]);
    expect(md).toContain('No open questions');
    expect(md).not.toContain('## ');
  });
});

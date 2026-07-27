import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  PATTERN_QUESTIONS,
  recommendPatternFromAnswers,
  type PatternAnswers,
} from '../../features/patterns/recommendPattern';
import { getPattern } from '../../features/patterns/patterns';
import type { OrchestrationPatternId } from '../../features/patterns/types';

interface GuidedPatternPickerProps {
  onRecommend: (patternId: OrchestrationPatternId) => void;
  onBack: () => void;
}

/**
 * Walks the decision-tree one yes/no question at a time. The first "yes"
 * resolves to a recommendation; "no" advances to the next question. Answering
 * "no" to all of them lands on the Autonomous Agent fallback.
 */
export function GuidedPatternPicker({ onRecommend, onBack }: GuidedPatternPickerProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PatternAnswers>({});
  const [done, setDone] = useState(false);

  const restart = () => {
    setStep(0);
    setAnswers({});
    setDone(false);
  };

  if (done) {
    const rec = recommendPatternFromAnswers(answers);
    const pattern = getPattern(rec.patternId);
    if (!pattern) return null;
    return (
      <div>
        <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-2">Recommended pattern</p>
        <h3 className="text-xl font-bold text-slate-900">{pattern.name}</h3>
        <p className="text-sm text-slate-600 mt-1">{pattern.description}</p>
        <p className="text-sm text-slate-500 mt-3 bg-slate-50 rounded-lg p-3">{rec.rationale}</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onRecommend(rec.patternId)}
            className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            Use this pattern
          </button>
          <button
            onClick={restart}
            className="py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const question = PATTERN_QUESTIONS[step];

  const answer = (value: 'yes' | 'no') => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    if (value === 'yes' || step === PATTERN_QUESTIONS.length - 1) {
      setDone(true);
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to all patterns
      </button>
      <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-2">
        Question {step + 1} of {PATTERN_QUESTIONS.length}
      </p>
      <h3 className="text-lg font-semibold text-slate-900">{question.question}</h3>
      <p className="text-sm text-slate-500 mt-1 mb-6">{question.help}</p>
      <div className="flex gap-3">
        <button
          onClick={() => answer('yes')}
          className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
        >
          Yes
        </button>
        <button
          onClick={() => answer('no')}
          className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors"
        >
          No
        </button>
      </div>
    </div>
  );
}

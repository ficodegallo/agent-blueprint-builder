import { useState } from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { PatternCard } from './PatternCard';
import { GuidedPatternPicker } from './GuidedPatternPicker';
import { ALL_PATTERNS } from '../../features/patterns/patterns';
import type { OrchestrationPatternId } from '../../features/patterns/types';

interface PatternPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the chosen pattern id, or null to start from a blank canvas. */
  onSelect: (patternId: OrchestrationPatternId | null) => void;
}

/**
 * Pre-canvas step for the manual creation path: pick an orchestration pattern
 * (whose scaffold seeds the canvas), get help choosing via the guided
 * questionnaire, or start from a blank canvas.
 */
export function PatternPickerDialog({ isOpen, onClose, onSelect }: PatternPickerDialogProps) {
  const [mode, setMode] = useState<'cards' | 'guided'>('cards');

  const close = () => {
    setMode('cards');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Choose an orchestration pattern" maxWidth="3xl">
      {mode === 'guided' ? (
        <GuidedPatternPicker onRecommend={(id) => onSelect(id)} onBack={() => setMode('cards')} />
      ) : (
        <div>
          <p className="text-sm text-slate-600 mb-4">
            The pattern shapes how work is orchestrated and seeds a starter graph. Pick the one that fits — you can
            change it later, or start blank and design freely.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ALL_PATTERNS.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                selected={false}
                onSelect={() => onSelect(pattern.id)}
              />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-5 pt-5 border-t border-slate-200">
            <button
              onClick={() => setMode('guided')}
              className="flex items-center justify-center gap-2 flex-1 py-2.5 border border-purple-300 text-purple-700 hover:bg-purple-50 font-medium rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Help me choose
            </button>
            <button
              onClick={() => onSelect(null)}
              className="flex items-center justify-center gap-2 flex-1 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" /> Start blank
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

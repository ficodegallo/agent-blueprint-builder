import { FileText, Brain, Sparkles, LayoutGrid, CheckCircle } from 'lucide-react';
import type { GenerationStep } from '../types';
import { STEP_LABELS } from '../constants';

interface GenerationProgressProps {
  step: Exclude<GenerationStep, 'idle' | 'complete' | 'error'>;
  progress: number;
}

const steps: Array<{
  key: GenerationStep;
  label: string;
  icon: typeof FileText;
}> = [
  { key: 'reading', label: 'Reading', icon: FileText },
  { key: 'analyzing', label: 'Analyzing', icon: Brain },
  { key: 'generating', label: 'Generating', icon: Sparkles },
  { key: 'layouting', label: 'Arranging', icon: LayoutGrid },
];

function getStepStatus(
  currentStep: GenerationStep,
  stepKey: GenerationStep
): 'completed' | 'current' | 'pending' {
  const stepOrder = steps.map((s) => s.key);
  const currentIndex = stepOrder.indexOf(currentStep);
  const stepIndex = stepOrder.indexOf(stepKey);

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'pending';
}

export function GenerationProgress({ step, progress }: GenerationProgressProps) {
  return (
    <div className="py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-sm text-gray-600 mt-2">
          {STEP_LABELS[step]}
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {steps.map((s, index) => {
          const Icon = s.icon;
          const status = getStepStatus(step, s.key);

          return (
            <div key={s.key} className="flex flex-col items-center flex-1">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={`
                    absolute h-0.5 -translate-y-4 -translate-x-1/2
                    ${status === 'pending' ? 'bg-gray-200' : 'bg-purple-500'}
                  `}
                  style={{ width: 'calc(100% - 2rem)' }}
                />
              )}

              {/* Step circle */}
              <div
                className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center transition-colors
                  ${status === 'completed' ? 'bg-purple-600' : ''}
                  ${status === 'current' ? 'bg-purple-100 ring-2 ring-purple-500' : ''}
                  ${status === 'pending' ? 'bg-gray-100' : ''}
                `}
              >
                {status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Icon
                    className={`
                      w-5 h-5
                      ${status === 'current' ? 'text-purple-600 animate-pulse' : 'text-gray-400'}
                    `}
                  />
                )}
              </div>

              {/* Step label */}
              <span
                className={`
                  text-xs mt-2 font-medium
                  ${status === 'completed' ? 'text-purple-600' : ''}
                  ${status === 'current' ? 'text-purple-700' : ''}
                  ${status === 'pending' ? 'text-gray-400' : ''}
                `}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Animated dots */}
      <div className="flex justify-center mt-8 gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

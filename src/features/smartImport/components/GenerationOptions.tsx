import { Bot, Users, Zap, Layers, List, MousePointer, Sparkles, Loader2 } from 'lucide-react';
import type { SmartImportOptions, OptimizationGoal, Granularity } from '../types';
import type { PatternRecommendation } from '../recommendPattern';
import { ALL_PATTERNS } from '../../patterns/patterns';
import type { OrchestrationPatternId } from '../../patterns/types';

interface GenerationOptionsProps {
  options: SmartImportOptions;
  onChange: (options: Partial<SmartImportOptions>) => void;
  disabled?: boolean;
  patternRecommendation?: PatternRecommendation | null;
  isRecommendingPattern?: boolean;
  canRecommendPattern?: boolean;
  onRecommendPattern?: () => void;
}

const optimizationOptions: Array<{
  value: OptimizationGoal;
  label: string;
  description: string;
  icon: typeof Bot;
}> = [
  {
    value: 'maximize_automation',
    label: 'Maximize Automation',
    description: 'Prefer AI agents and automations, minimize human tasks',
    icon: Bot,
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Mix of automation and human oversight',
    icon: Zap,
  },
  {
    value: 'human_in_loop',
    label: 'Human in Loop',
    description: 'Keep humans involved at key decision points',
    icon: Users,
  },
];

const granularityOptions: Array<{
  value: Granularity;
  label: string;
  description: string;
  icon: typeof Layers;
}> = [
  {
    value: 'high_level',
    label: 'High-Level',
    description: '5-10 nodes, major phases only',
    icon: Layers,
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: '10-25 nodes, all significant steps',
    icon: List,
  },
  {
    value: 'click_level',
    label: 'Click-Level',
    description: '20-50+ nodes, every action',
    icon: MousePointer,
  },
];

export function GenerationOptions({
  options,
  onChange,
  disabled,
  patternRecommendation,
  isRecommendingPattern,
  canRecommendPattern,
  onRecommendPattern,
}: GenerationOptionsProps) {
  return (
    <div className="space-y-6">
      {/* Orchestration Pattern */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Orchestration Pattern</p>
          {onRecommendPattern && (
            <button
              type="button"
              onClick={onRecommendPattern}
              disabled={disabled || isRecommendingPattern || !canRecommendPattern}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Analyze the uploaded document and recommend a pattern"
            >
              {isRecommendingPattern ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isRecommendingPattern ? 'Analyzing…' : 'Recommend from document'}
            </button>
          )}
        </div>
        <select
          value={options.orchestrationPattern ?? ''}
          onChange={(e) =>
            onChange({
              orchestrationPattern: (e.target.value || null) as OrchestrationPatternId | null,
            })
          }
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:bg-gray-50 bg-white"
        >
          <option value="">Let AI choose the simplest fit</option>
          {ALL_PATTERNS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.tagline}
            </option>
          ))}
        </select>
        {patternRecommendation && (
          <div className="mt-2 flex items-start gap-2 p-2.5 bg-purple-50 border border-purple-100 rounded-lg">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <p className="text-xs text-purple-800">
              <span className="font-medium">Recommended ({patternRecommendation.confidence} confidence):</span>{' '}
              {patternRecommendation.rationale}
            </p>
          </div>
        )}
      </div>

      {/* Process Name */}
      <div>
        <label htmlFor="processName" className="block text-sm font-medium text-gray-700 mb-1">
          Process Name <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="processName"
          type="text"
          value={options.processName}
          onChange={(e) => onChange({ processName: e.target.value })}
          disabled={disabled}
          placeholder="e.g., Customer Onboarding Process"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:bg-gray-50"
        />
      </div>

      {/* Optimization Goal */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Optimization Goal</p>
        <div className="grid grid-cols-3 gap-3">
          {optimizationOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = options.optimizationGoal === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ optimizationGoal: opt.value })}
                disabled={disabled}
                className={`
                  flex flex-col items-center p-3 rounded-lg border-2 transition-colors text-center
                  ${isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                  {opt.label}
                </span>
                <span className="text-xs text-gray-500 mt-1">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Granularity Level */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Granularity Level</p>
        <div className="grid grid-cols-3 gap-3">
          {granularityOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = options.granularity === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ granularity: opt.value })}
                disabled={disabled}
                className={`
                  flex flex-col items-center p-3 rounded-lg border-2 transition-colors text-center
                  ${isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                  {opt.label}
                </span>
                <span className="text-xs text-gray-500 mt-1">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Instructions */}
      <div>
        <label htmlFor="additionalInstructions" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Instructions <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="additionalInstructions"
          value={options.additionalInstructions}
          onChange={(e) => onChange({ additionalInstructions: e.target.value })}
          disabled={disabled}
          placeholder="Any specific requirements or constraints for the generated blueprint..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:bg-gray-50 resize-none"
        />
      </div>
    </div>
  );
}

import { Bot, Users, Zap, Layers, List, MousePointer } from 'lucide-react';
import type { SmartImportOptions, OptimizationGoal, Granularity } from '../types';

interface GenerationOptionsProps {
  options: SmartImportOptions;
  onChange: (options: Partial<SmartImportOptions>) => void;
  disabled?: boolean;
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
}: GenerationOptionsProps) {
  return (
    <div className="space-y-6">
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

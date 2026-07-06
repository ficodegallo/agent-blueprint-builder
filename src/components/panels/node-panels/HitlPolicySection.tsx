import { UserCheck } from 'lucide-react';
import { createHitlPolicy, type HitlMode, type HitlPolicy } from '../../../types';

interface Props {
  hitl: HitlPolicy | undefined;
  onChange: (hitl: HitlPolicy) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const MODE_DESCRIPTIONS: Record<HitlMode, string> = {
  none: 'The node acts fully autonomously',
  notify: 'A human is informed after the node acts',
  sampled: 'A human reviews a sample of outputs after the fact',
  approval: 'A human must approve before the action takes effect',
};

// Human oversight policy for automated nodes.
export function HitlPolicySection({ hitl, onChange }: Props) {
  const policy = hitl || createHitlPolicy();
  const update = (partial: Partial<HitlPolicy>) => onChange({ ...policy, ...partial });

  return (
    <div className="mb-4 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <UserCheck size={14} className="text-blue-500" />
        <span className="text-sm font-medium text-gray-700">Human Oversight</span>
      </div>

      <select
        value={policy.mode}
        onChange={(e) => update({ mode: e.target.value as HitlMode })}
        className={inputClass}
      >
        <option value="none">None — fully autonomous</option>
        <option value="notify">Notify — inform a human after acting</option>
        <option value="sampled">Sampled — human reviews a sample</option>
        <option value="approval">Approval — human approves before acting</option>
      </select>
      <p className="text-xs text-gray-400 mt-1">{MODE_DESCRIPTIONS[policy.mode]}</p>

      {policy.mode !== 'none' && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reviewer (role or person)</label>
            <input
              type="text"
              value={policy.reviewer}
              onChange={(e) => update({ reviewer: e.target.value })}
              placeholder="e.g. Ops Manager"
              className={inputClass}
            />
          </div>

          {policy.mode === 'sampled' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sampling Rate</label>
              <input
                type="text"
                value={policy.samplingRate}
                onChange={(e) => update({ samplingRate: e.target.value })}
                placeholder="e.g. 10% of outputs, or first 50 per week"
                className={inputClass}
              />
            </div>
          )}

          {policy.mode === 'approval' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Response SLA</label>
              <input
                type="text"
                value={policy.sla}
                onChange={(e) => update({ sla: e.target.value })}
                placeholder="e.g. 4 business hours"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Escalation Path
              <span className="block font-normal text-gray-400">When review fails or times out</span>
            </label>
            <textarea
              value={policy.escalationPath}
              onChange={(e) => update({ escalationPath: e.target.value })}
              rows={2}
              placeholder="e.g. Timeout after SLA → route to backup approver; rejection → return to drafting step"
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}

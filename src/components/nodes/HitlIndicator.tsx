import { UserCheck, Bell, Percent } from 'lucide-react';
import type { HitlPolicy } from '../../types';

// Small badge showing a node's human oversight policy on the canvas
export function HitlIndicator({ hitl }: { hitl?: HitlPolicy }) {
  if (!hitl || hitl.mode === 'none') return null;

  const config = {
    notify: { icon: Bell, label: 'Notify human', className: 'text-sky-600' },
    sampled: { icon: Percent, label: hitl.samplingRate ? `Sampled review (${hitl.samplingRate})` : 'Sampled review', className: 'text-amber-600' },
    approval: { icon: UserCheck, label: 'Approval required', className: 'text-red-600' },
  }[hitl.mode];

  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1 mt-1 text-xs ${config.className}`} title={hitl.reviewer ? `${config.label} — ${hitl.reviewer}` : config.label}>
      <Icon size={11} />
      <span className="truncate">{config.label}</span>
    </div>
  );
}

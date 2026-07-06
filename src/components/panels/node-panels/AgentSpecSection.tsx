import { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode2 } from 'lucide-react';
import { ListEditor } from '../../shared/ListEditor';
import type { AgentSpecFields, AutonomyLevel } from '../../../types';

interface Props {
  data: AgentSpecFields;
  onChange: (partial: Partial<AgentSpecFields>) => void;
  defaultOpen?: boolean;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

// Engineering-handoff fields shared by all agent-type nodes.
export function AgentSpecSection({ data, onChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 border border-gray-200 rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <FileCode2 size={14} className="text-indigo-500" />
        Agent Spec
        <span className="text-xs font-normal text-gray-400 ml-auto">engineering handoff</span>
      </button>

      {open && (
        <div className="p-3 pt-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
              <span className="block text-xs font-normal text-gray-400">
                Routing contract: what it does + when to use it + how it differs from related agents
              </span>
            </label>
            <textarea
              value={data.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
              placeholder="e.g. Extracts invoice line items from PDFs. Use for supplier invoices; not for expense receipts (see Receipt Agent)."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Autonomy Level
              <span className="block text-xs font-normal text-gray-400">
                Match strictness to how costly a wrong move is
              </span>
            </label>
            <select
              value={data.autonomyLevel || 'guided'}
              onChange={(e) => onChange({ autonomyLevel: e.target.value as AutonomyLevel })}
              className={inputClass}
            >
              <option value="strict">Strict — exact procedure, no deviation</option>
              <option value="guided">Guided — preferred pattern, some variation OK</option>
              <option value="open">Open — heuristics only, many approaches valid</option>
            </select>
          </div>

          <ListEditor
            label="Skills"
            items={data.skills || []}
            onChange={(skills) => onChange({ skills })}
            placeholder="Reusable capability (e.g. 'Invoice extraction')"
          />

          <ListEditor
            label="Tools"
            items={data.tools || []}
            onChange={(tools) => onChange({ tools })}
            placeholder="Tool or system the agent may call"
          />

          <ListEditor
            label="Guardrails"
            items={data.guardrails || []}
            onChange={(guardrails) => onChange({ guardrails })}
            placeholder="Hard constraint (e.g. 'Never email customers directly')"
          />

          <ListEditor
            label="Success Criteria"
            items={data.successCriteria || []}
            onChange={(successCriteria) => onChange({ successCriteria })}
            placeholder="Verifiable check (e.g. 'Totals reconcile to source')"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stop Condition</label>
            <textarea
              value={data.stopCondition || ''}
              onChange={(e) => onChange({ stopCondition: e.target.value })}
              rows={2}
              placeholder="When should the agent stop? e.g. 'All success criteria verified, or 3 failed attempts'"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Failure Handling</label>
            <textarea
              value={data.failureHandling || ''}
              onChange={(e) => onChange({ failureHandling: e.target.value })}
              rows={2}
              placeholder="What happens on failure? e.g. 'Retry once, then escalate to Ops queue with context'"
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}

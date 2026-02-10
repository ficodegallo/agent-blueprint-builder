import { AlertCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useValidation } from '../../hooks/useValidation';
import { useUIStore } from '../../store';
import type { ValidationIssue } from '../../utils/validation';

function IssueItem({ issue, onClick }: { issue: ValidationIssue; onClick?: () => void }) {
  const isError = issue.severity === 'error';

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-start gap-2 p-2 rounded text-left text-sm
        ${isError ? 'bg-red-50 hover:bg-red-100' : 'bg-yellow-50 hover:bg-yellow-100'}
        transition-colors
      `}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <div className={isError ? 'text-red-700' : 'text-yellow-700'}>
          {issue.message}
        </div>
        {issue.nodeName && (
          <div className="text-xs text-gray-500 mt-0.5">
            Click to select node
          </div>
        )}
      </div>
      <span className="text-xs text-gray-400 shrink-0">{issue.code}</span>
    </button>
  );
}

export function ValidationPanel() {
  const { isValid, errors, warnings, all } = useValidation();
  const [isExpanded, setIsExpanded] = useState(false);
  const selectNode = useUIStore((state) => state.selectNode);

  const handleIssueClick = (issue: ValidationIssue) => {
    if (issue.nodeId) {
      selectNode(issue.nodeId);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Summary bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}

        {isValid ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700 font-medium">
              Blueprint is valid
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 font-medium">
              {errors.length} error{errors.length !== 1 ? 's' : ''}
            </span>
          </>
        )}

        {warnings.length > 0 && (
          <span className="text-sm text-yellow-600">
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </span>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          Click to {isExpanded ? 'collapse' : 'expand'}
        </span>
      </button>

      {/* Expanded issues list */}
      {isExpanded && all.length > 0 && (
        <div className="px-4 pb-4 max-h-48 overflow-y-auto">
          <div className="space-y-2">
            {errors.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                onClick={() => handleIssueClick(issue)}
              />
            ))}
            {warnings.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                onClick={() => handleIssueClick(issue)}
              />
            ))}
          </div>
        </div>
      )}

      {isExpanded && all.length === 0 && (
        <div className="px-4 pb-4 text-sm text-gray-500">
          No issues found. Your blueprint is ready to export!
        </div>
      )}
    </div>
  );
}

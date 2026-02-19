import { AlertCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Loader2, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useValidation } from '../../hooks/useValidation';
import { useBestPracticesAnalysis } from '../../hooks/useBestPracticesAnalysis';
import { hasBestPractices } from '../../utils/bestPracticesStorage';
import { useUIStore, useNodesStore, useEdgesStore } from '../../store';
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
  const focusNode = useUIStore((state) => state.focusNode);
  const nodes = useNodesStore((state) => state.nodes);
  const edges = useEdgesStore((state) => state.edges);

  const {
    analyzeBestPractices,
    isAnalyzing,
    warnings: bpWarnings,
    error: bpError,
    clearWarnings,
  } = useBestPracticesAnalysis();

  const handleIssueClick = (issue: ValidationIssue) => {
    if (issue.nodeId) {
      focusNode(issue.nodeId);
    }
  };

  const handleCheckBestPractices = () => {
    analyzeBestPractices(nodes, edges);
  };

  const showBPButton = hasBestPractices();
  const totalIssues = all.length + bpWarnings.length;

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Summary bar */}
      <div className="flex items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 px-4 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors"
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

          {bpWarnings.length > 0 && (
            <span className="text-sm text-purple-600">
              {bpWarnings.length} BP issue{bpWarnings.length !== 1 ? 's' : ''}
            </span>
          )}

          <span className="text-xs text-gray-400 ml-auto">
            Click to {isExpanded ? 'collapse' : 'expand'}
          </span>
        </button>

        {showBPButton && (
          <button
            onClick={handleCheckBestPractices}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 mr-3 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <BookOpen className="w-3.5 h-3.5" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Check Best Practices'}
          </button>
        )}
      </div>

      {/* Expanded issues list */}
      {isExpanded && totalIssues > 0 && (
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

            {bpWarnings.length > 0 && (
              <>
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                    Best Practices
                  </div>
                  <button
                    onClick={clearWarnings}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                </div>
                {bpWarnings.map((issue) => (
                  <IssueItem
                    key={issue.id}
                    issue={issue}
                    onClick={() => handleIssueClick(issue)}
                  />
                ))}
              </>
            )}

            {bpError && (
              <div className="p-2 rounded text-sm bg-red-50 text-red-700">
                {bpError}
              </div>
            )}
          </div>
        </div>
      )}

      {isExpanded && totalIssues === 0 && !bpError && (
        <div className="px-4 pb-4 text-sm text-gray-500">
          No issues found. Your blueprint is ready to export!
        </div>
      )}

      {isExpanded && totalIssues === 0 && bpError && (
        <div className="px-4 pb-4">
          <div className="p-2 rounded text-sm bg-red-50 text-red-700">
            {bpError}
          </div>
        </div>
      )}
    </div>
  );
}

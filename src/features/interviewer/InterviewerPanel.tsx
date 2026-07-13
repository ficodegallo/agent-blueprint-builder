import { useEffect, useRef, useState } from 'react';
import { Flame, Loader2, MessageCircleQuestion, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useUIStore, useNodesStore } from '../../store';
import { useInterviewer } from './useInterviewer';
import { COVERAGE_LABELS, type CoverageArea, type CoverageStatus } from './types';

const COVERAGE_STYLES: Record<CoverageStatus, string> = {
  missing: 'bg-gray-100 text-gray-400 border-gray-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-300',
  covered: 'bg-green-50 text-green-700 border-green-300',
};

export function InterviewerPanel() {
  const isOpen = useUIStore((s) => s.isInterviewerOpen);
  const close = useUIStore((s) => s.closeInterviewer);
  const nodeCount = useNodesStore((s) => s.nodes.length);

  const { mode, messages, coverage, isThinking, isDone, error, start, sendAnswer, retry, reset } =
    useInterviewer();

  const [processContext, setProcessContext] = useState('');
  const [answer, setAnswer] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isThinking]);

  if (!isOpen) return null;

  const started = mode !== null;

  const handleSend = () => {
    if (!answer.trim() || isThinking) return;
    sendAnswer(answer.trim());
    setAnswer('');
  };

  return (
    <div className="fixed right-0 top-12 bottom-0 w-[28rem] bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Interviewer</h2>
          {mode && (
            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full capitalize">
              {mode}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {started && (
            <button
              onClick={reset}
              title="Start over"
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={close}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!started ? (
        /* Mode selection */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Interview a process owner and build the blueprint live on the canvas — no documents
            needed. The canvas updates after every answer.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What process are we working on?
            </label>
            <textarea
              value={processContext}
              onChange={(e) => setProcessContext(e.target.value)}
              rows={3}
              placeholder="e.g. Our supplier invoice approval process. It's mostly manual today and lives in email and NetSuite."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => start('discovery', processContext.trim())}
            disabled={isThinking}
            className="w-full flex items-start gap-3 p-3 border-2 border-indigo-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-gray-800">Discovery</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Build the blueprint from scratch, one question at a time.
              </div>
            </div>
          </button>

          <button
            onClick={() => start('grill', processContext.trim())}
            disabled={isThinking || nodeCount === 0}
            className="w-full flex items-start gap-3 p-3 border-2 border-rose-200 rounded-lg hover:border-rose-400 hover:bg-rose-50 transition-colors text-left disabled:opacity-40"
          >
            <Flame className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-gray-800">Grill</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {nodeCount === 0
                  ? 'Needs an existing draft on the canvas.'
                  : 'Stress-test the current draft: exceptions, timeouts, gaps.'}
              </div>
            </div>
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Coverage chips */}
          <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-1.5 shrink-0">
            {(Object.keys(COVERAGE_LABELS) as CoverageArea[]).map((area) => (
              <span
                key={area}
                className={`px-2 py-0.5 text-xs font-medium rounded-full border ${COVERAGE_STYLES[coverage[area]]}`}
                title={`${COVERAGE_LABELS[area]}: ${coverage[area]}`}
              >
                {COVERAGE_LABELS[area]}
              </span>
            ))}
          </div>

          {/* Transcript */}
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.displayText}
                  {msg.role === 'assistant' && (msg.actionCount || 0) > 0 && (
                    <div className="mt-1.5 text-xs text-indigo-600">
                      ✎ {msg.actionCount} canvas change{msg.actionCount === 1 ? '' : 's'} applied
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking…
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
                <button onClick={retry} className="ml-2 underline text-red-600 hover:text-red-700">
                  Retry
                </button>
              </div>
            )}
            {isDone && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                Interview complete. Review the canvas, then run Validation and the Best Practices
                check before sharing.
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 shrink-0">
            <div className="flex gap-2">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
                placeholder={isDone ? 'Add anything else…' : 'Type your answer… (Enter to send)'}
                disabled={isThinking}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none disabled:bg-gray-50"
              />
              <button
                onClick={handleSend}
                disabled={isThinking || !answer.trim()}
                className="px-3 self-end py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-40"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

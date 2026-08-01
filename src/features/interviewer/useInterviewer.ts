import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getApiKey } from '../smartImport/hooks/useClaudeApi';
import { getActivePrompts } from '../../utils/aiPromptStorage';
import { AI_FEATURE_MODELS, ANTHROPIC_API_URL, ANTHROPIC_VERSION } from '../../constants/aiModels';
import { applyAutoLayout } from '../smartImport/utils/autoLayout';
import { useNodesStore, useEdgesStore, useBlueprintStore } from '../../store';
import type { AppNode } from '../../store/nodesStore';
import type { BlueprintEdge, NodeData } from '../../types';
import type { SerializedNode } from '../../types/blueprint';
import { isOrchestrationPatternId } from '../patterns/patterns';
import { mergeParkedQuestions, pruneCoveredParked, removeParkedByIds } from './parkedQuestions';
import { loadSession, saveSession, clearSession } from './interviewSessionStorage';
import type { InterviewSession } from './types';
import {
  emptyCoverage,
  parkedQuestionKey,
  COVERAGE_LABELS,
  type CanvasAction,
  type ChatMessage,
  type Coverage,
  type CoverageArea,
  type InterviewerPatternRecommendation,
  type InterviewerTurn,
  type InterviewMode,
  type ParkedQuestion,
  type ParkedResolution,
} from './types';

const MODEL = AI_FEATURE_MODELS.interviewer;
const MAX_TOKENS = 8192;
const TIMEOUT_MS = 90000;

const MODE_INSTRUCTIONS: Record<InterviewMode, string> = {
  discovery: `## Mode: Discovery
The canvas starts (mostly) empty. Your job is to draw the process out of the owner's head, one question at a time, building the blueprint live as they answer. Start by asking what kicks the process off, then follow the work forward. Work through the coverage areas until each is covered.`,
  grill: `## Mode: Grill
A draft blueprint already exists on the canvas. Your job is to stress-test it: walk the flow and adversarially probe for what's missing or underspecified — unhandled exceptions, timeouts, approval gaps, vague goals, missing failure paths, unrealistic assumptions. For each question, briefly state your concern and (when you have one) your recommended answer. Patch the canvas as gaps are resolved. Prioritize the riskiest gaps first.`,
};

// Compact canvas serialization the model reads each turn
function serializeCanvas(nodes: AppNode[], edges: BlueprintEdge[]): string {
  if (nodes.length === 0) return '(empty canvas)';
  const lines: string[] = [];
  for (const node of nodes) {
    const d = node.data as Record<string, unknown>;
    const detail = JSON.stringify(
      Object.fromEntries(
        Object.entries(d).filter(
          ([k, v]) =>
            !['ai_generated', 'ai_confidence', 'ai_notes'].includes(k) &&
            v !== '' &&
            v !== undefined &&
            !(Array.isArray(v) && v.length === 0)
        )
      )
    );
    lines.push(`- [${node.id}] ${detail}`);
  }
  lines.push('Edges:');
  for (const edge of edges) {
    lines.push(
      `- ${edge.source} -> ${edge.target}${edge.sourceHandle ? ` (handle: ${edge.sourceHandle})` : ''}${edge.data?.conditionLabel ? ` [${edge.data.conditionLabel}]` : ''}`
    );
  }
  return lines.join('\n');
}

function extractTurn(text: string): InterviewerTurn {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonText = codeBlockMatch ? codeBlockMatch[1] : text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) throw new Error('Interviewer response contained no JSON');
  const parsed = JSON.parse(jsonText) as Partial<InterviewerTurn>;
  if (typeof parsed.message !== 'string') throw new Error('Interviewer response missing message');
  return {
    message: parsed.message,
    actions: Array.isArray(parsed.actions) ? (parsed.actions as CanvasAction[]) : [],
    coverage: { ...emptyCoverage(), ...(parsed.coverage || {}) },
    done: parsed.done === true,
    recommendedPattern: parsePattern(parsed.recommendedPattern),
    parkedQuestions: parseParkedQuestions(parsed.parkedQuestions),
    resolvedParked: parseResolvedParked(parsed.resolvedParked),
  };
}

// Parse the model's resolved-parked signals; drop anything without a known
// area and non-empty question (mirrors parseParkedQuestions discipline).
function parseResolvedParked(value: unknown): ParkedResolution[] {
  if (!Array.isArray(value)) return [];
  const out: ParkedResolution[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const p = entry as Record<string, unknown>;
    const question = typeof p.question === 'string' ? p.question.trim() : '';
    const area = p.area as CoverageArea;
    if (!question || !(area in COVERAGE_LABELS)) continue;
    out.push({ question, area });
  }
  return out;
}

// A parked question is valid only with a non-empty question and a known
// coverage area; anything else is dropped (mirrors parsePattern's discipline).
function parseParkedQuestions(value: unknown): ParkedQuestion[] {
  if (!Array.isArray(value)) return [];
  const out: ParkedQuestion[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const p = entry as Record<string, unknown>;
    const question = typeof p.question === 'string' ? p.question.trim() : '';
    const area = p.area as CoverageArea;
    if (!question || !(area in COVERAGE_LABELS)) continue;
    out.push({
      id: parkedQuestionKey(area, question),
      question,
      area,
      why: typeof p.why === 'string' ? p.why : '',
      context: typeof p.context === 'string' && p.context.trim() ? p.context.trim() : undefined,
    });
  }
  return out;
}

// Validate an inferred pattern; drop anything with an out-of-catalog id.
function parsePattern(value: unknown): InterviewerPatternRecommendation | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const p = value as Record<string, unknown>;
  if (!isOrchestrationPatternId(p.id)) return undefined;
  const confidence =
    p.confidence === 'high' || p.confidence === 'medium' || p.confidence === 'low'
      ? p.confidence
      : 'medium';
  return {
    id: p.id,
    rationale: typeof p.rationale === 'string' ? p.rationale : '',
    confidence,
  };
}

export function useInterviewer() {
  const [mode, setMode] = useState<InterviewMode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coverage, setCoverage] = useState<Coverage>(emptyCoverage());
  const [isThinking, setIsThinking] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendedPattern, setRecommendedPattern] =
    useState<InterviewerPatternRecommendation | null>(null);
  const [parkedQuestions, setParkedQuestions] = useState<ParkedQuestion[]>([]);
  const [processContext, setProcessContext] = useState('');

  // Persist the session per-blueprint after any meaningful change so closing
  // the panel or reloading doesn't lose the interview (R6).
  useEffect(() => {
    if (!mode) return;
    const blueprintId = useBlueprintStore.getState().id;
    saveSession(blueprintId, {
      mode,
      processContext,
      messages,
      coverage,
      parkedQuestions,
      updatedAt: new Date().toISOString(),
    });
  }, [mode, processContext, messages, coverage, parkedQuestions]);

  // Apply canvas actions from a turn; returns how many succeeded
  const applyActions = useCallback((actions: CanvasAction[]): number => {
    const nodesStore = useNodesStore.getState();
    const edgesStore = useEdgesStore.getState();
    let applied = 0;
    let addedNodes = false;

    for (const action of actions) {
      try {
        if (action.op === 'addNode') {
          if (!action.data?.nodeType || !action.data?.name) continue;
          const existing = useNodesStore.getState().nodes;
          // Preserve the model's id so later actions can reference it, unless taken
          const id = existing.some((n) => n.id === action.id) || !action.id ? uuidv4() : action.id;
          const newNode: AppNode = {
            id,
            type: action.data.nodeType,
            position: { x: 250, y: 150 },
            data: { ai_generated: true, ...action.data } as NodeData,
          };
          nodesStore.setNodes([...existing, newNode]);
          addedNodes = true;
          applied++;
        } else if (action.op === 'updateNode') {
          nodesStore.updateNode(action.id, action.data);
          applied++;
        } else if (action.op === 'addEdge') {
          const nodes = useNodesStore.getState().nodes;
          if (!nodes.some((n) => n.id === action.source) || !nodes.some((n) => n.id === action.target)) continue;
          edgesStore.addEdge({
            id: uuidv4(),
            source: action.source,
            target: action.target,
            sourceHandle: action.sourceHandle,
            data: { conditionLabel: action.label || '', description: '' },
          });
          applied++;
        } else if (action.op === 'removeNode') {
          const nodes = useNodesStore.getState().nodes.filter((n) => n.id !== action.id);
          nodesStore.setNodes(nodes);
          edgesStore.setEdges(
            useEdgesStore.getState().edges.filter((e) => e.source !== action.id && e.target !== action.id)
          );
          applied++;
        } else if (action.op === 'removeEdge') {
          edgesStore.setEdges(
            useEdgesStore
              .getState()
              .edges.filter((e) => !(e.source === action.source && e.target === action.target))
          );
          applied++;
        }
      } catch (err) {
        console.error('Interviewer action failed:', action, err);
      }
    }

    // Re-run auto-layout when the structure grew so the canvas stays readable
    if (addedNodes) {
      const nodes = useNodesStore.getState().nodes as SerializedNode[];
      const edges = useEdgesStore.getState().edges;
      const laidOut = applyAutoLayout(nodes, edges);
      useNodesStore.getState().setNodes(laidOut as AppNode[]);
    }

    return applied;
  }, []);

  const callApi = useCallback(
    async (apiMessages: { role: 'user' | 'assistant'; content: string }[]): Promise<InterviewerTurn & { raw: string }> => {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error('API key not found. Configure your Claude API key in Smart Import settings.');
      }

      const prompts = getActivePrompts('interviewer');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: prompts.systemPrompt,
            messages: apiMessages,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const data = await response.json();
        const content = data.content?.find((b: { type: string }) => b.type === 'text')?.text;
        if (!content) throw new Error('No content in API response');
        return { ...extractTurn(content), raw: content };
      } finally {
        clearTimeout(timeoutId);
      }
    },
    []
  );

  const runTurn = useCallback(
    async (history: ChatMessage[]) => {
      setIsThinking(true);
      setError(null);
      try {
        const turn = await callApi(history.map((m) => ({ role: m.role, content: m.apiText })));
        const applied = applyActions(turn.actions);
        setCoverage(turn.coverage);
        setIsDone(turn.done);
        if (turn.recommendedPattern) setRecommendedPattern(turn.recommendedPattern);
        // Accumulate newly-parked questions (deduped), remove the specific ones
        // the owner just answered, then drop any whose area is now fully covered.
        setParkedQuestions((prev) => {
          const merged = mergeParkedQuestions(prev, turn.parkedQuestions);
          const resolvedKeys = turn.resolvedParked.map((r) => parkedQuestionKey(r.area, r.question));
          return pruneCoveredParked(removeParkedByIds(merged, resolvedKeys), turn.coverage);
        });
        setMessages([
          ...history,
          {
            role: 'assistant',
            displayText: turn.message,
            apiText: turn.raw,
            actionCount: applied,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Interview turn failed');
      } finally {
        setIsThinking(false);
      }
    },
    [callApi, applyActions]
  );

  const start = useCallback(
    async (selectedMode: InterviewMode, processContext: string) => {
      setMode(selectedMode);
      setIsDone(false);
      setCoverage(emptyCoverage());
      setParkedQuestions([]);
      setProcessContext(processContext);

      const prompts = getActivePrompts('interviewer');
      const canvasState = serializeCanvas(useNodesStore.getState().nodes, useEdgesStore.getState().edges);
      const kickoff = prompts.userPromptTemplate
        .replace('{{MODE_INSTRUCTIONS}}', MODE_INSTRUCTIONS[selectedMode])
        .replace('{{PROCESS_CONTEXT}}', processContext || '(not provided — ask)')
        .replace('{{BLUEPRINT_STATE}}', canvasState);

      const history: ChatMessage[] = [
        { role: 'user', displayText: processContext, apiText: kickoff },
      ];
      setMessages(history);
      await runTurn(history);
    },
    [runTurn]
  );

  // Build a user turn: append the live canvas state to the API body, push it to
  // the transcript, and run the turn. Shared by every send path below.
  const sendUserTurn = useCallback(
    async (displayText: string, apiBody: string) => {
      const canvasState = serializeCanvas(useNodesStore.getState().nodes, useEdgesStore.getState().edges);
      const apiText = `${apiBody}\n\n## Current canvas state\n${canvasState}`;
      const history: ChatMessage[] = [...messages, { role: 'user', displayText, apiText }];
      setMessages(history);
      await runTurn(history);
    },
    [messages, runTurn]
  );

  const sendAnswer = useCallback(
    async (answer: string) => {
      await sendUserTurn(answer, answer);
    },
    [sendUserTurn]
  );

  // Explicitly defer the current question. Sends a canonical deferral (any
  // partial text the owner typed + a [[DEFER]] marker) so the model reliably
  // parks the current question even when the owner types nothing.
  const deferQuestion = useCallback(
    async (partialText?: string) => {
      const trimmed = partialText?.trim();
      const apiBody = trimmed
        ? `${trimmed}\n\n[[DEFER]]`
        : "[[DEFER]] I don't have this answer yet — park it for later.";
      const displayText = trimmed ? `${trimmed} (deferred)` : "I don't know — I'll get this later.";
      await sendUserTurn(displayText, apiBody);
    },
    [sendUserTurn]
  );

  const retry = useCallback(async () => {
    if (messages.length === 0) return;
    await runTurn(messages);
  }, [messages, runTurn]);

  // Return a persisted session for the current blueprint, if any (panel uses
  // this to offer Resume vs Start over on open).
  const getSavedSession = useCallback((): InterviewSession | null => {
    return loadSession(useBlueprintStore.getState().id);
  }, []);

  // Rehydrate hook state from a persisted session so the transcript, coverage,
  // and parked questions reappear.
  const resumeSession = useCallback((session: InterviewSession) => {
    setMode(session.mode);
    setProcessContext(session.processContext);
    setMessages(session.messages);
    setCoverage(session.coverage);
    setParkedQuestions(session.parkedQuestions);
    setRecommendedPattern(null);
    setIsDone(false);
    setError(null);
  }, []);

  // Kick off a focused pass that re-asks the still-open parked questions one at
  // a time so the owner can now fill them in (R7).
  const resumeParked = useCallback(async () => {
    if (parkedQuestions.length === 0) return;
    const list = parkedQuestions
      .map((q, i) => `${i + 1}. [${q.area}] ${q.question}`)
      .join('\n');
    const apiBody = `I'm ready to answer the questions we parked earlier. Here are the still-open ones:\n${list}\n\nAsk me the first one now (one at a time, as usual). As I answer each, patch the canvas and report it in resolvedParked so it clears from the parked list.`;
    setIsDone(false);
    await sendUserTurn("Let's fill in the parked questions.", apiBody);
  }, [parkedQuestions, sendUserTurn]);

  // Apply the recommended (or a chosen) pattern to the blueprint metadata.
  const acceptPattern = useCallback((patternId?: string) => {
    const id = patternId ?? recommendedPattern?.id;
    if (!id || !isOrchestrationPatternId(id)) return;
    useBlueprintStore.getState().updateMetadata({ orchestrationPattern: id });
  }, [recommendedPattern]);

  const reset = useCallback(() => {
    clearSession(useBlueprintStore.getState().id);
    setMode(null);
    setMessages([]);
    setCoverage(emptyCoverage());
    setIsDone(false);
    setError(null);
    setRecommendedPattern(null);
    setParkedQuestions([]);
    setProcessContext('');
  }, []);

  return {
    mode,
    messages,
    coverage,
    isThinking,
    isDone,
    error,
    recommendedPattern,
    parkedQuestions,
    acceptPattern,
    start,
    sendAnswer,
    deferQuestion,
    retry,
    getSavedSession,
    resumeSession,
    resumeParked,
    reset,
  };
}

import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getApiKey } from '../smartImport/hooks/useClaudeApi';
import { getActivePrompts } from '../../utils/aiPromptStorage';
import { AI_FEATURE_MODELS, ANTHROPIC_API_URL, ANTHROPIC_VERSION } from '../../constants/aiModels';
import { applyAutoLayout } from '../smartImport/utils/autoLayout';
import { useNodesStore, useEdgesStore } from '../../store';
import type { AppNode } from '../../store/nodesStore';
import type { BlueprintEdge, NodeData } from '../../types';
import type { SerializedNode } from '../../types/blueprint';
import {
  emptyCoverage,
  type CanvasAction,
  type ChatMessage,
  type Coverage,
  type InterviewerTurn,
  type InterviewMode,
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
  };
}

export function useInterviewer() {
  const [mode, setMode] = useState<InterviewMode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coverage, setCoverage] = useState<Coverage>(emptyCoverage());
  const [isThinking, setIsThinking] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const sendAnswer = useCallback(
    async (answer: string) => {
      const canvasState = serializeCanvas(useNodesStore.getState().nodes, useEdgesStore.getState().edges);
      const apiText = `${answer}\n\n## Current canvas state\n${canvasState}`;
      const history: ChatMessage[] = [
        ...messages,
        { role: 'user', displayText: answer, apiText },
      ];
      setMessages(history);
      await runTurn(history);
    },
    [messages, runTurn]
  );

  const retry = useCallback(async () => {
    if (messages.length === 0) return;
    await runTurn(messages);
  }, [messages, runTurn]);

  const reset = useCallback(() => {
    setMode(null);
    setMessages([]);
    setCoverage(emptyCoverage());
    setIsDone(false);
    setError(null);
  }, []);

  return {
    mode,
    messages,
    coverage,
    isThinking,
    isDone,
    error,
    start,
    sendAnswer,
    retry,
    reset,
  };
}
